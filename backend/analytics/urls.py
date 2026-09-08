"""
Analytics URL patterns.
"""

from django.urls import path
from .views import (
    DashboardAnalyticsView,
    OrgDashboardView,
    OrganizationAnalyticsView,
    UserAnalyticsView,
    TaskTrendsView,
    AnalyticsExportView,
    VillageAnalyticsView,
)

urlpatterns = [
    path('dashboard/', DashboardAnalyticsView.as_view(), name='analytics-dashboard'),
    path('org-dashboard/', OrgDashboardView.as_view(), name='analytics-org-dashboard'),
    path('organizations/', OrganizationAnalyticsView.as_view(), name='analytics-organizations'),
    path('users/', UserAnalyticsView.as_view(), name='analytics-users'),
    path('trends/', TaskTrendsView.as_view(), name='analytics-trends'),
    path('export/', AnalyticsExportView.as_view(), name='analytics-export'),
    # Interaktiv xarita uchun qishloqlar kesimi
    path('villages/', VillageAnalyticsView.as_view(), name='analytics-villages'),
]
