"""
OneID integratsiya xizmatlari.

Ushbu modul OneID tizimi bilan ishlash uchun asosiy xizmatlarni o'z ichiga oladi:
- OAuth 2.0 client
- Token management
- User ma'lumotlarini olish
- Ma'lumotlarni sinxronizatsiya qilish
"""

import json
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, Any
from urllib.parse import urlencode, urlparse, parse_qs

from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from .models import OneIDToken, OneIDSession, OneIDUserLog

User = get_user_model()
logger = logging.getLogger(__name__)


class OneIDService:
    """
    OneID OAuth 2.0 xizmati.
    
    OneID tizimi bilan integratsiya uchun asosiy xizmat.
    """
    
    # OneID endpointlari (production)
    AUTH_URL = "https://sso.egov.uz/sso/oauth/Authorization.do"
    TOKEN_URL = "https://sso.egov.uz/sso/oauth/AccessToken.do"
    USER_INFO_URL = "https://sso.egov.uz/sso/oauth/Authorization.do"
    LOGOUT_URL = "https://sso.egov.uz/sso/oauth/Authorization.do"
    
    def __init__(self):
        """OneID xizmatini initializatsiya qilish."""
        self.client_id = getattr(settings, 'ONEID_CLIENT_ID', '')
        self.client_secret = getattr(settings, 'ONEID_CLIENT_SECRET', '')
        self.redirect_uri = getattr(settings, 'ONEID_REDIRECT_URI', '')
        self.scope = getattr(settings, 'ONEID_SCOPE', '')
        
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            logger.error("OneID sozlamalari to'liq emas!")
    
    def get_authorization_url(self, state: str, redirect_uri: Optional[str] = None) -> str:
        """
        OneID avtorizatsiya URL'ini olish.
        
        Args:
            state: CSRF himoyasi uchun state parametri
            redirect_uri: Callback URL (agar berilmasa, default ishlatiladi)
            
        Returns:
            Avtorizatsiya URL
        """
        if redirect_uri is None:
            redirect_uri = self.redirect_uri
            
        params = {
            'response_type': 'one_code',
            'client_id': self.client_id,
            'redirect_uri': redirect_uri,
            'scope': self.scope,
            'state': state,
        }
        
        url = f"{self.AUTH_URL}?{urlencode(params)}"
        logger.info(f"OneID avtorizatsiya URL yaratildi: {url}")
        return url
    
    def exchange_code_for_tokens(self, code: str, redirect_uri: Optional[str] = None) -> Dict[str, Any]:
        """
        Authorization code ni tokenlarga almashtirish.
        
        Args:
            code: OneID dan qaytgan authorization code
            redirect_uri: Callback URL
            
        Returns:
            Token ma'lumotlari
            
        Raises:
            Exception: Token olishda xatolik yuz bersa
        """
        if redirect_uri is None:
            redirect_uri = self.redirect_uri
            
        data = {
            'grant_type': 'one_authorization_code',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': code,
            'redirect_uri': redirect_uri,
        }
        
        try:
            response = requests.post(self.TOKEN_URL, data=data, timeout=30)
            response.raise_for_status()
            
            token_data = response.json()
            logger.info("Tokenlar muvaffaqiyatli olindi")
            return token_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Token olishda xatolik: {e}")
            raise Exception(f"Token olishda xatolik: {e}")
    
    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Access token orqali foydalanuvchi ma'lumotlarini olish.
        
        Args:
            access_token: OneID access token
            
        Returns:
            Foydalanuvchi ma'lumotlari
            
        Raises:
            Exception: Ma'lumot olishda xatolik yuz bersa
        """
        data = {
            'grant_type': 'one_access_token_identify',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'access_token': access_token,
            'scope': self.scope,
        }
        
        try:
            response = requests.post(self.USER_INFO_URL, data=data, timeout=30)
            response.raise_for_status()
            
            user_data = response.json()
            logger.info("Foydalanuvchi ma'lumotlari muvaffaqiyatli olindi")
            return user_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Foydalanuvchi ma'lumotlarini olishda xatolik: {e}")
            raise Exception(f"Foydalanuvchi ma'lumotlarini olishda xatolik: {e}")
    
    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh token orqali access tokenni yangilash.
        
        Args:
            refresh_token: OneID refresh token
            
        Returns:
            Yangi token ma'lumotlari
            
        Raises:
            Exception: Token yangilashda xatolik yuz bersa
        """
        data = {
            'grant_type': 'refresh_token',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'refresh_token': refresh_token,
        }
        
        try:
            response = requests.post(self.TOKEN_URL, data=data, timeout=30)
            response.raise_for_status()
            
            token_data = response.json()
            logger.info("Access token muvaffaqiyatli yangilandi")
            return token_data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Token yangilashda xatolik: {e}")
            raise Exception(f"Token yangilashda xatolik: {e}")
    
    def logout_user(self, access_token: str) -> bool:
        """
        Foydalanuvchini OneID tizimidan chiqarish.
        
        Args:
            access_token: OneID access token
            
        Returns:
            Muvaffaqiyatli chiqarilganligi
        """
        data = {
            'grant_type': 'one_log_out',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'access_token': access_token,
            'scope': self.scope,
        }
        
        try:
            response = requests.post(self.LOGOUT_URL, data=data, timeout=30)
            response.raise_for_status()
            
            logger.info("Foydalanuvchi OneID dan muvaffaqiyatli chiqarildi")
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"OneID dan chiqarishda xatolik: {e}")
            return False
    
    def sync_user_data(self, user: User, oneid_data: Dict[str, Any]) -> bool:
        """
        OneID dan kelgan ma'lumotlar bilan foydalanuvchi ma'lumotlarini sinxronizatsiya qilish.
        
        Args:
            user: Django foydalanuvchi obyekti
            oneid_data: OneID dan kelgan ma'lumotlar
            
        Returns:
            Ma'lumotlar o'zgarganligi
        """
        changed = False
        old_data = {
            'first_name': user.first_name,
            'last_name': user.last_name,
            'middle_name': user.middle_name,
        }
        
        # Ism familiyasini yangilash
        if oneid_data.get('first_name') and oneid_data['first_name'] != user.first_name:
            user.first_name = oneid_data['first_name']
            changed = True
            
        if oneid_data.get('sur_name') and oneid_data['sur_name'] != user.last_name:
            user.last_name = oneid_data['sur_name']
            changed = True
            
        if oneid_data.get('mid_name') and oneid_data['mid_name'] != user.middle_name:
            user.middle_name = oneid_data['mid_name']
            changed = True
        
        if changed:
            new_data = {
                'first_name': user.first_name,
                'last_name': user.last_name,
                'middle_name': user.middle_name,
            }
            
            user.save(update_fields=['first_name', 'last_name', 'middle_name'])
            
            # Log yozish
            OneIDUserLog.objects.create(
                user=user,
                action='DATA_SYNC',
                oneid_user_id=oneid_data.get('user_id', ''),
                old_data=old_data,
                new_data=new_data,
                success=True
            )
            
            logger.info(f"Foydalanuvchi {user.pnfl} ma'lumotlari yangilandi")
        
        return changed
    
    def create_or_update_user_token(self, user: User, token_data: Dict[str, Any], oneid_user_id: str = '') -> OneIDToken:
        """
        Foydalanuvchi tokenini yaratish yoki yangilash.
        
        Args:
            user: Django foydalanuvchi obyekti
            token_data: Token ma'lumotlari
            oneid_user_id: OneID user ID
            
        Returns:
            OneIDToken obyekti
        """
        # Token muddatini hisoblash (odatda 1 soat)
        expires_in = token_data.get('expires_in', 3600)
        expires_at = timezone.now() + timedelta(seconds=expires_in)
        
        # Mavjud tokenni tekshirish
        token_obj, created = OneIDToken.objects.update_or_create(
            user=user,
            defaults={
                'access_token': token_data['access_token'],
                'refresh_token': token_data.get('refresh_token', ''),
                'expires_at': expires_at,
                'oneid_user_id': oneid_user_id,
                'is_active': True,
            }
        )
        
        if created:
            logger.info(f"Yangi OneID token yaratildi: {user.pnfl}")
        else:
            logger.info(f"OneID token yangilandi: {user.pnfl}")
        
        return token_obj
    
    def authenticate_user(self, pnfl: str) -> Optional[User]:
        """
        PNFL orqali foydalanuvchini autentifikatsiya qilish.
        
        Args:
            pnfl: Foydalanuvchi PNFL si
            
        Returns:
            User obyekti yoki None
        """
        try:
            user = User.objects.get(pnfl=pnfl)
            
            # Foydalanuvchi statusini tekshirish
            if user.status == 'ARXIV':
                logger.warning(f"Arxivlangan foydalanuvchi loginga urindi: {pnfl}")
                return None
                
            if user.status == 'BLOKLANGAN':
                logger.warning(f"Bloklangan foydalanuvchi loginqa urindi: {pnfl}")
                return None
            
            # Kutilayotgan foydalanuvchini faollashtirish
            if user.status == 'KUTILMOQDA':
                user.activate()
                logger.info(f"Foydalanuvchi faollashtirildi: {pnfl}")
            
            return user
            
        except User.DoesNotExist:
            logger.warning(f"Foydalanuvchi topilmadi: {pnfl}")
            return None
    
    def generate_jwt_tokens(self, user: User) -> Dict[str, str]:
        """
        Foydalanuvchi uchun JWT tokenlar generatsiya qilish.
        
        Args:
            user: Django foydalanuvchi obyekti
            
        Returns:
            JWT tokenlar
        """
        refresh = RefreshToken.for_user(user)
        
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
    
    def log_oneid_operation(self, user: User, action: str, success: bool = True, 
                          oneid_user_id: str = '', old_data: Dict = None, 
                          new_data: Dict = None, error_message: str = '',
                          ip_address: str = '', user_agent: str = '') -> None:
        """
        OneID operatsiyasini log qilish.
        
        Args:
            user: Django foydalanuvchi obyekti
            action: Operatsiya turi
            success: Muvaffaqiyatli ligi
            oneid_user_id: OneID user ID
            old_data: Eski ma'lumotlar
            new_data: Yangi ma'lumotlar
            error_message: Xatolik xabari
            ip_address: IP manzil
            user_agent: User Agent
        """
        OneIDUserLog.objects.create(
            user=user,
            action=action,
            oneid_user_id=oneid_user_id,
            old_data=old_data or {},
            new_data=new_data or {},
            success=success,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent
        )


# Global OneID xizmati obyekti
oneid_service = OneIDService()
