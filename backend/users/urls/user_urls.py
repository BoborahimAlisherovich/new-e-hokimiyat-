"""
User management URL patterns.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import UserViewSet, UserAssignmentViewSet

router = DefaultRouter()
router.register('', UserViewSet, basename='user')
router.register('assignments', UserAssignmentViewSet, basename='user-assignment')

urlpatterns = [
    path('', include(router.urls)),
]
