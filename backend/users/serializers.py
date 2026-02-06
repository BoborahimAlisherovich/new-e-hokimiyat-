"""
User serializers for E-Hokimiyat API.
"""

from rest_framework import serializers
from django.conf import settings
from django.contrib.auth import authenticate
from .models import User, UserAssignment


class UserMinimalSerializer(serializers.ModelSerializer):
    """
    Minimal user serializer for nested relations.
    """
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'full_name', 'role', 'position']


class UserSerializer(serializers.ModelSerializer):
    """
    Full user serializer.
    """
    full_name = serializers.CharField(read_only=True)
    masked_pnfl = serializers.CharField(read_only=True)
    cabinet_type = serializers.CharField(read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    is_online = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'pnfl', 'masked_pnfl', 'first_name', 'last_name', 'middle_name',
            'full_name', 'phone', 'email', 'role', 'organization', 'organization_name',
            'position', 'status', 'oneid_connected', 'cabinet_type',
            'created_by', 'created_by_name', 'created_at', 'activated_at', 'is_online', 'last_seen'
        ]
        read_only_fields = ['id', 'oneid_connected', 'created_at', 'activated_at', 'created_by', 'is_online', 'last_seen']
        extra_kwargs = {
            'pnfl': {'write_only': True}  # Don't expose PNFL in responses
        }


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new users (PNFL-based).
    """
    
    class Meta:
        model = User
        fields = [
            'pnfl', 'first_name', 'last_name', 'middle_name',
            'phone', 'email', 'role', 'organization', 'position'
        ]
    
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
        if request and request.user:
            target_role = attrs.get('role')
            if not request.user.can_add_user_with_role(target_role):
                raise serializers.ValidationError({
                    'role': f"Siz {target_role} roli bilan foydalanuvchi qo'sha olmaysiz"
                })
        
        # Validate organization for organization-level roles
        role = attrs.get('role')
        organization = attrs.get('organization')
        if role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'] and not organization:
            raise serializers.ValidationError({
                'organization': "Tashkilot tanlanishi shart"
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create user with KUTILMOQDA status."""
        request = self.context.get('request')
        validated_data['status'] = 'KUTILMOQDA'
        validated_data['created_by'] = request.user if request else None
        
        user = User.objects.create(**validated_data)
        
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
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'middle_name',
            'phone', 'email', 'position'
        ]


class LoginSerializer(serializers.Serializer):
    """
    Login serializer for mock authentication.
    In production, this would be replaced with OneID.
    """
    pnfl = serializers.CharField(max_length=14)
    password = serializers.CharField(write_only=True, required=False)
    
    def validate(self, attrs):
        pnfl = attrs.get('pnfl')
        password = attrs.get('password', '')
        
        # For mock auth, just check if user exists and is active
        try:
            user = User.objects.get(pnfl=pnfl)
        except User.DoesNotExist:
            # Dev mode: auto-create demo user for any PNFL
            if getattr(settings, 'DEBUG', False) or getattr(settings, 'ALLOW_DEV_LOGIN', False):
                user = User.objects.create_user(
                    pnfl=pnfl,
                    password=password or None,
                    first_name='Demo',
                    last_name='User',
                    role='ADMIN',
                    status='FAOL',
                    is_staff=True
                )
            else:
                raise serializers.ValidationError("Siz tizimga oldindan kiritilmagansiz")
        
        if user.status == 'ARXIV':
            raise serializers.ValidationError("Bu hisob arxivlangan")
        
        if user.status == 'BLOKLANGAN':
            raise serializers.ValidationError("Bu hisob bloklangan")
        
        # For mock auth with password (development only)
        if password:
            user = authenticate(pnfl=pnfl, password=password)
            if not user:
                raise serializers.ValidationError("Login yoki parol noto'g'ri")
        
        # Activate user if not already active
        if user.status == 'KUTILMOQDA':
            user.activate()
        
        attrs['user'] = user
        return attrs


class UserMeSerializer(serializers.ModelSerializer):
    """
    Serializer for current user profile.
    """
    full_name = serializers.CharField(read_only=True)
    masked_pnfl = serializers.CharField(read_only=True)
    cabinet_type = serializers.CharField(read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'masked_pnfl', 'first_name', 'last_name', 'middle_name',
            'full_name', 'phone', 'email', 'role', 'organization', 'organization_name',
            'position', 'status', 'cabinet_type', 'permissions'
        ]
    
    def get_permissions(self, obj):
        """Return user permissions based on role."""
        permissions = {
            'can_create_tasks': obj.role in ['HOKIM', 'HOKIMLIK_MASUL', 'ADMIN'],
            'can_close_tasks': obj.role == 'HOKIM',
            'can_manage_users': obj.role in ['HOKIM', 'HOKIMLIK_MASUL', 'TASHKILOT_RAHBARI', 'ADMIN'],
            'can_manage_organizations': obj.role in ['HOKIM', 'HOKIMLIK_MASUL', 'ADMIN'],
            'can_execute_tasks': obj.role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
            'can_view_analytics': obj.role in ['HOKIM', 'HOKIMLIK_MASUL', 'ADMIN'],
            'can_view_audit': obj.role in ['HOKIM', 'ADMIN'],
        }
        return permissions


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
