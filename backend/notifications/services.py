"""
Notification service helpers.

Creates Notification rows and optionally broadcasts them via Channels
to connected clients (NotificationConsumer).
"""

from __future__ import annotations

from typing import Iterable, Optional

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import Q

from core.constants import UserRole, UserStatus
from notifications.models import Notification


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


def _broadcast_notification(notification_id) -> None:
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    try:
        notification = Notification.objects.select_related("related_task").get(id=notification_id)
    except Notification.DoesNotExist:
        return

    async_to_sync(channel_layer.group_send)(
        f"notifications_{notification.user_id}",
        {"type": "notification_message", "notification": _notification_payload(notification)},
    )


def create_notification(
    *,
    user,
    title: str,
    message: str,
    notification_type: str = "INFO",
    related_task=None,
    link: str = "",
) -> Notification:
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
        create_notification(
            user=user,
            title=title,
            message=msg,
            notification_type="TASK",
            related_task=task,
            link=target_link,
        )
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
        create_notification(user=user, title=title, message=message, notification_type="INFO", link=link)
        created += 1
    return created
