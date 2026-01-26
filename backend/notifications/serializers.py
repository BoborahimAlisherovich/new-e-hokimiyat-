"""
Notification serializers for E-Hokimiyat API.
"""

from rest_framework import serializers
from .models import Notification


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
