"""
OneID integratsiya modellari.

Ushbu modul OneID tizimi bilan ishlash uchun kerakli ma'lumotlar bazasi 
modellarini o'z ichiga oladi.
"""

import uuid
from django.db import models
from django.conf import settings
from core.models import BaseModel


class OneIDToken(BaseModel):
    """
    OneID tokenlarni saqlash uchun model.
    
    Foydalanuvchi OneID orqali avtorizatsiyadan o'tganda,
    access_token va refresh_tokenlar shu modelda saqlanadi.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='oneid_token',
        verbose_name='Foydalanuvchi'
    )
    
    # OneID tokenlari
    access_token = models.TextField(
        verbose_name='Access Token',
        help_text='OneID access token'
    )
    refresh_token = models.TextField(
        blank=True,
        null=True,
        verbose_name='Refresh Token',
        help_text='OneID refresh token'
    )
    
    # Token muddati
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Token muddati'
    )
    
    # OneID ma'lumotlari
    oneid_user_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='OneID User ID'
    )
    
    # Session ma'lumotlari
    session_id = models.UUIDField(
        default=uuid.uuid4,
        verbose_name='Sessiya ID'
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        verbose_name='Aktiv'
    )
    
    class Meta:
        verbose_name = 'OneID Token'
        verbose_name_plural = 'OneID Tokenlar'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.full_name} - OneID Token"
    
    def is_expired(self):
        """Token muddati o'tganligini tekshirish."""
        if not self.expires_at:
            return False
        from django.utils import timezone
        return timezone.now() >= self.expires_at


class OneIDSession(BaseModel):
    """
    OneID sessiyalari uchun model.
    
    Har bir avtorizatsiya urinishi uchun sessiya yozuvi.
    """
    
    # Sessiya ma'lumotlari
    session_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        verbose_name='Sessiya ID'
    )
    
    state = models.CharField(
        max_length=255,
        unique=True,
        verbose_name='State'
    )
    
    # Foydalanuvchi ma'lumotlari (agar mavjud bo'lsa)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='oneid_sessions',
        verbose_name='Foydalanuvchi'
    )
    
    # OneID dan qaytgan ma'lumotlar
    authorization_code = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Authorization Code'
    )
    
    pnfl = models.CharField(
        max_length=14,
        blank=True,
        verbose_name='PNFL'
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Kutilmoqda'),
            ('SUCCESS', 'Muvaffaqiyatli'),
            ('FAILED', 'Xatolik'),
            ('EXPIRED', 'Muddati o\'tgan'),
        ],
        default='PENDING',
        verbose_name='Status'
    )
    
    # Xatolik ma'lumotlari
    error_code = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Xatolik kodi'
    )
    error_message = models.TextField(
        blank=True,
        verbose_name='Xatolik xabari'
    )
    
    # Callback URL
    redirect_uri = models.URLField(
        verbose_name='Redirect URI'
    )
    
    # IP va User Agent
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP manzil'
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name='User Agent'
    )
    
    class Meta:
        verbose_name = 'OneID Sessiya'
        verbose_name_plural = 'OneID Sessiyalar'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session_id']),
            models.Index(fields=['state']),
            models.Index(fields=['status']),
            models.Index(fields=['pnfl']),
        ]
    
    def __str__(self):
        return f"Session {self.session_id} - {self.get_status_display()}"


class OneIDUserLog(BaseModel):
    """
    OneID orqali bo'lgan operatsiyalar logi.
    
    Foydalanuvchining OneID orqali login qilishi, ma'lumotlari yangilanishi
    kabi barcha operatsiyalar bu modelda saqlanadi.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='oneid_logs',
        verbose_name='Foydalanuvchi'
    )
    
    # Operatsiya turi
    action = models.CharField(
        max_length=50,
        choices=[
            ('LOGIN', 'Login'),
            ('LOGOUT', 'Logout'),
            ('DATA_SYNC', 'Ma\'lumotlarni sinxronizatsiya'),
            ('TOKEN_REFRESH', 'Token yangilash'),
            ('PROFILE_UPDATE', 'Profil yangilash'),
        ],
        verbose_name='Operatsiya'
    )
    
    # OneID ma'lumotlari
    oneid_user_id = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='OneID User ID'
    )
    
    # Ma'lumotlar (JSON formatda)
    old_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Eski ma\'lumotlar'
    )
    new_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Yangi ma\'lumotlar'
    )
    
    # Status
    success = models.BooleanField(
        default=True,
        verbose_name='Muvaffaqiyatli'
    )
    
    # Xatolik ma'lumotlari
    error_message = models.TextField(
        blank=True,
        verbose_name='Xatolik xabari'
    )
    
    # IP va User Agent
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP manzil'
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name='User Agent'
    )
    
    class Meta:
        verbose_name = 'OneID Log'
        verbose_name_plural = 'OneID Loglar'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'action']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.full_name} - {self.get_action_display()}"
