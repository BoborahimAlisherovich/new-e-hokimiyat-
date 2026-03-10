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
from tasks.models import TaskOrganization
from users.models import User
from django.db.models import Prefetch
from django.utils.text import slugify
from .serializers import (
    OrganizationSerializer, OrganizationCreateSerializer,
    OrganizationMinimalSerializer, SectorSerializer
)
from core.permissions import CanManageOrganizations
from audit.models import AuditLog

DEFAULT_SECTORS = [
    {
        'name': "Sog'liqni saqlash",
        'description': "Sog'liqni saqlash tizimi tashkilotlari",
    },
    {
        'name': "Bandlik va mehnat",
        'description': "Bandlik va mehnat bozori tashkilotlari",
    },
    {
        'name': "Ta'lim",
        'description': "Ta'lim tizimi tashkilotlari",
    },
    {
        'name': "Ijtimoiy himoya",
        'description': "Ijtimoiy himoya tashkilotlari",
    },
    {
        'name': "Adliya",
        'description': "Adliya tizimi tashkilotlari",
    },
    {
        'name': "Ekologiya",
        'description': "Ekologiya va atrof-muhit tashkilotlari",
    },
    {
        'name': "Subsidiya",
        'description': "Subsidiya va davlat qo'llab-quvvatlash tashkilotlari",
    },
    {
        'name': "Oila va bolalar",
        'description': "Oila va bolalar huquqlarini himoya qilish tashkilotlari",
    },
    {
        'name': "Ko'chmas mulk",
        'description': "Ko'chmas mulk va yer boshqaruvi tashkilotlari",
    },
    {
        'name': "Fuqarolik",
        'description': "Fuqarolik va pasport ishlari tashkilotlari",
    },
    {
        'name': "Davlat aktivlari",
        'description': "Davlat mulki va aktivlarini boshqarish tashkilotlari",
    },
    {
        'name': "Iqtisodiyot va biznes",
        'description': "Iqtisodiyot, biznes va tadbirkorlik tashkilotlari",
    },
    {
        'name': "Yoshlar",
        'description': "Yoshlar siyosati va sport tashkilotlari",
    },
    {
        'name': "Transport",
        'description': "Transport va yo'l xo'jaligi tashkilotlari",
    },
    {
        'name': "Axborot va aloqa",
        'description': "Axborot texnologiyalari va aloqa tashkilotlari",
    },
    {
        'name': "Geologiya",
        'description': "Geologiya va mineral resurslar tashkilotlari",
    },
    {
        'name': "Pensiya",
        'description': "Pensiya ta'minoti tashkilotlari",
    },
    {
        'name': "Madaniyat, turizm va sport",
        'description': "Madaniyat, turizm va sport tashkilotlari",
    },
    {
        'name': "Kommunal soha",
        'description': "Kommunal xizmat va shahar xo'jaligi tashkilotlari",
    },
    {
        'name': "Soliqlar",
        'description': "Soliq va bojxona tashkilotlari",
    },
]


class SectorViewSet(viewsets.ModelViewSet):
    """
    Sector management endpoints.
    """
    queryset = Sector.objects.all()
    serializer_class = SectorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering = ['name']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'populate_defaults']:
            return [IsAuthenticated(), CanManageOrganizations()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, CanManageOrganizations])
    def populate_defaults(self, request):
        """
        Populate default sectors.

        POST /api/organizations/sectors/populate_defaults/
        """
        created_count = 0
        updated_count = 0

        for sector_data in DEFAULT_SECTORS:
            sector, created = Sector.objects.update_or_create(
                name=sector_data['name'],
                defaults={
                    'description': sector_data.get('description', ''),
                    'is_active': True,
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        return Response(
            {
                'created': created_count,
                'updated': updated_count,
                'total': Sector.objects.count(),
            },
            status=status.HTTP_200_OK,
        )


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
        queryset = Organization.objects.select_related('sector', 'parent').prefetch_related(
            Prefetch(
                'employees',
                queryset=User.objects.filter(
                    role='TASHKILOT_RAHBARI', status='FAOL'
                ).only('first_name', 'last_name', 'middle_name', 'role', 'status', 'organization_id')
            )
        )
        
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
    def regions(self, request):
        """
        Get distinct regions.

        GET /api/organizations/regions/
        """
        regions = (
            self.get_queryset()
            .exclude(region='')
            .values_list('region', flat=True)
            .distinct()
            .order_by('region')
        )
        data = [
            {
                'id': index + 1,
                'name': name,
                'code': slugify(name),
            }
            for index, name in enumerate(regions)
        ]
        return Response(data)

    @action(detail=False, methods=['get'])
    def districts(self, request):
        """
        Get distinct districts, optionally filtered by region.

        GET /api/organizations/districts/?region=<region>
        """
        queryset = self.get_queryset().exclude(district='')
        region = request.query_params.get('region')
        if region:
            queryset = queryset.filter(region=region)

        districts = queryset.values_list('district', flat=True).distinct().order_by('district')
        data = [
            {
                'id': index + 1,
                'name': name,
                'code': slugify(name),
                'region': region or '',
            }
            for index, name in enumerate(districts)
        ]
        return Response(data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """
        Get organization statistics.

        GET /api/organizations/{id}/statistics/
        """
        org = self.get_object()
        task_orgs = TaskOrganization.objects.filter(organization=org)

        total_tasks = task_orgs.count()
        completed_tasks = task_orgs.filter(status__in=['BAJARILDI', 'NAZORATDAN_YECHILDI']).count()
        pending_tasks = task_orgs.filter(status__in=['YANGI', 'IJRODA', 'MUDDATI_KECH']).count()
        overdue_tasks = task_orgs.filter(status='MUDDATI_KECH').count()
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks else 0
        employees_count = org.employees.filter(status='FAOL').count()

        return Response({
            'totalTasks': total_tasks,
            'completedTasks': completed_tasks,
            'pendingTasks': pending_tasks,
            'overdueTasks': overdue_tasks,
            'completionRate': completion_rate,
            'employeesCount': employees_count,
        })

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """
        Get organization hierarchy tree.

        GET /api/organizations/tree/
        """
        queryset = self.get_queryset().select_related('parent')

        nodes = {}
        for org in queryset:
            nodes[org.id] = {
                'id': org.id,
                'name': org.name,
                'short_name': org.short_name,
                'parent_id': org.parent_id,
                'region': org.region,
                'district': org.district,
                'address': org.address,
                'phone': org.phone,
                'email': org.email,
                'website': org.website,
                'director_name': org.director_name,
                'is_active': org.is_active,
                'children': [],
                'level': 0,
            }

        roots = []
        for org in queryset:
            node = nodes[org.id]
            if org.parent_id and org.parent_id in nodes:
                nodes[org.parent_id]['children'].append(node)
            else:
                roots.append(node)

        def set_levels(items, level=0):
            for item in items:
                item['level'] = level
                set_levels(item['children'], level + 1)

        set_levels(roots)
        return Response(roots)
    
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
        serializer = UserMinimalSerializer(employees, many=True, context={'request': request})
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
