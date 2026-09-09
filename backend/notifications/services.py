"""
Notification service helpers.

Creates Notification rows and optionally broadcasts them via Channels
to connected clients (NotificationConsumer).
"""

from __future__ import annotations

import json
from typing import Iterable, Optional

from channels.layers import get_channel_layer
from core.realtime import emit_sync
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from core.constants import UserRole, UserStatus
from notifications.models import Notification, NotificationPreference, PushSubscription


def _notification_payload(notification: Notification) -> dict:
    return {
        "id": str(notification.id),
        "title": notification.title,
        "message": notification.message,
        "notification_type": notification.notification_type,
        "related_task": str(notification.related_task_id) if notification.related_task_id else None,
        "task_title": getattr(notification.related_task, "title", "") if notification.related_task_id else "",
        "is_read": notification.is_read,
        "read_at": notification.read_at.isoformat() if notification.read_at else None,
        "link": notification.link,
        "created_at": notification.created_at.isoformat() if getattr(notification, "created_at", None) else None,
    }


def _should_create_notification(*, user, notification_type: str) -> bool:
    preference, _ = NotificationPreference.objects.get_or_create(user=user)
    if notification_type == "TASK" and not preference.new_task_notifications_enabled:
        return False
    if notification_type == "DEADLINE" and not preference.deadline_reminders_enabled:
        return False
    return True


def _broadcast_notification(notification_id) -> None:
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    try:
        notification = Notification.objects.select_related("related_task").get(id=notification_id)
    except Notification.DoesNotExist:
        return

    # Redis yo'q bo'lsa bildirishnoma bazada qoladi va sahifa yangilanganda
    # ko'rinadi — so'rov 500 bermaydi.
    emit_sync(
        f"notifications_{notification.user_id}",
        {"type": "notification_message", "notification": _notification_payload(notification)},
    )


def _send_push_notification(notification_id) -> None:
    try:
        from pywebpush import webpush, WebPushException
    except Exception:
        return

    from django.conf import settings

    public_key = getattr(settings, 'WEB_PUSH_PUBLIC_KEY', '')
    private_key = getattr(settings, 'WEB_PUSH_PRIVATE_KEY', '') or getattr(settings, 'WEB_PUSH_PRIVATE_KEY_PATH', '')
    subject = getattr(settings, 'WEB_PUSH_SUBJECT', '')

    if not public_key or not private_key or not subject:
        return

    try:
        notification = Notification.objects.select_related("related_task", "user").get(id=notification_id)
    except Notification.DoesNotExist:
        return

    preference, _ = NotificationPreference.objects.get_or_create(user=notification.user)
    if not preference.push_notifications_enabled:
        return
    if notification.notification_type == "TASK" and not preference.new_task_notifications_enabled:
        return
    if notification.notification_type == "DEADLINE" and not preference.deadline_reminders_enabled:
        return

    subscriptions = list(
        PushSubscription.objects.filter(user=notification.user, is_active=True)
    )
    if not subscriptions:
        return

    payload = _notification_payload(notification)
    body = {
        "title": payload["title"],
        "body": payload["message"],
        "url": payload["link"] or (f"/dashboard/tasks/{payload['related_task']}" if payload["related_task"] else "/dashboard/notifications"),
        "tag": f"notification-{payload['id']}",
        "data": payload,
    }

    for subscription in subscriptions:
        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh,
                "auth": subscription.auth,
            },
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(body),
                vapid_private_key=private_key,
                vapid_claims={"sub": subject},
            )
            subscription.last_success_at = timezone.now()
            subscription.last_error = ''
            subscription.is_active = True
            subscription.save(update_fields=['last_success_at', 'last_error', 'is_active', 'updated_at'])
        except WebPushException as exc:
            status_code = getattr(getattr(exc, 'response', None), 'status_code', None)
            subscription.last_error = str(exc)
            if status_code in {404, 410}:
                subscription.is_active = False
            subscription.save(update_fields=['last_error', 'is_active', 'updated_at'])
        except Exception as exc:
            subscription.last_error = str(exc)
            subscription.save(update_fields=['last_error', 'updated_at'])


def create_notification(
    *,
    user,
    title: str,
    message: str,
    notification_type: str = "INFO",
    related_task=None,
    link: str = "",
) -> Optional[Notification]:
    if not _should_create_notification(user=user, notification_type=notification_type):
        return None

    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        related_task=related_task,
        link=link or "",
    )

    # Broadcast after commit to avoid race with clients fetching the list.
    transaction.on_commit(lambda: _broadcast_notification(notification.id))
    transaction.on_commit(lambda: _send_push_notification(notification.id))
    return notification


