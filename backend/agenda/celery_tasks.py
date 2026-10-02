"""
MUDDAT ESLATMALARI VA KECHIKISH XABARLARI
=========================================

Nega eski `tasks.celery_tasks.send_deadline_reminders` yetarli emas edi:

  1. TAKRORLANISH. Eslatma «now + N kun» oynasi bo'yicha topilardi.
     Beat bir kunda ikki marta ishga tushsa (worker qayta ishga
     tushirilsa, vazifa retry bo'lsa) — bir xil xabar ikki marta ketardi.
     Endi har bir (topshiriq-tashkilot, tur, qolgan kun, muddat surati)
     uchun bazada UNIQUE yozuv bor: ikkinchi marta yuborib bo'lmaydi.

  2. QABUL QILUVCHILAR. Faqat tashkilot xodimlariga borardi. Hokim ham,
     topshiriqni bergan yordamchi ham muddat yaqinlashganini bilmasdi —
     ya'ni nazorat ishlamasdi. Endi uch qavat: IJROCHI → MAS'UL
     YORDAMCHI → HOKIM.

  3. KECHIKISH. Muddat o'tganda faqat tashkilotning o'ziga xabar
     ketardi: «ishni bajarmadingiz» xabarini aynan bajarmagan odam
     olardi va hech kim bilmasdi. Endi hokimga alohida xabar boradi:
     «falon tashkilot topshiriqni belgilangan muddatda bajarmadi».

  4. KUN HISOBI. `now + N kun` UTC bo'yicha hisoblanardi; Toshkent
     vaqtida ertalab 09:00 da ishga tushgan vazifa uchun bu «2.6 kun»
     degani edi va chegaradagi topshiriqlar tushib qolardi. Endi
     MAHALLIY SANA bo'yicha butun kun farqi hisoblanadi.
"""

from __future__ import annotations

import logging
from datetime import datetime, time, timedelta

from celery import shared_task
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger(__name__)

# Muddatgacha qaysi kunlarda eslatma yuboriladi.
# 0 — «bugun oxirgi kun».
REMINDER_DAYS = (3, 2, 1, 0)

# Eslatma yuborilmaydigan (ish tugagan) holatlar
FINISHED_STATUSES = ('BAJARILDI', 'NAZORATDAN_YECHILDI', 'BAJARILMADI')


def _local_days_until(deadline) -> int:
    """Mahalliy sana bo'yicha butun kun farqi. Kechikkanda manfiy."""
    local_deadline = timezone.localtime(deadline).date()
    today = timezone.localdate()
    return (local_deadline - today).days


def _reminder_text(days_left: int, task_title: str, org_name: str) -> tuple[str, str]:
    if days_left == 0:
        title = "Bugun — topshiriq muddatining oxirgi kuni"
        message = f"«{task_title}» topshirig'i bugun tugaydi. Ijrochi: {org_name}."
    elif days_left == 1:
        title = "Topshiriq muddatiga 1 kun qoldi"
        message = f"«{task_title}» topshirig'iga 1 kun qoldi. Ijrochi: {org_name}."
    else:
        title = f"Topshiriq muddatiga {days_left} kun qoldi"
        message = f"«{task_title}» topshirig'iga {days_left} kun qoldi. Ijrochi: {org_name}."
    return title, message


