"""
User management URL patterns.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import PositionViewSet, UserViewSet, UserAssignmentViewSet

router = DefaultRouter()
router.register('positions', PositionViewSet, basename='user-position')
router.register('', UserViewSet, basename='user')
router.register('assignments', UserAssignmentViewSet, basename='user-assignment')

urlpatterns = [
    path('', include(router.urls)),
]
