from rest_framework import serializers
from .models import (
    BotSettings, BotAdmin, BotRegion, TelegramUser,
    AppealCategory, AppealType, TelegramAppeal,
    AppealAttachment, AppealMessage
)


class BotSettingsSerializer(serializers.ModelSerializer):
    """Bot sozlamalari serializer"""
    
    # Token'ni faqat yozish uchun qilamiz (xavfsizlik)
    bot_token = serializers.CharField(write_only=True, required=False)
    has_token = serializers.SerializerMethodField()
    has_ai_key = serializers.SerializerMethodField()
    
    class Meta:
        model = BotSettings
        fields = [
            'id', 'bot_token', 'has_token', 'bot_username', 'is_active',
            'webhook_url', 'use_webhook',
            'ai_provider', 'ai_api_key', 'has_ai_key', 'ai_model',
            'welcome_message_uz', 'welcome_message_ru', 'welcome_message_en',
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'ai_api_key': {'write_only': True}
        }
    
    def get_has_token(self, obj):
        return bool(obj.bot_token)
    
    def get_has_ai_key(self, obj):
        return bool(obj.ai_api_key)


class BotAdminSerializer(serializers.ModelSerializer):
    """Bot admin serializer"""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = BotAdmin
        fields = [
            'id', 'telegram_id', 'user', 'user_email', 'username', 'full_name',
            'is_super_admin', 'is_active', 'can_approve_appeals', 'can_respond_appeals',
            'created_at', 'updated_at'
        ]


class BotRegionSerializer(serializers.ModelSerializer):
    """Hudud serializer"""
    
    class Meta:
        model = BotRegion
        fields = ['id', 'name_uz', 'name_ru', 'name_en', 'code', 'is_active', 'order']


class TelegramUserSerializer(serializers.ModelSerializer):
    """Telegram foydalanuvchi serializer"""
    
    region_name = serializers.CharField(source='region.name_uz', read_only=True)
    full_name = serializers.CharField(read_only=True)
    appeals_count = serializers.SerializerMethodField()
    last_activity = serializers.SerializerMethodField()
    
    class Meta:
        model = TelegramUser
        fields = [
            'id', 'telegram_id', 'username', 'first_name', 'last_name', 'full_name',
            'gender', 'phone', 'region', 'region_name', 'language',
            'is_registered', 'is_blocked', 'appeals_count', 'last_activity',
            'created_at', 'updated_at'
        ]
    
    def get_appeals_count(self, obj):
        """Foydalanuvchining murojaatlari sonini hisoblash"""
        return obj.appeals.count() if hasattr(obj, 'appeals') else 0
    
    def get_last_activity(self, obj):
        """Oxirgi faollik vaqtini olish"""
        # Oxirgi murojaat vaqtini tekshirish
        last_appeal = obj.appeals.order_by('-created_at').first() if hasattr(obj, 'appeals') else None
        if last_appeal:
            return last_appeal.created_at
        # Agar murojaat yo'q bo'lsa, updated_at qaytarish
        return obj.updated_at


class AppealCategorySerializer(serializers.ModelSerializer):
    """Murojaat sohasi serializer"""
    
    class Meta:
        model = AppealCategory
        fields = ['id', 'name_uz', 'name_ru', 'name_en', 'code', 'icon', 'is_active', 'order']


class AppealTypeSerializer(serializers.ModelSerializer):
    """Murojaat turi serializer"""
    
    class Meta:
        model = AppealType
        fields = ['id', 'name_uz', 'name_ru', 'name_en', 'code', 'icon', 'is_active', 'order']


