"""
Authentication URL patterns.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import AuthViewSet

router = DefaultRouter()
router.register('', AuthViewSet, basename='auth')

urlpatterns = [
    path('', include(router.urls)),
]
