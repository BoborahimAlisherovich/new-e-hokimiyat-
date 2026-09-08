"""
AI Chat API URLs.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views_ai import (
    AIConversationViewSet,
    AIReportViewSet,
    AITaskMonitorViewSet,
    quick_chat,
    ai_status,
    daily_summary,
    execute_command
)

router = DefaultRouter()
router.register(r'conversations', AIConversationViewSet, basename='ai-conversation')
router.register(r'reports', AIReportViewSet, basename='ai-report')
router.register(r'monitoring', AITaskMonitorViewSet, basename='ai-monitoring')

urlpatterns = [
    path('', include(router.urls)),
    path('quick-chat/', quick_chat, name='ai-quick-chat'),
    path('status/', ai_status, name='ai-status'),
    path('daily-summary/', daily_summary, name='ai-daily-summary'),
    path('execute/', execute_command, name='ai-execute'),
]
