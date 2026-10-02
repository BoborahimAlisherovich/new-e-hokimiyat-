"""
Kalendar API.

  GET    /api/calendar/feed/?from=2026-09-01&to=2026-09-30
         → topshiriq muddatlari + eslatmalar, bitta formatda

  GET    /api/calendar/events/          → faqat qo'lda qo'yilgan yozuvlar
  POST   /api/calendar/events/          → yangi eslatma
  PATCH  /api/calendar/events/{id}/     → tahrirlash (faqat egasi yoki hokim)
  DELETE /api/calendar/events/{id}/     → o'chirish
  GET    /api/calendar/upcoming/        → chap paneldagi «Yaqin kunlarda»
"""

from __future__ import annotations

from datetime import datetime, time, timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from agenda.models import CalendarEvent, EventVisibility
from agenda.serializers import (
    CalendarEventSerializer,
    event_to_feed_item,
    task_to_feed_item,
)
from tasks.access import can_edit_task, scope_tasks_for
from tasks.models import Task

# Kalendar bir marta so'raganda ko'pi bilan shuncha kun beradi.
# Cheklov bo'lmasa «from=2000&to=2100» bitta so'rov bilan butun bazani
# tortib chiqarardi.
MAX_RANGE_DAYS = 186


def _parse_range(request):
    """?from= va ?to= ni xavfsiz o'qiydi. Standart — joriy oy."""
    tz = timezone.get_current_timezone()
    today = timezone.localdate()

    def parse(value, fallback):
        if not value:
            return fallback
        try:
            return datetime.strptime(value[:10], '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return fallback

    default_from = today.replace(day=1)
    # Keyingi oyning birinchi kuni minus bir kun = joriy oy oxiri
    next_month = (default_from + timedelta(days=32)).replace(day=1)
    default_to = next_month - timedelta(days=1)

    date_from = parse(request.query_params.get('from'), default_from)
    date_to = parse(request.query_params.get('to'), default_to)

    if date_to < date_from:
        date_from, date_to = date_to, date_from
    if (date_to - date_from).days > MAX_RANGE_DAYS:
        date_to = date_from + timedelta(days=MAX_RANGE_DAYS)

    start = timezone.make_aware(datetime.combine(date_from, time.min), tz)
    end = timezone.make_aware(datetime.combine(date_to, time.max), tz)
    return start, end


def _visible_events_qs(user):
    """
    Foydalanuvchi ko'rishi mumkin bo'lgan yozuvlar.

    Doira: o'zi yaratgan + ishtirokchi qilib qo'shilgan + tashkiloti
    uchun ochiq + hammaga ochiq.
    """
    conditions = Q(owner=user) | Q(participants=user) | Q(visibility=EventVisibility.EVERYONE)
    if getattr(user, 'organization_id', None):
        conditions |= Q(
            visibility=EventVisibility.ORGANIZATION,
            organization_id=user.organization_id,
        )
    return (
        CalendarEvent.objects.filter(conditions)
        .select_related('owner', 'organization', 'related_task')
        .prefetch_related('participants')
        .distinct()
    )


class CalendarEventViewSet(viewsets.ModelViewSet):
    """Qo'lda qo'yilgan kalendar yozuvlari."""

    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = _visible_events_qs(self.request.user)
        start_raw = self.request.query_params.get('from')
        end_raw = self.request.query_params.get('to')
        if start_raw or end_raw:
            start, end = _parse_range(self.request)
            qs = qs.filter(start_at__lte=end).filter(
                Q(end_at__gte=start) | Q(end_at__isnull=True, start_at__gte=start)
            )
        return qs.order_by('start_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, created_by=self.request.user)

    def _assert_can_write(self, instance):
        user = self.request.user
        if instance.owner_id != user.id and getattr(user, 'role', None) not in ('HOKIM', 'ADMIN'):
            return Response(
                {'detail': "Bu yozuvni faqat uni yaratgan xodim o'zgartira oladi."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def update(self, request, *args, **kwargs):
        denied = self._assert_can_write(self.get_object())
        if denied is not None:
            return denied
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        denied = self._assert_can_write(self.get_object())
        if denied is not None:
            return denied
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        denied = self._assert_can_write(self.get_object())
        if denied is not None:
            return denied
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def feed(self, request):
        """Topshiriq muddatlari + eslatmalar — bitta ro'yxat."""
        return Response(_build_feed(request))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_feed(request):
    """`/api/calendar/feed/` — ViewSet'siz qisqa yo'l."""
    return Response(_build_feed(request))


def _build_feed(request):
    user = request.user
    start, end = _parse_range(request)

    # --- 1. Topshiriq muddatlari -------------------------------------------
    # Doira `tasks/access.py` dan keladi: ro'yxat sahifasi bilan AYNAN
    # bir xil qoida. Kalendarda o'zining doirasidan tashqaridagi topshiriq
    # ko'rinib qolsa, bu ma'lumot sizishi bo'lardi.
    tasks_qs = (
        scope_tasks_for(user, Task.objects.all())
        .filter(deadline__gte=start, deadline__lte=end)
        .select_related('created_by')
        .prefetch_related('assigned_organizations__organization')
        .order_by('deadline')
    )

    include_closed = request.query_params.get('closed') in ('1', 'true', 'yes')
    if not include_closed:
        tasks_qs = tasks_qs.exclude(status__in=['NAZORATDAN_YECHILDI', 'BAJARILMADI'])

    items = []
    for task in tasks_qs[:600]:
        items.append(task_to_feed_item(task, can_edit=can_edit_task(user, task)))

    # --- 2. Qo'lda qo'yilgan yozuvlar ---------------------------------------
    events_qs = (
        _visible_events_qs(user)
        .filter(start_at__lte=end)
        .filter(Q(end_at__gte=start) | Q(end_at__isnull=True, start_at__gte=start))
        .order_by('start_at')
    )
    for event in events_qs[:600]:
        items.append(event_to_feed_item(event, user=user))

    items.sort(key=lambda x: (x['start_at'] is None, x['start_at']))

    return {
        'from': start.date().isoformat(),
        'to': end.date().isoformat(),
        'count': len(items),
        'items': items,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_upcoming(request):
    """
    Chap paneldagi «Yaqin kunlarda» ro'yxati.

    Standart — keyingi 14 kun, ko'pi bilan 20 ta yozuv.
    """
    try:
        days = min(int(request.query_params.get('days', 14)), 90)
    except (TypeError, ValueError):
        days = 14

    now = timezone.now()
    end = now + timedelta(days=days)

    tasks_qs = (
        scope_tasks_for(request.user, Task.objects.all())
        .filter(deadline__gte=now, deadline__lte=end)
        .exclude(status__in=['NAZORATDAN_YECHILDI', 'BAJARILMADI'])
        .prefetch_related('assigned_organizations__organization')
        .order_by('deadline')[:20]
    )

    events_qs = (
        _visible_events_qs(request.user)
        .filter(start_at__gte=now, start_at__lte=end)
        .order_by('start_at')[:20]
    )

    items = [task_to_feed_item(t, can_edit=False) for t in tasks_qs]
    items += [event_to_feed_item(e, user=request.user) for e in events_qs]
    items.sort(key=lambda x: x['start_at'])

    return Response({'count': len(items[:20]), 'items': items[:20]})
