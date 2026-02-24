"""
OneID integratsiya serializerlari.

Ushbu modul OneID tizimi bilan ishlash uchun serializerlarni o'z ichiga oladi.
"""

from rest_framework import serializers


class OneIDLoginSerializer(serializers.Serializer):
    """
    OneID login uchun serializer.
    
    Foydalanuvchi PNFL sini qabul qilish va validatsiya qilish.
    """
    pnfl = serializers.CharField(
        max_length=14,
        min_length=14,
        required=True,
        help_text="14 ta raqamli PNFL (JShShIR)"
    )
    redirect_uri = serializers.URLField(
        required=False,
        allow_blank=True,
        help_text="Callback URL (ixtiyoriy)"
    )
    
    def validate_pnfl(self, value):
        """PNFL formatini tekshirish."""
        if not value.isdigit():
            raise serializers.ValidationError("PNFL faqat raqamlardan iborat bo'lishi kerak")
        
        if len(value) != 14:
            raise serializers.ValidationError("PNFL 14 ta raqamdan iborat bo'lishi kerak")
        
        return value


class OneIDCallbackSerializer(serializers.Serializer):
    """
    OneID callback uchun serializer.
    
    OneID dan qaytgan ma'lumotlarni qabul qilish.
    """
    code = serializers.CharField(
        required=False,
        help_text="Authorization code"
    )
    state = serializers.CharField(
        required=False,
        help_text="Sessiya state"
    )
    error = serializers.CharField(
        required=False,
        help_text="Xatolik kodi"
    )
    error_description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Xatolik tavsifi"
    )
    
    def validate(self, attrs):
        """Callback ma'lumotlarini tekshirish."""
        code = attrs.get('code')
        error = attrs.get('error')
        state = attrs.get('state')
        
        if not code and not error:
            raise serializers.ValidationError("Code yoki error majburiy")
        
        if not state:
            raise serializers.ValidationError("State majburiy")
        
        return attrs


class OneIDTokenRefreshSerializer(serializers.Serializer):
    """
    OneID token yangilash uchun serializer.
    """
    refresh_token = serializers.CharField(
        required=True,
        help_text="OneID refresh token"
    )


class OneIDLogoutSerializer(serializers.Serializer):
    """
    OneID logout uchun serializer.
    """
    access_token = serializers.CharField(
        required=False,
        help_text="OneID access token (ixtiyoriy)"
    )
