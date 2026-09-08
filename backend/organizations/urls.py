"""
Organization URL patterns.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, SectorViewSet

router = DefaultRouter()
router.register('sectors', SectorViewSet, basename='sector')
router.register('', OrganizationViewSet, basename='organization')

urlpatterns = [
    path('', include(router.urls)),
]
