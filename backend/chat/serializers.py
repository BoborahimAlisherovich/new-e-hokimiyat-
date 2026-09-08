"""
Chat serializerlari.

Muhim: DirectMessageSerializer da `content` READ-ONLY. Ilgari u yozuvchi
maydon edi va ModelViewSet ning standart PATCH/PUT route'lari orqali
QABUL QILUVCHI ham jo'natuvchining xabarini qayta yozishi mumkin edi.
Tahrirlash faqat `POST /api/chat/messages/<id>/edit/` orqali, faqat
jo'natuvchi uchun ishlaydi.
"""

import os

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Q

from .models import DirectMessage, DirectMessageAttachment, ChatConversation

User = get_user_model()


def _absolute(url: str, request) -> str:
    if not url:
        return url
    if request:
        absolute = request.build_absolute_uri(url)
        if absolute.startswith('http://') and request.is_secure():
            return absolute.replace('http://', 'https://', 1)
        return absolute
    return url


class UserBriefSerializer(serializers.ModelSerializer):
    """Chat uchun qisqa foydalanuvchi ma'lumoti (presence bilan)."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    avatar_url = serializers.SerializerMethodField()
    is_online = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'position', 'avatar_url', 'is_online', 'last_seen',
        ]

    def get_avatar_url(self, obj):
        avatar = getattr(obj, 'avatar', None)
        if not avatar:
            return None
        try:
            return _absolute(avatar.url, self.context.get('request'))
        except Exception:
            return None


class DirectMessageAttachmentSerializer(serializers.ModelSerializer):
    """Bitta fayl — turi, hajmi, o'lchami va davomiyligi bilan."""
    url = serializers.SerializerMethodField()

    class Meta:
        model = DirectMessageAttachment
        fields = [
            'id', 'url', 'original_name', 'mime_type', 'kind',
            'size', 'width', 'height', 'duration_ms', 'created_at',
        ]
        read_only_fields = fields

    def get_url(self, obj):
        if not obj.file:
            return None
        try:
            return _absolute(obj.file.url, self.context.get('request'))
        except Exception:
            return None


class ReplyPreviewSerializer(serializers.ModelSerializer):
    """Javob (quote) bloki uchun minimal ma'lumot."""
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    preview = serializers.SerializerMethodField()
    kind = serializers.SerializerMethodField()

    class Meta:
        model = DirectMessage
        fields = ['id', 'sender_name', 'preview', 'kind', 'is_deleted']
        read_only_fields = fields

    def get_preview(self, obj):
        if obj.is_deleted:
            return ''
        text = (obj.content or '').strip()
        return text[:120]

    def get_kind(self, obj):
        first = obj.attachments.all()[:1]
        if first:
            return first[0].kind
        if obj.attachment:
            return DirectMessage.ATTACHMENT_FILE
        return 'TEXT'


class DirectMessageSerializer(serializers.ModelSerializer):
    """To'liq xabar. Barcha maydonlar read-only."""
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    sender = UserBriefSerializer(read_only=True)
    recipient = UserBriefSerializer(read_only=True)
    attachment = serializers.SerializerMethodField()
    attachments = DirectMessageAttachmentSerializer(many=True, read_only=True)
    reply_to = ReplyPreviewSerializer(read_only=True)

    class Meta:
        model = DirectMessage
        fields = [
            'id', 'client_id', 'sender', 'sender_name', 'recipient', 'recipient_name',
            'content', 'attachment', 'attachments', 'reply_to',
            'created_at', 'updated_at',
            'is_read', 'read_at', 'delivered_at',
            'is_edited', 'edited_at',
            'is_deleted', 'deleted_at',
        ]
        # `content` ataylab read-only — B20.
        read_only_fields = fields

    def get_attachment(self, obj):
        """Orqaga moslik: eski bitta fayl maydonining to'liq URL'i."""
        if obj.attachment:
            try:
                return _absolute(obj.attachment.url, self.context.get('request'))
            except Exception:
                return None
        return None


class DirectMessageEditSerializer(serializers.Serializer):
    """POST /api/chat/messages/<id>/edit/ tanasi."""
    content = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=8000)


class DirectMessageCreateSerializer(serializers.ModelSerializer):
    """Orqaga moslik uchun saqlangan (create yo'lida ishlatilmaydi)."""

    class Meta:
        model = DirectMessage
        fields = ['content', 'attachment']


class ChatConversationSerializer(serializers.ModelSerializer):
    """Suhbat kartasi — sidebar shu ma'lumot bilan yashaydi."""
    participant1 = UserBriefSerializer(read_only=True)
    participant2 = UserBriefSerializer(read_only=True)
    last_message = DirectMessageSerializer(read_only=True)
    other_participant = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = [
            'id', 'participant1', 'participant2', 'other_participant',
            'created_at', 'updated_at', 'last_message', 'unread_count'
        ]

    def get_other_participant(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other = obj.get_other_participant(request.user)
            return UserBriefSerializer(other, context=self.context).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not (request and request.user):
            return 0
        # View `unread_map` ni oldindan hisoblab bersa — qo'shimcha so'rov yo'q.
        unread_map = self.context.get('unread_map')
        if unread_map is not None:
            other = obj.get_other_participant(request.user)
            return unread_map.get(other.id, 0)
        return DirectMessage.objects.filter(
            Q(sender=obj.participant1, recipient=obj.participant2) |
            Q(sender=obj.participant2, recipient=obj.participant1),
            recipient=request.user,
            is_read=False,
            is_deleted=False,
        ).count()
