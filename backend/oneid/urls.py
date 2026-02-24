"""
OneID integratsiya URL konfiguratsiyasi.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import OneIDAuthViewSet, OneIDStatusViewSet

router = DefaultRouter()
router.register(r'auth', OneIDAuthViewSet, basename='oneid-auth')
router.register(r'status', OneIDStatusViewSet, basename='oneid-status')

app_name = 'oneid'

urlpatterns = [
    path('', include(router.urls)),
]
