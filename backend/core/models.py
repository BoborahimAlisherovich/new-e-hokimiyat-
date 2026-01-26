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
