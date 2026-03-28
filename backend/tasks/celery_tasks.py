"""
Celery tasks for E-Hokimiyat task management.
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta


@shared_task
def check_overdue_tasks():
    """
    Check for overdue tasks and update their status.
    
    Runs every 10 minutes via Celery Beat.
    
    Status transitions:
    - IJRODA -> MUDDATI_KECH (if deadline passed)
    - MUDDATI_KECH -> BAJARILMADI (if 7 days past deadline)
    """
    from tasks.models import Task, TaskOrganization
    from audit.models import AuditLog
    from notifications.models import Notification
    
    now = timezone.now()
    seven_days_ago = now - timedelta(days=7)
    
    updated_to_overdue = 0
    updated_to_failed = 0
    
    # Mark tasks as overdue
    overdue_task_orgs = TaskOrganization.objects.filter(
        status__in=['YANGI', 'IJRODA', 'QAYTA_IJROGA_YUBORILDI'],
        task__deadline__lt=now
    )

    touched_task_ids = set()
    
    for task_org in overdue_task_orgs:
        old_status = task_org.status
        task_org.status = 'MUDDATI_KECH'
        task_org.save()
        updated_to_overdue += 1
        touched_task_ids.add(task_org.task_id)
        
        AuditLog.log(
            user=None,
            action='TASK_OVERDUE',
            entity_type='TASK_ORGANIZATION',
            entity_id=task_org.id,
            description=f"Topshiriq muddati o'tdi: {task_org.task.title}",
            old_values={'status': old_status},
            new_values={'status': task_org.status}
        )
        
        # Notify organization employees
        for user in task_org.organization.employees.filter(
            status='FAOL',
            role__in=['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']
        ):
            Notification.objects.create(
                user=user,
                title="Topshiriq muddati o'tdi!",
                message=f"Topshiriq muddati o'tdi: {task_org.task.title}",
                notification_type='DEADLINE',
                related_task=task_org.task,
                link=f'/dashboard/tasks/{task_org.task.id}'
            )
    
    # Mark severely overdue tasks as failed
    failed_task_orgs = TaskOrganization.objects.filter(
        status='MUDDATI_KECH',
        task__deadline__lt=seven_days_ago
    )
    
    for task_org in failed_task_orgs:
        old_status = task_org.status
        task_org.status = 'BAJARILMADI'
        task_org.save()
        updated_to_failed += 1
        touched_task_ids.add(task_org.task_id)
        
        AuditLog.log(
            user=None,
            action='TASK_OVERDUE',
            entity_type='TASK_ORGANIZATION',
            entity_id=task_org.id,
            description=f"Topshiriq bajarilmadi: {task_org.task.title}",
            old_values={'status': old_status},
            new_values={'status': task_org.status}
        )

    # Sync parent Task.status for creator/admin dashboards
    for task in Task.objects.filter(id__in=touched_task_ids):
        task.sync_status_from_assignments()
    
    return {
        'overdue': updated_to_overdue,
        'failed': updated_to_failed
    }


@shared_task
def send_deadline_reminders():
    """
    Send reminders for tasks approaching deadline.
    
    Runs daily at 9:00 AM.
    Sends reminders for tasks due in 1, 3, and 7 days.
    """
    from tasks.models import TaskOrganization
    from notifications.models import Notification
    
    now = timezone.now()
    
    reminder_days = [1, 3, 7]
    reminders_sent = 0
    
    for days in reminder_days:
        deadline_start = now + timedelta(days=days)
        deadline_end = deadline_start + timedelta(days=1)
        
        task_orgs = TaskOrganization.objects.filter(
            status__in=['YANGI', 'IJRODA'],
            task__deadline__gte=deadline_start,
            task__deadline__lt=deadline_end
        )
        
        for task_org in task_orgs:
            for user in task_org.organization.employees.filter(
                status='FAOL',
                role__in=['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']
            ):
                Notification.objects.create(
                    user=user,
                    title=f"Topshiriq muddati {days} kun qoldi",
                    message=f"Topshiriq: {task_org.task.title}",
                    notification_type='DEADLINE',
                    related_task=task_org.task,
                    link=f'/dashboard/tasks/{task_org.task.id}'
                )
                reminders_sent += 1
    
    return {'reminders_sent': reminders_sent}


@shared_task
def send_notification_async(user_id, title, message, notification_type='INFO', task_id=None, link=''):
    """
    Send notification asynchronously.
    """
    from notifications.models import Notification
    from users.models import User
    from tasks.models import Task
    
    try:
        user = User.objects.get(id=user_id)
        task = Task.objects.get(id=task_id) if task_id else None
        
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            related_task=task,
            link=link
        )
        return True
    except Exception as e:
        return str(e)
