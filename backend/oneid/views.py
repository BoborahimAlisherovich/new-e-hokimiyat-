"""
OneID integratsiya viewlari.

Ushbu modul OneID tizimi bilan ishlash uchun API endpointlarini o'z ichiga oladi:
- Login/Logout
- Callback handling
- Token management
- User ma'lumotlarini sinxronizatsiya
"""

import logging
from typing import Dict, Any
from urllib.parse import urlparse, parse_qs

from django.conf import settings
from django.shortcuts import redirect
from django.contrib.auth import get_user_model
from django.http import JsonResponse, HttpRequest
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .services import oneid_service
from .models import OneIDSession, OneIDToken
from .serializers import OneIDLoginSerializer, OneIDCallbackSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class OneIDAuthViewSet(viewsets.ViewSet):
    """
    OneID autentifikatsiya endpointlari.
    
    Endpointlar:
        - login: OneID orqali login boshlash
        - callback: OneID dan qaytgan callback
        - refresh: Token yangilash
        - logout: OneID orqali chiqish
    """
    
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def login(self, request: Request) -> Response:
        """
        OneID orqali login boshlash.
        
        Request:
            pnfl: 14 raqamli PNFL
            redirect_uri: Callback URL (optional)
            
        Response:
            success: true
            authorization_url: OneID avtorizatsiya URL
            state: CSRF himoya uchun state
        """
        serializer = OneIDLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        pnfl = serializer.validated_data['pnfl']
        redirect_uri = serializer.validated_data.get('redirect_uri')
        
        # Foydalanuvchini tekshirish
        user = oneid_service.authenticate_user(pnfl)
        if not user:
            return Response({
                'success': False,
                'error': 'Foydalanuvchi topilmadi yoki bloklangan'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Sessiya yaratish
        session = OneIDSession.objects.create(
            user=user,
            pnfl=pnfl,
            redirect_uri=redirect_uri or oneid_service.redirect_uri,
            ip_address=getattr(request, 'client_ip', None),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        # OneID avtorizatsiya URL
        auth_url = oneid_service.get_authorization_url(
            state=session.state,
            redirect_uri=session.redirect_uri
        )
        
        return Response({
            'success': True,
            'authorization_url': auth_url,
            'state': session.state,
            'session_id': str(session.session_id)
        })
    
    @action(detail=False, methods=['get'])
    def callback(self, request: Request) -> Response:
        """
        OneID callback endpoint.
        
        OneID tizimidan qaytgan so'rovni qabul qilish va tokenlarni olish.
        
        Query params:
            code: Authorization code
            state: Sessiya state
            error: Xatolik (agar bo'lsa)
        """
        # Query parametrlarni olish
        code = request.GET.get('code')
        state = request.GET.get('state')
        error = request.GET.get('error')
        
        if error:
            logger.error(f"OneID callback xatolik: {error}")
            return self._handle_callback_error(state, error, request.GET.get('error_description', ''))
        
        if not code or not state:
            logger.error("OneID callback: code yoki state yo'q")
            return Response({
                'success': False,
                'error': 'Invalid callback parameters'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Sessiyani topish
        try:
            session = OneIDSession.objects.get(state=state, status='PENDING')
        except OneIDSession.DoesNotExist:
            logger.error(f"Sessiya topilmadi: {state}")
            return Response({
                'success': False,
                'error': 'Invalid or expired session'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Tokenlarni olish
            token_data = oneid_service.exchange_code_for_tokens(
                code=code,
                redirect_uri=session.redirect_uri
            )
            
            # Foydalanuvchi ma'lumotlarini olish
            user_info = oneid_service.get_user_info(
                access_token=token_data['access_token']
            )
            
            # PNFL ni tekshirish
            if user_info.get('pin') != session.pnfl:
                logger.error(f"PNFL mos kelmadi: {user_info.get('pin')} != {session.pnfl}")
                session.status = 'FAILED'
                session.error_code = 'PNFL_MISMATCH'
                session.error_message = 'PNFL mos kelmadi'
                session.save()
                return Response({
                    'success': False,
                    'error': 'PNFL mismatch'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Foydalanuvchi ma'lumotlarini sinxronizatsiya qilish
            user = session.user
            oneid_service.sync_user_data(user, user_info)
            
            # OneID token saqlash
            oneid_service.create_or_update_user_token(
                user=user,
                token_data=token_data,
                oneid_user_id=user_info.get('user_id', '')
            )
            
            # JWT tokenlarni generatsiya qilish
            jwt_tokens = oneid_service.generate_jwt_tokens(user)
            
            # Sessiyani yangilash
            session.status = 'SUCCESS'
            session.authorization_code = code
            session.save()
            
            # Log yozish
            oneid_service.log_oneid_operation(
                user=user,
                action='LOGIN',
                success=True,
                oneid_user_id=user_info.get('user_id', ''),
                ip_address=session.ip_address,
                user_agent=session.user_agent
            )
            
            # Frontend uchun tokenlar bilan redirect
            redirect_url = f"{settings.FRONTEND_URL}/login/callback?" + \
                           f"access={jwt_tokens['access']}&" + \
                           f"refresh={jwt_tokens['refresh']}&" + \
                           f"success=true"
            
            return redirect(redirect_url)
            
        except Exception as e:
            logger.error(f"OneID callback xatolik: {e}")
            session.status = 'FAILED'
            session.error_message = str(e)
            session.save()
            
            # Frontend uchun xatolik bilan redirect
            redirect_url = f"{settings.FRONTEND_URL}/login/callback?" + \
                           f"success=false&error={str(e)}"
            
            return redirect(redirect_url)
    
    @action(detail=False, methods=['post'])
    def refresh(self, request: Request) -> Response:
        """
        OneID token yangilash.
        
        Request:
            refresh_token: OneID refresh token
            
        Response:
            success: true/false
            access_token: Yangi access token
            expires_in: Token muddati
        """
        refresh_token = request.data.get('refresh_token')
        
        if not refresh_token:
            return Response({
                'success': False,
                'error': 'Refresh token required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Token yangilash
            token_data = oneid_service.refresh_access_token(refresh_token)
            
            # Tokenni yangilash
            oneid_token = OneIDToken.objects.get(refresh_token=refresh_token)
            oneid_service.create_or_update_user_token(
                user=oneid_token.user,
                token_data=token_data,
                oneid_user_id=oneid_token.oneid_user_id
            )
            
            # Log yozish
            oneid_service.log_oneid_operation(
                user=oneid_token.user,
                action='TOKEN_REFRESH',
                success=True,
                oneid_user_id=oneid_token.oneid_user_id
            )
            
            return Response({
                'success': True,
                'access_token': token_data['access_token'],
                'expires_in': token_data.get('expires_in', 3600)
            })
            
        except Exception as e:
            logger.error(f"Token yangilash xatolik: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request: Request) -> Response:
        """
        OneID orqali chiqish.
        
        Foydalanuvchini OneID tizimidan chiqarish.
        """
        try:
            # OneID token ni olish
            oneid_token = OneIDToken.objects.filter(user=request.user).first()
            
            if oneid_token:
                # OneID dan chiqarish
                oneid_service.logout_user(oneid_token.access_token)
                
                # Tokenni o'chirish
                oneid_token.is_active = False
                oneid_token.save()
            
            # Log yozish
            oneid_service.log_oneid_operation(
                user=request.user,
                action='LOGOUT',
                success=True,
                oneid_user_id=oneid_token.oneid_user_id if oneid_token else '',
                ip_address=getattr(request, 'client_ip', None),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'success': True,
                'message': 'Muvaffaqiyatli chiqildi'
            })
            
        except Exception as e:
            logger.error(f"OneID logout xatolik: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _handle_callback_error(self, state: str, error: str, description: str) -> Response:
        """
        Callback xatoligini qayta ishlash.
        
        Args:
            state: Sessiya state
            error: Xatolik kodi
            description: Xatolik tavsifi
        """
        try:
            session = OneIDSession.objects.get(state=state)
            session.status = 'FAILED'
            session.error_code = error
            session.error_message = description
            session.save()
        except OneIDSession.DoesNotExist:
            pass
        
        # Frontend uchun xatolik bilan redirect
        redirect_url = f"{settings.FRONTEND_URL}/login/callback?" + \
                       f"success=false&error={error}&description={description}"
        
        return redirect(redirect_url)


class OneIDStatusViewSet(viewsets.ViewSet):
    """
    OneID status va ma'lumotlar endpointlari.
    """
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def status(self, request: Request) -> Response:
        """
        Foydalanuvchining OneID statusini olish.
        """
        try:
            oneid_token = OneIDToken.objects.filter(
                user=request.user,
                is_active=True
            ).first()
            
            if not oneid_token:
                return Response({
                    'connected': False,
                    'message': 'OneID ulanmagan'
                })
            
            is_expired = oneid_token.is_expired()
            
            return Response({
                'connected': True,
                'oneid_user_id': oneid_token.oneid_user_id,
                'expires_at': oneid_token.expires_at,
                'is_expired': is_expired,
                'session_id': str(oneid_token.session_id)
            })
            
        except Exception as e:
            logger.error(f"OneID status xatolik: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def sync_data(self, request: Request) -> Response:
        """
        OneID dan ma'lumotlarni qayta sinxronizatsiya qilish.
        """
        try:
            oneid_token = OneIDToken.objects.filter(
                user=request.user,
                is_active=True
            ).first()
            
            if not oneid_token:
                return Response({
                    'success': False,
                    'error': 'OneID token topilmadi'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Ma'lumotlarni olish
            user_info = oneid_service.get_user_info(oneid_token.access_token)
            
            # Ma'lumotlarni sinxronizatsiya qilish
            changed = oneid_service.sync_user_data(request.user, user_info)
            
            return Response({
                'success': True,
                'changed': changed,
                'message': 'Ma\'lumotlar muvaffaqiyatli sinxronizatsiya qilindi'
            })
            
        except Exception as e:
            logger.error(f"Ma'lumotlarni sinxronizatsiya qilish xatolik: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
