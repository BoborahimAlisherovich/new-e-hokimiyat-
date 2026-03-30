from django.contrib import admin
from .models import (
    BotSettings, BotAdmin, BotRegion, TelegramUser, 
    AppealCategory, AppealType, TelegramAppeal, 
    AppealAttachment, AppealMessage, UserState
)


@admin.register(BotSettings)
class BotSettingsAdmin(admin.ModelAdmin):
    list_display = ['bot_username', 'is_active', 'ai_provider', 'use_webhook', 'updated_at']
    fieldsets = (
        ('Bot sozlamalari', {
            'fields': ('bot_token', 'bot_username', 'is_active')
        }),
        ('Webhook', {
            'fields': ('use_webhook', 'webhook_url'),
            'classes': ('collapse',)
        }),
        ("Sun'iy intellekt", {
            'fields': ('ai_provider', 'ai_api_key', 'ai_model')
        }),
        ('Xabar shablonlari', {
            'fields': (
                'welcome_message_uz', 'welcome_message_ru', 'welcome_message_en',
                'about_text_uz', 'about_text_ru', 'about_text_en',
                'help_text_uz', 'help_text_ru', 'help_text_en'
            ),
            'classes': ('collapse',)
        }),
    )


@admin.register(BotAdmin)
class BotAdminAdmin(admin.ModelAdmin):
    list_display = ['telegram_id', 'full_name', 'username', 'is_active', 'is_super_admin']
    list_filter = ['is_active', 'is_super_admin']
    search_fields = ['telegram_id', 'username', 'full_name']


@admin.register(BotRegion)
class BotRegionAdmin(admin.ModelAdmin):
    list_display = ['name_uz', 'code', 'is_active', 'order']
    list_editable = ['order', 'is_active']
    ordering = ['order']


@admin.register(TelegramUser)
class TelegramUserAdmin(admin.ModelAdmin):
    list_display = ['telegram_id', 'first_name', 'last_name', 'gender', 'phone', 'region', 'is_registered', 'language']
    list_filter = ['is_registered', 'gender', 'language', 'region']
    search_fields = ['telegram_id', 'first_name', 'last_name', 'phone']
    readonly_fields = ['telegram_id', 'created_at', 'updated_at']


@admin.register(AppealCategory)
class AppealCategoryAdmin(admin.ModelAdmin):
    list_display = ['icon', 'name_uz', 'code', 'is_active', 'order']
    list_editable = ['order', 'is_active']
    ordering = ['order']
    filter_horizontal = ['responsible_organizations']


@admin.register(AppealType)
class AppealTypeAdmin(admin.ModelAdmin):
    list_display = ['icon', 'name_uz', 'code', 'is_active', 'order']
    list_editable = ['order', 'is_active']
    ordering = ['order']


class AppealAttachmentInline(admin.TabularInline):
    model = AppealAttachment
    extra = 0
    readonly_fields = ['telegram_file_id', 'file_type', 'file_size']


class AppealMessageInline(admin.TabularInline):
    model = AppealMessage
    extra = 0
    readonly_fields = ['is_from_admin', 'admin', 'created_at']


@admin.register(TelegramAppeal)
class TelegramAppealAdmin(admin.ModelAdmin):
    list_display = ['appeal_number', 'telegram_user', 'user_gender', 'appeal_type', 'category', 'status', 'priority', 'created_at']
    list_filter = ['status', 'priority', 'appeal_type', 'category', 'source', 'forwarded_to_site']
    search_fields = ['appeal_number', 'text', 'telegram_user__first_name', 'telegram_user__last_name']
    readonly_fields = ['uuid', 'appeal_number', 'created_at', 'updated_at', 'ai_analysis']
    inlines = [AppealAttachmentInline, AppealMessageInline]
    
    fieldsets = (
        ('Asosiy', {
            'fields': ('uuid', 'appeal_number', 'telegram_user', 'status', 'priority', 'source')
        }),
        ('Murojaat', {
            'fields': ('appeal_type', 'category', 'text')
        }),
        ('AI tahlili', {
            'fields': ('ai_analysis', 'ai_priority', 'ai_category_suggestion', 'ai_is_valid', 'ai_rejection_reason', 'ai_response'),
            'classes': ('collapse',)
        }),
        ('Admin javobi', {
            'fields': ('admin_response', 'reviewed_by', 'reviewed_at')
        }),
        ('Sayt integratsiyasi', {
            'fields': ('forwarded_to_site', 'site_appeal_id', 'site_task_id'),
            'classes': ('collapse',)
        }),
        ('Vaqtlar', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    @admin.display(description='Jinsi')
    def user_gender(self, obj):
        if not obj.telegram_user:
            return '-'
        return obj.telegram_user.get_gender_display()


@admin.register(UserState)
class UserStateAdmin(admin.ModelAdmin):
    list_display = ['telegram_id', 'state', 'updated_at']
    search_fields = ['telegram_id']
