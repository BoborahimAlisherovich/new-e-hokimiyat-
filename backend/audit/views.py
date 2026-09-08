"""
Audit views for E-Hokimiyat API.
"""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import AuditLog
from .serializers import AuditLogSerializer


class IsHokimOrAdmin:
    """
    Permission for viewing audit logs.
    """
    def has_permission(self, request, view):
        return request.user.role in ['HOKIM', 'ADMIN']


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Audit log viewing endpoints (read-only).
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsHokimOrAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['action', 'entity_type', 'user']
    search_fields = ['description', 'entity_id']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return AuditLog.objects.select_related('user')
