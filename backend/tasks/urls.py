"""
Task URL patterns.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, DeadlineExtensionViewSet
from .views_recurring import RecurringTaskViewSet

router = DefaultRouter()
router.register('extensions', DeadlineExtensionViewSet, basename='extension')
router.register('recurring', RecurringTaskViewSet, basename='recurring-task')
router.register('', TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
]
