"""
Core admin configuration.
"""

from django.contrib import admin
from .models import SystemSettings

@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ("system_name", "maintenance_mode", "updated_at")
    fieldsets = (
        ("Asosiy", {
            "fields": ("system_name", "maintenance_mode", "welcome_message", "footer_text")
        }),
        ("Cheklovlar", {
            "fields": ("max_upload_size_mb", "allowed_file_types")
        }),
    )

    def has_add_permission(self, request):
        # Allow adding only if no instance exists
        return not SystemSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Prevent deleting the settings
        return False
