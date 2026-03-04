"""
OneID integratsiya admin paneli.
"""

from django.contrib import admin
from .models import OneIDToken, OneIDSession, OneIDUserLog


@admin.register(OneIDToken)
class OneIDTokenAdmin(admin.ModelAdmin):
    """OneID token admin paneli."""
    
    list_display = [
        'user', 'oneid_user_id', 'is_active', 'expires_at', 
        'created_at', 'session_id'
    ]
    list_filter = ['is_active', 'created_at', 'expires_at']
    search_fields = ['user__pnfl', 'user__first_name', 'user__last_name', 'oneid_user_id']
    readonly_fields = ['session_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Asosiy ma\'lumotlar', {
            'fields': ('user', 'oneid_user_id', 'session_id')
        }),
        ('Token ma\'lumotlari', {
            'fields': ('access_token', 'refresh_token', 'expires_at', 'is_active')
        }),
        ('Vaqt ma\'lumotlari', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """Tokenlarni faqat o'qish rejimida ko'rsatish."""
        if obj:  # Mavjud obyekt uchun
            return self.readonly_fields + ['access_token', 'refresh_token']
        return self.readonly_fields


@admin.register(OneIDSession)
class OneIDSessionAdmin(admin.ModelAdmin):
    """OneID sessiya admin paneli."""
    
    list_display = [
        'session_id', 'user', 'pnfl', 'status', 'ip_address', 
        'created_at'
    ]
    list_filter = ['status', 'created_at', 'ip_address']
    search_fields = [
        'user__pnfl', 'user__first_name', 'user__last_name', 
        'pnfl', 'session_id', 'state'
    ]
    readonly_fields = [
        'session_id', 'state', 'authorization_code', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Asosiy ma\'lumotlar', {
            'fields': ('user', 'pnfl', 'status', 'session_id', 'state')
        }),
        ('OneID ma\'lumotlari', {
            'fields': ('authorization_code', 'redirect_uri')
        }),
        ('Xatolik ma\'lumotlari', {
            'fields': ('error_code', 'error_message'),
            'classes': ('collapse',)
        }),
        ('Tekshirish ma\'lumotlari', {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
        ('Vaqt ma\'lumotlari', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_delete_permission(self, request, obj=None):
        """Sessiyalarni o'chirishga ruxsat berish."""
        return request.user.is_superuser


@admin.register(OneIDUserLog)
class OneIDUserLogAdmin(admin.ModelAdmin):
    """OneID log admin paneli."""
    
    list_display = [
        'user', 'action', 'success', 'oneid_user_id', 
        'ip_address', 'created_at'
    ]
    list_filter = ['action', 'success', 'created_at', 'ip_address']
    search_fields = [
        'user__pnfl', 'user__first_name', 'user__last_name',
        'oneid_user_id', 'error_message'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Asosiy ma\'lumotlar', {
            'fields': ('user', 'action', 'success', 'oneid_user_id')
        }),
        ('Ma\'lumotlar o\'zgarishi', {
            'fields': ('old_data', 'new_data'),
            'classes': ('collapse',)
        }),
        ('Xatolik ma\'lumotlari', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
        ('Tekshirish ma\'lumotlari', {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
        ('Vaqt ma\'lumotlari', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_delete_permission(self, request, obj=None):
        """Loglarni o'chirishga faqat superuserga ruxsat berish."""
        return request.user.is_superuser
    
    def has_add_permission(self, request):
        """Loglarni qo'shishga ruxsat berilmasin."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Loglarni o'zgartirishga ruxsat berilmasin."""
        return False
