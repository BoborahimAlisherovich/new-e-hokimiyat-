"""
URL configuration for E-Hokimiyat project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API v1 endpoints
    path('api/auth/', include('users.urls.auth_urls')),
    path('api/users/', include('users.urls.user_urls')),
    path('api/organizations/', include('organizations.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/settings/', include('core.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/telegram-bot/', include('telegram_bot.urls')),
    
    # AI Chat API
    path('api/ai/', include('core.urls_ai')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
