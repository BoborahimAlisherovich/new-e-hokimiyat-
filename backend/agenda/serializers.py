"""
Kalendar serializerlari.
"""

from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from agenda.models import CalendarEvent, EventKind, EventVisibility


class CalendarParticipantSerializer(serializers.Serializer):
    """Ishtirokchining ixcham ko'rinishi — avatar qatori uchun."""

    id = serializers.UUIDField(read_only=True)
    full_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    position = serializers.CharField(read_only=True, default='')

    def get_full_name(self, obj) -> str:
        parts = [obj.last_name, obj.first_name]
        return ' '.join(p for p in parts if p).strip() or obj.login

    def get_avatar(self, obj):
        request = self.context.get('request')
        if not getattr(obj, 'avatar', None):
            return None
        url = obj.avatar.url
        return request.build_absolute_uri(url) if request else url


class CalendarEventSerializer(serializers.ModelSerializer):
    """Qo'lda qo'yilgan yozuv."""

    participants_detail = CalendarParticipantSerializer(
        source='participants', many=True, read_only=True
    )
    owner_name = serializers.SerializerMethodField(read_only=True)
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    can_edit = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CalendarEvent
        fields = [
            'id',
            'title',
            'description',
            'location',
            'kind',
            'kind_display',
            'start_at',
            'end_at',
            'all_day',
            'visibility',
            'organization',
            'participants',
            'participants_detail',
            'related_task',
            'remind_before_minutes',
            'owner',
            'owner_name',
            'can_edit',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_owner_name(self, obj) -> str:
        owner = obj.owner
        parts = [owner.last_name, owner.first_name]
        return ' '.join(p for p in parts if p).strip() or owner.login

    def get_can_edit(self, obj) -> bool:
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return obj.owner_id == user.id or getattr(user, 'role', None) in ('HOKIM', 'ADMIN')

    def validate(self, attrs):
        start = attrs.get('start_at') or getattr(self.instance, 'start_at', None)
        end = attrs.get('end_at', getattr(self.instance, 'end_at', None))

        if start and end and end < start:
            raise serializers.ValidationError(
                {'end_at': "Tugash vaqti boshlanish vaqtidan oldin bo'lishi mumkin emas."}
            )

        visibility = attrs.get('visibility') or getattr(self.instance, 'visibility', None)
        organization = attrs.get('organization', getattr(self.instance, 'organization', None))
        if visibility == EventVisibility.ORGANIZATION and organization is None:
            # Tashkilot ko'rsatilmasa, yozuv hech kimga ko'rinmay qolardi —
            # foydalanuvchi buni sezmasdi. Shuning uchun aniq xato.
            raise serializers.ValidationError(
                {'organization': "«Tashkilotim» ko'rinishi uchun tashkilot tanlanishi shart."}
            )

        remind = attrs.get(
            'remind_before_minutes',
            getattr(self.instance, 'remind_before_minutes', 0),
        )
        if remind and remind > 60 * 24 * 30:
            raise serializers.ValidationError(
                {'remind_before_minutes': "Eslatma bir oydan ko'proq oldin yuborilmaydi."}
            )

        return attrs


class CalendarFeedItemSerializer(serializers.Serializer):
    """
    Kalendar lentasining YAGONA formati.

    Ikki manba bitta shaklga keltiriladi, shuning uchun frontend'da
    «bu topshiriqmi yoki eslatmami» degan shartlar tarqalib ketmaydi:
    bitta ro'yxat, bitta render.
    """

    id = serializers.CharField()
    source = serializers.ChoiceField(choices=['task', 'event'])
    kind = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField(allow_blank=True)
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField(allow_null=True)
    all_day = serializers.BooleanField()
    location = serializers.CharField(allow_blank=True)
    tone = serializers.CharField()
    link = serializers.CharField(allow_blank=True)
    can_edit = serializers.BooleanField()
    meta = serializers.DictField(required=False)


# Muddat yozuvlari uchun rang ohangi — frontend `lib/status-styles.ts`
# dagi bir xil sinflarni ishlatadi, ya'ni qorong'i tema o'zi ishlaydi.
TASK_TONE_BY_STATUS = {
    'YANGI': 'st-yangi',
    'TEKSHIRUVDA': 'st-tekshiruvda',
    'IJRODA': 'st-ijroda',
    'QAYTA_IJROGA_YUBORILDI': 'st-qayta',
    'MUDDATI_KECH': 'st-kech',
    'BAJARILDI': 'st-bajarildi',
    'NAZORATDAN_YECHILDI': 'st-yechildi',
    'BAJARILMADI': 'st-bajarilmadi',
}

EVENT_TONE_BY_KIND = {
    EventKind.ESLATMA: 'st-tekshiruvda',
    EventKind.YIGILISH: 'st-yangi',
    EventKind.TADBIR: 'st-yechildi',
    EventKind.QABUL: 'st-ijroda',
    EventKind.BOSHQA: 'st-bajarilmadi',
}


def task_to_feed_item(task, *, can_edit: bool) -> dict:
    """
    Topshiriqni kalendar yozuviga aylantiradi.

    Sarlavha ataylab «Tekshiriladi: …» deb boshlanadi — kalendarda
    ko'rilganda bu sana ISH MUDDATI emas, NAZORAT KUNI ekani darrov
    tushunilishi kerak.
    """
    deadline = task.deadline
    return {
        'id': f'task:{task.id}',
        'source': 'task',
        'kind': 'TOPSHIRIQ',
        'title': f'Tekshiriladi: {task.title}',
        'description': (task.description or '')[:400],
        'start_at': deadline,
        'end_at': None,
        'all_day': False,
        'location': task.address or '',
        'tone': TASK_TONE_BY_STATUS.get(task.status, 'st-bajarilmadi'),
        'link': f'/dashboard/tasks/{task.id}',
        'can_edit': can_edit,
        'meta': {
            'status': task.status,
            'priority': task.priority,
            'is_overdue': bool(
                deadline
                and deadline < timezone.now()
                and task.status not in ('NAZORATDAN_YECHILDI', 'BAJARILMADI', 'BAJARILDI')
            ),
            'organizations': [
                (getattr(assignment.organization, 'short_name', '') or assignment.organization.name)
                for assignment in task.assigned_organizations.all()
                if assignment.organization_id
            ],
        },
    }


def event_to_feed_item(event: CalendarEvent, *, user) -> dict:
    can_edit = event.owner_id == user.id or getattr(user, 'role', None) in ('HOKIM', 'ADMIN')
    return {
        'id': f'event:{event.id}',
        'source': 'event',
        'kind': event.kind,
        'title': event.title,
        'description': event.description or '',
        'start_at': event.start_at,
        'end_at': event.end_at,
        'all_day': event.all_day,
        'location': event.location or '',
        'tone': EVENT_TONE_BY_KIND.get(event.kind, 'st-tekshiruvda'),
        'link': f'/dashboard/tasks/{event.related_task_id}' if event.related_task_id else '',
        'can_edit': can_edit,
        'meta': {
            'visibility': event.visibility,
            'remind_before_minutes': event.remind_before_minutes,
            'participants': [
                {
                    'id': str(p.id),
                    'name': ' '.join(x for x in [p.last_name, p.first_name] if x) or p.login,
                }
                for p in event.participants.all()[:8]
            ],
        },
    }
