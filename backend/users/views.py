"""
User views for E-Hokimiyat API.

Bu modul foydalanuvchilar bilan ishlash uchun API endpointlarni o'z ichiga oladi.

Endpointlar:
    Auth:
        - POST /api/auth/login/ - Tizimga kirish
        - POST /api/auth/logout/ - Tizimdan chiqish
        - GET /api/auth/me/ - Joriy foydalanuvchi ma'lumotlari
        - POST /api/auth/refresh/ - Token yangilash
    
    Users:
        - GET/POST /api/users/ - Foydalanuvchilar ro'yxati va yaratish
        - GET/PUT/DELETE /api/users/{id}/ - Foydalanuvchi detallari
        - PATCH /api/users/{id}/block/ - Bloklash
        - PATCH /api/users/{id}/unblock/ - Blokdan chiqarish
        - PATCH /api/users/{id}/archive/ - Arxivlash
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, List, Type

from django.db.models import Q
from django.db.models.query import QuerySet
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework_simplejwt.tokens import RefreshToken

from audit.models import AuditLog
from core.constants import AuditAction, Messages, UserRole
from core.permissions import CanManageUsers

from .models import User, UserAssignment
from .serializers import (
    LoginSerializer,
    UserAssignmentSerializer,
    UserCreateSerializer,
    UserMeSerializer,
    UserMinimalSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

if TYPE_CHECKING:
    pass


# =============================================================================
# AUTHENTICATION VIEWSET
# =============================================================================

class AuthViewSet(viewsets.ViewSet):
    """Autentifikatsiya endpointlari.
    
    Development uchun: Mock autentifikatsiya PNFL bilan
    Production uchun: OneID OAuth integratsiyasi
    
    Endpointlar:
        - login: Tizimga kirish
        - logout: Tizimdan chiqish
        - me: Joriy foydalanuvchi profili
        - refresh: Access token yangilash
    """
    
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def login(self, request: Request) -> Response:
        """Tizimga kirish.
        
        Mock login endpoint - development uchun.
        
        Args:
            request: HTTP so'rov
                - pnfl: 14 raqamli JSHSHR
                - password: Parol (ixtiyoriy)
        
        Returns:
            Response: JWT tokenlar va foydalanuvchi ma'lumotlari
                - access: Access token
                - refresh: Refresh token
                - user: Foydalanuvchi profili
        """
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # JWT tokenlar generatsiya qilish
        refresh = RefreshToken.for_user(user)
        
        # Login logini yozish
        AuditLog.log(
            user=user,
            action=AuditAction.USER_LOGIN,
            entity_type='USER',
            entity_id=user.id,
            description=f"{user.full_name} tizimga kirdi",
            ip_address=getattr(request, 'client_ip', None),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserMeSerializer(user, context={'request': request}).data
        })
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request: Request) -> Response:
        """Tizimdan chiqish.
        
        Refresh tokenni blacklist'ga qo'shadi.
        
        Args:
            request: HTTP so'rov
                - refresh: Refresh token
        
        Returns:
            Response: Muvaffaqiyat xabari
        """
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            AuditLog.log(
                user=request.user,
                action=AuditAction.USER_LOGOUT,
                entity_type='USER',
                entity_id=request.user.id,
                description=f"{request.user.full_name} tizimdan chiqdi",
                ip_address=getattr(request, 'client_ip', None)
            )
            
            return Response({'detail': Messages.LOGOUT_SUCCESS})
        except Exception:
            return Response({'detail': Messages.LOGOUT_SUCCESS})
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request: Request) -> Response:
        """Joriy foydalanuvchi profilini olish.
        
        Args:
            request: HTTP so'rov
        
        Returns:
            Response: Foydalanuvchi profili
        """
        return Response(UserMeSerializer(request.user, context={'request': request}).data)
    
    @action(detail=False, methods=['post'])
    def refresh(self, request: Request) -> Response:
        """Access tokenni yangilash.
        
        Args:
            request: HTTP so'rov
                - refresh: Refresh token
        
        Returns:
            Response: Yangi access token
        """
        from rest_framework_simplejwt.views import TokenRefreshView
        return TokenRefreshView.as_view()(request._request)


# =============================================================================
# USER VIEWSET
# =============================================================================

class UserViewSet(viewsets.ModelViewSet):
    """Foydalanuvchilar bilan ishlash uchun ViewSet.
    
    Bu ViewSet foydalanuvchilarni boshqarish uchun CRUD operatsiyalarni
    va qo'shimcha action'larni o'z ichiga oladi.
    
    Attributes:
        queryset: Barcha foydalanuvchilar
        permission_classes: Autentifikatsiya va CanManageUsers
        
    Qo'shimcha action'lar:
        - block: Foydalanuvchini bloklash
        - unblock: Blokdan chiqarish
        - archive: Arxivlash
        - activate: Faollashtirish
    """
    
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, CanManageUsers]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'status', 'organization']
    search_fields = ['first_name', 'last_name', 'middle_name', 'position']
    ordering_fields = ['created_at', 'last_name', 'first_name']
    ordering = ['-created_at']
    
    def get_serializer_class(self) -> Type[Serializer]:
        """So'rov turiga qarab serializer tanlash.
        
        Returns:
            Tegishli Serializer class
        """
        serializer_map = {
            'create': UserCreateSerializer,
            'update': UserUpdateSerializer,
            'partial_update': UserUpdateSerializer,
        }
        return serializer_map.get(self.action, UserSerializer)
    
    def get_queryset(self) -> QuerySet[User]:
        """Foydalanuvchi roliga qarab filtrlash.
        
        Tashkilot rahbari faqat o'z tashkiloti xodimlarini,
        tashkilot mas'uli faqat o'zini ko'radi.
        
        Returns:
            Filtrlangan foydalanuvchilar queryset'i
        """
        user = self.request.user
        queryset = User.objects.select_related('organization', 'created_by')
        
        # Tashkilot rahbari - faqat o'z tashkiloti
        if user.role == UserRole.TASHKILOT_RAHBARI:
            return queryset.filter(organization=user.organization)
        
        # Tashkilot mas'uli - faqat o'zi
        if user.role == UserRole.TASHKILOT_MASUL:
            return queryset.filter(id=user.id)
        
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
        
        return Response(UserSerializer(user, context={'request': request}).data)
    
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
        
        return Response(UserSerializer(user, context={'request': request}).data)
    
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
        
        return Response(UserSerializer(user, context={'request': request}).data)

    @action(detail=False, methods=['get'])
    def chat_users(self, request):
        """
        Chat uchun foydalanuvchilar ro'yxati.
        
        Rolga qarab quyidagi foydalanuvchilarni ko'rsatadi:
        - HOKIM, HOKIMLIK_MASUL, ADMIN: Barcha foydalanuvchilar
        - TASHKILOT_RAHBARI: O'z tashkiloti + HOKIM/HOKIMLIK_MASUL
        - TASHKILOT_MASUL: O'z tashkiloti + HOKIM/HOKIMLIK_MASUL
        
        GET /api/users/chat_users/
        """
        user = request.user
        queryset = User.objects.select_related('organization').filter(
            status='FAOL'
        ).exclude(id=user.id)
        
        # Hokim va admin barcha foydalanuvchilarni ko'radi
        if user.role in ['HOKIM', 'HOKIMLIK_MASUL', 'ADMIN']:
            pass  # Hech qanday filter qo'shilmaydi
        
        # Tashkilot xodimlari
        elif user.role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
            from django.db.models import Q
            # O'z tashkiloti + Hokimlik xodimlari
            queryset = queryset.filter(
                Q(organization=user.organization) |  # O'z tashkiloti
                Q(role__in=['HOKIM', 'HOKIMLIK_MASUL'])  # Hokimlik xodimlari
            )
        else:
            queryset = queryset.none()
        
        serializer = UserSerializer(queryset.order_by('first_name', 'last_name'), many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post', 'delete'], permission_classes=[IsAuthenticated])
    def avatar(self, request):
        """
        Profil rasmini yuklash yoki o'chirish.
        
        POST /api/users/avatar/ - Rasm yuklash (multipart/form-data, field: 'avatar')
        DELETE /api/users/avatar/ - Rasmni o'chirish
        """
        user = request.user
        
        if request.method == 'DELETE':
            if user.avatar:
                user.avatar.delete(save=False)
                user.avatar = None
                user.save(update_fields=['avatar'])
            return Response({'status': "Rasm o'chirildi"})
        
        # POST - rasm yuklash
        avatar_file = request.FILES.get('avatar')
        if not avatar_file:
            return Response(
                {'error': 'Rasm fayli topilmadi. "avatar" kalit bilan yuklang.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Fayl turini tekshirish
        allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if avatar_file.content_type not in allowed_types:
            return Response(
                {'error': 'Faqat JPEG, PNG, WebP va GIF formatidagi rasmlar qabul qilinadi.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Fayl hajmini tekshirish (5 MB)
        if avatar_file.size > 5 * 1024 * 1024:
            return Response(
                {'error': "Rasm hajmi 5 MB dan oshmasligi kerak."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Eski rasmni o'chirish
        if user.avatar:
            user.avatar.delete(save=False)
        
        user.avatar = avatar_file
        user.save(update_fields=['avatar'])
        
        avatar_url = request.build_absolute_uri(user.avatar.url)
        if avatar_url.startswith('http://'):
            avatar_url = avatar_url.replace('http://', 'https://', 1)
        return Response({
            'status': 'Rasm muvaffaqiyatli yuklandi',
            'avatar_url': avatar_url
        })


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
