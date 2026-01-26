"""
Organization views for E-Hokimiyat API.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Organization, Sector
from .serializers import (
    OrganizationSerializer, OrganizationCreateSerializer,
    OrganizationMinimalSerializer, SectorSerializer
)
from core.permissions import CanManageOrganizations
from audit.models import AuditLog


class SectorViewSet(viewsets.ModelViewSet):
    """
    Sector management endpoints.
    """
    queryset = Sector.objects.all()
    serializer_class = SectorSerializer
    permission_classes = [IsAuthenticated, CanManageOrganizations]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering = ['name']


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    Organization management endpoints.
    """
    queryset = Organization.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['sector', 'region', 'district', 'is_active', 'parent']
    search_fields = ['name', 'short_name', 'director_name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return OrganizationCreateSerializer
        elif self.action == 'list_minimal':
            return OrganizationMinimalSerializer
        return OrganizationSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanManageOrganizations()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Filter organizations based on user role."""
        user = self.request.user
        queryset = Organization.objects.select_related('sector', 'parent')
        
        # Tashkilot rahbari and mas'uli can only see their organization
        if user.role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
            if user.organization:
                queryset = queryset.filter(id=user.organization.id)
            else:
                queryset = queryset.none()
        
        return queryset
    
    def perform_create(self, serializer):
        """Create organization and log the action."""
        org = serializer.save()
        
        AuditLog.log(
            user=self.request.user,
            action='ORG_CREATED',
            entity_type='ORGANIZATION',
            entity_id=org.id,
            description=f"{self.request.user.full_name} yangi tashkilot yaratdi: {org.name}",
            new_values={'name': org.name, 'sector': str(org.sector_id)},
            ip_address=getattr(self.request, 'client_ip', None)
        )
    
    def perform_update(self, serializer):
        """Update organization and log the action."""
        old_data = {
            'name': serializer.instance.name,
            'is_active': serializer.instance.is_active
        }
        
        org = serializer.save()
        
        AuditLog.log(
            user=self.request.user,
            action='ORG_UPDATED',
            entity_type='ORGANIZATION',
            entity_id=org.id,
            description=f"{self.request.user.full_name} tashkilotni yangiladi: {org.name}",
            old_values=old_data,
            new_values={'name': org.name, 'is_active': org.is_active},
            ip_address=getattr(self.request, 'client_ip', None)
        )
    
    @action(detail=False, methods=['get'])
    def list_minimal(self, request):
        """
        Get minimal list of organizations for dropdowns.
        
        GET /api/organizations/list_minimal/
        """
        queryset = self.get_queryset().filter(is_active=True)
        serializer = OrganizationMinimalSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        """
        Get employees of an organization.
        
        GET /api/organizations/{id}/employees/
        """
        from users.serializers import UserMinimalSerializer
        
        org = self.get_object()
        employees = org.employees.filter(status='FAOL')
        serializer = UserMinimalSerializer(employees, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """
        Get tasks assigned to an organization.
        
        GET /api/organizations/{id}/tasks/
        """
        from tasks.serializers import TaskMinimalSerializer
        
        org = self.get_object()
        task_orgs = org.task_assignments.select_related('task').filter(
            status__in=['YANGI', 'IJRODA', 'MUDDATI_KECH']
        )
        tasks = [to.task for to in task_orgs]
        serializer = TaskMinimalSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def hierarchy(self, request, pk=None):
        """
        Get organization hierarchy path.
        
        GET /api/organizations/{id}/hierarchy/
        """
        org = self.get_object()
        path = org.get_hierarchy_path()
        serializer = OrganizationMinimalSerializer(path, many=True)
        return Response(serializer.data)
