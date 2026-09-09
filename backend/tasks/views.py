"""
Task views for E-Hokimiyat API.

Bu modul topshiriqlar (tasks) bilan ishlash uchun API endpointlarni
o'z ichiga oladi.

Endpointlar:
    - GET/POST /api/tasks/ - Topshiriqlar ro'yxati va yaratish
    - GET/PUT/DELETE /api/tasks/{id}/ - Topshiriq detallari
    - POST /api/tasks/{id}/accept/ - Topshiriqni qabul qilish
    - POST /api/tasks/{id}/report/ - Hisobot topshirish
    - POST /api/tasks/{id}/close/ - Topshiriqni yopish
    - POST /api/tasks/{id}/reassign/ - Qayta ijroga yuborish
    - GET/POST /api/tasks/{id}/timeline/ - Timeline xabarlari
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Type

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from datetime import timedelta
from django.db import transaction
from django.db.models import Case, Count, IntegerField, Prefetch, Q, Value, When
from django.db.models.query import QuerySet
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import Serializer

from audit.models import AuditLog
from core.constants import FileType, Messages, TaskStatus, UserRole
from core.file_validators import resolve_file_type, validate_uploads
from core.permissions import CanCloseTask, CanCreateTasks, CanExecuteTasks
from core.ai_service import AIService
from notifications.services import create_notification, notify_task_chat_message

from .models import (
    DeadlineExtensionRequest,
    Task,
    TaskAttachment,
    TaskExecution,
    TaskMessage,
    TaskOrganization,
)
from .serializers import (
    DeadlineExtensionRequestSerializer,
    ExtensionRequestCreateSerializer,
    ExtensionReviewSerializer,
    TaskAcceptSerializer,
    TaskAttachmentSerializer,
    TaskCreateSerializer,
    TaskDetailSerializer,
    TaskMessageSerializer,
    TaskMinimalSerializer,
    TaskOrganizationSerializer,
    TaskReportSerializer,
    TaskSerializer,
    TaskTimelineSerializer,
)

if TYPE_CHECKING:
    from django.core.files.uploadedfile import UploadedFile

logger = logging.getLogger(__name__)

# Topshiriq tahrirlashga ruxsati bo'lgan rollar
TASK_EDITOR_ROLES = ('HOKIM', 'HOKIM_YORDAMCHISI', 'ADMIN')

# Yopilgan topshiriqlar - ular ustida hech qanday o'zgartirish qilinmaydi
LOCKED_TASK_STATUSES = ('NAZORATDAN_YECHILDI', 'BAJARILMADI')

# Tahrirlanishi kuzatiladigan maydonlar
TRACKED_TASK_FIELDS = (
    'title', 'description', 'priority', 'deadline',
    'category', 'sector', 'address', 'latitude', 'longitude',
)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _guess_message_type(file_obj: 'UploadedFile') -> str:
    """Fayl turidan xabar turini aniqlash.
    
    Args:
        file_obj: Django yuklangan fayl obyekti
        
    Returns:
        Xabar turi (AUDIO, FILE)
    """
    content_type = getattr(file_obj, 'content_type', '') or ''
    name = getattr(file_obj, 'name', '') or ''
    
    if content_type.startswith('audio/') or name.lower().endswith(FileType.AUDIO_EXTENSIONS):
        return 'AUDIO'
    return 'FILE'


def _guess_attachment_type(file_obj: 'UploadedFile') -> str:
    """Fayl turidan attachment turini aniqlash.
    
    Args:
        file_obj: Django yuklangan fayl obyekti
        
    Returns:
        Attachment turi (IMAGE, VIDEO, AUDIO, DOCUMENT, OTHER)
    """
    content_type = getattr(file_obj, 'content_type', '') or ''
    name = getattr(file_obj, 'name', '') or ''
    
    return FileType.get_type_from_content_type(content_type, name)


def _normalize_match_text(value: str) -> str:
    return re.sub(r'\s+', ' ', (value or '').strip().lower())


def _match_organizations_from_text(text: str, organizations: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    normalized = _normalize_match_text(text)
    if not normalized:
        return []

    query_tokens = [token for token in re.split(r'[^a-z0-9а-яёўқғҳ]+', normalized) if len(token) >= 3]
    results: List[Dict[str, str]] = []

    for org in organizations:
        org_name = str(org.get('name') or '')
        org_short_name = str(org.get('short_name') or '')
        name_norm = _normalize_match_text(org_name)
        short_norm = _normalize_match_text(org_short_name)

        if (name_norm and name_norm in normalized) or (short_norm and short_norm in normalized):
            results.append({'id': str(org['id']), 'name': org_name})
            continue

        org_tokens = [
            token
            for token in re.split(r'[^a-z0-9а-яёўқғҳ]+', f'{name_norm} {short_norm}')
            if len(token) >= 3
        ]
        if not org_tokens or not query_tokens:
            continue

        hits = 0
        for query_token in query_tokens:
            if any(
                query_token in org_token
                or org_token in query_token
                or query_token.startswith(org_token[: max(3, min(len(org_token), len(query_token)))])
                for org_token in org_tokens
            ):
                hits += 1

        threshold = 1 if len(org_tokens) <= 3 else 2
        if hits >= threshold:
            results.append({'id': str(org['id']), 'name': org_name})

    unique: Dict[str, Dict[str, str]] = {}
    for item in results:
        unique[item['id']] = item
    return list(unique.values())


class TaskViewSet(viewsets.ModelViewSet):
    """Topshiriqlar bilan ishlash uchun ViewSet.
    
    Bu ViewSet quyidagi amallarni qo'llab-quvvatlaydi:
        - list: Topshiriqlar ro'yxatini olish
        - create: Yangi topshiriq yaratish
        - retrieve: Topshiriq tafsilotlarini olish
        - update/partial_update: Topshiriqni yangilash
        - destroy: Topshiriqni o'chirish
        
    Qo'shimcha action'lar:
        - accept: Topshiriqni qabul qilish
        - report: Hisobot topshirish
        - close: Topshiriqni yopish
        - reassign: Qayta ijroga yuborish
        - timeline: Xabarlar va amallar tarixi
        - extend_request: Muddat uzaytirish so'rovi
    
    Attributes:
        queryset: Barcha topshiriqlar
        permission_classes: Faqat autentifikatsiya qilingan foydalanuvchilar
        parser_classes: JSON, multipart va form data qabul qilish
    """
    
    queryset = Task.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    # `status` filtering is handled in `get_queryset` because organization users
    # need filtering by TaskOrganization.status and overdue must work without Celery.
    filterset_fields = ['priority', 'category', 'sector']
    search_fields = ['title', 'description']
    ordering_fields = ['deadline', 'created_at', 'priority', 'status']
    ordering = ['status', 'deadline', '-created_at']

    @action(detail=False, methods=['get'])
    def stats(self, request: Request) -> Response:
        """Topshiriqlar statistikasi (filtrlar bilan).

        Barcha sanoqlar BITTA `aggregate()` so'rovida hisoblanadi.

        Maydonlar:
            total             - jami topshiriqlar
            pending           - yangi (muddati o'tmagan)
            in_progress       - ijroda / tekshiruvda (muddati o'tmagan)
            completed         - YOPILGAN (NAZORATDAN_YECHILDI) topshiriqlar
            awaiting_approval - hisobot topshirilgan, lekin hokim tasdiqlamagan
                                (kamida bitta tashkilot BAJARILDI holatida)
            returned          - qayta ijroga yuborilgan
                                (kamida bitta tashkilot QAYTA_IJROGA_YUBORILDI)
            overdue           - muddati o'tgan
            active_sectors    - topshiriqlarda ishlatilgan sohalar soni
        """
        user = request.user
        queryset = self.filter_queryset(self.get_queryset())
        now = timezone.now()

        overdue_statuses = ['YANGI', 'IJRODA', 'QAYTA_IJROGA_YUBORILDI', 'TEKSHIRUVDA']

        if user.role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'] and user.organization:
            # Tashkilot xodimlari uchun TaskOrganization statusini hisoblash.
            task_orgs = TaskOrganization.objects.filter(
                task__in=queryset.values('id'),
                organization=user.organization,
            )
            counts = task_orgs.aggregate(
                total=Count('id'),
                overdue=Count('id', filter=Q(
                    status__in=overdue_statuses + ['MUDDATI_KECH'],
                    task__deadline__lt=now,
                )),
                pending=Count('id', filter=Q(status='YANGI', task__deadline__gte=now)),
                in_progress=Count('id', filter=Q(
                    status__in=['IJRODA', 'TEKSHIRUVDA'],
                    task__deadline__gte=now,
                )),
                completed=Count('id', filter=Q(status='NAZORATDAN_YECHILDI')),
                awaiting_approval=Count('id', filter=Q(status='BAJARILDI')),
                returned=Count('id', filter=Q(status='QAYTA_IJROGA_YUBORILDI')),
            )
        else:
            # Admin/yaratuvchi rollar: Task.status + TaskOrganization bo'yicha
            # kutilayotgan/qaytarilgan topshiriqlar. `assigned_organizations`
            # bo'yicha JOIN qatorlarni ko'paytirgani uchun barcha sanoqlar
            # `distinct=True` bilan olinadi.
            counts = queryset.aggregate(
                total=Count('id', distinct=True),
                overdue=Count('id', distinct=True, filter=(
                    Q(status='MUDDATI_KECH') |
                    Q(status__in=overdue_statuses, deadline__lt=now)
                )),
                pending=Count('id', distinct=True, filter=Q(status='YANGI', deadline__gte=now)),
                in_progress=Count('id', distinct=True, filter=Q(
                    status__in=['IJRODA', 'TEKSHIRUVDA'],
                    deadline__gte=now,
                )),
                completed=Count('id', distinct=True, filter=Q(status='NAZORATDAN_YECHILDI')),
                awaiting_approval=Count('id', distinct=True, filter=Q(
                    assigned_organizations__status='BAJARILDI'
                )),
                returned=Count('id', distinct=True, filter=Q(
                    assigned_organizations__status='QAYTA_IJROGA_YUBORILDI'
                )),
            )

        active_sectors = (
            queryset.filter(sector__isnull=False)
            .values('sector')
            .distinct()
            .count()
        )

        return Response({
            'total': int(counts.get('total') or 0),
            'pending': int(counts.get('pending') or 0),
            'in_progress': int(counts.get('in_progress') or 0),
            'completed': int(counts.get('completed') or 0),
            'awaiting_approval': int(counts.get('awaiting_approval') or 0),
            'returned': int(counts.get('returned') or 0),
            'overdue': int(counts.get('overdue') or 0),
            'active_sectors': active_sectors,
        })

    def _apply_status_filter(self, queryset: QuerySet[Task], *, user, status_value: str) -> QuerySet[Task]:
        """Filter by an 'effective' status (per-organization + overdue by deadline)."""
        if not status_value:
            return queryset

        now = timezone.now()
        seven_days_ago = now - timedelta(days=7)
        active_statuses = [
            TaskStatus.YANGI,
            TaskStatus.IJRODA,
            TaskStatus.TEKSHIRUVDA,
            TaskStatus.QAYTA_IJROGA_YUBORILDI,
        ]

        if user.role in UserRole.ORGANIZATION_ROLES and user.organization:
            queryset = queryset.filter(assigned_organizations__organization=user.organization)

            if status_value == TaskStatus.MUDDATI_KECH:
                return queryset.filter(
                    Q(assigned_organizations__status=TaskStatus.MUDDATI_KECH) |
                    Q(
                        assigned_organizations__status__in=[
                            TaskStatus.YANGI,
                            TaskStatus.IJRODA,
                            TaskStatus.QAYTA_IJROGA_YUBORILDI,
                            TaskStatus.TEKSHIRUVDA,
                        ],
                        deadline__lt=now,
                    )
                ).distinct()

            if status_value == TaskStatus.BAJARILMADI:
                return queryset.filter(
                    Q(assigned_organizations__status=TaskStatus.BAJARILMADI) |
                    Q(assigned_organizations__status=TaskStatus.MUDDATI_KECH, deadline__lt=seven_days_ago)
                ).distinct()

            if status_value in active_statuses:
                return queryset.filter(
                    assigned_organizations__status=status_value,
                    deadline__gte=now,
                ).distinct()

            return queryset.filter(assigned_organizations__status=status_value).distinct()

        # Admin/creator: Task.status + overdue computation
        if status_value == TaskStatus.MUDDATI_KECH:
            return queryset.filter(
                Q(status=TaskStatus.MUDDATI_KECH) |
                Q(
                    status__in=[
                        TaskStatus.YANGI,
                        TaskStatus.IJRODA,
                        TaskStatus.QAYTA_IJROGA_YUBORILDI,
                        TaskStatus.TEKSHIRUVDA,
                    ],
                    deadline__lt=now,
                )
            )

        if status_value == TaskStatus.BAJARILMADI:
            return queryset.filter(
                Q(status=TaskStatus.BAJARILMADI) |
                Q(status=TaskStatus.MUDDATI_KECH, deadline__lt=seven_days_ago)
            )

        if status_value in active_statuses:
            return queryset.filter(status=status_value, deadline__gte=now)

        return queryset.filter(status=status_value)
    
    def get_serializer_class(self) -> Type[Serializer]:
        """So'rov turiga qarab serializer tanlash.
        
        Returns:
            Tegishli Serializer class
        """
        serializer_map = {
            'create': TaskCreateSerializer,
            'retrieve': TaskDetailSerializer,
            'list': TaskMinimalSerializer,
        }
        return serializer_map.get(self.action, TaskSerializer)
    
    def get_permissions(self) -> List:
        """Action turiga qarab permission'larni tanlash.
        
        Returns:
            Permission class'lar ro'yxati
        """
        if self.action == 'create':
            return [IsAuthenticated(), CanCreateTasks()]
        # Topshiriqni tahrirlash faqat yaratuvchilar uchun
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanCreateTasks()]
        return [IsAuthenticated()]
    
    @staticmethod
    def _field_snapshot(task: Task) -> Dict[str, Any]:
        """Kuzatiladigan maydonlarning hozirgi qiymatlarini olish."""
        snapshot: Dict[str, Any] = {}
        for field in TRACKED_TASK_FIELDS:
            if field == 'sector':
                snapshot[field] = str(task.sector_id) if task.sector_id else None
            else:
                value = getattr(task, field, None)
                snapshot[field] = None if value is None else str(value)
        return snapshot

    def _guard_task_edit(self, request: Request) -> Optional[Response]:
        """Tahrirlash huquqi va topshiriq holatini tekshirish.

        Returns:
            Xatolik `Response` obyekti yoki `None` (ruxsat berilgan).
        """
        user = request.user
        if user.role not in TASK_EDITOR_ROLES:
            return Response(
                {'detail': "Topshiriqni tahrirlash huquqingiz yo'q"},
                status=status.HTTP_403_FORBIDDEN
            )

        task = self.get_object()
        if task.status in LOCKED_TASK_STATUSES:
            return Response(
                {'detail': (
                    "Yopilgan topshiriqni tahrirlash mumkin emas "
                    f"(holat: {task.get_status_display()})"
                )},
                status=status.HTTP_400_BAD_REQUEST
            )
        return None

    def _log_task_edit(self, request: Request, before: Dict[str, Any]) -> None:
        """Maydon darajasidagi o'zgarishlarni ijro jurnaliga yozish."""
        task = Task.objects.select_related('sector').get(pk=self.kwargs.get('pk') or self.kwargs.get('id'))
        after = self._field_snapshot(task)

        changed = {
            field: {'old': before.get(field), 'new': after.get(field)}
            for field in TRACKED_TASK_FIELDS
            if before.get(field) != after.get(field)
        }
        if not changed:
            return

        readable = ', '.join(
            f"{field}: «{values['old'] or '-'}» -> «{values['new'] or '-'}»"
            for field, values in changed.items()
        )

        TaskExecution.objects.create(
            task=task,
            executed_by=request.user,
            action_type='TAHRIRLANDI',
            comment=f"{request.user.full_name} topshiriqni tahrirladi. {readable}",
            old_status=task.status,
            new_status=task.status,
        )

        AuditLog.log(
            user=request.user,
            action='TASK_UPDATED',
            entity_type='TASK',
            entity_id=task.id,
            description=f"{request.user.full_name} topshiriqni tahrirladi: {task.title}",
            old_values={field: values['old'] for field, values in changed.items()},
            new_values={field: values['new'] for field, values in changed.items()},
            ip_address=getattr(request, 'client_ip', None)
        )

    def update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Topshiriqni yangilash.
        
        Faqat HOKIM, HOKIM_YORDAMCHISI va ADMIN tahrirlashi mumkin.
        Yopilgan (NAZORATDAN_YECHILDI / BAJARILMADI) topshiriqlar tahrirlanmaydi.
        """
        denied = self._guard_task_edit(request)
        if denied is not None:
            return denied

        before = self._field_snapshot(self.get_object())
        response = super().update(request, *args, **kwargs)
        if response.status_code < 400:
            self._log_task_edit(request, before)
        return response
    
    def partial_update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Topshiriqni qisman yangilash.
        
        Faqat HOKIM, HOKIM_YORDAMCHISI va ADMIN tahrirlashi mumkin.
        Yopilgan (NAZORATDAN_YECHILDI / BAJARILMADI) topshiriqlar tahrirlanmaydi.
        """
        denied = self._guard_task_edit(request)
        if denied is not None:
            return denied

        before = self._field_snapshot(self.get_object())
        response = super().partial_update(request, *args, **kwargs)
        if response.status_code < 400:
            self._log_task_edit(request, before)
        return response
    
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Topshiriqni o'chirish.
        
        Faqat HOKIM va ADMIN o'chirishi mumkin.
        """
        user = request.user
        if user.role not in ['HOKIM', 'ADMIN']:
            return Response(
                {'detail': "Topshiriqni o'chirish huquqingiz yo'q"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Topshiriqni ko'rish.

        MUHIM: GET so'rovi HECH QANDAY holatni o'zgartirmaydi.
        Ilgari bu metod tashkilot foydalanuvchisi topshiriqni ochganda
        `TaskOrganization.status` ni `TEKSHIRUVDA` ga o'tkazardi. Bu
        `accept` va `report` endpointlarini butunlay ishlamas holga
        keltirgani uchun olib tashlandi.
        """
        task = self.get_object()

        task = Task.objects.select_related('created_by', 'closed_by', 'sector').prefetch_related(
            Prefetch(
                'assigned_organizations',
                queryset=TaskOrganization.objects.select_related('organization', 'assigned_to'),
            ),
            'assigned_deputies',
        ).get(pk=task.pk)

        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='ai-analyze')
    def ai_analyze(self, request: Request) -> Response:
        """Audio yoki matn asosida topshiriq maydonlarini AI bilan to'ldirish.
        
        Audio yuborilsa — avval Whisper bilan transkripsiya, keyin AI tahlil va tahrirlash.
        Matn yuborilsa — to'g'ridan-to'g'ri AI tahlil.
        
        AI imloviy xatolarni tuzatadi, tegishli tashkilotlarni tanlaydi,
        va takrorlanuvchi topshiriq ekanligini aniqlaydi.
        
        Returns:
            AI tomonidan tavsiya qilingan topshiriq maydonlari
        """
        import json
        
        ai_service = AIService()
        text = request.data.get('text', '')
        audio_file = request.FILES.get('audio')
        
        if not text and not audio_file:
            return Response(
                {'error': 'Matn yoki audio fayl kerak'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        raw_transcription = ''
        
        # Audio bo'lsa — Whisper bilan transkripsiya
        if audio_file:
            raw_transcription = ai_service.transcribe_audio(audio_file)
            if raw_transcription.startswith('Xatolik:'):
                return Response({'error': raw_transcription}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            text = raw_transcription
        
        # Tashkilotlar ro'yxatini olish
        from organizations.models import Organization, Sector
        orgs = list(Organization.objects.filter(is_active=True).values('id', 'name', 'short_name', 'sector__name'))
        sectors = list(Sector.objects.filter(is_active=True).values_list('name', flat=True))
        
        org_list = "\n".join([
            f"- {o['name']}{f' / {o['short_name']}' if o.get('short_name') else ''} "
            f"(ID: {o['id']}, Soha: {o['sector__name'] or 'Nomalum'})"
            for o in orgs
        ])
        
        prompt = f"""Sen E-Hokimiyat tizimining professional AI yordamchisisan. 
Quyidagi matn audio yozuvdan olingan bo'lishi mumkin. Unda imloviy, grammatik xatolar bo'lishi tabiiy.
Sening vazifang:
1. Matnni diqqat bilan o'qib, imloviy va grammatik xatolarni tuzatish
2. Mazmunni tushunib, rasmiy topshiriq sifatida qayta yozish
3. Tegishli tashkilotlarni aniqlash
4. Agar topshiriq takrorlanuvchi (har kuni, har hafta, har oy va h.k.) bo'lsa — buni aniqlash
5. Agar matnda barcha faol tashkilotlarga yuborish mazmuni bo'lsa, mavjud faol tashkilotlarning barchasini tanlash

KIRITILGAN MATN (audio transkripsiyadan, xatolar bo'lishi mumkin):
\"{text}\"

MAVJUD TASHKILOTLAR:
{org_list}

SOHALAR: {', '.join(sectors)}

MUHIMLIK DARAJALARI:
- FAVQULODDA — Juda shoshilinch va muhim (1 kun muddat)
- YUQORI — Muhim, lekin biroz vaqt bor (3 kun muddat)
- ODDIY — Oddiy topshiriq (5 kun muddat)
- PAST — Muhim emas, shoshilinch emas (7 kun muddat)

KATEGORIYALAR: IJTIMOIY, IQTISODIY, HUQUQIY, INFRASTRUKTURA, TA_LIM, SOG_LIQNI_SAQLASH, BOSHQA

TAKRORLANISH CHASTOTALARI: DAILY (har kuni), WEEKLY (har hafta), BIWEEKLY (ikki haftada bir), MONTHLY (har oy), QUARTERLY (har chorakda), YEARLY (har yili)

Quyidagi JSON formatida javob ber (FAQAT JSON, boshqa hech narsa emas):
{{
    "title": "Qisqa va aniq topshiriq sarlavhasi (max 100 belgi, adabiy o'zbek tilida)",
    "description": "To'liq, rasmiy uslubda yozilgan topshiriq tavsifi. Barcha imloviy xatolar tuzatilgan, mazmun saqlanagan.",
    "priority": "ODDIY yoki YUQORI yoki FAVQULODDA yoki PAST",
    "category": "Tegishli kategoriya",
    "organization_ids": ["tegishli tashkilot UUID lari"],
    "organization_names": ["tegishli tashkilot nomlari"],
    "is_recurring": false,
    "frequency": null,
    "deadline_days": 5
}}

QOIDALAR:
1. Imloviy xatolarni ALBATTA tuzat — audio transkripsiyada ko'p xato bo'ladi
2. Mazmunni saqla, lekin rasmiy-ish uslubida qayta yoz
3. Matnda "har kuni", "har hafta", "har oy", "muntazam", "doimiy", "takroriy", "har doim" kabi so'zlar bo'lsa — is_recurring=true qil va tegishli frequency ni belgilasin
4. Agar takrorlanuvchi bo'lsa, deadline_days ni chastotaga mos ravishda belgilasin (DAILY=1, WEEKLY=5, MONTHLY=7, va h.k.)
5. Agar takrorlanuvchi bo'lmasa, is_recurring=false, frequency=null
6. Tegishli tashkilotlar ro'yxatidan ENG MOS tashkilotlarni tanla
7. priority ni mazmun va shoshilinchlikdan kelib chiqib belgilasin
8. title 100 belgidan oshmasin, aniq va tushunarli bo'lsin"""

        fallback_suggestions = {
            'title': text[:100] if text else '',
            'description': text or '',
            'priority': 'ODDIY',
            'category': 'BOSHQA',
            'organization_ids': [],
            'organization_names': [],
            'is_recurring': False,
            'frequency': None,
            'deadline_days': 5
        }

        try:
            client = ai_service.get_client()
            if not client:
                return Response({'error': 'AI xizmat sozlanmagan'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            if ai_service.provider == 'openai':
                response = client.chat.completions.create(
                    model=ai_service.model,
                    messages=[
                        {"role": "system", "content": "Sen O'zbekiston hokimiyati uchun ishlayotgan professional AI yordamchisan. Javoblaringni faqat JSON formatida ber."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2,
                    response_format={"type": "json_object"}
                )
                result_text = response.choices[0].message.content
            else:
                response = client.messages.create(
                    model=ai_service.model,
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )
                result_text = response.content[0].text
            
            # Parse JSON from response
            result = json.loads(result_text)
            
            # Validate and sanitize the result
            suggestions = {
                'title': str(result.get('title', ''))[:500] or fallback_suggestions['title'],
                'description': str(result.get('description', '')) or fallback_suggestions['description'],
                'priority': result.get('priority', 'ODDIY') if result.get('priority') in ('FAVQULODDA', 'YUQORI', 'ODDIY', 'PAST') else 'ODDIY',
                'category': result.get('category', 'BOSHQA') if result.get('category') in ('IJTIMOIY', 'IQTISODIY', 'HUQUQIY', 'INFRASTRUKTURA', 'TA_LIM', 'SOG_LIQNI_SAQLASH', 'BOSHQA') else 'BOSHQA',
                'organization_ids': result.get('organization_ids', []) or [],
                'organization_names': result.get('organization_names', []) or [],
                'is_recurring': bool(result.get('is_recurring', False)),
                'frequency': result.get('frequency') if result.get('frequency') in ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY') else None,
                'deadline_days': int(result.get('deadline_days', 5)) if result.get('deadline_days') else 5,
            }
            
            # Validate organization IDs exist
            if suggestions['organization_ids']:
                valid_org_ids = set(str(o['id']) for o in orgs)
                suggestions['organization_ids'] = [
                    oid for oid in suggestions['organization_ids'] 
                    if str(oid) in valid_org_ids
                ]

            if not suggestions['organization_ids'] and suggestions['organization_names']:
                matched_orgs: List[Dict[str, str]] = []
                for org_name in suggestions['organization_names'][:20]:
                    matched_orgs.extend(_match_organizations_from_text(str(org_name), orgs))
                if matched_orgs:
                    deduped = {item['id']: item for item in matched_orgs}
                    suggestions['organization_ids'] = list(deduped.keys())
                    suggestions['organization_names'] = [item['name'] for item in deduped.values()]

            if not suggestions['organization_ids']:
                inferred_orgs = _match_organizations_from_text(
                    f"{suggestions['title']} {suggestions['description']}",
                    orgs,
                )
                if inferred_orgs:
                    suggestions['organization_ids'] = [item['id'] for item in inferred_orgs]
                    suggestions['organization_names'] = [item['name'] for item in inferred_orgs]
            
            return Response({
                'transcription': text,
                'raw_transcription': raw_transcription or text,
                'suggestions': suggestions
            })
        except json.JSONDecodeError:
            return Response({
                'transcription': text,
                'raw_transcription': raw_transcription or text,
                'suggestions': fallback_suggestions
            })
        except Exception as e:
            logger.error(f"AI task analysis error: {e}")
            return Response({
                'transcription': text,
                'raw_transcription': raw_transcription or text,
                'suggestions': fallback_suggestions
            })
    
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Yangi topshiriq yaratish.
        
        Args:
            request: HTTP so'rov
            
        Returns:
            Yaratilgan topshiriq ma'lumotlari
        """
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def get_queryset(self) -> QuerySet[Task]:
        """Foydalanuvchi roliga qarab topshiriqlarni filtrlash.
        
        Bajarilgan topshiriqlar ro'yxat oxirida ko'rsatiladi.
        
        Returns:
            Filtrlangan topshiriqlar queryset'i
        """
        user = self.request.user
        queryset = Task.objects.select_related('created_by', 'closed_by', 'sector').prefetch_related(
            Prefetch(
                'assigned_organizations',
                queryset=TaskOrganization.objects.select_related('organization', 'assigned_to'),
            ),
            'assigned_deputies',
        )
        
        # Faol topshiriqlar birinchi (0), bajarilganlar oxirda (1)
        queryset = queryset.annotate(
            status_order=Case(
                When(status__in=TaskStatus.CLOSED_STATUSES, then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            )
        ).order_by('status_order', 'deadline', '-created_at')
        
        # Role-based scoping
        if user.role in UserRole.ADMIN_ROLES:
            scoped = queryset
        elif user.role == UserRole.HOKIM_YORDAMCHISI:
            scoped = queryset.filter(Q(created_by=user) | Q(assigned_deputies=user)).distinct()
        elif user.role == UserRole.HOKIMLIK_MASUL:
            if user.supervisor_id:
                scoped = queryset.filter(
                    Q(created_by=user.supervisor) | Q(assigned_deputies=user.supervisor)
                ).distinct()
            elif user.sector_id:
                scoped = queryset.filter(
                    Q(created_by__role=UserRole.HOKIM_YORDAMCHISI, created_by__sector_id=user.sector_id)
                    | Q(assigned_deputies__role=UserRole.HOKIM_YORDAMCHISI, assigned_deputies__sector_id=user.sector_id)
                ).distinct()
            else:
                scoped = queryset.none()
        elif user.role in UserRole.ORGANIZATION_ROLES:
            if user.organization:
                scoped = queryset.filter(assigned_organizations__organization=user.organization).distinct()
            else:
                scoped = queryset.none()
        else:
            scoped = queryset.none()

        status_value = (self.request.query_params.get('status') or '').strip()
        if status_value:
            scoped = self._apply_status_filter(scoped, user=user, status_value=status_value)

        organization_id = (self.request.query_params.get('organization') or '').strip()
        if organization_id:
            scoped = scoped.filter(assigned_organizations__organization_id=organization_id).distinct()

        return scoped
    
    def perform_create(self, serializer):
        """Create task and log the action."""
        task = serializer.save()
        
        AuditLog.log(
            user=self.request.user,
            action='TASK_CREATED',
            entity_type='TASK',
            entity_id=task.id,
            description=f"{self.request.user.full_name} yangi topshiriq yaratdi: {task.title}",
            new_values={
                'title': task.title,
                'priority': task.priority,
                'deadline': str(task.deadline),
                'organizations': list(task.assigned_organizations.values_list('organization__name', flat=True)),
                # `full_name` — model xossasi (property), DB maydoni EMAS.
                # `values_list('full_name')` FieldError beradi va topshiriq
                # saqlangandan keyin 500 qaytaradi. Python tomonida yig'amiz.
                'deputies': [d.full_name for d in task.assigned_deputies.all()],
            },
            ip_address=getattr(self.request, 'client_ip', None)
        )

        for deputy in task.assigned_deputies.filter(status='FAOL'):
            create_notification(
                user=deputy,
                title='Yangi topshiriq',
                message=f"Sizga nazorat uchun yangi topshiriq biriktirildi: {task.title}",
                notification_type='TASK',
                related_task=task,
                link=f'/dashboard/tasks/{task.id}'
            )
        
        # Create notifications for assigned organizations
        for task_org in task.assigned_organizations.all():
            for user in task_org.organization.employees.filter(
                status='FAOL',
                role__in=['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']
            ):
                create_notification(
                    user=user,
                    title='Yangi topshiriq',
                    message=f"Sizning tashkilotingizga yangi topshiriq berildi: {task.title}",
                    notification_type='TASK',
                    related_task=task,
                    link=f'/dashboard/tasks/{task.id}'
                )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanExecuteTasks])
    def accept(self, request, pk=None):
        """
        Accept task for execution.
        
        POST /api/tasks/{id}/accept/
        """
        task = self.get_object()
        user = request.user
        
        # Find task organization for user's organization
        try:
            task_org = task.assigned_organizations.get(organization=user.organization)
        except TaskOrganization.DoesNotExist:
            return Response(
                {'detail': "Bu topshiriq sizning tashkilotingizga berilmagan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TEKSHIRUVDA - eski (xato) GET-mutatsiyasi qoldirgan holat.
        # Bunday qatorlar ham ijroga olinishi kerak.
        if task_org.status not in ['YANGI', 'QAYTA_IJROGA_YUBORILDI', 'TEKSHIRUVDA']:
            return Response(
                {'detail': "Bu topshiriqni qabul qilib bo'lmaydi"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TaskAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_status = task_org.status
        task_org.accept(user)
        task.sync_status_from_assignments()
        
        # Create execution record
        TaskExecution.objects.create(
            task=task,
            task_organization=task_org,
            executed_by=user,
            action_type='IJROGA_OLINDI',
            comment=serializer.validated_data.get('comment', ''),
            old_status=old_status,
            new_status=task_org.status
        )
        
        AuditLog.log(
            user=user,
            action='TASK_ACCEPTED',
            entity_type='TASK',
            entity_id=task.id,
            description=f"{user.full_name} topshiriqni qabul qildi: {task.title}",
            old_values={'status': old_status},
            new_values={'status': task_org.status},
            ip_address=getattr(request, 'client_ip', None)
        )
        
        return Response(TaskDetailSerializer(task, context={"request": request}).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanExecuteTasks])
    def report(self, request, pk=None):
        """
        Submit task completion report.
        
        POST /api/tasks/{id}/report/
        """
        task = self.get_object()
        user = request.user
        
        try:
            task_org = task.assigned_organizations.get(organization=user.organization)
        except TaskOrganization.DoesNotExist:
            return Response(
                {'detail': "Bu topshiriq sizning tashkilotingizga berilmagan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TEKSHIRUVDA / YANGI - eski GET-mutatsiyasi va to'g'ridan-to'g'ri
        # hisobot topshirish holatlari uchun ham ruxsat beriladi.
        if task_org.status not in ['YANGI', 'IJRODA', 'TEKSHIRUVDA', 'QAYTA_IJROGA_YUBORILDI', 'MUDDATI_KECH']:
            return Response(
                {'detail': "Bu topshiriq uchun hisobot topshirish mumkin emas"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        files = request.FILES.getlist('attachments')
        try:
            file_types = validate_uploads(files)
        except ValidationError as exc:
            return Response({'attachments': exc.detail}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = TaskReportSerializer(data={'comment': request.data.get('comment', '')})
        serializer.is_valid(raise_exception=True)
        
        old_status = task_org.status
        task_org.complete()
        task.sync_status_from_assignments()
        
        # Create execution record
        execution = TaskExecution.objects.create(
            task=task,
            task_organization=task_org,
            executed_by=user,
            action_type='HISOBOT_TOPSHIRILDI',
            comment=serializer.validated_data['comment'],
            old_status=old_status,
            new_status=task_org.status
        )
        
        # Handle file attachments (turi to'g'ri belgilanadi, aks holda
        # rasmlar DOCUMENT bo'lib qolib, oldindan ko'rinmaydi)
        for f, file_type in zip(files, file_types):
            TaskAttachment.objects.create(
                task=task,
                execution=execution,
                uploaded_by=user,
                file=f,
                file_name=f.name,
                file_size=f.size,
                file_type=file_type,
            )
        
        AuditLog.log(
            user=user,
            action='REPORT_SUBMITTED',
            entity_type='TASK',
            entity_id=task.id,
            description=f"{user.full_name} topshiriq hisobotini topshirdi: {task.title}",
            old_values={'status': old_status},
            new_values={'status': task_org.status},
            ip_address=getattr(request, 'client_ip', None)
        )
        
        # Notify Hokim
        for hokim in task.created_by.organization.employees.filter(role='HOKIM', status='FAOL') if task.created_by.organization else []:
            create_notification(
                user=hokim,
                title='Hisobot topshirildi',
                message=f"{user.organization.name} topshiriq hisobotini topshirdi: {task.title}",
                notification_type='TASK',
                related_task=task,
                link=f'/dashboard/tasks/{task.id}'
            )
        
        return Response(TaskDetailSerializer(task, context={"request": request}).data)
    
    @staticmethod
    def _notify_organization(task: Task, organization, *, title: str, message: str) -> None:
        """Tashkilot xodimlariga bildirishnoma yuborish."""
        if organization is None:
            return
        for member in organization.employees.filter(
            status='FAOL',
            role__in=['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']
        ):
            create_notification(
                user=member,
                title=title,
                message=message,
                notification_type='TASK',
                related_task=task,
                link=f'/dashboard/tasks/{task.id}'
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanCloseTask])
    def close(self, request, pk=None):
        """Topshiriqni nazoratdan yechish (tasdiqlash). Faqat HOKIM.

        POST /api/tasks/{id}/close/
        Body (ixtiyoriy):
            {"organization_id": "<uuid>", "comment": "<ixtiyoriy izoh>"}

        `organization_id` berilsa - faqat shu tashkilotning biriktirilishi
        yopiladi (boshqa tashkilotlar kechikayotgan bo'lsa ham). Ota-topshiriq
        `NAZORATDAN_YECHILDI` ga faqat BARCHA biriktirilishlar yopilganda o'tadi.
        """
        task = self.get_object()
        organization_id = request.data.get('organization_id')
        comment = (request.data.get('comment') or '').strip()

        assignments = list(task.assigned_organizations.select_related('organization').all())
        if not assignments:
            return Response(
                {'detail': "Topshiriqqa hech qanday tashkilot biriktirilmagan"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if organization_id:
            targets = [a for a in assignments if str(a.organization_id) == str(organization_id)]
            if not targets:
                return Response(
                    {'detail': "Tashkilot bu topshiriqqa biriktirilmagan"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if targets[0].status == 'NAZORATDAN_YECHILDI':
                return Response(
                    {'detail': "Bu tashkilotning topshirig'i allaqachon nazoratdan yechilgan"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if targets[0].status != 'BAJARILDI':
                return Response(
                    {'detail': (
                        "Faqat hisobot topshirilgan (bajarilgan) tashkilotni "
                        "nazoratdan yechish mumkin"
                    )},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            blocking = [
                a.organization.name for a in assignments
                if a.status not in ('BAJARILDI', 'NAZORATDAN_YECHILDI')
            ]
            if blocking:
                return Response(
                    {'detail': (
                        "Barcha tashkilotlar topshiriqni bajarmaguncha yopib bo'lmaydi. "
                        f"Kutilayotgan tashkilotlar: {', '.join(sorted(blocking))}. "
                        "Bitta tashkilotni alohida tasdiqlash uchun `organization_id` yuboring."
                    )},
                    status=status.HTTP_400_BAD_REQUEST
                )
            targets = [a for a in assignments if a.status == 'BAJARILDI']
            if not targets:
                return Response(
                    {'detail': "Yopish uchun tasdiqlanishi kerak bo'lgan tashkilot yo'q"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        old_task_status = task.status
        closed_names: List[str] = []

        with transaction.atomic():
            for assignment in targets:
                old_status = assignment.status
                assignment.status = 'NAZORATDAN_YECHILDI'
                assignment.save(update_fields=['status', 'updated_at'])
                closed_names.append(assignment.organization.name)

                TaskExecution.objects.create(
                    task=task,
                    task_organization=assignment,
                    executed_by=request.user,
                    action_type='NAZORATDAN_YECHILDI',
                    comment=comment,
                    old_status=old_status,
                    new_status=assignment.status,
                )

            task.refresh_from_db()
            remaining = task.assigned_organizations.exclude(status='NAZORATDAN_YECHILDI').exists()
            if not remaining:
                task.close(request.user)
            else:
                task.sync_status_from_assignments()

        AuditLog.log(
            user=request.user,
            action='TASK_CLOSED',
            entity_type='TASK',
            entity_id=task.id,
            description=(
                f"{request.user.full_name} topshiriqni nazoratdan yechdi: {task.title} "
                f"({', '.join(closed_names)})"
            ),
            old_values={'status': old_task_status},
            new_values={'status': task.status, 'organizations': closed_names},
            ip_address=getattr(request, 'client_ip', None)
        )

        # Ijrochi tashkilotlarni tasdiqlash haqida xabardor qilish
        for assignment in targets:
            self._notify_organization(
                task,
                assignment.organization,
                title='Topshiriq tasdiqlandi',
                message=(
                    f"Topshiriq nazoratdan yechildi: {task.title}"
                    + (f". Izoh: {comment}" if comment else '')
                ),
            )

        task = self.get_queryset().get(pk=task.pk)
        return Response(TaskDetailSerializer(task, context={"request": request}).data)
    
    # =========================================================================
    # QAYTA IJROGA YUBORISH (return / reassign)
    # =========================================================================

    def _return_to_execution(self, request: Request, task: Task) -> Response:
        """`return` va `reassign` uchun umumiy mantiq.

        Body:
            comment         - MAJBURIY, kamida 10 belgi
            organization_id - ixtiyoriy. Berilmasa, hozirda `BAJARILDI`
                              holatidagi BARCHA tashkilotlar qaytariladi.
        """
        organization_id = request.data.get('organization_id')
        comment = (request.data.get('comment') or '').strip()

        if not comment:
            return Response(
                {'comment': "Qaytarish sababini yozing (kamida 10 belgi)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(comment) < 10:
            return Response(
                {'comment': (
                    "Qaytarish sababi juda qisqa. Kamida 10 belgi kiriting "
                    f"(hozir {len(comment)} belgi)"
                )},
                status=status.HTTP_400_BAD_REQUEST
            )

        assignments = list(task.assigned_organizations.select_related('organization').all())

        if organization_id:
            targets = [a for a in assignments if str(a.organization_id) == str(organization_id)]
            if not targets:
                return Response(
                    {'detail': "Tashkilot bu topshiriqqa biriktirilmagan"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if targets[0].status not in ('BAJARILDI', 'NAZORATDAN_YECHILDI'):
                return Response(
                    {'detail': "Faqat hisobot topshirilgan topshiriqni qayta ijroga yuborish mumkin"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            targets = [a for a in assignments if a.status == 'BAJARILDI']
            if not targets:
                return Response(
                    {'detail': "Qayta ijroga yuborish uchun hisobot topshirgan tashkilot yo'q"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        returned_names: List[str] = []

        with transaction.atomic():
            for assignment in targets:
                old_status = assignment.status
                assignment.status = 'QAYTA_IJROGA_YUBORILDI'
                assignment.completed_at = None
                assignment.save(update_fields=['status', 'completed_at', 'updated_at'])
                returned_names.append(assignment.organization.name)

                TaskExecution.objects.create(
                    task=task,
                    task_organization=assignment,
                    executed_by=request.user,
                    action_type='QAYTA_YUBORILDI',
                    comment=comment,
                    old_status=old_status,
                    new_status=assignment.status,
                )

            # Ota-topshiriq allaqachon yopilgan bo'lsa, uni qayta ochamiz
            if task.status == 'NAZORATDAN_YECHILDI':
                task.status = 'QAYTA_IJROGA_YUBORILDI'
                task.closed_at = None
                task.closed_by = None
                task.save(update_fields=['status', 'closed_at', 'closed_by', 'updated_at'])
            task.sync_status_from_assignments()

        AuditLog.log(
            user=request.user,
            action='TASK_REASSIGNED',
            entity_type='TASK',
            entity_id=task.id,
            description=(
                f"{request.user.full_name} topshiriqni qayta ijroga yubordi: {task.title} "
                f"({', '.join(returned_names)})"
            ),
            old_values={'status': 'BAJARILDI'},
            new_values={'status': 'QAYTA_IJROGA_YUBORILDI', 'organizations': returned_names},
            ip_address=getattr(request, 'client_ip', None)
        )

        for assignment in targets:
            self._notify_organization(
                task,
                assignment.organization,
                title='Topshiriq qayta yuborildi',
                message=f"Topshiriq qayta ijroga yuborildi: {task.title}. Sabab: {comment}",
            )

        task = self.get_queryset().get(pk=task.pk)
        return Response(TaskDetailSerializer(task, context={"request": request}).data)

    @action(detail=True, methods=['post'], url_path='return',
            permission_classes=[IsAuthenticated, CanCloseTask])
    def return_for_rework(self, request, pk=None):
        """Hisobotni qaytarish (qayta ijroga yuborish). Faqat HOKIM.

        POST /api/tasks/{id}/return/
        Body:
            {"comment": "<majburiy, kamida 10 belgi>",
             "organization_id": "<ixtiyoriy uuid>"}
        """
        return self._return_to_execution(request, self.get_object())

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanCloseTask])
    def reassign(self, request, pk=None):
        """`/return/` uchun eski nom (alias). Faqat HOKIM.

        POST /api/tasks/{id}/reassign/
        """
        return self._return_to_execution(request, self.get_object())

    # =========================================================================
    # TASDIQLASH KUTILAYOTGAN TOPSHIRIQLAR
    # =========================================================================

    def _attachment_payload(self, attachment: TaskAttachment) -> Dict[str, Any]:
        """Ilova (fayl) uchun JSON."""
        request = self.request
        file_url = ''
        try:
            file_url = attachment.file.url
        except Exception:
            file_url = ''
        if file_url and request is not None:
            file_url = request.build_absolute_uri(file_url)

        return {
            'id': str(attachment.id),
            'file': file_url,
            'file_name': attachment.file_name,
            'file_type': attachment.file_type,
            'file_size': attachment.file_size,
            'uploaded_at': attachment.created_at,
        }

    def _awaiting_organizations(self, task: Task) -> List[Dict[str, Any]]:
        """Tasdiqlash kutayotgan (BAJARILDI) biriktirilishlar ro'yxati."""
        payload: List[Dict[str, Any]] = []

        # Har bir biriktirilish uchun oxirgi hisobot ijrosini topamiz
        reports: Dict[Any, TaskExecution] = {}
        for execution in task.executions.all():
            if execution.action_type != 'HISOBOT_TOPSHIRILDI':
                continue
            key = execution.task_organization_id
            existing = reports.get(key)
            if existing is None or execution.created_at > existing.created_at:
                reports[key] = execution

        for assignment in task.assigned_organizations.all():
            if assignment.status != 'BAJARILDI':
                continue
            report = reports.get(assignment.id)
            payload.append({
                'id': str(assignment.id),
                'organization_id': str(assignment.organization_id),
                'organization_name': assignment.organization.name,
                'status': assignment.status,
                'reported_at': assignment.completed_at or (report.created_at if report else None),
                'report_comment': report.comment if report else '',
                'attachments': [
                    self._attachment_payload(att)
                    for att in (report.attachments.all() if report else [])
                ],
            })
        return payload

    @action(detail=False, methods=['get'], url_path='pending-approval',
            permission_classes=[IsAuthenticated, CanCloseTask])
    def pending_approval(self, request: Request) -> Response:
        """Hokim tasdig'ini kutayotgan topshiriqlar.

        GET /api/tasks/pending-approval/

        Ro'yxat `GET /api/tasks/` bilan bir xil paginatsiya va serializer'dan
        foydalanadi. Har bir element qo'shimcha `awaiting_organizations`
        maydonini oladi.

        Filtrlar: ?search= ?priority= ?sector= ?organization= ?ordering=
        """
        queryset = self.filter_queryset(self.get_queryset()).filter(
            assigned_organizations__status='BAJARILDI'
        ).distinct().prefetch_related(
            Prefetch(
                'executions',
                queryset=TaskExecution.objects.filter(
                    action_type='HISOBOT_TOPSHIRILDI'
                ).prefetch_related('attachments'),
            ),
        )

        page = self.paginate_queryset(queryset)
        target = page if page is not None else queryset
        serializer = TaskMinimalSerializer(target, many=True, context=self.get_serializer_context())

        data = []
        for task, item in zip(target, serializer.data):
            row = dict(item)
            row['awaiting_organizations'] = self._awaiting_organizations(task)
            data.append(row)

        if page is not None:
            return self.get_paginated_response(data)
        return Response(data)

    @action(detail=True, methods=['post'], url_path='mark-complete')
    def mark_complete(self, request, pk=None):
        """
        Tashkilot rahbari yoki mas'uli topshiriqni bajarildi deb belgilaydi.
        
        POST /api/tasks/{id}/mark-complete/
        """
        task = self.get_object()
        user = request.user
        comment = request.data.get('comment', '')
        
        # Faqat tashkilot rahbari yoki mas'uli
        if user.role not in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
            return Response(
                {'detail': "Faqat tashkilot rahbari yoki mas'uli topshiriqni bajarildi deb belgilashi mumkin"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Foydalanuvchi tashkilotini topish
        user_org = user.organization
        if not user_org:
            return Response(
                {'detail': "Foydalanuvchi tashkilotga biriktirilmagan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Topshiriqda tashkilotni topish
        task_org = task.assigned_organizations.filter(organization=user_org).first()
        if not task_org:
            return Response(
                {'detail': "Bu topshiriq sizning tashkilotingizga tayinlanmagan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if task_org.status == 'BAJARILDI':
            return Response(
                {'detail': "Topshiriq allaqachon bajarildi deb belgilangan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Statusni yangilash
        old_status = task_org.status
        task_org.status = 'BAJARILDI'
        task_org.completed_at = timezone.now()
        task_org.save()
        
        # Execution log
        TaskExecution.objects.create(
            task=task,
            task_organization=task_org,
            executed_by=user,
            action_type='BAJARILDI',
            comment=comment or f"{user_org.name} topshiriqni bajardi",
            old_status=old_status,
            new_status='BAJARILDI'
        )
        
        # Audit log
        AuditLog.objects.create(
            user=user,
            action='TASK_COMPLETED',
            entity_type='TASK_ORGANIZATION',
            entity_id=str(task_org.id),
            description=f'Tashkilot topshiriqni bajardi: {user_org.name}',
            extra_data={
                'task_id': str(task.id),
                'organization': user_org.name,
                'old_status': old_status,
                'new_status': task_org.status
            }
        )
        
        # Barcha tashkilotlar bajarilganligini tekshirish
        all_completed = all(
            to.status == 'BAJARILDI' 
            for to in task.assigned_organizations.all()
        )
        
        if all_completed:
            task.status = 'BAJARILDI'
            task.save()
        else:
            task.sync_status_from_assignments()
        
        # HOKIM va HOKIMLIK_MASUL larga bildirishnoma yuborish
        from users.models import User as UserModel
        hokimlik_users = UserModel.objects.filter(
            role__in=['HOKIM', 'HOKIMLIK_MASUL'],
            status='FAOL'
        )
        for huser in hokimlik_users:
            create_notification(
                user=huser,
                title='Topshiriq bajarildi',
                message=f"{user_org.name} topshiriqni bajardi: {task.title}",
                notification_type='TASK',
                related_task=task,
                link=f'/dashboard/tasks/{task.id}'
            )
        
        return Response(TaskDetailSerializer(task, context={"request": request}).data)
    
    @action(detail=True, methods=['get', 'post'])
    def timeline(self, request, pk=None):
        """
        Get or add to task timeline (messages + executions).
        
        GET /api/tasks/{id}/timeline/
        POST /api/tasks/{id}/timeline/
        """
        task = self.get_object()
        
        if request.method == 'GET':
            # Combine messages and executions
            messages = list(task.messages.all())
            executions = list(task.executions.all())
            
            timeline = []
            
            for msg in messages:
                timeline.append({
                    'type': 'message',
                    'id': msg.id,
                    'timestamp': msg.created_at,
                    'sender': str(msg.sender_id) if msg.sender_id else None,
                    'user_name': msg.sender.full_name if msg.sender else 'Tizim',
                    'user_role': msg.sender.role if msg.sender else 'SYSTEM',
                    'content': msg.content,
                    'message_type': msg.message_type,
                    'attachment': TaskAttachmentSerializer(msg.attachment).data if msg.attachment else None
                })
            
            for exec in executions:
                timeline.append({
                    'type': 'execution',
                    'id': exec.id,
                    'timestamp': exec.created_at,
                    'executed_by': str(exec.executed_by_id) if exec.executed_by_id else None,
                    'user_name': exec.executed_by.full_name,
                    'user_role': exec.executed_by.role,
                    'content': exec.comment or exec.get_action_type_display(),
                    'action_type': exec.action_type
                })
            
            # Sort by timestamp
            timeline.sort(key=lambda x: x['timestamp'])
            
            return Response(timeline)
        
        else:  # POST
            content = request.data.get('content') or request.data.get('message', '')
            attachment_file = request.FILES.get('attachment') or request.FILES.get('file')
            attachment = None
            message_type = request.data.get('message_type', 'TEXT')

            if attachment_file:
                attachment = TaskAttachment.objects.create(
                    task=task,
                    uploaded_by=request.user,
                    file=attachment_file,
                    file_name=attachment_file.name,
                    file_size=attachment_file.size,
                    file_type=_guess_attachment_type(attachment_file)
                )
                message_type = _guess_message_type(attachment_file)

            if not (content or attachment):
                return Response(
                    {'detail': "Xabar matni yoki fayl talab qilinadi"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            message = TaskMessage.objects.create(
                task=task,
                sender=request.user,
                message_type=message_type,
                content=content or (attachment_file.name if attachment_file else ''),
                attachment=attachment
            )

            preview = (content or "").strip()
            if not preview and attachment_file:
                preview = f"Fayl yuborildi: {attachment_file.name}"
            notify_task_chat_message(
                task=task,
                sender=request.user,
                preview=preview,
                link=f"/dashboard/tasks/{task.id}",
            )

            # Broadcast to WS clients
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"task_chat_{task.id}",
                    {"type": "chat_message", "message": TaskMessageSerializer(message).data}
                )

            # AI tahlil va action bajarish
            ai_response = self._process_chat_with_ai(task, message, request.user, channel_layer)

            return Response({
                **TaskMessageSerializer(message).data,
                'ai_response': ai_response
            }, status=status.HTTP_201_CREATED)
    
    def _process_chat_with_ai(self, task, message, user, channel_layer):
        """
        Chat xabarini AI bilan tahlil qilish va kerak bo'lsa action bajarish.
        
        AI quyidagilarni aniqlaydi:
        - Hokim "nazoratdan yechilsin" desa → topshiriqni yopish
        - Tashkilot rahbari "bajarildi" desa → statusni yangilash
        - Dalil/fayl bilan tasdiqlash → statusni yangilash
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            ai_service = AIService()
            content = message.content.lower()
            user_role = user.role
            
            # AI tahlil uchun kontekst
            task_context = f"""
Topshiriq: {task.title}
Status: {task.status}
Yaratilgan: {task.created_at}
Muddat: {task.deadline}
Xabar yuboruvchi: {user.full_name} ({user_role})
Xabar matni: {message.content}
"""
            
            # Hokim buyruqlarini tekshirish
            close_keywords = ['nazoratdan yechilsin', 'nazoratdan yech', 'yakunla', 'tugat', 'yopilsin', 'tasdiqlandi']
            complete_keywords = ['bajarildi', 'tugallandi', 'yakunlandi', 'topshiriq bajarildi', 'ish tugadi']
            
            ai_action = None
            ai_message = None
            
            # Hokim nazoratdan yechish buyrug'i
            if user_role == 'HOKIM':
                for keyword in close_keywords:
                    if keyword in content:
                        # Barcha tashkilotlar bajarilganligini tekshirish
                        all_completed = all(
                            to.status == 'BAJARILDI' 
                            for to in task.assigned_organizations.all()
                        )
                        
                        # Hokim buyrug'i bilan - tashkilotlar bajarilmagan bo'lsa ham yopish mumkin
                        # Avval barcha tashkilotlarni "BAJARILDI" ga o'zgartirish
                        if not all_completed and task.status != 'BAJARILDI':
                            for task_org in task.assigned_organizations.all():
                                if task_org.status != 'BAJARILDI':
                                    task_org.status = 'BAJARILDI'
                                    task_org.completed_at = timezone.now()
                                    task_org.save()
                            task.status = 'BAJARILDI'
                            task.save()
                        
                        try:
                            old_status = task.status
                            task.close(user)
                            ai_action = 'TASK_CLOSED'
                            ai_message = f"✅ Topshiriq muvaffaqiyatli nazoratdan yechildi. Hokim {user.full_name} tomonidan tasdiqlandi."
                            
                            # Audit log
                            AuditLog.objects.create(
                                user=user,
                                action='TASK_CLOSED',
                                entity_type='TASK',
                                entity_id=str(task.id),
                                description=f'Topshiriq AI orqali nazoratdan yechildi: {task.title}',
                                extra_data={
                                    'old_status': old_status,
                                    'new_status': task.status,
                                    'ai_triggered': True,
                                    'message_id': str(message.id)
                                }
                            )
                        except Exception as e:
                            ai_message = f"⚠️ Topshiriqni yopishda xatolik: {str(e)}"
                        break
            
            # Tashkilot rahbari bajarildi deyishi
            elif user_role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
                for keyword in complete_keywords:
                    if keyword in content:
                        # Foydalanuvchi tashkilotini topish
                        user_org = user.organization
                        if user_org:
                            task_org = task.assigned_organizations.filter(organization=user_org).first()
                            if task_org and task_org.status != 'BAJARILDI':
                                # Tashkilot statusini yangilash
                                old_status = task_org.status
                                task_org.status = 'BAJARILDI'
                                task_org.completed_at = timezone.now()
                                task_org.save()
                                
                                ai_action = 'ORG_COMPLETED'
                                ai_message = f"✅ {user_org.name} tomonidan topshiriq bajarildi deb belgilandi."
                                
                                # Barcha tashkilotlar bajarilganligini tekshirish
                                all_completed = all(
                                    to.status == 'BAJARILDI' 
                                    for to in task.assigned_organizations.all()
                                )
                                
                                if all_completed:
                                    task.status = 'BAJARILDI'
                                    task.save()
                                    ai_message += " 🎉 Barcha tashkilotlar topshiriqni bajardi. Hokim nazoratdan yechishi mumkin."
                                
                                # Audit log
                                AuditLog.objects.create(
                                    user=user,
                                    action='TASK_COMPLETED',
                                    entity_type='TASK_ORGANIZATION',
                                    entity_id=str(task_org.id),
                                    description=f'Tashkilot topshiriqni bajardi: {user_org.name}',
                                    extra_data={
                                        'task_id': str(task.id),
                                        'organization': user_org.name,
                                        'old_status': old_status,
                                        'new_status': task_org.status,
                                        'ai_triggered': True,
                                        'message_id': str(message.id)
                                    }
                                )
                        break
            
            # Agar AI action bajarilgan bo'lsa, xabar yuborish
            if ai_message:
                # AI xabarini yaratish
                ai_msg = TaskMessage.objects.create(
                    task=task,
                    sender=None,  # Tizim xabari
                    message_type='SYSTEM',
                    content=ai_message
                )
                
                # WS orqali broadcast
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"task_chat_{task.id}",
                        {"type": "chat_message", "message": TaskMessageSerializer(ai_msg).data}
                    )
                
                return {
                    'action': ai_action,
                    'message': ai_message,
                    'success': ai_action is not None
                }
            
            return None
            
        except Exception as e:
            logger.error(f"AI chat processing error: {str(e)}")
            return None

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated], url_path='messages/(?P<message_id>[^/.]+)')
    def update_message(self, request, pk=None, message_id=None):
        """Update a user's own message."""
        task = self.get_object()
        try:
            message = TaskMessage.objects.get(id=message_id, task=task)
        except TaskMessage.DoesNotExist:
            return Response({'detail': 'Xabar topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        if message.sender != request.user:
            return Response({'detail': "Faqat o'zingiz yozgan xabarni tahrirlashingiz mumkin"}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content') or request.data.get('message')
        if content is None:
            return Response({'detail': "Matn talab qilinadi"}, status=status.HTTP_400_BAD_REQUEST)

        message.content = content
        message.save(update_fields=['content', 'updated_at'])

        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"task_chat_{task.id}",
                {"type": "chat_message", "message": TaskMessageSerializer(message).data}
            )

        return Response(TaskMessageSerializer(message).data)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated], url_path='messages/(?P<message_id>[^/.]+)')
    def delete_message(self, request, pk=None, message_id=None):
        """Delete a user's own message."""
        task = self.get_object()
        try:
            message = TaskMessage.objects.get(id=message_id, task=task)
        except TaskMessage.DoesNotExist:
            return Response({'detail': 'Xabar topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        if message.sender != request.user:
            return Response({'detail': "Faqat o'zingiz yozgan xabarni o'chirishingiz mumkin"}, status=status.HTTP_403_FORBIDDEN)

        message_id_value = str(message.id)
        if message.attachment:
            message.attachment.delete()
        message.delete()

        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"task_chat_{task.id}",
                {"type": "chat_message", "message": {"id": message_id_value, "deleted": True}}
            )

        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanExecuteTasks])
    def extend_request(self, request, pk=None):
        """
        Request deadline extension.
        
        POST /api/tasks/{id}/extend_request/
        """
        task = self.get_object()
        user = request.user
        
        try:
            task_org = task.assigned_organizations.get(organization=user.organization)
        except TaskOrganization.DoesNotExist:
            return Response(
                {'detail': "Bu topshiriq sizning tashkilotingizga berilmagan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ExtensionRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        extension = DeadlineExtensionRequest.objects.create(
            task=task,
            task_organization=task_org,
            requested_by=user,
            current_deadline=task.deadline,
            requested_deadline=serializer.validated_data['requested_deadline'],
            reason=serializer.validated_data['reason']
        )
        
        # Create execution record
        TaskExecution.objects.create(
            task=task,
            task_organization=task_org,
            executed_by=user,
            action_type='MUDDAT_UZAYTIRISH_SOROVI',
            comment=serializer.validated_data['reason']
        )
        
        AuditLog.log(
            user=user,
            action='EXTENSION_REQUESTED',
            entity_type='TASK',
            entity_id=task.id,
            description=f"{user.full_name} muddat uzaytirish so'radi: {task.title}",
            new_values={
                'current_deadline': str(task.deadline),
                'requested_deadline': str(serializer.validated_data['requested_deadline'])
            },
            ip_address=getattr(request, 'client_ip', None)
        )
        
        return Response(
            DeadlineExtensionRequestSerializer(extension).data,
            status=status.HTTP_201_CREATED
        )


class DeadlineExtensionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Deadline extension requests management.
    """
    queryset = DeadlineExtensionRequest.objects.all()
    serializer_class = DeadlineExtensionRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'task']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = DeadlineExtensionRequest.objects.select_related(
            'task', 'task_organization__organization', 'requested_by', 'reviewed_by'
        )
        
        if user.role in ['HOKIM', 'ADMIN']:
            return queryset
        
        if user.organization:
            return queryset.filter(task_organization__organization=user.organization)
        
        return queryset.none()
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanCloseTask])
    def review(self, request, pk=None):
        """
        Review extension request (approve/reject).
        Only Hokim can do this.
        
        POST /api/tasks/extensions/{id}/review/
        """
        extension = self.get_object()
        
        if extension.status != 'KUTILMOQDA':
            return Response(
                {'detail': "Bu so'rov allaqachon ko'rib chiqilgan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ExtensionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        comment = serializer.validated_data.get('comment', '')
        
        if action == 'approve':
            extension.approve(request.user, comment)
            audit_action = 'EXTENSION_APPROVED'
            
            TaskExecution.objects.create(
                task=extension.task,
                task_organization=extension.task_organization,
                executed_by=request.user,
                action_type='MUDDAT_UZAYTIRILDI',
                comment=comment
            )
        else:
            extension.reject(request.user, comment)
            audit_action = 'EXTENSION_REJECTED'
        
        AuditLog.log(
            user=request.user,
            action=audit_action,
            entity_type='EXTENSION_REQUEST',
            entity_id=extension.id,
            description=f"{request.user.full_name} muddat uzaytirish so'rovini {action}",
            new_values={'status': extension.status, 'comment': comment},
            ip_address=getattr(request, 'client_ip', None)
        )
        
        return Response(DeadlineExtensionRequestSerializer(extension).data)
