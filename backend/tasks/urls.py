"""
Task URL patterns.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, DeadlineExtensionViewSet

router = DefaultRouter()
router.register('extensions', DeadlineExtensionViewSet, basename='extension')
router.register('', TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
]
