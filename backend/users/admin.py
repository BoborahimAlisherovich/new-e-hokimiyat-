"""
User admin configuration.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Role, UserAssignment


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['login', 'pnfl', 'full_name', 'role', 'organization', 'status', 'created_at']
    list_filter = ['role', 'status', 'organization']
    search_fields = ['login', 'pnfl', 'first_name', 'last_name', 'email']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('login', 'pnfl', 'password')}),
        ('Shaxsiy ma\'lumotlar', {'fields': ('first_name', 'last_name', 'middle_name', 'phone', 'email')}),
        # `sector` va `supervisor` admin'da umuman ko'rinmasdi — ular esa
        # topshiriq berish doirasini belgilaydi. `curated_organizations`
        # to'ldirilsa doira soha o'rniga aynan shu tashkilotlar bo'ladi.
        ('Rol va vakolat doirasi', {
            'fields': ('role', 'sector', 'organization', 'supervisor', 'position',
                       'curated_organizations'),
            'description': (
                "Hokim o'rinbosari / hokimlik mas'uli topshiriqni faqat o'z sohasidagi "
                "tashkilotlarga bera oladi. Alohida tashkilotlarga biriktirish kerak bo'lsa — "
                "«Biriktirilgan tashkilotlar»ni to'ldiring: shunda doira faqat ular bo'ladi."
            ),
        }),
        ('Holat', {'fields': ('status', 'is_active', 'is_staff')}),
        ('Muhim sanalar', {'fields': ('created_at', 'activated_at', 'first_login_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('login', 'pnfl', 'first_name', 'last_name', 'role', 'organization', 'password1', 'password2'),
        }),
    )
    
    readonly_fields = ['created_at', 'activated_at', 'first_login_at']
    filter_horizontal = ['curated_organizations']
    autocomplete_fields = ['supervisor']


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'display_name']


@admin.register(UserAssignment)
class UserAssignmentAdmin(admin.ModelAdmin):
    list_display = ['assigned_user', 'assigned_by', 'assigned_role', 'created_at']
    list_filter = ['assigned_role', 'created_at']
