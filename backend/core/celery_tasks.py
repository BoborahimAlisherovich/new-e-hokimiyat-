"""
Celery Tasks - Fon vazifalar.

Bu modul quyidagi vazifalarni bajaradi:
- Takrorlanuvchi topshiriqlarni yaratish
- AI monitoring
- Bildirishnomalar yuborish
- Ma'lumotlar tozalash
"""
from typing import Any

from celery import shared_task
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(name='core.tasks.process_recurring_tasks')
def process_recurring_tasks():
    """
    Takrorlanuvchi topshiriqlarni tekshirish va yaratish.
    Har soatda ishga tushadi.
    """
    from tasks.models import RecurringTask
    
    now = timezone.now()
    logger.info(f"Processing recurring tasks at {now}")
    
    # Faol va vaqti kelgan takrorlanuvchi topshiriqlar
    recurring_tasks = RecurringTask.objects.filter(
        status='ACTIVE',
        next_run_date__lte=now
    ).filter(
        Q(end_date__isnull=True) | Q(end_date__gt=now.date())
    )
    
    created_count = 0
    
    for recurring in recurring_tasks:
        try:
            # Topshiriq yaratish
            task = recurring.create_task_instance()
            if task:
                created_count += 1
                logger.info(f"Created task #{task.id} from recurring #{recurring.id}")
                
                # Bildirishnoma yuborish
                send_recurring_task_notification.delay(recurring.id, task.id)  # type: ignore
        except Exception as e:
            logger.error(f"Error creating task from recurring #{recurring.id}: {e}")
    
    logger.info(f"Created {created_count} tasks from recurring tasks")
    return created_count


@shared_task(name='core.tasks.send_recurring_task_notification')
def send_recurring_task_notification(recurring_id: int, task_id: int):
    """Takrorlanuvchi topshiriq yaratilganda bildirishnoma yuborish"""
    from tasks.models import RecurringTask, Task
    from notifications.models import Notification
    
    try:
        recurring = RecurringTask.objects.get(id=recurring_id)
        task = Task.objects.get(id=task_id)
        
        # Yaratuvchiga bildirishnoma
        if recurring.created_by:
            Notification.objects.create(
                user=recurring.created_by,
                title="Takrorlanuvchi topshiriq yaratildi",
                message=f"'{recurring.title}' nomli takrorlanuvchi topshiriqdan #{task.id} topshiriq yaratildi.",
                type="TASK",
                task=task
            )
        
        # Tayinlangan tashkilotlarga bildirishnoma
        for org in recurring.organizations.all():
            for user in org.users.all():
                Notification.objects.create(
                    user=user,
                    title="Yangi topshiriq",
                    message=f"Sizga '{task.title}' nomli topshiriq tayinlandi.",
                    type="TASK",
                    task=task
                )
    except Exception as e:
        logger.error(f"Notification error: {e}")


@shared_task(name='core.tasks.ai_monitor_tasks')
def ai_monitor_tasks():
    """
    AI task monitoring.
    Har 30 daqiqada ishga tushadi.
    """
    from core.ai_service import AIService
    
    ai_service = AIService()
    alerts = ai_service.monitor_tasks()
    
    logger.info(f"AI monitoring completed. Found {len(alerts)} alerts")
    
    # Ogohlantirishlarni yuborish
    for alert in alerts:
        send_ai_alert.delay(alert)  # type: ignore
    
    return len(alerts)


@shared_task(name='core.tasks.send_ai_alert')
def send_ai_alert(alert: dict):
    """AI ogohlantirish yuborish"""
    from tasks.models import Task
    from notifications.models import Notification
    
    try:
        task = Task.objects.get(id=alert['task_id'])
        alert_type = alert.get('alert_type', 'GENERAL')
        
        title_map = {
            'DEADLINE_APPROACHING': "⚠️ Muddat yaqinlashmoqda",
            'OVERDUE': "🔴 Muddat o'tdi",
            'STALLED': "⏸️ Topshiriq to'xtadi",
        }
        
        title = title_map.get(alert_type, "AI Ogohlantirish")
        message = f"Topshiriq: {task.title}\nMuddat: {alert.get('deadline', 'Noma\'lum')}"
        
        # Yaratuvchiga
        if task.created_by:
            Notification.objects.create(
                user=task.created_by,
                title=title,
                message=message,
                type="SYSTEM",
                task=task,
                priority="HIGH"
            )
        
        # Mas'ul xodimlarga
        for assignment in task.assigned_organizations.all():  # type: ignore
            for user in assignment.organization.users.all():
                Notification.objects.create(
                    user=user,
                    title=title,
                    message=message,
                    type="SYSTEM",
                    task=task,
                    priority="HIGH"
                )
    except Exception as e:
        logger.error(f"AI alert error: {e}")


@shared_task(name='core.tasks.ai_analyze_comments')
def ai_analyze_comments():
    """
    Topshiriq xabarlarini tahlil qilish.
    Kuniga 1 marta ishga tushadi.
    """
    from tasks.models import Task, TaskMessage
    from core.ai_service import AIService
    from core.models import AITaskMonitor
    
    ai_service = AIService()
    
    # Oxirgi 24 soatda xabar qo'shilgan topshiriqlar
    yesterday = timezone.now() - timedelta(days=1)
    tasks_with_messages = Task.objects.filter(
        status__in=['IJRODA', 'TEKSHIRILMOQDA'],
        messages__created_at__gte=yesterday
    ).distinct()
    
    analyzed_count = 0
    
    for task in tasks_with_messages:
        try:
            result = ai_service.analyze_task_comments(task)
            
            # Monitoring yangilash
            monitor, _ = AITaskMonitor.objects.get_or_create(task=task)
            monitor.comments_analyzed = True
            monitor.comments_analysis_result = result
            monitor.ai_notes = result.get('recommendation', '')
            monitor.save()
            
            # Agar hal bo'lgan bo'lsa
            if result.get('is_resolved') and result.get('confidence', 0) > 0.7:
                # Yaratuvchiga ogohlantirish yuborish
                send_resolution_alert.delay(task.id, result)  # type: ignore
            
            analyzed_count += 1
        except Exception as e:
            logger.error(f"Comment analysis error for task #{task.id}: {e}")
    
    logger.info(f"Analyzed comments for {analyzed_count} tasks")
    return analyzed_count