class AppealAttachmentSerializer(serializers.ModelSerializer):
    """Murojaat ilovasi serializer"""
    
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AppealAttachment
        fields = [
            'id', 'file_type', 'telegram_file_id', 'file', 'file_url',
            'file_name', 'file_size', 'mime_type', 'created_at'
        ]
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class AppealMessageSerializer(serializers.ModelSerializer):
    """Murojaat xabari serializer"""
    
    admin_name = serializers.CharField(source='admin.full_name', read_only=True)
    
    class Meta:
        model = AppealMessage
        fields = [
            'id', 'is_from_admin', 'admin', 'admin_name', 'text',
            'is_ai_generated', 'telegram_message_id', 'created_at'
        ]


class TelegramAppealListSerializer(serializers.ModelSerializer):
    """Telegram murojaat ro'yxati serializer"""
    
    telegram_user = TelegramUserSerializer(read_only=True)
    user_name = serializers.CharField(source='telegram_user.full_name', read_only=True)
    user_phone = serializers.CharField(source='telegram_user.phone', read_only=True)
    appeal_type_name = serializers.CharField(source='appeal_type.name_uz', read_only=True)
    category_name = serializers.CharField(source='category.name_uz', read_only=True)
    attachments_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TelegramAppeal
        fields = [
            'id', 'uuid', 'appeal_number', 'telegram_user', 'user_name', 'user_phone',
            'appeal_type', 'appeal_type_name', 'category', 'category_name',
            'text', 'status', 'priority', 'source',
            'ai_priority', 'ai_is_valid', 'ai_analysis', 'ai_score',
            'forwarded_to_site', 'attachments_count',
            'rating', 'rated_at', 'closed_at',
            'created_at', 'updated_at'
        ]
    
    def get_attachments_count(self, obj):
        return obj.attachments.count()


class TelegramAppealDetailSerializer(serializers.ModelSerializer):
    """Telegram murojaat tafsilotlari serializer"""
    
    telegram_user = TelegramUserSerializer(read_only=True)
    appeal_type_detail = AppealTypeSerializer(source='appeal_type', read_only=True)
    category_detail = AppealCategorySerializer(source='category', read_only=True)
    attachments = AppealAttachmentSerializer(many=True, read_only=True)
    messages = AppealMessageSerializer(many=True, read_only=True)
    reviewed_by_detail = BotAdminSerializer(source='reviewed_by', read_only=True)
    
    class Meta:
        model = TelegramAppeal
        fields = [
            'id', 'uuid', 'appeal_number', 'telegram_user',
            'appeal_type', 'appeal_type_detail', 'category', 'category_detail',
            'text', 'status', 'priority', 'source',
            'ai_analysis', 'ai_priority', 'ai_category_suggestion',
            'ai_response', 'ai_is_valid', 'ai_rejection_reason',
            'admin_response', 'reviewed_by', 'reviewed_by_detail', 'reviewed_at',
            'forwarded_to_site', 'site_appeal_id', 'site_task_id',
            'rating', 'rating_comment', 'rated_at', 'closed_at',
            'attachments', 'messages',
            'created_at', 'updated_at'
        ]


class AppealReviewSerializer(serializers.Serializer):
    """Murojaatni ko'rib chiqish serializer"""
    
    action = serializers.ChoiceField(choices=['approve', 'reject', 'respond'])
    priority = serializers.ChoiceField(
        choices=['low', 'medium', 'high', 'urgent'],
        required=False
    )
    response = serializers.CharField(required=False, allow_blank=True)
    forward_to_site = serializers.BooleanField(default=False)
    create_task = serializers.BooleanField(default=False)
    organization_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list
    )


class BotStatsSerializer(serializers.Serializer):
    """Bot statistikasi serializer"""
    
    total_users = serializers.IntegerField()
    registered_users = serializers.IntegerField()
    total_appeals = serializers.IntegerField()
    pending_appeals = serializers.IntegerField()
    approved_appeals = serializers.IntegerField()
    rejected_appeals = serializers.IntegerField()
    forwarded_appeals = serializers.IntegerField()
    today_appeals = serializers.IntegerField()
    this_week_appeals = serializers.IntegerField()
    this_month_appeals = serializers.IntegerField()
