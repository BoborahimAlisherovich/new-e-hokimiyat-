"""
Core models - Base classes and mixins for all models.
"""

from django.db import models
import uuid


class TimeStampedModel(models.Model):
    """
    Abstract base model with created_at and updated_at fields.
    """
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Yangilangan vaqt")

    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """
    Abstract base model with UUID primary key.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel):
    """
    Abstract base model combining UUID and timestamps.
    """
    class Meta:
        abstract = True


class SystemSettings(TimeStampedModel):
    """
    Global system settings manageable via Admin panel.
    Singleton model - only one instance should exist.
    """
    system_name = models.CharField(max_length=255, default="E-Hokimiyat Platformasi", verbose_name="Tizim nomi")
    maintenance_mode = models.BooleanField(default=False, verbose_name="Texnik xizmat ko'rsatish rejimi")
    welcome_message = models.TextField(blank=True, verbose_name="Xush kelibsiz xabari")
    footer_text = models.CharField(max_length=255, blank=True, default="© 2026 E-Hokimiyat", verbose_name="Footer matni")
    
    # System Limits
    max_upload_size_mb = models.IntegerField(default=10, verbose_name="Maksimal yuklash hajmi (MB)")
    allowed_file_types = models.CharField(
        max_length=255, 
        default=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png",
        help_text="Vergul bilan ajratilgan kengaytmalar",
        verbose_name="Ruxsat etilgan fayl turlari"
    )

    class Meta:
        verbose_name = "Tizim Sozlamalari"
        verbose_name_plural = "Tizim Sozlamalari"

    def save(self, *args, **kwargs):
        if not self.pk and SystemSettings.objects.exists():
            # If trying to create a new instance when one exists, just update the existing one
            return SystemSettings.objects.first().save(*args, **kwargs)
        return super(SystemSettings, self).save(*args, **kwargs)

    def __str__(self):
        return self.system_name


# ==============================================================================
# AI MODELLARI
# ==============================================================================

class AIConversation(BaseModel):
    """AI bilan suhbat sessiyasi."""
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Faol'),
        ('COMPLETED', 'Yakunlangan'),
        ('ARCHIVED', 'Arxivlangan'),
    ]
    
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='ai_conversations',
        verbose_name='Foydalanuvchi'
    )
    
    title = models.CharField(max_length=255, blank=True, default='', verbose_name='Suhbat sarlavhasi')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE', verbose_name='Holat')
    context = models.JSONField(default=dict, blank=True, verbose_name='Kontekst')
    message_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        verbose_name = "AI suhbat"
        verbose_name_plural = "AI suhbatlar"
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.title or 'Yangi suhbat'}"


class AIMessage(BaseModel):
    """AI suhbatdagi xabar."""
    
    ROLE_CHOICES = [
        ('system', 'Tizim'),
        ('user', 'Foydalanuvchi'),
        ('assistant', 'AI'),
    ]
    
    conversation = models.ForeignKey(AIConversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, verbose_name='Rol')
    content = models.TextField(verbose_name='Matn')
    
    # Audio xabar
    audio_file = models.FileField(upload_to='ai_audio/', blank=True, null=True)
    is_audio_message = models.BooleanField(default=False)
    
    # Intent
    detected_intent = models.CharField(max_length=50, blank=True, default='')
    intent_confidence = models.FloatField(default=0)
    
    class Meta:
        verbose_name = "AI xabar"
        verbose_name_plural = "AI xabarlar"
        ordering = ['created_at']
    
    def __str__(self):
        return f"[{self.role}] {self.content[:50]}..."


class AIAction(BaseModel):
    """AI tomonidan bajarilgan harakat."""
    
    ACTION_TYPES = [
        ('CREATE_RECURRING_TASK', 'Takrorlanuvchi topshiriq yaratish'),
        ('EXPORT_ANALYTICS', 'Analitika faylini yaratish'),
        ('CREATE_TASK', 'Topshiriq yaratish'),
        ('CLOSE_TASK', 'Topshiriqni yopish'),
        ('REMOVE_CONTROL', 'Nazoratdan yechish'),
        ('GENERATE_REPORT', 'Hisobot yaratish'),
        ('SEND_NOTIFICATION', 'Bildirishnoma yuborish'),
        ('CLOSE_APPEAL', 'Murojaatni yopish'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Kutilmoqda'),
        ('IN_PROGRESS', 'Bajarilmoqda'),
        ('COMPLETED', 'Bajarildi'),
        ('FAILED', 'Xato'),
        ('CANCELLED', 'Bekor qilindi'),
    ]
    
    conversation = models.ForeignKey(AIConversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='actions')
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES, verbose_name='Harakat turi')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name='Holat')
    parameters = models.JSONField(default=dict, verbose_name='Parametrlar')
    result = models.JSONField(default=dict, blank=True, verbose_name='Natija')
    
    initiated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='ai_actions')
    executed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "AI harakat"
        verbose_name_plural = "AI harakatlar"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"[{self.get_action_type_display()}] - {self.get_status_display()}"


class AIReport(BaseModel):
    """AI tomonidan yaratilgan hisobot."""
    
    REPORT_TYPES = [
        ('DAILY_SUMMARY', 'Kunlik hisobot'),
        ('WEEKLY_SUMMARY', 'Haftalik hisobot'),
        ('MONTHLY_SUMMARY', 'Oylik hisobot'),
        ('TASK_ANALYSIS', 'Topshiriq tahlili'),
        ('CUSTOM', 'Maxsus hisobot'),
    ]
    
    report_type = models.CharField(max_length=30, choices=REPORT_TYPES, verbose_name='Hisobot turi')
    title = models.CharField(max_length=255, verbose_name='Sarlavha')
    summary = models.TextField(verbose_name='Qisqacha mazmun')
    content = models.JSONField(default=dict, verbose_name='To\'liq mazmun')
    
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    
    requested_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='ai_reports')
    conversation = models.ForeignKey(AIConversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    
    class Meta:
        verbose_name = "AI hisobot"
        verbose_name_plural = "AI hisobotlar"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"[{self.get_report_type_display()}] {self.title}"


class AITaskMonitor(BaseModel):
    """AI topshiriq monitoring."""
    
    task = models.OneToOneField('tasks.Task', on_delete=models.CASCADE, related_name='ai_monitor')
    
    risk_level = models.CharField(
        max_length=20,
        choices=[('LOW', 'Past'), ('MEDIUM', "O'rta"), ('HIGH', 'Yuqori'), ('CRITICAL', 'Kritik')],
        default='LOW'
    )
    
    needs_attention = models.BooleanField(default=False)
    ai_notes = models.TextField(blank=True, default='')
    
    warning_sent = models.BooleanField(default=False)
    warning_sent_at = models.DateTimeField(null=True, blank=True)
    
    comments_analyzed = models.BooleanField(default=False)
    comments_analysis_result = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = "AI topshiriq monitoring"
        verbose_name_plural = "AI topshiriq monitoringlari"
    
    def __str__(self):
        return f"Monitor: {self.task.title[:50]}"
