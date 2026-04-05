from rest_framework import serializers
from .models import (
    BotSettings, BotAdmin, BotRegion, TelegramUser,
    AppealCategory, AppealType, TelegramAppeal,
    AppealAttachment, AppealMessage
)
from organizations.serializers import OrganizationMinimalSerializer
from organizations.models import Organization


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
            'auto_response_enabled', 'auto_response_timeout_minutes',
            'welcome_message_uz', 'welcome_message_ru', 'welcome_message_en',
            'about_text_uz', 'about_text_ru', 'about_text_en',
            'help_text_uz', 'help_text_ru', 'help_text_en',
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'ai_api_key': {'write_only': True}
        }
    
    def get_has_token(self, obj):
        return bool(obj.bot_token)
    
    def get_has_ai_key(self, obj):
        return bool(obj.ai_api_key)
    
    def update(self, instance, validated_data):
        # Token o'zgarganda bot_username tozalansin
        if 'bot_token' in validated_data and validated_data['bot_token'] != instance.bot_token:
            validated_data['bot_username'] = ''
        return super().update(instance, validated_data)


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


class AppealCategoryAdminSerializer(serializers.ModelSerializer):
    """Murojaat sohasi (admin) serializer - mas'ul tashkilotlar bilan."""

    responsible_organizations = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Organization.objects.filter(is_active=True),
        required=False,
    )
    responsible_organizations_detail = OrganizationMinimalSerializer(
        many=True,
        source='responsible_organizations',
        read_only=True,
    )

    class Meta:
        model = AppealCategory
        fields = [
            'id',
            'name_uz', 'name_ru', 'name_en',
            'code', 'icon', 'is_active', 'order',
            'responsible_organizations',
            'responsible_organizations_detail',
        ]


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
    user_name = serializers.SerializerMethodField()
    user_phone = serializers.SerializerMethodField()
    region_name = serializers.SerializerMethodField()
    appeal_type_name = serializers.CharField(source='appeal_type.name_uz', read_only=True)
    category_name = serializers.CharField(source='category.name_uz', read_only=True)
    assigned_organizations = OrganizationMinimalSerializer(many=True, read_only=True)
    attachments_count = serializers.SerializerMethodField()
    new_messages_count = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    
    class Meta:
        model = TelegramAppeal
        fields = [
            'id', 'uuid', 'appeal_number', 'telegram_user', 'user_name', 'user_phone', 'region_name',
            'appeal_type', 'appeal_type_name', 'category', 'category_name',
            'assigned_organizations',
            'latitude', 'longitude', 'address',
            'text', 'status', 'priority', 'source',
            'ai_priority', 'ai_is_valid', 'ai_analysis', 'ai_score',
            'ai_auto_responded', 'admin_notified_at',
            'forwarded_to_site', 'attachments_count',
            'new_messages_count', 'last_message_at',
            'rating', 'rated_at', 'closed_at',
            'created_at', 'updated_at'
        ]

    def get_user_name(self, obj):
        if getattr(obj, 'telegram_user', None):
            return obj.telegram_user.full_name
        return (getattr(obj, 'citizen_name', '') or '').strip() or "Noma'lum"

    def get_user_phone(self, obj):
        if getattr(obj, 'telegram_user', None):
            return obj.telegram_user.phone or ''
        return (getattr(obj, 'citizen_phone', '') or '').strip()

    def get_region_name(self, obj):
        if getattr(obj, 'telegram_user', None) and getattr(obj.telegram_user, 'region', None):
            return obj.telegram_user.region.name_uz
        if getattr(obj, 'citizen_region', None):
            try:
                return obj.citizen_region.name_uz
            except Exception:
                return ''
        return ''
    
    def get_attachments_count(self, obj):
        return obj.attachments.count()

    def get_new_messages_count(self, obj):
        """Fuqarodan kelgan yangi (o'qilmagan) xabarlar soni.

        Agar queryset annotate qilingan bo'lsa `unread_user_messages_count` dan oladi,
        aks holda eski usul (oxirgi admin xabaridan keyingi fuqarolik xabarlari).
        """
        annotated = getattr(obj, 'unread_user_messages_count', None)
        if annotated is not None:
            try:
                return int(annotated)
            except Exception:
                return 0

        messages = obj.messages.all()
        last_admin_msg = messages.filter(is_from_admin=True).order_by('-created_at').first()
        if last_admin_msg:
            return messages.filter(is_from_admin=False, created_at__gt=last_admin_msg.created_at).count()
        return messages.filter(is_from_admin=False).count()

    def get_last_message_at(self, obj):
        """Oxirgi xabar vaqti"""
        last_msg = obj.messages.order_by('-created_at').first()
        return last_msg.created_at.isoformat() if last_msg else None


