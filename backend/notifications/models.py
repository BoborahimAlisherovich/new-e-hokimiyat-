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
