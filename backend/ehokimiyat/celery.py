"""
Celery configuration for E-Hokimiyat.

Background tasks:
- Check overdue tasks every 10 minutes
- Send notifications
- Generate reports
"""

import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ehokimiyat.settings')

app = Celery('ehokimiyat')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

app.conf.beat_schedule = {
    # Mavjud task-lar
    'check-overdue-tasks': {
        'task': 'tasks.celery_tasks.check_overdue_tasks',
        'schedule': crontab(minute='*/10'),
    },
    # ESLATMALAR — `agenda` ilovasida.
    # Eski `tasks.celery_tasks.send_deadline_reminders` ataylab ro'yxatdan
    # OLIB TASHLANDI: u oyna bo'yicha ishlagani uchun takroriy xabar
    # yuborardi va faqat tashkilot xodimlariga borardi (hokim ham,
    # mas'ul yordamchi ham xabardor bo'lmasdi). Funksiyaning o'zi
    # `tasks` ichida qoldirildi — eski chaqiruvlar sinmasligi uchun.
    #
    # Muddatga 3 / 2 / 1 / 0 kun qolganda — ijrochi, mas'ul yordamchi,
    # (1 kun va undan kam qolganda) hokim.
    'send-task-deadline-reminders': {
        'task': 'agenda.celery_tasks.send_task_deadline_reminders',
        'schedule': crontab(hour='8', minute='30'),
    },
    # Muddat o'tganda — hokimga «bu tashkilot bajarmadi» xabari.
    # Soatda bir marta: kechikish hokimga darrov ko'rinishi kerak,
    # lekin har daqiqada baza aylantirilmasin.
    'notify-overdue-tasks': {
        'task': 'agenda.celery_tasks.notify_overdue_tasks',
        'schedule': crontab(minute='5'),
    },
    # Kalendarga qo'lda qo'yilgan eslatmalar
    'send-calendar-event-reminders': {
        'task': 'agenda.celery_tasks.send_calendar_event_reminders',
        'schedule': crontab(minute='*/5'),
    },


    # Takrorlanuvchi topshiriqlar
    'process-recurring-tasks': {
        'task': 'core.tasks.process_recurring_tasks',
        'schedule': crontab(minute='0'),  # Har soatda
    },
    
    # AI Monitoring
    'ai-monitor-tasks': {
        'task': 'core.tasks.ai_monitor_tasks',
        'schedule': crontab(minute='*/30'),  # Har 30 daqiqada
    },
    
    # AI sharx tahlili
    'ai-analyze-comments': {
        'task': 'core.tasks.ai_analyze_comments',
        'schedule': crontab(hour='8', minute='0'),  # Har kuni 8:00 da
    },
    
    # Kunlik hisobot
    'generate-daily-report': {
        'task': 'core.tasks.generate_daily_report',
        'schedule': crontab(hour='7', minute='0'),  # Har kuni 7:00 da
    },
    
    # Murojaatlar tekshiruvi
    'check-appeal-resolution': {
        'task': 'core.tasks.check_appeal_resolution',
        'schedule': crontab(minute='0', hour='*/2'),  # Har 2 soatda
    },
    
    # AI avtomatik javob - admin javob bermasa
    'auto-respond-unanswered-appeals': {
        'task': 'core.tasks.auto_respond_unanswered_appeals',
        'schedule': crontab(minute='*/2'),  # Har 2 daqiqada tekshirish
    },
    
    # Eski ma'lumotlarni tozalash
    'cleanup-old-data': {
        'task': 'core.tasks.cleanup_old_data',
        'schedule': crontab(hour='3', minute='0', day_of_week='sunday'),  # Yakshanba 3:00 da
    },
}

app.conf.timezone = 'Asia/Tashkent'