def _executor_recipients(task_org):
    """Ijrochilar: tashkilot xodimlari + aniq biriktirilgan xodim."""
    from users.models import User

    conditions = Q(
        organization_id=task_org.organization_id,
        role__in=['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
    )
    if task_org.assigned_to_id:
        conditions |= Q(id=task_org.assigned_to_id)

    return User.objects.filter(status='FAOL', is_active=True).filter(conditions).distinct()


def _supervisor_recipients(task):
    """
    Nazorat qiluvchilar: topshiriqni bergan xodim va biriktirilgan
    mas'ul yordamchilar. Hokim bu ro'yxatga kirmaydi — u alohida.
    """
    from users.models import User

    ids = set()
    if task.created_by_id:
        ids.add(task.created_by_id)
    ids.update(task.assigned_deputies.values_list('id', flat=True))
    if not ids:
        return User.objects.none()
    return User.objects.filter(id__in=ids, status='FAOL', is_active=True)


def _hokim_recipients():
    from users.models import User

    return User.objects.filter(role='HOKIM', status='FAOL', is_active=True)


def _notify_many(users, *, title, message, task, link) -> int:
    from notifications.services import create_notification

    sent = 0
    seen = set()
    for user in users:
        if user.id in seen:
            continue
        seen.add(user.id)
        if create_notification(
            user=user,
            title=title,
            message=message,
            notification_type='DEADLINE',
            related_task=task,
            link=link,
        ):
            sent += 1
    return sent


@shared_task(name='agenda.celery_tasks.send_task_deadline_reminders')
def send_task_deadline_reminders():
    """
    Har kuni ertalab ishlaydi: muddatiga 3, 2, 1 va 0 kun qolgan
    topshiriqlar bo'yicha ijrochi, mas'ul yordamchi va hokimga
    bildirishnoma yuboradi.

    Har bir xabar bir marta ketishi `TaskDeadlineNotice` dagi baza
    darajasidagi unique cheklov bilan kafolatlanadi.
    """
    from agenda.models import TaskDeadlineNotice
    from tasks.models import TaskOrganization

    today = timezone.localdate()
    horizon_start = timezone.make_aware(
        datetime.combine(today, time.min), timezone.get_current_timezone()
    )
    horizon_end = horizon_start + timedelta(days=max(REMINDER_DAYS) + 1)

    assignments = (
        TaskOrganization.objects.filter(
            task__deadline__gte=horizon_start,
            task__deadline__lt=horizon_end,
        )
        .exclude(status__in=FINISHED_STATUSES)
        .select_related('task', 'organization', 'task__created_by')
        .prefetch_related('task__assigned_deputies')
    )

    hokimlar = list(_hokim_recipients())
    sent_total = 0
    notices_created = 0

    for assignment in assignments:
        task = assignment.task
        if not task.deadline:
            continue

        days_left = _local_days_until(task.deadline)
        if days_left not in REMINDER_DAYS:
            continue

        org_name = (
            getattr(assignment.organization, 'short_name', '')
            or getattr(assignment.organization, 'name', '')
            or "tashkilot ko'rsatilmagan"
        )

        # Belgini AVVAL qo'yamiz: agar yozuv allaqachon bo'lsa,
        # bildirishnoma umuman yaratilmaydi. Aksincha qilinsa
        # (avval yuborib, keyin belgilash) worker o'rtada yiqilganda
        # xabar ikki marta ketardi.
        try:
            with transaction.atomic():
                notice = TaskDeadlineNotice.objects.create(
                    task_organization=assignment,
                    kind=TaskDeadlineNotice.KIND_REMINDER,
                    days_left=days_left,
                    deadline_snapshot=task.deadline,
                )
                notices_created += 1
        except IntegrityError:
            continue  # bu xabar allaqachon yuborilgan

        title, message = _reminder_text(days_left, task.title, org_name)
        link = f'/dashboard/tasks/{task.id}'

        recipients = list(_executor_recipients(assignment))
        recipients += list(_supervisor_recipients(task))
        # Hokimga faqat 1 kun qolganda va oxirgi kuni — har uch kunda
        # bezovta qilinmasligi uchun. Kechikish xabari alohida boradi.
        if days_left <= 1:
            recipients += hokimlar

        sent = _notify_many(recipients, title=title, message=message, task=task, link=link)
        sent_total += sent

        TaskDeadlineNotice.objects.filter(pk=notice.pk).update(recipients_count=sent)

    logger.info(
        'send_task_deadline_reminders: %s belgi, %s bildirishnoma',
        notices_created,
        sent_total,
    )
    return {'notices': notices_created, 'notifications': sent_total}


@shared_task(name='agenda.celery_tasks.notify_overdue_tasks')
def notify_overdue_tasks():
    """
    Muddati o'tgan, lekin hali bajarilmagan topshiriqlar bo'yicha
    HOKIMGA xabar: «falon tashkilot ishni belgilangan vaqtda bajarmadi».

    Ijrochi va mas'ul yordamchi ham xabar oladi — ular vaziyatni
    tuzatishi kerak.
    """
    from agenda.models import TaskDeadlineNotice
    from tasks.models import TaskOrganization

    now = timezone.now()

    assignments = (
        TaskOrganization.objects.filter(task__deadline__lt=now)
        .exclude(status__in=FINISHED_STATUSES)
        .select_related('task', 'organization', 'task__created_by')
        .prefetch_related('task__assigned_deputies')
    )

    hokimlar = list(_hokim_recipients())
    sent_total = 0
    notices_created = 0

    for assignment in assignments:
        task = assignment.task
        if not task.deadline:
            continue

        org_name = (
            getattr(assignment.organization, 'short_name', '')
            or getattr(assignment.organization, 'name', '')
            or "tashkilot ko'rsatilmagan"
        )

        try:
            with transaction.atomic():
                notice = TaskDeadlineNotice.objects.create(
                    task_organization=assignment,
                    kind=TaskDeadlineNotice.KIND_OVERDUE,
                    days_left=-1,
                    deadline_snapshot=task.deadline,
                )
                notices_created += 1
        except IntegrityError:
            continue

        late_days = abs(_local_days_until(task.deadline))
        deadline_text = timezone.localtime(task.deadline).strftime('%d.%m.%Y')

        hokim_title = 'Topshiriq belgilangan muddatda bajarilmadi'
        hokim_message = (
            f"«{org_name}» «{task.title}» topshirig'ini belgilangan muddatda "
            f"({deadline_text}) bajarmadi."
            + (f" Kechikish: {late_days} kun." if late_days else '')
        )

        executor_title = "Topshiriq muddati o'tdi"
        executor_message = (
            f"«{task.title}» topshirig'ining muddati ({deadline_text}) o'tdi. "
            "Hokimlik xabardor qilindi."
        )

        link = f'/dashboard/tasks/{task.id}'

        sent = _notify_many(
            hokimlar + list(_supervisor_recipients(task)),
            title=hokim_title,
            message=hokim_message,
            task=task,
            link=link,
        )
        sent += _notify_many(
            _executor_recipients(assignment),
            title=executor_title,
            message=executor_message,
            task=task,
            link=link,
        )
        sent_total += sent

        TaskDeadlineNotice.objects.filter(pk=notice.pk).update(recipients_count=sent)

    logger.info('notify_overdue_tasks: %s belgi, %s bildirishnoma', notices_created, sent_total)
    return {'notices': notices_created, 'notifications': sent_total}


@shared_task(name='agenda.celery_tasks.send_calendar_event_reminders')
def send_calendar_event_reminders():
    """
    Kalendarga qo'lda qo'yilgan eslatmalarni vaqti kelganda yuboradi.

    Har besh daqiqada ishlaydi. `reminded_at` to'ldirilgan yozuv
    qayta yuborilmaydi; eski (bir kundan oshgan) eslatmalar esa
    umuman yuborilmaydi — worker uzoq o'chib qolsa, foydalanuvchi
    ertalab o'nlab eskirgan xabarni olmasligi kerak.
    """
    from agenda.models import CalendarEvent
    from notifications.services import create_notification

    now = timezone.now()
    stale_before = now - timedelta(hours=24)

    candidates = (
        CalendarEvent.objects.filter(
            reminded_at__isnull=True,
            remind_before_minutes__gt=0,
            start_at__gte=stale_before,
        )
        .select_related('owner', 'related_task')
        .prefetch_related('participants')
    )

    sent_total = 0
    for event in candidates:
        due_at = event.reminder_due_at
        if due_at is None or due_at > now:
            continue

        # Belgini avval qo'yamiz — takror yuborilmasligi uchun.
        updated = CalendarEvent.objects.filter(pk=event.pk, reminded_at__isnull=True).update(
            reminded_at=now
        )
        if not updated:
            continue

        when = timezone.localtime(event.start_at).strftime('%d.%m.%Y %H:%M')
        title = 'Kalendar eslatmasi'
        message = f"«{event.title}» — {when}" + (f", {event.location}" if event.location else '')
        link = (
            f'/dashboard/tasks/{event.related_task_id}'
            if event.related_task_id
            else '/dashboard/calendar'
        )

        recipients = [event.owner] + [
            p for p in event.participants.all() if p.id != event.owner_id
        ]
        for user in recipients:
            if getattr(user, 'status', '') != 'FAOL' or not user.is_active:
                continue
            if create_notification(
                user=user,
                title=title,
                message=message,
                notification_type='DEADLINE',
                related_task=event.related_task,
                link=link,
            ):
                sent_total += 1

    logger.info('send_calendar_event_reminders: %s bildirishnoma', sent_total)
    return {'notifications': sent_total}
