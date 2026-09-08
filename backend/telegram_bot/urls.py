from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    BotSettingsViewSet, BotAdminViewSet, BotRegionViewSet,
    TelegramUserViewSet, AppealCategoryViewSet, AppealTypeViewSet,
    TelegramAppealViewSet, BotStatsView, WebhookView
)

router = DefaultRouter()
router.register('settings', BotSettingsViewSet, basename='bot-settings')
router.register('admins', BotAdminViewSet, basename='bot-admins')
router.register('regions', BotRegionViewSet, basename='bot-regions')
router.register('users', TelegramUserViewSet, basename='telegram-users')
router.register('categories', AppealCategoryViewSet, basename='appeal-categories')
router.register('types', AppealTypeViewSet, basename='appeal-types')
router.register('appeals', TelegramAppealViewSet, basename='telegram-appeals')

urlpatterns = [
    path('', include(router.urls)),
    path('stats/', BotStatsView.as_view(), name='bot-stats'),
    path('webhook/', WebhookView.as_view(), name='telegram-webhook'),
]
