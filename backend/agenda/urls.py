"""
Kalendar URL'lari.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from agenda.views import CalendarEventViewSet, calendar_feed, calendar_upcoming

router = DefaultRouter()
router.register('events', CalendarEventViewSet, basename='calendar-event')

urlpatterns = [
    path('feed/', calendar_feed, name='calendar-feed'),
    path('upcoming/', calendar_upcoming, name='calendar-upcoming'),
    path('', include(router.urls)),
]