class TelegramAppealDetailSerializer(serializers.ModelSerializer):
    """Telegram murojaat tafsilotlari serializer"""
    
    telegram_user = TelegramUserSerializer(read_only=True)
    user_name = serializers.SerializerMethodField()
    user_phone = serializers.SerializerMethodField()
    region_name = serializers.SerializerMethodField()
    appeal_type_detail = AppealTypeSerializer(source='appeal_type', read_only=True)
    category_detail = AppealCategorySerializer(source='category', read_only=True)
    assigned_organizations = OrganizationMinimalSerializer(many=True, read_only=True)
    attachments = AppealAttachmentSerializer(many=True, read_only=True)
    messages = AppealMessageSerializer(many=True, read_only=True)
    reviewed_by_detail = BotAdminSerializer(source='reviewed_by', read_only=True)
    
    class Meta:
        model = TelegramAppeal
        fields = [
            'id', 'uuid', 'appeal_number', 'telegram_user', 'user_name', 'user_phone', 'region_name',
            'appeal_type', 'appeal_type_detail', 'category', 'category_detail',
            'assigned_organizations',
            'latitude', 'longitude', 'address',
            'text', 'status', 'priority', 'source',
            'ai_analysis', 'ai_priority', 'ai_category_suggestion',
            'ai_response', 'ai_is_valid', 'ai_rejection_reason',
            'ai_auto_responded', 'admin_notified_at',
            'admin_response', 'reviewed_by', 'reviewed_by_detail', 'reviewed_at',
            'forwarded_to_site', 'site_appeal_id', 'site_task_id',
            'rating', 'rating_comment', 'rated_at', 'closed_at',
            'attachments', 'messages',
            'created_at', 'updated_at'
        ]

    def get_user_name(self, obj):
        if getattr(obj, 'telegram_user', None):
            return obj.telegram_user.full_name
        return (getattr(obj, 'citizen_name', '') or '').strip() or "Noma'lum"

    def get_user_phone(self, obj):
        if getattr(obj, 'telegram_user', None):
            return obj.telegram_user.phone or ''
        return (getattr(obj, 'citizen_phone', '') or '').strip()

    def get_region_name(self, obj):
        if getattr(obj, 'telegram_user', None) and getattr(obj.telegram_user, 'region', None):
            return obj.telegram_user.region.name_uz
        if getattr(obj, 'citizen_region', None):
            try:
                return obj.citizen_region.name_uz
            except Exception:
                return ''
        return ''


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
        child=serializers.CharField(),
        required=False,
        default=list
    )


class AppealAssignSerializer(serializers.Serializer):
    """Murojaatni yo'naltirish (soha va/yo tashkilotlarni biriktirish)."""

    category_id = serializers.IntegerField(required=False)
    organization_ids = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )


class ManualAppealCreateSerializer(serializers.Serializer):
    """Dashboard orqali qo'lda murojaat qo'shish."""

    citizen_name = serializers.CharField(max_length=200)
    citizen_phone = serializers.CharField(max_length=13, required=False, allow_blank=True, default='')
    citizen_region_id = serializers.IntegerField(required=False, allow_null=True)

    text = serializers.CharField()
    appeal_type_id = serializers.IntegerField(required=False, allow_null=True)
    category_id = serializers.IntegerField(required=False, allow_null=True)

    priority = serializers.ChoiceField(
        choices=[c[0] for c in TelegramAppeal.PRIORITY_CHOICES],
        required=False,
        default='medium',
    )
    address = serializers.CharField(required=False, allow_blank=True, default='')
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, required=False, allow_null=True)

    organization_ids = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
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
