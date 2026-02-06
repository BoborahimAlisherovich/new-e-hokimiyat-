from rest_framework import serializers
from .models import SystemSettings


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = [
            'id',
            'system_name',
            'maintenance_mode',
            'welcome_message',
            'footer_text',
            'max_upload_size_mb',
            'allowed_file_types',
            'created_at',
            'updated_at',
        ]
