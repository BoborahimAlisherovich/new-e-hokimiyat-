"""
OneID integratsiyasi uchun testlar.

Ushbu modul OneID xizmatlarining to'g'ri ishlashini tekshirish uchun testlarni o'z ichiga oladi.
"""

import json
import uuid
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from oneid.models import OneIDToken, OneIDSession, OneIDUserLog
from oneid.services import oneid_service
from oneid.views import OneIDAuthViewSet, OneIDStatusViewSet

User = get_user_model()


class OneIDServiceTestCase(TestCase):
    """OneID xizmati testlari."""
    
    def setUp(self):
        """Test ma'lumotlarini tayyorlash."""
        self.user = User.objects.create_user(
            pnfl='12345678901234',
            first_name='Test',
            last_name='User',
            role='ADMIN',
            status='FAOL'
        )
    
    def test_get_authorization_url(self):
        """Avtorizatsiya URL yaratish testi."""
        state = 'test-state-123'
        
        with patch.dict('oneid.services.settings.__dict__', {
            'ONEID_CLIENT_ID': 'test-client-id',
            'ONEID_REDIRECT_URI': 'https://test.com/callback',
            'ONEID_SCOPE': 'test-scope'
        }):
            url = oneid_service.get_authorization_url(state)
            
            self.assertIn('https://sso.egov.uz/sso/oauth/Authorization.do', url)
            self.assertIn('response_type=one_code', url)
            self.assertIn('client_id=test-client-id', url)
            self.assertIn('redirect_uri=https://test.com/callback', url)
            self.assertIn('scope=test-scope', url)
            self.assertIn(f'state={state}', url)
    
    def test_authenticate_user_success(self):
        """Muvaffaqiyatli foydalanuvchi autentifikatsiyasi testi."""
        user = oneid_service.authenticate_user('12345678901234')
        
        self.assertIsNotNone(user)
        self.assertEqual(user.pnfl, '12345678901234')
        self.assertEqual(user.status, 'FAOL')
    
    def test_authenticate_user_not_found(self):
        """Topilmagan foydalanuvchi autentifikatsiyasi testi."""
        user = oneid_service.authenticate_user('99999999999999')
        
        self.assertIsNone(user)
    
    def test_authenticate_user_blocked(self):
        """Bloklangan foydalanuvchi autentifikatsiyasi testi."""
        self.user.status = 'BLOKLANGAN'
        self.user.save()
        
        user = oneid_service.authenticate_user('12345678901234')
        
        self.assertIsNone(user)
    
    def test_authenticate_user_waiting(self):
        """Kutilayotgan foydalanuvchi autentifikatsiyasi testi."""
        self.user.status = 'KUTILMOQDA'
        self.user.save()
        
        user = oneid_service.authenticate_user('12345678901234')
        
        self.assertIsNotNone(user)
        self.assertEqual(user.status, 'FAOL')  # Faollashtirilishi kerak
    
    def test_sync_user_data_with_changes(self):
        """Foydalanuvchi ma'lumotlarini sinxronizatsiya testi (o'zgarish bilan)."""
        oneid_data = {
            'first_name': 'Updated',
            'last_name': 'Name',
            'mid_name': 'Middle',
            'user_id': 'oneid-123'
        }
        
        changed = oneid_service.sync_user_data(self.user, oneid_data)
        
        self.assertTrue(changed)
        
        # Ma'lumotlarni tekshirish
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated')
        self.assertEqual(self.user.last_name, 'Name')
        self.assertEqual(self.user.middle_name, 'Middle')
        
        # Log yozilganligini tekshirish
        log = OneIDUserLog.objects.filter(
            user=self.user,
            action='DATA_SYNC'
        ).first()
        self.assertIsNotNone(log)
        self.assertTrue(log.success)
    
    def test_sync_user_data_no_changes(self):
        """Foydalanuvchi ma'lumotlarini sinxronizatsiya testi (o'zgarishsiz)."""
        oneid_data = {
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'mid_name': self.user.middle_name,
            'user_id': 'oneid-123'
        }
        
        changed = oneid_service.sync_user_data(self.user, oneid_data)
        
        self.assertFalse(changed)
    
    def test_create_or_update_user_token(self):
        """Token yaratish/yangilash testi."""
        token_data = {
            'access_token': 'test-access-token',
            'refresh_token': 'test-refresh-token',
            'expires_in': 3600
        }
        
        token = oneid_service.create_or_update_user_token(
            self.user,
            token_data,
            'oneid-user-123'
        )
        
        self.assertIsInstance(token, OneIDToken)
        self.assertEqual(token.user, self.user)
        self.assertEqual(token.access_token, 'test-access-token')
        self.assertEqual(token.refresh_token, 'test-refresh-token')
        self.assertEqual(token.oneid_user_id, 'oneid-user-123')
        self.assertTrue(token.is_active)
        self.assertIsNotNone(token.expires_at)


