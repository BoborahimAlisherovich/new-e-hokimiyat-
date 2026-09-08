"""
Notification serializers for E-Hokimiyat API.
"""

from rest_framework import serializers
from .models import Notification, NotificationPreference, PushSubscription


class NotificationSerializer(serializers.ModelSerializer):
    """
    Notification serializer.
    """
    type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    task_title = serializers.CharField(source='related_task.title', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type', 'type_display',
            'related_task', 'task_title', 'is_read', 'read_at',
            'link', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = [
            'id',
            'endpoint',
            'p256dh',
            'auth',
            'user_agent',
            'is_active',
            'last_success_at',
            'last_error',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'last_success_at', 'last_error', 'created_at', 'updated_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'email_notifications_enabled',
            'telegram_notifications_enabled',
            'push_notifications_enabled',
            'new_task_notifications_enabled',
            'deadline_reminders_enabled',
        ]