def notify_task_chat_message(
    *,
    task,
    sender,
    preview: str,
    link: Optional[str] = None,
) -> int:
    """
    Creates notifications for task chat messages for all participants except sender.
    Participants:
      - Admin roles (HOKIM, HOKIMLIK_MASUL, ADMIN)
      - Organization roles (TASHKILOT_RAHBARI, TASHKILOT_MASUL) within assigned organizations
    """
    from users.models import User

    org_ids = list(task.assigned_organizations.values_list("organization_id", flat=True))
    recipients = (
        User.objects.filter(status=UserStatus.FAOL, is_active=True)
        .filter(
            (
                # Admin roles see all tasks
                Q(role__in=UserRole.ADMIN_ROLES)
            )
            | (
                Q(role__in=UserRole.ORGANIZATION_ROLES, organization_id__in=org_ids)
            )
        )
        .exclude(id=sender.id)
        .distinct()
    )

    title = "Topshiriqda yangi xabar"
    safe_preview = (preview or "").strip()
    if safe_preview:
        safe_preview = safe_preview[:160] + ("..." if len(safe_preview) > 160 else "")
        msg = f'{sender.full_name} "{task.title}" topshirig\'iga xabar yozdi: {safe_preview}'
    else:
        msg = f'{sender.full_name} "{task.title}" topshirig\'iga yangi xabar yubordi.'

    target_link = link or f"/dashboard/tasks/{task.id}"
    created = 0
    for user in recipients:
        notification = create_notification(
            user=user,
            title=title,
            message=msg,
            notification_type="TASK",
            related_task=task,
            link=target_link,
        )
        if notification:
            created += 1
    return created


def notify_new_appeal(
    *,
    title: str,
    message: str,
    link: str,
    exclude_user_ids: Optional[Iterable] = None,
) -> int:
    """Notify all dashboard admin roles about a new appeal."""
    from users.models import User

    exclude_user_ids = set(exclude_user_ids or [])
    qs = User.objects.filter(status=UserStatus.FAOL, is_active=True, role__in=UserRole.ADMIN_ROLES)
    if exclude_user_ids:
        qs = qs.exclude(id__in=list(exclude_user_ids))

    created = 0
    for user in qs:
        notification = create_notification(user=user, title=title, message=message, notification_type="INFO", link=link)
        if notification:
            created += 1
    return created


def _appeal_recipients_queryset(*, appeal, include_assigned_orgs: bool = True):
    from users.models import User

    recipient_filter = Q(role__in=UserRole.ADMIN_ROLES)

    if include_assigned_orgs:
        org_ids = list(appeal.assigned_organizations.values_list("id", flat=True))
        if org_ids:
            recipient_filter |= Q(
                role__in=UserRole.ORGANIZATION_ROLES,
                organization_id__in=org_ids,
            )

    reviewer_user_id = getattr(getattr(appeal, "reviewed_by", None), "user_id", None)
    if reviewer_user_id:
        recipient_filter |= Q(id=reviewer_user_id)

    participant_ids = list(
        appeal.messages.filter(sender_user__isnull=False).values_list("sender_user_id", flat=True)
    )
    if participant_ids:
        recipient_filter |= Q(id__in=participant_ids)

    return (
        User.objects.filter(status=UserStatus.FAOL, is_active=True)
        .filter(recipient_filter)
        .distinct()
    )


def notify_appeal_status_update(
    *,
    appeal,
    title: str,
    message: str,
    exclude_user_ids: Optional[Iterable] = None,
    include_assigned_orgs: bool = True,
) -> int:
    exclude_user_ids = set(exclude_user_ids or [])
    link = f"/dashboard/appeals/{appeal.id}"
    recipients = _appeal_recipients_queryset(
        appeal=appeal,
        include_assigned_orgs=include_assigned_orgs,
    )
    if exclude_user_ids:
        recipients = recipients.exclude(id__in=list(exclude_user_ids))

    created = 0
    for user in recipients:
        notification = create_notification(
            user=user,
            title=title,
            message=message,
            notification_type="INFO",
            link=link,
        )
        if notification:
            created += 1
    return created


def notify_appeal_message(
    *,
    appeal,
    sender_name: str,
    preview: str,
    exclude_user_ids: Optional[Iterable] = None,
) -> int:
    safe_preview = (preview or "").strip()
    if safe_preview:
        safe_preview = safe_preview[:160] + ("..." if len(safe_preview) > 160 else "")
        message = f'#{appeal.appeal_number} bo\'yicha {sender_name} yangi xabar yubordi: {safe_preview}'
    else:
        message = f"#{appeal.appeal_number} bo'yicha {sender_name} yangi xabar yubordi."

    return notify_appeal_status_update(
        appeal=appeal,
        title="Murojaatda yangi xabar",
        message=message,
        exclude_user_ids=exclude_user_ids,
    )


def notify_appeal_feedback(
    *,
    appeal,
    rating: Optional[int],
    exclude_user_ids: Optional[Iterable] = None,
) -> int:
    stars = ("⭐" * rating) if rating else "bahosiz"
    message = f"#{appeal.appeal_number} murojaati fuqaro tomonidan {stars} bilan yakunlandi."
    return notify_appeal_status_update(
        appeal=appeal,
        title="Murojaat baholandi",
        message=message,
        exclude_user_ids=exclude_user_ids,
    )


def notify_project_update(
    *,
    project,
    title: str,
    message: str,
    exclude_user_ids: Optional[Iterable] = None,
) -> int:
    from users.models import User

    exclude_user_ids = set(exclude_user_ids or [])
    recipients = User.objects.filter(
        status=UserStatus.FAOL,
        is_active=True,
        role__in=UserRole.PROJECT_MANAGER_ROLES,
    )
    if exclude_user_ids:
        recipients = recipients.exclude(id__in=list(exclude_user_ids))

    created = 0
    for user in recipients.distinct():
        create_notification(
            user=user,
            title=title,
            message=message,
            notification_type="INFO",
            link=f"/dashboard/projects/{project.id}",
        )
        created += 1
    return created
