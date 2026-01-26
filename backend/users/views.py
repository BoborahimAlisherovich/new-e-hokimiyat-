"""
User views for E-Hokimiyat API.
"""

from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import User, UserAssignment
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    LoginSerializer, UserMeSerializer, UserMinimalSerializer,
    UserAssignmentSerializer
)
from core.permissions import CanManageUsers
from audit.models import AuditLog


class AuthViewSet(viewsets.ViewSet):
    """
    Authentication endpoints.
    
    For development: Mock authentication with PNFL
    For production: Replace with OneID OAuth
    """
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        """
        Mock login endpoint.
        
        POST /api/auth/login/
        {
            "pnfl": "12345678901234",
            "password": "optional_password"
        }
        """
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Log the login
        AuditLog.log(
            user=user,
            action='USER_LOGIN',
            entity_type='USER',
            entity_id=user.id,
            description=f"{user.full_name} tizimga kirdi",
            ip_address=getattr(request, 'client_ip', None),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserMeSerializer(user).data
        })
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        Logout endpoint.
        
        POST /api/auth/logout/
        """
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            # Log the logout
            AuditLog.log(
                user=request.user,
                action='USER_LOGOUT',
                entity_type='USER',
                entity_id=request.user.id,
                description=f"{request.user.full_name} tizimdan chiqdi",
                ip_address=getattr(request, 'client_ip', None)
            )
            
            return Response({'detail': 'Muvaffaqiyatli chiqildi'})
        except Exception:
            return Response({'detail': 'Logout amalga oshirildi'})
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Get current user profile.
        
        GET /api/auth/me/
        """
        return Response(UserMeSerializer(request.user).data)
    
    @action(detail=False, methods=['post'])
    def refresh(self, request):
        """
        Refresh access token.
        
        POST /api/auth/refresh/
        {
            "refresh": "refresh_token"
        }
        """
        from rest_framework_simplejwt.views import TokenRefreshView
        return TokenRefreshView.as_view()(request._request)


class UserViewSet(viewsets.ModelViewSet):
    """
    User management endpoints.
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, CanManageUsers]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'status', 'organization']
    search_fields = ['first_name', 'last_name', 'middle_name', 'position']
    ordering_fields = ['created_at', 'last_name', 'first_name']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'list':
            return UserSerializer
        return UserSerializer
    
    def get_queryset(self):
        """Filter users based on current user's role and organization."""
        user = self.request.user
        queryset = User.objects.select_related('organization', 'created_by')
        
        # Tashkilot rahbari can only see users in their organization
        if user.role == 'TASHKILOT_RAHBARI':
            queryset = queryset.filter(organization=user.organization)
        
        # Tashkilot mas'uli can only see themselves
        elif user.role == 'TASHKILOT_MASUL':
            queryset = queryset.filter(id=user.id)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create user and log the action."""
        user = serializer.save()
        
        AuditLog.log(
            user=self.request.user,
            action='USER_CREATED',
            entity_type='USER',
            entity_id=user.id,
            description=f"{self.request.user.full_name} yangi foydalanuvchi yaratdi: {user.full_name}",
            new_values={
                'pnfl': user.masked_pnfl,
                'role': user.role,
                'organization': str(user.organization_id) if user.organization else None
            },
            ip_address=getattr(self.request, 'client_ip', None)
        )
    
    @action(detail=True, methods=['patch'])
    def block(self, request, pk=None):
        """
        Block a user.
        
        PATCH /api/users/{id}/block/
        """
        user = self.get_object()
        
        # Can't block yourself
        if user == request.user:
            return Response(
                {'detail': "O'zingizni bloklash mumkin emas"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check hierarchy
        if not request.user.can_add_user_with_role(user.role):
            return Response(
                {'detail': "Bu foydalanuvchini bloklash huquqingiz yo'q"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        old_status = user.status
        user.block()
        
        AuditLog.log(
            user=request.user,
            action='USER_BLOCKED',
            entity_type='USER',
            entity_id=user.id,
            description=f"{request.user.full_name} foydalanuvchini blokladi: {user.full_name}",
            old_values={'status': old_status},
            new_values={'status': user.status},
            ip_address=getattr(request, 'client_ip', None)
        )
        
        return Response(UserSerializer(user).data)
    
    @action(detail=True, methods=['patch'])
    def archive(self, request, pk=None):
        """
        Archive a user.
        
        PATCH /api/users/{id}/archive/
        """
        user = self.get_object()
        
        # Can't archive yourself
        if user == request.user:
            return Response(
                {'detail': "O'zingizni arxivlash mumkin emas"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check hierarchy
        if not request.user.can_add_user_with_role(user.role):
            return Response(
                {'detail': "Bu foydalanuvchini arxivlash huquqingiz yo'q"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        old_status = user.status
        user.archive()
        
        AuditLog.log(
            user=request.user,
            action='USER_ARCHIVED',
            entity_type='USER',
            entity_id=user.id,
            description=f"{request.user.full_name} foydalanuvchini arxivladi: {user.full_name}",
            old_values={'status': old_status},
            new_values={'status': user.status},
            ip_address=getattr(request, 'client_ip', None)
        )
        
        return Response(UserSerializer(user).data)
    
    @action(detail=True, methods=['patch'])
    def activate(self, request, pk=None):
        """
        Activate a blocked user.
        
        PATCH /api/users/{id}/activate/
        """
        user = self.get_object()
        
        if user.status == 'ARXIV':
            return Response(
                {'detail': "Arxivlangan foydalanuvchini faollashtirish mumkin emas"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if user.status == 'FAOL':
            return Response(
                {'detail': "Foydalanuvchi allaqachon faol"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = user.status
        user.activate()
        
        AuditLog.log(
            user=request.user,
            action='USER_ACTIVATED',
            entity_type='USER',
            entity_id=user.id,
            description=f"{request.user.full_name} foydalanuvchini faollashtirdi: {user.full_name}",
            old_values={'status': old_status},
            new_values={'status': user.status},
            ip_address=getattr(request, 'client_ip', None)
        )
        
        return Response(UserSerializer(user).data)


class UserAssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    User assignment history (read-only).
    """
    queryset = UserAssignment.objects.all()
    serializer_class = UserAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['assigned_user', 'assigned_by', 'assigned_role']
    ordering = ['-created_at']
