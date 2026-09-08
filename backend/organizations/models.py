"""
Organization models for E-Hokimiyat platform.
"""

from django.db import models
from core.models import BaseModel


class Sector(BaseModel):
    """
    Sector/Category for organizations.
    Example: Ta'lim, Sog'liqni saqlash, Qurilish, etc.
    """
    name = models.CharField(max_length=200, unique=True, verbose_name='Nomi')
    description = models.TextField(blank=True, verbose_name='Tavsif')
    is_active = models.BooleanField(default=True, verbose_name='Faol')
    
    class Meta:
        verbose_name = 'Soha'
        verbose_name_plural = 'Sohalar'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Organization(BaseModel):
    """
    Organization model.
    
    Organizations can have parent-child relationships for hierarchy.
    """
    name = models.CharField(max_length=300, verbose_name='Nomi')
    short_name = models.CharField(max_length=100, blank=True, verbose_name='Qisqa nomi')
    
    # Hierarchy
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Yuqori tashkilot'
    )
    
    # Classification
    sector = models.ForeignKey(
        Sector,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='organizations',
        verbose_name='Soha'
    )
    
    # Location
    region = models.CharField(max_length=100, blank=True, verbose_name='Viloyat')
    district = models.CharField(max_length=100, blank=True, verbose_name='Tuman')
    address = models.TextField(blank=True, verbose_name='Manzil')
    
    # Contact
    phone = models.CharField(max_length=20, blank=True, verbose_name='Telefon')
    email = models.EmailField(blank=True, verbose_name='Email')
    website = models.URLField(blank=True, verbose_name='Veb-sayt')
    
    # Director info (for quick reference)
    director_name = models.CharField(max_length=200, blank=True, verbose_name='Rahbar ismi')
    
    # Status
    is_active = models.BooleanField(default=True, verbose_name='Faol')
    
    class Meta:
        verbose_name = 'Tashkilot'
        verbose_name_plural = 'Tashkilotlar'
        ordering = ['name']
    
    def __str__(self):
        return self.short_name or self.name
    
    @property
    def employee_count(self):
        """Return number of employees in this organization."""
        return self.employees.filter(status='FAOL').count()
    
    @property
    def active_tasks_count(self):
        """Return number of active tasks assigned to this organization."""
        return self.task_assignments.filter(
            status__in=['YANGI', 'IJRODA', 'MUDDATI_KECH']
        ).count()
    
    def get_hierarchy_path(self):
        """Return list of organizations from root to this one."""
        path = [self]
        current = self.parent
        while current:
            path.insert(0, current)
            current = current.parent
        return path
