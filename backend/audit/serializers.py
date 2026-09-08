"""
Audit serializers for E-Hokimiyat API.
"""

from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Audit log serializer.
    """
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    entity_type_display = serializers.CharField(source='get_entity_type_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'action_display',
            'entity_type', 'entity_type_display', 'entity_id',
            'description', 'old_values', 'new_values',
            'ip_address', 'created_at'
        ]
