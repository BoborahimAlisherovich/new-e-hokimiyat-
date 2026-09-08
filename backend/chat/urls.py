"""
Chat URL patterns.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DirectMessageViewSet

router = DefaultRouter()
router.register('messages', DirectMessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
]
