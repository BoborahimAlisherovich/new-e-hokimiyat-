"""
User admin configuration.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, UserAssignment


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['pnfl', 'full_name', 'role', 'organization', 'status', 'created_at']
    list_filter = ['role', 'status', 'organization']
    search_fields = ['pnfl', 'first_name', 'last_name', 'email']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('pnfl', 'password')}),
        ('Shaxsiy ma\'lumotlar', {'fields': ('first_name', 'last_name', 'middle_name', 'phone', 'email')}),
        ('Rol va tashkilot', {'fields': ('role', 'organization', 'position')}),
        ('Holat', {'fields': ('status', 'oneid_connected', 'is_active', 'is_staff')}),
        ('Muhim sanalar', {'fields': ('created_at', 'activated_at', 'first_login_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('pnfl', 'first_name', 'last_name', 'role', 'organization', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ['created_at', 'activated_at', 'first_login_at']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'display_name']


@admin.register(UserAssignment)
class UserAssignmentAdmin(admin.ModelAdmin):
    list_display = ['assigned_user', 'assigned_by', 'assigned_role', 'created_at']
    list_filter = ['assigned_role', 'created_at']
