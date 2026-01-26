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
    'check-overdue-tasks': {
        'task': 'tasks.celery_tasks.check_overdue_tasks',
        'schedule': crontab(minute='*/10'),
    },
    'send-deadline-reminders': {
        'task': 'tasks.celery_tasks.send_deadline_reminders',
        'schedule': crontab(hour='9', minute='0'),
    },
}

app.conf.timezone = 'Asia/Tashkent'
