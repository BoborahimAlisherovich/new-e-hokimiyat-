"""
Analytics models for E-Hokimiyat platform.

Pre-computed analytics for dashboard performance.
"""

from django.db import models
from core.models import BaseModel


class OrganizationStats(BaseModel):
    """
    Daily statistics for organizations.
    Pre-computed for fast dashboard loading.
    """
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='daily_stats',
        verbose_name='Tashkilot'
    )
    
    date = models.DateField(verbose_name='Sana')
    
    # Task statistics
    total_tasks = models.PositiveIntegerField(default=0, verbose_name='Jami topshiriqlar')
    new_tasks = models.PositiveIntegerField(default=0, verbose_name='Yangi topshiriqlar')
    in_progress_tasks = models.PositiveIntegerField(default=0, verbose_name='Ijrodagi topshiriqlar')
    completed_tasks = models.PositiveIntegerField(default=0, verbose_name='Bajarilgan topshiriqlar')
    overdue_tasks = models.PositiveIntegerField(default=0, verbose_name='Kechikkan topshiriqlar')
    
    # Performance metrics
    average_completion_time = models.FloatField(default=0, verbose_name="O'rtacha bajarilish vaqti (kun)")
    on_time_completion_rate = models.FloatField(default=0, verbose_name="O'z vaqtida bajarilish foizi")
    
    # Rating (0-100)
    rating = models.FloatField(default=0, verbose_name='Reyting')
    
    class Meta:
        verbose_name = 'Tashkilot statistikasi'
        verbose_name_plural = 'Tashkilot statistikalari'
        unique_together = ['organization', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.organization.name} - {self.date}"


class DashboardSnapshot(BaseModel):
    """
    Daily snapshot of overall system statistics.
    """
    
    date = models.DateField(unique=True, verbose_name='Sana')
    
    # User statistics
    total_users = models.PositiveIntegerField(default=0, verbose_name='Jami foydalanuvchilar')
    active_users = models.PositiveIntegerField(default=0, verbose_name='Faol foydalanuvchilar')
    new_users = models.PositiveIntegerField(default=0, verbose_name='Yangi foydalanuvchilar')
    
    # Organization statistics
    total_organizations = models.PositiveIntegerField(default=0, verbose_name='Jami tashkilotlar')
    
    # Task statistics
    total_tasks = models.PositiveIntegerField(default=0, verbose_name='Jami topshiriqlar')
    new_tasks = models.PositiveIntegerField(default=0, verbose_name='Yangi topshiriqlar')
    completed_tasks = models.PositiveIntegerField(default=0, verbose_name='Bajarilgan topshiriqlar')
    overdue_tasks = models.PositiveIntegerField(default=0, verbose_name='Kechikkan topshiriqlar')
    
    # Performance
    average_completion_time = models.FloatField(default=0, verbose_name="O'rtacha bajarilish vaqti")
    system_rating = models.FloatField(default=0, verbose_name='Tizim reytingi')
    
    class Meta:
        verbose_name = 'Dashboard snapshot'
        verbose_name_plural = 'Dashboard snapshotlar'
        ordering = ['-date']
    
    def __str__(self):
        return f"Dashboard - {self.date}"
