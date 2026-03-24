"""
User serializers for E-Hokimiyat API.
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserAssignment


import os

def _build_avatar_url(obj, request):
    """Avatar URL'ni HTTPS bilan qaytaradi."""
    if not obj.avatar:
        return None
    if request:
        url = request.build_absolute_uri(obj.avatar.url)
        return url.replace('http://', 'https://', 1) if url.startswith('http://') else url
    # Fallback: request mavjud bo'lmaganda to'liq URL qurish
    base = os.environ.get('API_BASE_URL', 'https://api.pytech.uz')
    return f"{base}{obj.avatar.url}"


class UserMinimalSerializer(serializers.ModelSerializer):
    """
    Minimal user serializer for nested relations.
    """
    full_name = serializers.CharField(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'full_name', 'role', 'position', 'avatar_url', 'sector_name']
    
    def get_avatar_url(self, obj):
        return _build_avatar_url(obj, self.context.get('request'))


class UserSerializer(serializers.ModelSerializer):
    """
    Full user serializer.
    """
    full_name = serializers.CharField(read_only=True)
    masked_pnfl = serializers.CharField(read_only=True)
    cabinet_type = serializers.CharField(read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    is_online = serializers.BooleanField(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'login', 'pnfl', 'masked_pnfl', 'first_name', 'last_name', 'middle_name',
            'full_name', 'phone', 'email', 'role', 'organization', 'organization_name',
            'sector', 'sector_name', 'supervisor', 'supervisor_name',
            'position', 'status', 'cabinet_type',
            'created_by', 'created_by_name', 'created_at', 'activated_at', 'is_online', 'last_seen',
            'avatar', 'avatar_url'
        ]
        read_only_fields = ['id', 'created_at', 'activated_at', 'created_by', 'is_online', 'last_seen']
        extra_kwargs = {
            'pnfl': {'write_only': True},
            'avatar': {'write_only': True, 'required': False}
        }
    
    def get_avatar_url(self, obj):
        return _build_avatar_url(obj, self.context.get('request'))


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new users.
    """
    password = serializers.CharField(write_only=True, min_length=6)
    
    class Meta:
        model = User
        fields = [
            'login', 'pnfl', 'first_name', 'last_name', 'middle_name',
            'phone', 'email', 'role', 'organization', 'sector', 'supervisor', 'position', 'password'
        ]

    def validate_login(self, value):
        login = value.strip()
        if not login:
            raise serializers.ValidationError("Login kiritilishi shart")
        if User.objects.filter(login__iexact=login).exists():
            raise serializers.ValidationError("Bu login allaqachon band")
        if User.objects.filter(pnfl=login).exists():
            raise serializers.ValidationError("Bu login boshqa foydalanuvchining PNFL qiymati bilan to'qnashadi")
        return login
    
    def validate_pnfl(self, value):
        """Validate PNFL format (14 digits)."""
        if not value.isdigit() or len(value) != 14:
            raise serializers.ValidationError("PNFL 14 ta raqamdan iborat bo'lishi kerak")
        if User.objects.filter(pnfl=value).exists():
            raise serializers.ValidationError("Bu PNFL allaqachon ro'yxatdan o'tgan")
        return value
    
    def validate(self, attrs):
        """Validate role hierarchy."""
        request = self.context.get('request')
        current_user = request.user if request else None
        if request and request.user:
            target_role = attrs.get('role')
            if not request.user.can_add_user_with_role(target_role):
                raise serializers.ValidationError({
                    'role': f"Siz {target_role} roli bilan foydalanuvchi qo'sha olmaysiz"
                })
        
        role = attrs.get('role')
        organization = attrs.get('organization')
        sector = attrs.get('sector')
        supervisor = attrs.get('supervisor')

        if role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'] and not organization:
            raise serializers.ValidationError({
                'organization': "Tashkilot tanlanishi shart"
            })
        if role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'] and organization:
            attrs['sector'] = organization.sector

        if role in ['HOKIM_YORDAMCHISI', 'HOKIMLIK_MASUL'] and not sector:
            raise serializers.ValidationError({
                'sector': "Hokimlik profillari uchun soha/kompleks tanlanishi shart"
            })

        if role == 'HOKIMLIK_MASUL':
            if not supervisor:
                raise serializers.ValidationError({
                    'supervisor': "Bosh mutaxassis uchun tegishli hokim o'rinbosari biriktirilishi shart"
                })
            if supervisor.role != 'HOKIM_YORDAMCHISI':
                raise serializers.ValidationError({
                    'supervisor': "Bosh mutaxassis faqat hokim o'rinbosariga biriktirilishi mumkin"
                })
            if sector and supervisor.sector_id and sector.id != supervisor.sector_id:
                raise serializers.ValidationError({
                    'sector': "Bosh mutaxassisning sohasi biriktirilgan o'rinbosar sohasi bilan bir xil bo'lishi kerak"
                })
            if current_user and current_user.role == 'HOKIM_YORDAMCHISI' and supervisor.id != current_user.id:
                raise serializers.ValidationError({
                    'supervisor': "Siz faqat o'zingizga biriktiriladigan bosh mutaxassis yaratishingiz mumkin"
                })

        if role == 'HOKIM_YORDAMCHISI' and current_user and current_user.role == 'HOKIM_YORDAMCHISI':
            raise serializers.ValidationError({
                'role': "Hokim o'rinbosari boshqa hokim o'rinbosari yarata olmaydi"
            })

        if role not in ['HOKIM_YORDAMCHISI', 'HOKIMLIK_MASUL', 'TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
            attrs['sector'] = None

        if role != 'HOKIMLIK_MASUL':
            attrs['supervisor'] = None

        if role not in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
            attrs['organization'] = None
        
        return attrs
    
    def create(self, validated_data):
        """Create user with active login/password access."""
        from django.utils import timezone

        request = self.context.get('request')
        password = validated_data.pop('password')
        validated_data['status'] = 'FAOL'
        validated_data['created_by'] = request.user if request else None
        validated_data['activated_at'] = timezone.now()

        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        # Create assignment record
        if request and request.user:
            UserAssignment.objects.create(
                assigned_user=user,
                assigned_by=request.user,
                assigned_role=user.role
            )
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating users.
    """
    password = serializers.CharField(write_only=True, required=False, min_length=6)
    
    class Meta:
        model = User
        fields = [
            'login',
            'first_name', 'last_name', 'middle_name',
            'phone', 'email', 'position',
            'role', 'status', 'organization', 'sector', 'supervisor', 'password'
        ]

    def validate_login(self, value):
        login = value.strip()
        instance = getattr(self, 'instance', None)
        if User.objects.filter(login__iexact=login).exclude(pk=getattr(instance, 'pk', None)).exists():
            raise serializers.ValidationError("Bu login allaqachon band")
        if User.objects.filter(pnfl=login).exclude(pk=getattr(instance, 'pk', None)).exists():
            raise serializers.ValidationError("Bu login boshqa foydalanuvchining PNFL qiymati bilan to'qnashadi")
        return login

    def validate(self, attrs):
        """Validate role hierarchy and organization assignment."""
        request = self.context.get('request')
        instance = getattr(self, 'instance', None)

        role = attrs.get('role', instance.role if instance else None)
        organization = attrs.get('organization', instance.organization if instance else None)
        sector = attrs.get('sector', instance.sector if instance else None)
        supervisor = attrs.get('supervisor', instance.supervisor if instance else None)

        if request and request.user and role:
            # Only allow role change if current user can assign that role
            if role != getattr(instance, 'role', None) and not request.user.can_add_user_with_role(role):
                raise serializers.ValidationError({
                    'role': f"Siz {role} roli bilan foydalanuvchi belgilay olmaysiz"
                })

        if role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'] and not organization:
            raise serializers.ValidationError({
                'organization': "Tashkilot tanlanishi shart"
            })
        if role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'] and organization:
            attrs['sector'] = organization.sector

        if role in ['HOKIM_YORDAMCHISI', 'HOKIMLIK_MASUL'] and not sector:
            raise serializers.ValidationError({
                'sector': "Hokimlik profillari uchun soha/kompleks tanlanishi shart"
            })

        if role == 'HOKIMLIK_MASUL':
            if not supervisor:
                raise serializers.ValidationError({
                    'supervisor': "Bosh mutaxassis uchun tegishli hokim o'rinbosari biriktirilishi shart"
                })
            if supervisor.role != 'HOKIM_YORDAMCHISI':
                raise serializers.ValidationError({
                    'supervisor': "Bosh mutaxassis faqat hokim o'rinbosariga biriktirilishi mumkin"
                })
            if sector and supervisor.sector_id and sector.id != supervisor.sector_id:
                raise serializers.ValidationError({
                    'sector': "Bosh mutaxassisning sohasi biriktirilgan o'rinbosar sohasi bilan bir xil bo'lishi kerak"
                })
            if request and request.user.role == 'HOKIM_YORDAMCHISI' and supervisor.id != request.user.id:
                raise serializers.ValidationError({
                    'supervisor': "Siz faqat o'zingizga biriktirilgan bosh mutaxassisni boshqara olasiz"
                })

        if role not in ['HOKIM_YORDAMCHISI', 'HOKIMLIK_MASUL', 'TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
            attrs['sector'] = None

        if role != 'HOKIMLIK_MASUL':
            attrs['supervisor'] = None

        if role not in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
            attrs['organization'] = None

        return attrs

    def update(self, instance, validated_data):
        from django.utils import timezone

        password = validated_data.pop('password', None)
        status_value = validated_data.get('status')

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if status_value == 'FAOL' and not instance.activated_at:
            instance.activated_at = timezone.now()

        if password:
            instance.set_password(password)

        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    """
    Login serializer for login/password authentication.
    """
    login = serializers.CharField(max_length=150, required=False)
    pnfl = serializers.CharField(max_length=14, required=False)
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        identifier = (attrs.get('login') or attrs.get('pnfl') or '').strip()
        if not identifier:
            raise serializers.ValidationError("Login kiritilishi shart")
        password = attrs.get('password')
        
        # Foydalanuvchi mavjudligini tekshirish
        user = User.objects.filter(login__iexact=identifier).first()
        if not user:
            user = User.objects.filter(pnfl=identifier).first()

        if not user:
            raise serializers.ValidationError("Siz tizimga oldindan kiritilmagansiz")
        
        if user.status == 'ARXIV':
            raise serializers.ValidationError("Bu hisob arxivlangan")
        
        if user.status == 'BLOKLANGAN':
            raise serializers.ValidationError("Bu hisob bloklangan")

        if user.status != 'FAOL':
            raise serializers.ValidationError("Bu hisob aktiv emas")
        
        auth_user = authenticate(username=user.login, password=password)
        if not auth_user:
            raise serializers.ValidationError("Login yoki parol noto'g'ri")
        
        attrs['user'] = auth_user
        return attrs


class UserMeSerializer(serializers.ModelSerializer):
    """
    Serializer for current user profile.
    """
    full_name = serializers.CharField(read_only=True)
    masked_pnfl = serializers.CharField(read_only=True)
    cabinet_type = serializers.CharField(read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True)
    permissions = serializers.SerializerMethodField()
    profile_guidance = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'login', 'masked_pnfl', 'first_name', 'last_name', 'middle_name',
            'full_name', 'phone', 'email', 'role', 'organization', 'organization_name',
            'sector', 'sector_name', 'supervisor', 'supervisor_name',
            'position', 'status', 'cabinet_type', 'permissions', 'profile_guidance',
            'avatar', 'avatar_url'
        ]
        extra_kwargs = {
            'avatar': {'write_only': True, 'required': False}
        }
    
    def get_avatar_url(self, obj):
        return _build_avatar_url(obj, self.context.get('request'))
    
    def get_permissions(self, obj):
        """Return user permissions based on role."""
        permissions = {
            'can_create_tasks': obj.role in ['HOKIM', 'HOKIM_YORDAMCHISI', 'TASHKILOT_RAHBARI', 'ADMIN'],
            'can_close_tasks': obj.role == 'HOKIM',
            'can_manage_users': obj.role in ['HOKIM', 'HOKIM_YORDAMCHISI', 'TASHKILOT_RAHBARI', 'ADMIN'],
            'can_manage_organizations': obj.role in ['HOKIM', 'HOKIM_YORDAMCHISI', 'ADMIN'],
            'can_execute_tasks': obj.role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
            'can_view_analytics': obj.role in ['HOKIM', 'HOKIM_YORDAMCHISI', 'ADMIN'],
            'can_view_audit': obj.role in ['HOKIM', 'ADMIN'],
        }
        return permissions

    def get_profile_guidance(self, obj):
        guidance = {
            'HOKIM': "Barcha topshiriqlarni ko'radi, topshiriq yaratadi va yakuniy nazoratdan yechadi.",
            'HOKIM_YORDAMCHISI': "Faqat o'z sohasi bo'yicha topshiriq yaratadi, o'z kompleksidagi tashkilotlarga va biriktirilgan bosh mutaxassislarga ishlaydi.",
            'HOKIMLIK_MASUL': "Faqat o'ziga biriktirilgan hokim o'rinbosari yuborgan topshiriqlarni ko'radi, lekin yangi topshiriq yaratmaydi.",
            'TASHKILOT_RAHBARI': "Faqat o'z tashkilotiga oid topshiriqlarni ko'radi va zaruratda o'z tashkiloti ichida topshiriq yaratadi.",
            'TASHKILOT_MASUL': "Faqat o'z tashkilotiga tegishli topshiriqlarni ko'radi va ijroga javob beradi.",
            'ADMIN': "Tizimni to'liq boshqaradi va barcha rollarni nazorat qiladi.",
        }
        return guidance.get(obj.role, "")


class UserAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for user assignments.
    """
    assigned_user_name = serializers.CharField(source='assigned_user.full_name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.full_name', read_only=True)
    
    class Meta:
        model = UserAssignment
        fields = [
            'id', 'assigned_user', 'assigned_user_name',
            'assigned_by', 'assigned_by_name', 'assigned_role',
            'notes', 'created_at'
        ]