@shared_task(name='core.tasks.send_resolution_alert')
def send_resolution_alert(task_id: int, analysis_result: dict):
    """Topshiriq hal bo'lganligi haqida ogohlantirish"""
    from tasks.models import Task
    from notifications.models import Notification
    
    try:
        task = Task.objects.get(id=task_id)
        
        message = f"""
Topshiriq: {task.title}

AI tahlili shuni ko'rsatadiki, bu topshiriq hal bo'lgan bo'lishi mumkin.
Ishonchlilik darajasi: {int(analysis_result.get('confidence', 0) * 100)}%

Sabab: {analysis_result.get('reason', 'Noma\'lum')}

Agar topshiriq haqiqatan ham hal bo'lgan bo'lsa, nazoratdan yechishingiz mumkin.
"""
        
        if task.created_by:
            Notification.objects.create(
                user=task.created_by,
                title="🤖 AI: Topshiriq hal bo'lgan bo'lishi mumkin",
                message=message,
                type="SYSTEM",
                task=task
            )
    except Exception as e:
        logger.error(f"Resolution alert error: {e}")


@shared_task(name='core.tasks.generate_daily_report')
def generate_daily_report():
    """
    Kunlik hisobot yaratish.
    Har kuni ertalab ishga tushadi.
    """
    from core.ai_service import AIService
    from core.models import AIReport, AIAction
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    ai_service = AIService()
    
    # Hokim foydalanuvchini olish
    try:
        hokim = User.objects.filter(role='HOKIM').first()
        if not hokim:
            hokim = User.objects.filter(is_superuser=True).first()
    except Exception:
        hokim = None
    
    params = {
        'report_type': 'DAILY_SUMMARY',
        'period_days': 1
    }
    
    # Action yaratish
    action = AIAction.objects.create(
        action_type='GENERATE_REPORT',
        status='IN_PROGRESS',
        parameters=params,
        initiated_by=hokim
    )
    
    try:
        result = ai_service._generate_report(params, hokim, None)
        action.status = 'COMPLETED'
        action.result = result
        action.executed_at = timezone.now()
        action.save()
        
        logger.info(f"Daily report generated: {result.get('report_id')}")
        return result
    except Exception as e:
        action.status = 'FAILED'
        action.result = {'error': str(e)}
        action.save()
        logger.error(f"Daily report error: {e}")
        raise


@shared_task(name='core.tasks.cleanup_old_data')
def cleanup_old_data():
    """
    Eski ma'lumotlarni tozalash.
    Haftada 1 marta ishga tushadi.
    """
    from core.models import AIMessage, AIConversation
    from notifications.models import Notification
    
    # 90 kundan eski AI suhbatlar
    old_conversations_date = timezone.now() - timedelta(days=90)
    old_conversations = AIConversation.objects.filter(
        updated_at__lt=old_conversations_date
    )
    deleted_conversations = old_conversations.count()
    old_conversations.delete()
    
    # 30 kundan eski o'qilgan bildirishnomalar
    old_notifications_date = timezone.now() - timedelta(days=30)
    old_notifications = Notification.objects.filter(
        is_read=True,
        created_at__lt=old_notifications_date
    )
    deleted_notifications = old_notifications.count()
    old_notifications.delete()
    
    logger.info(f"Cleanup: {deleted_conversations} conversations, {deleted_notifications} notifications deleted")
    
    return {
        'deleted_conversations': deleted_conversations,
        'deleted_notifications': deleted_notifications
    }


@shared_task(name='core.tasks.check_appeal_resolution')
def check_appeal_resolution():
    """
    Murojaatlar sharxlarini tekshirish va hal bo'lganlarni aniqlash.
    Har 2 soatda ishga tushadi.
    """
    from telegram_bot.models import TelegramAppeal, AppealMessage
    from core.ai_service import AIService
    
    ai_service = AIService()
    
    # Ko'rib chiqilayotgan murojaatlar
    pending_appeals = TelegramAppeal.objects.filter(
        status__in=['in_progress', 'pending_review']
    )
    
    resolved_count = 0
    
    for appeal in pending_appeals:
        # Oxirgi xabarni tekshirish
        last_message = AppealMessage.objects.filter(appeal=appeal).order_by('-created_at').first()
        
        if last_message and last_message.is_from_admin:
            # Admin javob bergan - foydalanuvchi javobini kutish
            # Agar 48 soat o'tsa va javob bo'lmasa, hal etilgan deb belgilash
            time_since_reply = timezone.now() - last_message.created_at
            if time_since_reply > timedelta(hours=48):
                appeal.status = 'resolved'
                appeal.closed_at = timezone.now()
                appeal.save()
                resolved_count += 1
                
                logger.info(f"Auto-resolved appeal #{appeal.appeal_number}")
    
    logger.info(f"Checked appeals, auto-resolved: {resolved_count}")
    return resolved_count
