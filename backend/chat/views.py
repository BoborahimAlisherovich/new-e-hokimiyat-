"""
Chat API.

Xavfsizlik: `DirectMessageViewSet` endi ModelViewSet EMAS. Standart
`update`/`partial_update`/`destroy` route'lari umuman ro'yxatga olinmaydi,
shuning uchun qabul qiluvchi jo'natuvchining xabarini o'zgartira olmaydi
(B20). Tahrirlash va o'chirish faqat maxsus action'lar orqali, faqat
jo'natuvchi uchun.

Tarix kursor bo'yicha sahifalanadi va GET so'rov hech narsa yozmaydi
(B21, B25).
"""

import uuid as uuid_lib
from typing import Any, Dict, List, Optional

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatConversation, DirectMessage, DirectMessageAttachment
from .permissions import IsMessageSender
from .serializers import (
    ChatConversationSerializer,
    DirectMessageAttachmentSerializer,
    DirectMessageEditSerializer,
    DirectMessageSerializer,
)
from . import services

User = get_user_model()

# Maksimal fayl hajmi (50MB)
MAX_FILE_SIZE = 50 * 1024 * 1024

# Tarix sahifasi
DEFAULT_PAGE_LIMIT = 40
MAX_PAGE_LIMIT = 100

# Ruxsat etilgan fayl turlari
ALLOWED_FILE_TYPES = {
    # Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
    # Videos
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    # Audio
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a',
    'audio/mp4', 'audio/aac',
    # Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'text/plain', 'text/csv',
}


def _validate_upload(file):
    """Fayl hajmi va turini tekshirish. Xato bo'lsa ValueError."""
    if not file:
        return None
    if file.size > MAX_FILE_SIZE:
        raise ValueError(
            f"Fayl hajmi 50MB dan oshmasligi kerak. Hozirgi: {file.size / (1024 * 1024):.1f}MB"
        )
    content_type = getattr(file, 'content_type', '') or ''
    if content_type not in ALLOWED_FILE_TYPES:
        raise ValueError(f"Ruxsat etilmagan fayl turi: {content_type or 'nomaʼlum'}")
    return file


def _parse_int(value, default=None) -> Optional[int]:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_uuid(value) -> Optional[uuid_lib.UUID]:
    if not value:
        return None
    try:
        return uuid_lib.UUID(str(value))
    except (TypeError, ValueError):
        return None


def _parse_id_list(raw) -> List[int]:
    """`attachment_ids` JSON massiv, vergul bilan ajratilgan matn yoki ro'yxat."""
    if raw in (None, ''):
        return []
    if isinstance(raw, (list, tuple)):
        items = raw
    else:
        items = str(raw).replace('[', '').replace(']', '').split(',')
    out: List[int] = []
    for item in items:
        parsed = _parse_int(str(item).strip().strip('"').strip("'"))
        if parsed is not None:
            out.append(parsed)
    return out


class DirectMessageViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Direct message API.

    Ro'yxatga olinadigan standart route'lar: `list`, `retrieve`.
    `update`, `partial_update`, `destroy` ATAYLAB YO'Q (B20).
    """

    serializer_class = DirectMessageSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    # ------------------------------------------------------------ queryset

    def get_queryset(self):
        return services.message_queryset().filter(
            Q(sender=self.request.user) | Q(recipient=self.request.user)
        ).order_by('-id')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    # -------------------------------------------------------------- yuborish

    def _create_message(self, request, recipient) -> Response:
        """Xabar yaratishning yagona yo'li (create va send_message uchun)."""
        if recipient.id == request.user.id:
            return Response(
                {'detail': "O'zingizga xabar yuborib bo'lmaydi"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        client_id = _parse_uuid(request.data.get('client_id'))

        # Idempotentlik: bir xil client_id ikkinchi marta kelsa yangi xabar
        # yaratilmaydi — mavjudi qaytariladi (optimistik yuborishni qayta
        # urinishda dublikat pufakcha bo'lmaydi).
        if client_id:
            existing = services.message_queryset().filter(
                sender=request.user, client_id=client_id
            ).first()
            if existing:
                return Response(
                    DirectMessageSerializer(existing, context={'request': request}).data,
                    status=status.HTTP_200_OK,
                )

        # Eski oqim: bitta fayl to'g'ridan-to'g'ri so'rov bilan.
        legacy_attachment = request.FILES.get('attachment')
        try:
            legacy_attachment = _validate_upload(legacy_attachment)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Yangi oqim: oldindan yuklangan fayllarning id'lari.
        attachment_ids = _parse_id_list(request.data.get('attachment_ids'))
        pending_attachments = []
        if attachment_ids:
            pending_attachments = list(
                DirectMessageAttachment.objects.filter(
                    id__in=attachment_ids,
                    uploaded_by=request.user,
                    message__isnull=True,
                )
            )
            if len(pending_attachments) != len(set(attachment_ids)):
                return Response(
                    {'detail': "Biriktirilgan fayl topilmadi yoki allaqachon ishlatilgan"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        content = request.data.get('content', '') or ''
        if not content.strip() and not legacy_attachment and not pending_attachments:
            return Response(
                {'detail': 'content yoki attachment talab qilinadi'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reply_to = None
        reply_to_id = _parse_int(request.data.get('reply_to_id') or request.data.get('reply_to'))
        if reply_to_id:
            reply_to = DirectMessage.objects.filter(
                Q(sender=request.user, recipient=recipient) |
                Q(sender=recipient, recipient=request.user),
                id=reply_to_id,
            ).first()
            if reply_to is None:
                return Response(
                    {'detail': 'Javob berilayotgan xabar bu suhbatda topilmadi'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            with transaction.atomic():
                message = DirectMessage.objects.create(
                    sender=request.user,
                    recipient=recipient,
                    content=content,
                    attachment=legacy_attachment,
                    client_id=client_id,
                    reply_to=reply_to,
                )
                if pending_attachments:
                    DirectMessageAttachment.objects.filter(
                        id__in=[a.id for a in pending_attachments]
                    ).update(message=message)
                services.touch_conversation(request.user, recipient, message)
        except IntegrityError:
            # client_id unique constraint — parallel takroriy so'rov.
            existing = services.message_queryset().filter(
                sender=request.user, client_id=client_id
            ).first()
            if existing:
                return Response(
                    DirectMessageSerializer(existing, context={'request': request}).data,
                    status=status.HTTP_200_OK,
                )
            raise

        message = services.message_queryset().get(pk=message.pk)
        services.broadcast_new_message(message, request)
        services.notify_direct_message(message)

        return Response(
            DirectMessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def create(self, request, *args, **kwargs):
        """POST /api/chat/messages/ — `recipient_id` tanada."""
        recipient_id = request.data.get('recipient_id')
        if not recipient_id:
            return Response(
                {'detail': 'recipient_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        recipient = get_object_or_404(User, id=recipient_id)
        return self._create_message(request, recipient)

    @action(detail=False, methods=['post'], url_path='message/(?P<user_id>[^/.]+)')
    def send_message(self, request, user_id=None):
        """POST /api/chat/messages/message/<user_id>/"""
        recipient = get_object_or_404(User, id=user_id)
        return self._create_message(request, recipient)

    # ------------------------------------------------------------- suhbatlar

    @action(detail=False, methods=['get'], url_path='conversations')
    def conversations(self, request):
        """GET /api/chat/messages/conversations/ — sidebar ma'lumoti."""
        conversations = (
            ChatConversation.objects
            .filter(Q(participant1=request.user) | Q(participant2=request.user))
            .select_related(
                'participant1', 'participant2',
                'last_message', 'last_message__sender', 'last_message__recipient',
            )
            .prefetch_related('last_message__attachments')
            .order_by('-updated_at')
        )

        # unread'ni bitta GROUP BY bilan hisoblaymiz (N+1 emas).
        unread_rows = (
            DirectMessage.objects
            .filter(recipient=request.user, is_read=False, is_deleted=False)
            .values('sender_id')
            .annotate(total=Count('id'))
        )
        unread_map = {row['sender_id']: row['total'] for row in unread_rows}

        serializer = ChatConversationSerializer(
            conversations,
            many=True,
            context={'request': request, 'unread_map': unread_map},
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='conversation/(?P<user_id>[^/.]+)')
    def conversation_with_user(self, request, user_id=None):
        """
        GET /api/chat/messages/conversation/<user_id>/?before_id=&limit=

        Kursor bo'yicha sahifalash. Eng yangi sahifa birinchi bo'lib
        qaytariladi, natijalar ESKIDAN YANGIGA tartibda (newest-last).

        MUHIM: bu GET hech narsa yozmaydi — o'qilganlik holatini
        o'zgartirmaydi va bo'sh suhbat satri yaratmaydi (B21, B25, B16).

        Orqaga moslik: parametrsiz chaqirilsa eng yangi sahifani oddiy
        massiv sifatida qaytaradi (eski frontend shu formatni kutadi).
        """
        other_user = get_object_or_404(User, id=user_id)

        limit = _parse_int(request.query_params.get('limit'), DEFAULT_PAGE_LIMIT) or DEFAULT_PAGE_LIMIT
        limit = max(1, min(limit, MAX_PAGE_LIMIT))
        before_id = _parse_int(request.query_params.get('before_id'))

        qs = services.message_queryset().filter(
            services.pair_filter(request.user, other_user)
        )
        if before_id:
            qs = qs.filter(id__lt=before_id)

        # limit + 1 — yana sahifa borligini bilish uchun.
        rows = list(qs.order_by('-id')[: limit + 1])
        has_more = len(rows) > limit
        rows = rows[:limit]
        rows.reverse()  # newest-last

        data = DirectMessageSerializer(rows, many=True, context={'request': request}).data

        wants_cursor = any(
            key in request.query_params for key in ('before_id', 'limit', 'cursor')
        )
        if not wants_cursor:
            # Eski chaqiruv shakli — faqat massiv.
            return Response(data)

        return Response({
            'results': data,
            'has_more': has_more,
            'next_before_id': rows[0]['id'] if (rows and has_more) else None,
        })

    @action(
        detail=False,
        methods=['get'],
        url_path='conversation/(?P<user_id>[^/.]+)/first-unread',
    )
    def first_unread(self, request, user_id=None):
        """
        GET /api/chat/messages/conversation/<user_id>/first-unread/

        "O'qilmagan xabarlar" ajratkichi va unga sakrash uchun anchor.
        """
        other_user = get_object_or_404(User, id=user_id)
        first = (
            DirectMessage.objects
            .filter(recipient=request.user, sender=other_user, is_read=False)
            .order_by('id')
            .values('id')
            .first()
        )
        total = DirectMessage.objects.filter(
            recipient=request.user, sender=other_user, is_read=False, is_deleted=False
        ).count()
        return Response({
            'first_unread_id': first['id'] if first else None,
            'unread_count': total,
        })

    # ------------------------------------------------------------ o'qilganlik

    @action(detail=False, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request):
        """POST /api/chat/messages/mark-as-read/ — tanada `user_id`."""
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'detail': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._do_mark_read(request, user_id, request.data.get('last_message_id'))

    @action(detail=False, methods=['post'], url_path='(?P<user_id>[^/.]+)/mark_read')
    def mark_read_for_user(self, request, user_id=None):
        """POST /api/chat/messages/<user_id>/mark_read/ — frontend ishlatadi."""
        return self._do_mark_read(request, user_id, request.data.get('last_message_id'))

    def _do_mark_read(self, request, other_user_id, last_message_id=None) -> Response:
        ids = services.mark_conversation_read(
            reader=request.user,
            other_user_id=other_user_id,
            up_to_id=_parse_int(last_message_id),
        )
        services.broadcast_messages_read(
            reader_id=request.user.id,
            sender_id=other_user_id,
            message_ids=ids,
            last_message_id=_parse_int(last_message_id),
        )
        return Response({'status': 'messages marked as read', 'message_ids': ids})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """GET /api/chat/messages/unread-count/"""
        count = DirectMessage.objects.filter(
            recipient=request.user, is_read=False, is_deleted=False
        ).count()
        return Response({'unread_count': count})

    # ------------------------------------------------------- tahrir/o'chirish

    @action(
        detail=True,
        methods=['post'],
        url_path='edit',
        permission_classes=[IsAuthenticated, IsMessageSender],
    )
    def edit_message(self, request, pk=None):
        """
        POST /api/chat/messages/<id>/edit/

        Faqat jo'natuvchi. `is_edited` va `edited_at` qo'yiladi.
        """
        message = get_object_or_404(services.message_queryset(), pk=pk)
        self.check_object_permissions(request, message)

        if message.is_deleted:
            return Response(
                {'detail': "O'chirilgan xabarni tahrirlab bo'lmaydi"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DirectMessageEditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message.content = serializer.validated_data['content']
        message.is_edited = True
        message.edited_at = timezone.now()
        message.save(update_fields=['content', 'is_edited', 'edited_at', 'updated_at'])

        message = services.message_queryset().get(pk=message.pk)
        services.broadcast_message_edited(message, request)
        return Response(DirectMessageSerializer(message, context={'request': request}).data)

    @action(
        detail=True,
        methods=['delete', 'post'],
        url_path='delete',
        permission_classes=[IsAuthenticated, IsMessageSender],
    )
    def delete_message(self, request, pk=None):
        """
        DELETE /api/chat/messages/<id>/delete/

        Yumshoq o'chirish — satr qoladi, "Xabar o'chirildi" placeholder
        ko'rsatiladi va o'qilganlik holati buzilmaydi.
        """
        message = get_object_or_404(services.message_queryset(), pk=pk)
        self.check_object_permissions(request, message)

        if not message.is_deleted:
            message.soft_delete()

        message = services.message_queryset().get(pk=message.pk)
        services.broadcast_message_deleted(message, request)
        return Response(
            {
                'status': 'message deleted',
                'message': DirectMessageSerializer(message, context={'request': request}).data,
            },
            status=status.HTTP_200_OK,
        )


class ChatAttachmentUploadView(APIView):
    """
    POST /api/chat/attachments/

    Faylni xabardan ALOHIDA yuklaydi va id qaytaradi. Composer shu bilan
    yuklash progressini ko'rsatadi va xabarni darhol (matn bilan) yuboradi,
    bitta katta so'rovni kutib turmaydi.

    Tana (multipart): `file`, ixtiyoriy `kind` (VOICE), `width`, `height`,
    `duration_ms`.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get('file') or request.FILES.get('attachment')
        if not upload:
            return Response({'detail': 'file talab qilinadi'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            _validate_upload(upload)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        requested_kind = (request.data.get('kind') or '').upper()
        is_voice = requested_kind == DirectMessage.ATTACHMENT_VOICE
        kind = DirectMessageAttachment.kind_from_mime(
            getattr(upload, 'content_type', ''), is_voice=is_voice
        )

        attachment = DirectMessageAttachment.objects.create(
            uploaded_by=request.user,
            file=upload,
            original_name=(getattr(upload, 'name', '') or '')[:255],
            mime_type=(getattr(upload, 'content_type', '') or '')[:120],
            kind=kind,
            size=upload.size or 0,
            width=_parse_int(request.data.get('width')),
            height=_parse_int(request.data.get('height')),
            duration_ms=_parse_int(request.data.get('duration_ms')),
        )

        return Response(
            DirectMessageAttachmentSerializer(attachment, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class ChatSearchView(APIView):
    """
    GET /api/chat/search/?q=<matn>[&user_id=<suhbatdosh>][&limit=]

    Xabar matni bo'yicha qidiruv. `user_id` berilsa faqat shu suhbat ichida.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = (request.query_params.get('q') or '').strip()
        if len(query) < 2:
            return Response({'results': [], 'count': 0})

        limit = _parse_int(request.query_params.get('limit'), 30) or 30
        limit = max(1, min(limit, 100))

        qs = services.message_queryset().filter(
            Q(sender=request.user) | Q(recipient=request.user),
            content__icontains=query,
            is_deleted=False,
        )

        user_id = request.query_params.get('user_id')
        if user_id:
            other_user = get_object_or_404(User, id=user_id)
            qs = qs.filter(services.pair_filter(request.user, other_user))

        rows = list(qs.order_by('-id')[:limit])
        data = DirectMessageSerializer(rows, many=True, context={'request': request}).data

        # Har bir natija qaysi suhbatga tegishli — sidebar'da ochish uchun.
        for item, row in zip(data, rows):
            item['peer_id'] = str(
                row.recipient_id if row.sender_id == request.user.id else row.sender_id
            )

        return Response({'results': data, 'count': len(data)})
