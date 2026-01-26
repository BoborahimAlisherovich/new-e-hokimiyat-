"""
Notification views for E-Hokimiyat API.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import Notification
from .serializers import NotificationSerializer


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
