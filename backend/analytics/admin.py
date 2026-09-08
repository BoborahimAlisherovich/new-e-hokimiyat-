"""
Analytics admin configuration.
"""

from django.contrib import admin
from .models import OrganizationStats, DashboardSnapshot


@admin.register(OrganizationStats)
class OrganizationStatsAdmin(admin.ModelAdmin):
    list_display = ['organization', 'date', 'total_tasks', 'completed_tasks', 'rating']
    list_filter = ['date', 'organization']
    ordering = ['-date']


@admin.register(DashboardSnapshot)
class DashboardSnapshotAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_tasks', 'completed_tasks', 'total_users']
    ordering = ['-date']
