"""
Notification models for E-Hokimiyat platform.
"""

from django.db import models
from core.models import BaseModel


class Notification(BaseModel):
    """
    User notification model.
    """
    
    TYPE_CHOICES = [
        ('INFO', 'Ma\'lumot'),
        ('WARNING', 'Ogohlantirish'),
        ('ERROR', 'Xato'),
        ('SUCCESS', 'Muvaffaqiyat'),
        ('TASK', 'Topshiriq'),
        ('DEADLINE', 'Muddat'),
        ('SYSTEM', 'Tizim'),
    ]
    
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Foydalanuvchi'
    )
    
    title = models.CharField(max_length=200, verbose_name='Sarlavha')
    message = models.TextField(verbose_name='Xabar')
    
    notification_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='INFO',
        verbose_name='Tur'
    )
    
    # Related entity
    related_task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name='Bog\'liq topshiriq'
    )
    
    is_read = models.BooleanField(default=False, verbose_name='O\'qilgan')
    read_at = models.DateTimeField(null=True, blank=True, verbose_name='O\'qilgan vaqt')
    
    # For linking to specific pages
    link = models.CharField(max_length=500, blank=True, verbose_name='Havola')
    
    class Meta:
        verbose_name = 'Bildirishnoma'
        verbose_name_plural = 'Bildirishnomalar'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.full_name}: {self.title}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()


class PushSubscription(BaseModel):
    """
    Browser push subscription for offline/background notifications.
    """

    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='push_subscriptions',
        verbose_name='Foydalanuvchi'
    )
    endpoint = models.TextField(unique=True, verbose_name='Push endpoint')
    p256dh = models.CharField(max_length=255, verbose_name='P256DH kalit')
    auth = models.CharField(max_length=255, verbose_name='Auth kalit')
    user_agent = models.CharField(max_length=500, blank=True, default='', verbose_name='Brauzer')
    is_active = models.BooleanField(default=True, verbose_name='Faol')
    last_success_at = models.DateTimeField(null=True, blank=True, verbose_name='Oxirgi muvaffaqiyatli yuborish')
    last_error = models.TextField(blank=True, default='', verbose_name='Oxirgi xato')

    class Meta:
        verbose_name = 'Push obuna'
        verbose_name_plural = 'Push obunalar'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.full_name}: {self.endpoint[:48]}"


class NotificationPreference(BaseModel):
    """
    Per-user notification channel/type preferences.
    """

    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='notification_preference',
        verbose_name='Foydalanuvchi'
    )
    email_notifications_enabled = models.BooleanField(default=True, verbose_name='Email bildirishnomalari')
    telegram_notifications_enabled = models.BooleanField(default=True, verbose_name='Telegram bildirishnomalari')
    push_notifications_enabled = models.BooleanField(default=False, verbose_name='Push bildirishnomalari')
    new_task_notifications_enabled = models.BooleanField(default=True, verbose_name='Yangi topshiriq bildirishnomalari')
    deadline_reminders_enabled = models.BooleanField(default=True, verbose_name='Muddat eslatmalari')

    class Meta:
        verbose_name = 'Bildirishnoma sozlamasi'
        verbose_name_plural = 'Bildirishnoma sozlamalari'

    def __str__(self):
        return f"{self.user.full_name} notification settings"
