"""
Notification admin configuration.
"""

from django.contrib import admin
from .models import Notification, NotificationPreference, PushSubscription


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['title', 'message']
    ordering = ['-created_at']


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_active', 'last_success_at', 'updated_at']
    list_filter = ['is_active', 'created_at', 'updated_at']
    search_fields = ['user__first_name', 'user__last_name', 'user__login', 'endpoint']
    ordering = ['-updated_at']


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        'user',
        'email_notifications_enabled',
        'telegram_notifications_enabled',
        'push_notifications_enabled',
        'new_task_notifications_enabled',
        'deadline_reminders_enabled',
    ]
    list_filter = [
        'email_notifications_enabled',
        'telegram_notifications_enabled',
        'push_notifications_enabled',
        'new_task_notifications_enabled',
        'deadline_reminders_enabled',
    ]
    search_fields = ['user__first_name', 'user__last_name', 'user__login']