class OneIDAPITestCase(APITestCase):
    """OneID API endpointlari testlari."""
    
    def setUp(self):
        """Test ma'lumotlarini tayyorlash."""
        self.user = User.objects.create_user(
            pnfl='12345678901234',
            first_name='Test',
            last_name='User',
            role='ADMIN',
            status='FAOL'
        )
        self.client.force_authenticate(user=self.user)
    
    @patch('oneid.views.oneid_service')
    def test_login_success(self, mock_service):
        """Muvaffaqiyatli login testi."""
        mock_service.authenticate_user.return_value = self.user
        mock_service.get_authorization_url.return_value = 'https://oneid.gov.uz/auth'
        
        response = self.client.post('/api/oneid/auth/login/', {
            'pnfl': '12345678901234'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertIn('authorization_url', response.data)
        self.assertIn('state', response.data)
        self.assertIn('session_id', response.data)
    
    def test_login_invalid_pnfl(self):
        """Noto'g'ri PNFL bilan login testi."""
        response = self.client.post('/api/oneid/auth/login/', {
            'pnfl': 'invalid'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_user_not_found(self, mock_service):
        """Topilmagan foydalanuvchi bilan login testi."""
        mock_service.authenticate_user.return_value = None
        
        response = self.client.post('/api/oneid/auth/login/', {
            'pnfl': '99999999999999'
        })
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data['success'])
    
    @patch('oneid.views.oneid_service')
    def test_get_status_connected(self, mock_service):
        """OneID ulangan status testi."""
        # Token yaratish
        OneIDToken.objects.create(
            user=self.user,
            access_token='test-token',
            oneid_user_id='oneid-123',
            expires_at=timezone.now() + timezone.timedelta(hours=1)
        )
        
        response = self.client.get('/api/oneid/status/status/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['connected'])
        self.assertEqual(response.data['oneid_user_id'], 'oneid-123')
        self.assertFalse(response.data['is_expired'])
    
    def test_get_status_not_connected(self):
        """OneID ulanmagan status testi."""
        response = self.client.get('/api/oneid/status/status/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['connected'])
        self.assertEqual(response.data['message'], 'OneID ulanmagan')
    
    @patch('oneid.views.oneid_service')
    def test_sync_data_success(self, mock_service):
        """Ma'lumotlarni sinxronizatsiya testi."""
        # Token yaratish
        OneIDToken.objects.create(
            user=self.user,
            access_token='test-token',
            oneid_user_id='oneid-123'
        )
        
        mock_service.get_user_info.return_value = {
            'first_name': 'Updated',
            'last_name': 'Name',
            'user_id': 'oneid-123'
        }
        mock_service.sync_user_data.return_value = True
        
        response = self.client.post('/api/oneid/status/sync_data/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertTrue(response.data['changed'])


class OneIDModelTestCase(TestCase):
    """OneID modellari testlari."""
    
    def setUp(self):
        """Test ma'lumotlarini tayyorlash."""
        self.user = User.objects.create_user(
            pnfl='12345678901234',
            first_name='Test',
            last_name='User',
            role='ADMIN',
            status='FAOL'
        )
    
    def test_oneid_token_creation(self):
        """OneID token yaratish testi."""
        token = OneIDToken.objects.create(
            user=self.user,
            access_token='test-access-token',
            refresh_token='test-refresh-token',
            oneid_user_id='oneid-123'
        )
        
        self.assertEqual(str(token), f'{self.user} - OneID Token')
        self.assertEqual(token.user, self.user)
        self.assertTrue(token.is_active)
    
    def test_oneid_token_is_expired(self):
        """Token muddati o'tganligi testi."""
        # Muddati o'tmagan token
        token = OneIDToken.objects.create(
            user=self.user,
            access_token='test-token',
            expires_at=timezone.now() + timezone.timedelta(hours=1)
        )
        self.assertFalse(token.is_expired())
        
        # Muddati o'tgan token
        token.expires_at = timezone.now() - timezone.timedelta(hours=1)
        token.save()
        self.assertTrue(token.is_expired())
    
    def test_oneid_session_creation(self):
        """OneID sessiya yaratish testi."""
        session = OneIDSession.objects.create(
            user=self.user,
            pnfl='12345678901234',
            state='test-state',
            redirect_uri='https://test.com/callback'
        )
        
        self.assertEqual(str(session), f'Session {session.session_id} - Kutilmoqda')
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.status, 'PENDING')
    
    def test_oneid_user_log_creation(self):
        """OneID log yaratish testi."""
        log = OneIDUserLog.objects.create(
            user=self.user,
            action='LOGIN',
            oneid_user_id='oneid-123',
            new_data={'test': 'data'}
        )
        
        self.assertEqual(str(log), f'{self.user} - Login')
        self.assertEqual(log.user, self.user)
        self.assertTrue(log.success)


class OneIDIntegrationTestCase(TransactionTestCase):
    """OneID integratsiyasi testlari (to'liq flow)."""
    
    def setUp(self):
        """Test ma'lumotlarini tayyorlash."""
        self.user = User.objects.create_user(
            pnfl='12345678901234',
            first_name='Test',
            last_name='User',
            role='ADMIN',
            status='KUTILMOQDA'  # Kutilayotgan holatda
        )
    
    @patch('oneid.services.requests.post')
    def test_full_login_flow(self, mock_post):
        """To'liq login flow testi."""
        # Mock OneID token exchange
        mock_token_response = Mock()
        mock_token_response.status_code = 200
        mock_token_response.json.return_value = {
            'access_token': 'test-access-token',
            'refresh_token': 'test-refresh-token',
            'expires_in': 3600
        }
        
        # Mock OneID user info
        mock_user_response = Mock()
        mock_user_response.status_code = 200
        mock_user_response.json.return_value = {
            'pin': '12345678901234',
            'first_name': 'Test',
            'last_name': 'User',
            'user_id': 'oneid-123'
        }
        
        mock_post.side_effect = [mock_token_response, mock_user_response]
        
        # Login boshlash
        with patch.dict('oneid.services.settings.__dict__', {
            'ONEID_CLIENT_ID': 'test-client-id',
            'ONEID_CLIENT_SECRET': 'test-client-secret',
            'ONEID_REDIRECT_URI': 'https://test.com/callback',
            'ONEID_SCOPE': 'test-scope'
        }):
            response = self.client.post('/api/oneid/auth/login/', {
                'pnfl': '12345678901234'
            })
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data['success'])
            
            # Sessiya yaratilganligini tekshirish
            session = OneIDSession.objects.filter(pnfl='12345678901234').first()
            self.assertIsNotNone(session)
            self.assertEqual(session.status, 'PENDING')
            
            # Callbackni simulyatsiya qilish
            callback_response = self.client.get('/api/oneid/auth/callback/', {
                'code': 'test-auth-code',
                'state': response.data['state']
            })
            
            # Token yaratilganligini tekshirish
            token = OneIDToken.objects.filter(user=self.user).first()
            self.assertIsNotNone(token)
            self.assertEqual(token.access_token, 'test-access-token')
            
            # Foydalanuvchi faollashtirilganligini tekshirish
            self.user.refresh_from_db()
            self.assertEqual(self.user.status, 'FAOL')
            self.assertTrue(self.user.oneid_connected)


if __name__ == '__main__':
    import unittest
    unittest.main()
