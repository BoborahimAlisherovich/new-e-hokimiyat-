"""
Audit models for E-Hokimiyat platform.

Comprehensive audit logging for all system actions.
This is critical for:
- Legal proceedings
- Accountability
- Security monitoring
- Compliance with government regulations
"""

from django.db import models
from core.models import BaseModel


class AuditLog(BaseModel):
    """
    Audit log for tracking all system actions.
    
    Every action is recorded with:
    - Who performed it
    - What action was taken
    - When it was performed
    - What data was affected
    """
    
    ACTION_CHOICES = [
        # User actions
        ('USER_CREATED', "Foydalanuvchi yaratildi"),
        ('USER_UPDATED', "Foydalanuvchi yangilandi"),
        ('USER_BLOCKED', "Foydalanuvchi bloklandi"),
        ('USER_ARCHIVED', "Foydalanuvchi arxivlandi"),
        ('USER_ACTIVATED', "Foydalanuvchi faollashtirildi"),
        ('USER_LOGIN', "Foydalanuvchi kirdi"),
        ('USER_LOGOUT', "Foydalanuvchi chiqdi"),
        ('USER_LOGIN_FAILED', "Kirish muvaffaqiyatsiz"),
        
        # Organization actions
        ('ORG_CREATED', "Tashkilot yaratildi"),
        ('ORG_UPDATED', "Tashkilot yangilandi"),
        ('ORG_DELETED', "Tashkilot o'chirildi"),
        
        # Task actions
        ('TASK_CREATED', "Topshiriq yaratildi"),
        ('TASK_UPDATED', "Topshiriq yangilandi"),
        ('TASK_ACCEPTED', "Topshiriq qabul qilindi"),
        ('TASK_COMPLETED', "Topshiriq bajarildi"),
        ('TASK_REASSIGNED', "Topshiriq qayta yuborildi"),
        ('TASK_CLOSED', "Topshiriq yopildi"),
        ('TASK_OVERDUE', "Topshiriq muddati o'tdi"),
        
        # Report actions
        ('REPORT_SUBMITTED', "Hisobot topshirildi"),
        ('REPORT_REVIEWED', "Hisobot ko'rib chiqildi"),
        
        # Extension requests
        ('EXTENSION_REQUESTED', "Muddat uzaytirish so'raldi"),
        ('EXTENSION_APPROVED', "Muddat uzaytirish tasdiqlandi"),
        ('EXTENSION_REJECTED', "Muddat uzaytirish rad etildi"),
        
        # System actions
        ('SYSTEM_ERROR', "Tizim xatosi"),
        ('DATA_EXPORT', "Ma'lumotlar eksport qilindi"),
    ]
    
    ENTITY_TYPE_CHOICES = [
        ('USER', 'Foydalanuvchi'),
        ('ORGANIZATION', 'Tashkilot'),
        ('TASK', 'Topshiriq'),
        ('TASK_ORGANIZATION', 'Topshiriq biriktirilishi'),
        ('REPORT', 'Hisobot'),
        ('EXTENSION_REQUEST', "Muddat uzaytirish so'rovi"),
        ('NOTIFICATION', 'Bildirishnoma'),
        ('SYSTEM', 'Tizim'),
    ]
    
    # Who performed the action
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='Foydalanuvchi'
    )
    
    # Action details
    action = models.CharField(
        max_length=50,
        choices=ACTION_CHOICES,
        verbose_name='Amal'
    )
    
    # Entity affected
    entity_type = models.CharField(
        max_length=30,
        choices=ENTITY_TYPE_CHOICES,
        verbose_name="Ob'yekt turi"
    )
    entity_id = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Ob'yekt ID"
    )
    
    # Additional data
    description = models.TextField(verbose_name='Tavsif')
    
    # Changes (JSON format)
    old_values = models.JSONField(null=True, blank=True, verbose_name='Eski qiymatlar')
    new_values = models.JSONField(null=True, blank=True, verbose_name='Yangi qiymatlar')
    
    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP manzil')
    user_agent = models.TextField(blank=True, verbose_name='User Agent')
    
    # Additional context
    extra_data = models.JSONField(null=True, blank=True, verbose_name="Qo'shimcha ma'lumot")
    
    class Meta:
        verbose_name = 'Audit log'
        verbose_name_plural = 'Audit loglar'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]
    
    def __str__(self):
        user_str = self.user.full_name if self.user else 'Tizim'
        return f"{user_str} - {self.get_action_display()}"
    
    @classmethod
    def log(cls, user, action, entity_type, entity_id='', description='', 
            old_values=None, new_values=None, ip_address=None, user_agent='', extra_data=None):
        """
        Convenience method to create audit log.
        """
        return cls.objects.create(
            user=user,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else '',
            description=description,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=extra_data
        )
