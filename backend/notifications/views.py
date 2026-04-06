"""
Notification views for E-Hokimiyat API.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from django.conf import settings

from .models import Notification, NotificationPreference, PushSubscription
from .serializers import NotificationPreferenceSerializer, NotificationSerializer, PushSubscriptionSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Notification management endpoints.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['notification_type', 'is_read']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Return only current user's notifications."""
        return Notification.objects.filter(user=self.request.user).select_related('related_task')

    def _get_preferences(self, user):
        preference, _ = NotificationPreference.objects.get_or_create(user=user)
        return preference
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Get unread notifications count.
        
        GET /api/notifications/unread_count/
        """
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread': count})
    
    @action(detail=True, methods=['patch'])
    def read(self, request, pk=None):
        """
        Mark notification as read.
        
        PATCH /api/notifications/{id}/read/
        """
        notification = self.get_object()
        notification.mark_as_read()
        return Response(NotificationSerializer(notification).data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """
        Mark all notifications as read.
        
        POST /api/notifications/mark_all_read/
        """
        from django.utils import timezone
        
        updated = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'marked_read': updated})

    @action(detail=False, methods=['get'])
    def push_public_key(self, request):
        key = getattr(settings, 'WEB_PUSH_PUBLIC_KEY', '')
        if not key:
            return Response({'public_key': '', 'configured': False})
        return Response({'public_key': key, 'configured': True})

    @action(detail=False, methods=['get'])
    def push_status(self, request):
        subscriptions = PushSubscription.objects.filter(user=request.user, is_active=True)
        preference = self._get_preferences(request.user)
        return Response({
            'enabled': preference.push_notifications_enabled and subscriptions.exists(),
            'count': subscriptions.count(),
            'permission_required': True,
        })

    @action(detail=False, methods=['post'])
    def push_subscribe(self, request):
        endpoint = (request.data.get('endpoint') or '').strip()
        keys = request.data.get('keys') or {}
        p256dh = (keys.get('p256dh') or request.data.get('p256dh') or '').strip()
        auth = (keys.get('auth') or request.data.get('auth') or '').strip()
        user_agent = (request.data.get('user_agent') or request.META.get('HTTP_USER_AGENT') or '')[:500]

        if not endpoint or not p256dh or not auth:
            return Response(
                {'error': "Push subscription ma'lumotlari to'liq emas"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subscription, _ = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                'user': request.user,
                'p256dh': p256dh,
                'auth': auth,
                'user_agent': user_agent,
                'is_active': True,
                'last_error': '',
            },
        )
        preference = self._get_preferences(request.user)
        if not preference.push_notifications_enabled:
            preference.push_notifications_enabled = True
            preference.save(update_fields=['push_notifications_enabled', 'updated_at'])
        return Response(PushSubscriptionSerializer(subscription).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def push_unsubscribe(self, request):
        endpoint = (request.data.get('endpoint') or '').strip()
        queryset = PushSubscription.objects.filter(user=request.user)
        if endpoint:
            queryset = queryset.filter(endpoint=endpoint)
        updated = queryset.update(is_active=False)
        return Response({'unsubscribed': updated})

    @action(detail=False, methods=['get'])
    def preferences(self, request):
        preference = self._get_preferences(request.user)
        return Response(NotificationPreferenceSerializer(preference).data)

    @preferences.mapping.put
    def update_preferences(self, request):
        preference = self._get_preferences(request.user)
        serializer = NotificationPreferenceSerializer(preference, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if not serializer.instance.push_notifications_enabled:
            PushSubscription.objects.filter(user=request.user, is_active=True).update(is_active=False)

        return Response(NotificationPreferenceSerializer(serializer.instance).data)
