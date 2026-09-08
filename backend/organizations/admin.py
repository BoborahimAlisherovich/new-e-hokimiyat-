"""
Organization admin configuration.
"""

from django.contrib import admin
from .models import Organization, Sector


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    search_fields = ['name']


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'sector', 'district', 'director_name', 'is_active']
    list_filter = ['sector', 'region', 'district', 'is_active']
    search_fields = ['name', 'director_name']
    ordering = ['name']
