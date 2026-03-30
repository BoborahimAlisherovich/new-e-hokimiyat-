from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Count, Q, F, Value, OuterRef, Subquery, DateTimeField, Sum
from django.db.models.functions import Coalesce
import datetime
from datetime import timedelta
import json
import subprocess

from .models import (
    BotSettings, BotAdmin, BotRegion, TelegramUser,
    AppealCategory, AppealType, TelegramAppeal,
    AppealAttachment, AppealMessage, AppealReadState
)
from .serializers import (
    BotSettingsSerializer, BotAdminSerializer, BotRegionSerializer,
    TelegramUserSerializer, AppealCategorySerializer, AppealCategoryAdminSerializer, AppealTypeSerializer,
    TelegramAppealListSerializer, TelegramAppealDetailSerializer,
    AppealReviewSerializer, AppealAssignSerializer, BotStatsSerializer
)
from core.permissions import CanManageBotSettings
from notifications.services import notify_appeal_feedback, notify_appeal_message, notify_appeal_status_update


def _find_bot_pids() -> list:
    try:
        output = subprocess.check_output([
            'ps', '-eo', 'pid=,command='
        ], text=True)
    except Exception:
        return []

    pids = []
    for line in output.splitlines():
        if 'run_bot.py' in line or ('manage.py' in line and 'telegram_bot' in line and 'run' in line):
            parts = line.strip().split(None, 1)
            if not parts:
                continue
            try:
                pids.append(int(parts[0]))
            except ValueError:
                continue
    return pids


def _kill_pids(pids: list) -> bool:
    import os
    import signal
    import time

    stopped_any = False
    for pid in pids:
        try:
            try:
                pgid = os.getpgid(pid)
                os.killpg(pgid, signal.SIGTERM)
            except Exception:
                os.kill(pid, signal.SIGTERM)
            time.sleep(0.5)
            try:
                os.kill(pid, 0)
                try:
                    pgid = os.getpgid(pid)
                    os.killpg(pgid, signal.SIGKILL)
                except Exception:
                    os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            stopped_any = True
        except Exception:
            continue
    return stopped_any


class BotSettingsViewSet(viewsets.ModelViewSet):
    """Bot sozlamalari API"""
    
    queryset = BotSettings.objects.all()
    serializer_class = BotSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        protected_actions = {
            'list', 'retrieve', 'create', 'update', 'partial_update', 'destroy',
            'test_connection', 'set_webhook', 'delete_webhook', 'start_bot',
            'stop_bot', 'bot_status', 'webhook_info', 'test_ai_connection'
        }
        if self.action in protected_actions:
            return [permissions.IsAuthenticated(), CanManageBotSettings()]
        return [permissions.IsAuthenticated()]
    
    def get_object(self):
        # Har doim birinchi (va yagona) sozlamani qaytarish
        obj, created = BotSettings.objects.get_or_create(pk=1, defaults={
            'bot_token': '',
            'bot_username': '',
        })
        return obj
    
    def list(self, request, *args, **kwargs):
        # Ro'yxat o'rniga bitta ob'ekt qaytarish
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def test_connection(self, request):
        """Bot ulanishini tekshirish"""
        settings = self.get_object()
        if not settings.bot_token:
            return Response(
                {'error': 'Bot token kiritilmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            import requests
            response = requests.get(
                f'https://api.telegram.org/bot{settings.bot_token}/getMe',
                timeout=10
            )
            data = response.json()
            
            if data.get('ok'):
                bot_info = data.get('result', {})
                settings.bot_username = bot_info.get('username', '')
                settings.save()
                return Response({
                    'success': True,
                    'bot_info': bot_info
                })
            else:
                return Response({
                    'success': False,
                    'error': data.get('description', 'Noma\'lum xato')
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def set_webhook(self, request):
        """Webhook o'rnatish"""
        settings = self.get_object()
        webhook_url = request.data.get('webhook_url')
        
        if not webhook_url:
            return Response(
                {'error': 'Webhook URL kiritilmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            import os
            import signal
            import time
            import requests
            import secrets
            
            # Polling ishlayotgan bo'lsa, to'xtatish
            pid_file = '/tmp/telegram_bot.pid'
            if os.path.exists(pid_file):
                try:
                    with open(pid_file, 'r') as f:
                        pid = int(f.read().strip())
                    try:
                        pgid = os.getpgid(pid)
                        os.killpg(pgid, signal.SIGTERM)
                    except Exception:
                        os.kill(pid, signal.SIGTERM)
                    time.sleep(1)
                except (ProcessLookupError, ValueError):
                    pass
                finally:
                    if os.path.exists(pid_file):
                        os.remove(pid_file)

            if not settings.webhook_secret:
                settings.webhook_secret = secrets.token_urlsafe(32)

            response = requests.post(
                f'https://api.telegram.org/bot{settings.bot_token}/setWebhook',
                json={'url': webhook_url, 'secret_token': settings.webhook_secret},
                timeout=10
            )
            data = response.json()
            
            if data.get('ok'):
                settings.webhook_url = webhook_url
                settings.use_webhook = True
                settings.is_active = True
                settings.save()
                return Response({'success': True})
            else:
                return Response({
                    'success': False,
                    'error': data.get('description')
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def delete_webhook(self, request):
        """Webhook o'chirish"""
        settings = self.get_object()
        
        try:
            import requests
            response = requests.post(
                f'https://api.telegram.org/bot{settings.bot_token}/deleteWebhook',
                timeout=10
            )
            data = response.json()
            
            if data.get('ok'):
                settings.webhook_url = ''
                settings.use_webhook = False
                settings.is_active = False
                settings.save()
                return Response({'success': True})
            else:
                return Response({
                    'success': False,
                    'error': data.get('description')
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)    
    @action(detail=False, methods=['post'])
    def start_bot(self, request):
        """Bot polling'ni ishga tushirish"""
        settings = self.get_object()
        
        if not settings.bot_token:
            return Response(
                {'error': 'Bot token kiritilmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        force = bool(request.data.get('force'))
        if settings.use_webhook and not force:
            return Response(
                {'error': 'Webhook rejimi faol. Avval webhook\'ni o\'chiring yoki force=true yuboring'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            import subprocess
            import os
            import signal
            import time
            import requests
            
            # Webhook rejimidan pollingga o'tish
            if settings.use_webhook:
                try:
                    requests.post(
                        f'https://api.telegram.org/bot{settings.bot_token}/deleteWebhook',
                        timeout=10
                    )
                except Exception:
                    pass
                settings.use_webhook = False
                settings.webhook_url = ''

            # Avval eski processni to'xtatish
            pid_file = '/tmp/telegram_bot.pid'
            if os.path.exists(pid_file):
                try:
                    with open(pid_file, 'r') as f:
                        old_pid = int(f.read().strip())
                    try:
                        pgid = os.getpgid(old_pid)
                        os.killpg(pgid, signal.SIGTERM)
                    except Exception:
                        os.kill(old_pid, signal.SIGTERM)
                    time.sleep(1)
                except (ProcessLookupError, ValueError):
                    pass
                if os.path.exists(pid_file):
                    os.remove(pid_file)

            # Pid file yo'q bo'lsa ham eski processlarni tozalash
            extra_pids = _find_bot_pids()
            if extra_pids:
                _kill_pids(extra_pids)
            
            # Yangi processni ishga tushirish
            bot_script = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'run_bot.py')
            log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
            os.makedirs(log_dir, exist_ok=True)
            log_path = os.path.join(log_dir, 'telegram_bot.log')
            log_file = open(log_path, 'a')

            process = subprocess.Popen(
                ['python3', bot_script],
                stdout=log_file,
                stderr=log_file,
                start_new_session=True
            )
            
            # PID saqlash
            with open(pid_file, 'w') as f:
                f.write(str(process.pid))
            
            settings.is_active = True
            settings.save()
            
            return Response({
                'success': True,
                'message': 'Bot muvaffaqiyatli ishga tushirildi',
                'pid': process.pid
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def stop_bot(self, request):
        """Bot polling'ni to'xtatish"""
        settings = self.get_object()
        
        try:
            import os
            import signal
            import time
            import requests
            
            pid_file = '/tmp/telegram_bot.pid'
            stopped = False
            pid = None
            was_webhook = bool(settings.use_webhook)
            if os.path.exists(pid_file):
                try:
                    with open(pid_file, 'r') as f:
                        pid = int(f.read().strip())
                    try:
                        pgid = os.getpgid(pid)
                        os.killpg(pgid, signal.SIGTERM)
                    except Exception:
                        os.kill(pid, signal.SIGTERM)
                    time.sleep(1)
                    try:
                        os.kill(pid, 0)
                        try:
                            pgid = os.getpgid(pid)
                            os.killpg(pgid, signal.SIGKILL)
                        except Exception:
                            os.kill(pid, signal.SIGKILL)
                        time.sleep(1)
                    except ProcessLookupError:
                        pass
                    try:
                        os.kill(pid, 0)
                        return Response(
                            {
                                'success': False,
                                'error': 'Bot jarayonini to\'xtatib bo\'lmadi. Serverdagi processni tekshiring.'
                            },
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
                    except ProcessLookupError:
                        stopped = True
                except (ProcessLookupError, ValueError):
                    stopped = False
                finally:
                    if os.path.exists(pid_file):
                        os.remove(pid_file)

            # Pid file bo'lmasa ham eski processlarni to'xtatish
            if not stopped:
                extra_pids = _find_bot_pids()
                if extra_pids:
                    stopped = _kill_pids(extra_pids)

            # Webhook rejimini ham to'xtatish
            if settings.bot_token and settings.use_webhook:
                try:
                    response = requests.post(
                        f'https://api.telegram.org/bot{settings.bot_token}/deleteWebhook',
                        timeout=10
                    )
                    if response.json().get('ok'):
                        settings.use_webhook = False
                except Exception:
                    pass
            
            settings.is_active = False
            settings.save()

            if not stopped and not settings.use_webhook and not was_webhook:
                return Response(
                    {
                        'success': False,
                        'error': 'Bot jarayoni topilmadi yoki allaqachon to\'xtagan.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            return Response({
                'success': True,
                'message': 'Bot muvaffaqiyatli to\'xtatildi'
            })
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def bot_status(self, request):
        """Bot holatini tekshirish"""
        settings = self.get_object()
        
        is_running = False
        pid = None
        
        try:
            import os
            import signal
            
            pid_file = '/tmp/telegram_bot.pid'
            if os.path.exists(pid_file):
                with open(pid_file, 'r') as f:
                    pid = int(f.read().strip())
                try:
                    os.kill(pid, 0)  # Check if process exists
                    is_running = True
                except ProcessLookupError:
                    is_running = False
                    os.remove(pid_file)
            if not is_running:
                extra_pids = _find_bot_pids()
                if extra_pids:
                    is_running = True
                    pid = extra_pids[0]
        except Exception:
            is_running = False
        
        return Response({
            'is_active': settings.is_active,
            'is_running': is_running,
            'use_webhook': settings.use_webhook,
            'pid': pid if is_running else None
        })
    
    @action(detail=False, methods=['post'])
    def test_ai_connection(self, request):
        """AI ulanishini tekshirish"""
        settings = self.get_object()
        
        if not settings.ai_api_key:
            return Response(
                {'success': False, 'error': 'AI API kalit kiritilmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if settings.ai_provider == 'disabled':
            return Response(
                {'success': False, 'error': 'AI provayder tanlanmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            if settings.ai_provider == 'openai':
                from openai import OpenAI
                client = OpenAI(api_key=settings.ai_api_key)
                # Oddiy test so'rov
                response = client.chat.completions.create(
                    model=settings.ai_model or 'gpt-4o-mini',
                    messages=[{"role": "user", "content": "Salom, 1+1 nechaga teng?"}],
                    max_tokens=50
                )
                return Response({
                    'success': True,
                    'provider': 'OpenAI',
                    'model': settings.ai_model,
                    'message': 'AI muvaffaqiyatli ulandi!'
                })
            elif settings.ai_provider == 'anthropic':
                from anthropic import Anthropic
                client = Anthropic(api_key=settings.ai_api_key)
                response = client.messages.create(
                    model=settings.ai_model or 'claude-3-haiku-20240307',
                    max_tokens=50,
                    messages=[{"role": "user", "content": "Salom, 1+1 nechaga teng?"}]
                )
                return Response({
                    'success': True,
                    'provider': 'Anthropic',
                    'model': settings.ai_model,
                    'message': 'AI muvaffaqiyatli ulandi!'
                })
            else:
                return Response(
                    {'success': False, 'error': 'Noto\'g\'ri AI provayder'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            error_msg = str(e)
            if 'invalid_api_key' in error_msg.lower() or 'incorrect api key' in error_msg.lower():
                error_msg = "Noto'g'ri API kalit. Iltimos tekshirib qaytadan kiriting."
            elif 'quota' in error_msg.lower() or 'rate limit' in error_msg.lower():
                error_msg = "API limitga yetdi. Iltimos keyinroq urinib ko'ring."
            return Response({
                'success': False,
                'error': error_msg
            }, status=status.HTTP_400_BAD_REQUEST)

class BotAdminViewSet(viewsets.ModelViewSet):
    """Bot adminlari API"""
    
    queryset = BotAdmin.objects.all()
    serializer_class = BotAdminSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_active', 'is_super_admin']
    search_fields = ['telegram_id', 'username', 'full_name']


class BotRegionViewSet(viewsets.ModelViewSet):
    """Hududlar API"""
    
    queryset = BotRegion.objects.all()
    serializer_class = BotRegionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_active']
    
    def get_permissions(self):
        if self.action == 'list':
            return [permissions.AllowAny()]
        return super().get_permissions()


class TelegramUserViewSet(viewsets.ModelViewSet):
    """Telegram foydalanuvchilar API"""
    
    queryset = TelegramUser.objects.all()
    serializer_class = TelegramUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_registered', 'gender', 'language', 'region', 'is_blocked']
    search_fields = ['telegram_id', 'first_name', 'last_name', 'phone', 'username']
    
    @action(detail=True, methods=['post'])
    def block(self, request, pk=None):
        """Foydalanuvchini bloklash"""
        user = self.get_object()
        user.is_blocked = True
        user.save()
        return Response({'success': True})
    
    @action(detail=True, methods=['post'])
    def unblock(self, request, pk=None):
        """Foydalanuvchini blokdan chiqarish"""
        user = self.get_object()
        user.is_blocked = False
        user.save()
        return Response({'success': True})
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Foydalanuvchiga xabar yuborish"""
        user = self.get_object()
        text = request.data.get('text')
        
        if not text:
            return Response(
                {'error': 'Xabar matni kiritilmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            settings = BotSettings.objects.first()
            if not settings or not settings.bot_token:
                return Response(
                    {'error': 'Bot sozlamalari topilmadi'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            import requests as req
            response = req.post(
                f'https://api.telegram.org/bot{settings.bot_token}/sendMessage',
                json={
                    'chat_id': user.telegram_id,
                    'text': text,
                    'parse_mode': 'HTML'
                },
                timeout=10
            )
            
            if response.json().get('ok'):
                return Response({'success': True})
            else:
                return Response(
                    {'error': response.json().get('description', 'Xabar yuborilmadi')},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def webhook_info(self, request):
        """Telegram webhook holatini olish"""
        settings = self.get_object()
        if not settings.bot_token:
            return Response({'success': False, 'error': 'Bot token kiritilmagan'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            import requests
            response = requests.get(
                f'https://api.telegram.org/bot{settings.bot_token}/getWebhookInfo',
                timeout=10
            )
            data = response.json()
            if data.get('ok'):
                return Response({'success': True, 'result': data.get('result', {})})
            return Response({'success': False, 'error': data.get('description', 'Noma\'lum xato')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'success': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def send_media(self, request, pk=None):
        """Foydalanuvchiga media (rasm, video, fayl) yuborish"""
        user = self.get_object()
        media_type = request.data.get('media_type', 'photo')  # photo, video, document
        caption = request.data.get('caption', '')
        file_url = request.data.get('file_url')
        uploaded_file = request.FILES.get('file')
        
        if not file_url and not uploaded_file:
            return Response(
                {'error': 'Fayl yoki URL kiritilmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            settings = BotSettings.objects.first()
            if not settings or not settings.bot_token:
                return Response(
                    {'error': 'Bot sozlamalari topilmadi'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            import requests as req
            
            method_map = {
                'photo': 'sendPhoto',
                'video': 'sendVideo',
                'document': 'sendDocument'
            }
            field_map = {
                'photo': 'photo',
                'video': 'video',
                'document': 'document'
            }
            
            method = method_map.get(media_type, 'sendPhoto')
            field = field_map.get(media_type, 'photo')
            
            if uploaded_file:
                # Faylni to'g'ridan-to'g'ri yuborish
                files = {field: (uploaded_file.name, uploaded_file.read(), uploaded_file.content_type)}
                data = {
                    'chat_id': user.telegram_id,
                    'caption': caption,
                    'parse_mode': 'HTML'
                }
                response = req.post(
                    f'https://api.telegram.org/bot{settings.bot_token}/{method}',
                    data=data,
                    files=files,
                    timeout=60
                )
            else:
                # URL orqali yuborish
                response = req.post(
                    f'https://api.telegram.org/bot{settings.bot_token}/{method}',
                    json={
                        'chat_id': user.telegram_id,
                        field: file_url,
                        'caption': caption,
                        'parse_mode': 'HTML'
                    },
                    timeout=30
                )
            
            if response.json().get('ok'):
                return Response({'success': True})
            else:
                return Response(
                    {'error': response.json().get('description', 'Media yuborilmadi')},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def broadcast(self, request):
        """Barcha foydalanuvchilarga xabar yuborish"""
        text = request.data.get('text')
        media_type = request.data.get('media_type')  # None, photo, video, document
        file_url = request.data.get('file_url')
        uploaded_file = request.FILES.get('file')
        filter_registered = request.data.get('filter_registered', False)
        filter_region = request.data.get('filter_region')
        
        if not text and not file_url and not uploaded_file:
            return Response(
                {'error': 'Xabar matni yoki fayl kiritilmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            settings = BotSettings.objects.first()
            if not settings or not settings.bot_token:
                return Response(
                    {'error': 'Bot sozlamalari topilmadi'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            import requests as req
            
            # Foydalanuvchilarni filtrlash
            users = TelegramUser.objects.filter(is_blocked=False)
            if filter_registered:
                users = users.filter(is_registered=True)
            if filter_region:
                users = users.filter(region_id=filter_region)
            
            success_count = 0
            fail_count = 0
            
            # Agar fayl yuklangan bo'lsa, avval uni Telegram'ga yuklash va file_id olish
            file_id = None
            if uploaded_file and media_type:
                # Birinchi foydalanuvchiga yuborib file_id olish
                first_user = users.first()
                if first_user:
                    method_map = {
                        'photo': 'sendPhoto',
                        'video': 'sendVideo',
                        'document': 'sendDocument'
                    }
                    field_map = {
                        'photo': 'photo',
                        'video': 'video',
                        'document': 'document'
                    }
                    method = method_map.get(media_type, 'sendPhoto')
                    field = field_map.get(media_type, 'photo')
                    
                    files = {field: (uploaded_file.name, uploaded_file.read(), uploaded_file.content_type)}
                    data = {
                        'chat_id': first_user.telegram_id,
                        'caption': text or '',
                        'parse_mode': 'HTML'
                    }
                    response = req.post(
                        f'https://api.telegram.org/bot{settings.bot_token}/{method}',
                        data=data,
                        files=files,
                        timeout=60
                    )
                    if response.json().get('ok'):
                        result = response.json().get('result', {})
                        # file_id olish
                        if media_type == 'photo' and result.get('photo'):
                            file_id = result['photo'][-1].get('file_id')
                        elif media_type == 'video' and result.get('video'):
                            file_id = result['video'].get('file_id')
                        elif media_type == 'document' and result.get('document'):
                            file_id = result['document'].get('file_id')
                        success_count += 1
                        users = users.exclude(id=first_user.id)
                    else:
                        fail_count += 1
            
            for user in users:
                try:
                    if file_id:
                        # file_id orqali yuborish (tezroq)
                        method_map = {
                            'photo': 'sendPhoto',
                            'video': 'sendVideo',
                            'document': 'sendDocument'
                        }
                        field_map = {
                            'photo': 'photo',
                            'video': 'video',
                            'document': 'document'
                        }
                        method = method_map.get(media_type, 'sendPhoto')
                        field = field_map.get(media_type, 'photo')
                        
                        response = req.post(
                            f'https://api.telegram.org/bot{settings.bot_token}/{method}',
                            json={
                                'chat_id': user.telegram_id,
                                field: file_id,
                                'caption': text or '',
                                'parse_mode': 'HTML'
                            },
                            timeout=30
                        )
                    elif media_type and file_url:
                        # Media yuborish
                        method_map = {
                            'photo': 'sendPhoto',
                            'video': 'sendVideo',
                            'document': 'sendDocument'
                        }
                        field_map = {
                            'photo': 'photo',
                            'video': 'video',
                            'document': 'document'
                        }
                        method = method_map.get(media_type, 'sendPhoto')
                        field = field_map.get(media_type, 'photo')
                        
                        response = req.post(
                            f'https://api.telegram.org/bot{settings.bot_token}/{method}',
                            json={
                                'chat_id': user.telegram_id,
                                field: file_url,
                                'caption': text or '',
                                'parse_mode': 'HTML'
                            },
                            timeout=30
                        )
                    else:
                        # Oddiy xabar yuborish
                        response = req.post(
                            f'https://api.telegram.org/bot{settings.bot_token}/sendMessage',
                            json={
                                'chat_id': user.telegram_id,
                                'text': text,
                                'parse_mode': 'HTML'
                            },
                            timeout=10
                        )
                    
                    if response.json().get('ok'):
                        success_count += 1
                    else:
                        fail_count += 1
                except Exception:
                    fail_count += 1
            
            return Response({
                'success': True,
                'total': users.count(),
                'success_count': success_count,
                'fail_count': fail_count
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AppealCategoryViewSet(viewsets.ModelViewSet):
    """Murojaat sohalari API"""
    
    queryset = AppealCategory.objects.all()
    serializer_class = AppealCategorySerializer
    filterset_fields = ['is_active']
    
    def get_permissions(self):
        if self.action == 'list':
            return [permissions.AllowAny()]
        if self.action in {'admin_list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'}:
            return [permissions.IsAuthenticated(), CanManageBotSettings()]
        return super().get_permissions()

    def get_serializer_class(self):
        # List endpoint bot/public uchun ishlatiladi, shu sabab mas'ul tashkilotlarni oshkor qilmaymiz.
        if self.action == 'list':
            return AppealCategorySerializer
        return AppealCategoryAdminSerializer

    @action(detail=False, methods=['get'])
    def admin_list(self, request):
        """Admin uchun: mas'ul tashkilotlar bilan sohalar ro'yxati."""
        qs = self.filter_queryset(self.get_queryset())
        return Response(self.get_serializer(qs, many=True).data)


class AppealTypeViewSet(viewsets.ModelViewSet):
    """Murojaat turlari API"""
    
    queryset = AppealType.objects.all()
    serializer_class = AppealTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_active']
    
    def get_permissions(self):
        if self.action == 'list':
            return [permissions.AllowAny()]
        return super().get_permissions()


class TelegramAppealViewSet(viewsets.ModelViewSet):
    """Telegram murojaatlar API"""
    
    queryset = TelegramAppeal.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'priority', 'appeal_type', 'category', 'source', 'forwarded_to_site']
    search_fields = ['appeal_number', 'text', 'telegram_user__first_name', 'telegram_user__last_name']
    ordering_fields = ['created_at', 'priority', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role not in ['HOKIM', 'ADMIN']:
            # Tashkilot rahbari/mas'uli faqat o'z tashkilotiga biriktirilgan murojaatlarni ko'radi
            if user.role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
                if not user.organization:
                    queryset = queryset.none()
                else:
                    # Agar murojaat explicit biriktirilmagan bo'lsa ham, soha bo'yicha mas'ul tashkilotlarga ko'rinsin.
                    queryset = queryset.filter(
                        Q(assigned_organizations=user.organization)
                        | Q(category__responsible_organizations=user.organization)
                    ).distinct()
            elif user.role in ['HOKIM_YORDAMCHISI', 'HOKIMLIK_MASUL']:
                visibility_filter = Q(reviewed_by__user=user) | Q(messages__sender_user=user)
                if user.organization:
                    visibility_filter |= Q(assigned_organizations=user.organization)
                if getattr(user, 'sector_id', None):
                    visibility_filter |= Q(assigned_organizations__sector_id=user.sector_id)

                queryset = queryset.filter(visibility_filter).distinct()
            else:
                queryset = queryset.none()

        # Unread messages count (fuqarodan kelgan) - current dashboard user uchun
        try:
            if getattr(user, 'is_authenticated', False) and getattr(user, 'id', None):
                last_read_at = Subquery(
                    AppealReadState.objects.filter(appeal_id=OuterRef('pk'), user_id=user.id)
                    .values('last_read_at')[:1],
                    output_field=DateTimeField(),
                )
                epoch = datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc)
                queryset = queryset.annotate(
                    _last_read_at=last_read_at,
                ).annotate(
                    _last_read_at_c=Coalesce(F('_last_read_at'), Value(epoch, output_field=DateTimeField()))
                ).annotate(
                    unread_user_messages_count=Count(
                        'messages',
                        filter=Q(messages__is_from_admin=False, messages__created_at__gt=F('_last_read_at_c')),
                        distinct=True,
                    )
                )
        except Exception:
            pass

        return queryset
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TelegramAppealDetailSerializer
        return TelegramAppealListSerializer

    def _normalize_task_priority(self, priority):
        value = str(priority or 'ODDIY').upper()
        if value == 'SHOSHILINCH':
            value = 'FAVQULODDA'
        return value if value in {'PAST', 'ODDIY', 'YUQORI', 'FAVQULODDA'} else 'ODDIY'

    def _normalize_task_category(self, appeal):
        raw = (
            getattr(getattr(appeal, 'category', None), 'name_uz', '')
            or getattr(getattr(appeal, 'ai_category_suggestion', None), 'name_uz', '')
            or 'BOSHQA'
        )
        normalized = str(raw).upper().replace(" ", "_").replace("O‘", "O'").replace("`", "'")
        category_map = {
            'IJTIMOIY': 'IJTIMOIY',
            'IQTISODIY': 'IQTISODIY',
            'HUQUQIY': 'HUQUQIY',
            'INFRASTRUKTURA': 'INFRASTRUKTURA',
            "TA'LIM": 'TA_LIM',
            'TA_LIM': 'TA_LIM',
            "SOG'LIQNI_SAQLASH": 'SOG_LIQNI_SAQLASH',
            'SOG_LIQNI_SAQLASH': 'SOG_LIQNI_SAQLASH',
            'BANDLIK': 'IQTISODIY',
        }
        return category_map.get(normalized, 'BOSHQA')

    def _normalize_organization_ids(self, organization_ids):
        if organization_ids is None:
            return []
        if isinstance(organization_ids, str):
            return [item.strip() for item in organization_ids.split(',') if item.strip()]
        return [str(item).strip() for item in organization_ids if str(item).strip()]

    def _create_task_for_appeal(self, *, appeal, user, title, deadline, priority, organization_ids, comment=''):
        from tasks.models import Task, TaskOrganization
        from organizations.models import Organization
        from notifications.models import Notification

        normalized_org_ids = self._normalize_organization_ids(organization_ids)
        organizations = list(Organization.objects.filter(id__in=normalized_org_ids, is_active=True))
        if not organizations:
            raise ValueError("Tashkilot tanlanmagan yoki topilmadi")
        region_name = appeal.telegram_user.region.name_uz if appeal.telegram_user.region else "Noma'lum"

        normalized_comment = (comment or '').strip()
        description_parts = [
            f"Telegram murojaat #{appeal.appeal_number}",
            "",
            f"Fuqaro: {appeal.telegram_user.full_name}",
            f"Telefon: {appeal.telegram_user.phone}",
            f"Hudud: {region_name}",
        ]
        if normalized_comment:
            description_parts.extend([
                "",
                "Hokim/AI izohi:",
                normalized_comment,
            ])
        description_parts.extend([
            "",
            "Murojaat matni:",
            appeal.text,
        ])

        task = Task.objects.create(
            title=title,
            description="\n".join(description_parts),
            priority=self._normalize_task_priority(priority),
            deadline=deadline,
            created_by=user,
            category=self._normalize_task_category(appeal),
            source='TELEGRAM',
        )

        for organization in organizations:
            TaskOrganization.objects.create(task=task, organization=organization, status='YANGI')
            for org_user in organization.employees.filter(
                status='FAOL',
                role__in=['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
            ):
                Notification.objects.create(
                    user=org_user,
                    title='Yangi topshiriq',
                    message=f"Murojaat asosida yangi topshiriq berildi: {task.title}",
                    notification_type='TASK',
                    related_task=task,
                    link=f'/dashboard/tasks/{task.id}',
                )

        appeal.forwarded_to_site = True
        appeal.status = 'forwarded'
        appeal.site_task_id = str(task.id)
        appeal.assigned_organizations.set([org.id for org in organizations])
        appeal.save(update_fields=['forwarded_to_site', 'status', 'site_task_id', 'updated_at'])
        return task, organizations

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Murojaatni soha/tashkilot bo'yicha yo'naltirish (manual routing)."""
        if request.user.role not in {'ADMIN', 'HOKIM', 'HOKIM_YORDAMCHISI', 'HOKIMLIK_MASUL'}:
            return Response({'error': "Ruxsat yo'q"}, status=status.HTTP_403_FORBIDDEN)

        appeal = self.get_object()
        serializer = AppealAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        category_id = serializer.validated_data.get('category_id', None)
        organization_ids = serializer.validated_data.get('organization_ids', [])

        category_changed = False
        if 'category_id' in request.data:
            if category_id is None:
                appeal.category = None
                category_changed = True
            else:
                try:
                    category = AppealCategory.objects.get(id=category_id)
                except AppealCategory.DoesNotExist:
                    return Response({'error': 'Soha topilmadi'}, status=status.HTTP_400_BAD_REQUEST)
                appeal.category = category
                category_changed = True

        if 'organization_ids' in request.data:
            appeal.assigned_organizations.set(self._normalize_organization_ids(organization_ids))
        elif category_changed:
            # Soha o'zgartirilsa, mapping bo'yicha default biriktirishga urinib ko'ramiz.
            try:
                mapped_orgs = appeal.category.responsible_organizations.filter(is_active=True) if appeal.category else None  # type: ignore[attr-defined]
            except Exception:
                mapped_orgs = None
            if mapped_orgs is not None and mapped_orgs.exists():
                appeal.assigned_organizations.set(mapped_orgs)
            else:
                # Noto'g'ri oldingi biriktirishlar qolib ketmasligi uchun tozalaymiz.
                appeal.assigned_organizations.clear()

        appeal.save(update_fields=['category', 'updated_at'])

        try:
            org_names = list(appeal.assigned_organizations.values_list('name', flat=True))
            extra = f" ({', '.join(org_names[:3])}{'...' if len(org_names) > 3 else ''})" if org_names else ""
            notify_appeal_status_update(
                appeal=appeal,
                title="Murojaat yo'naltirildi",
                message=f"#{appeal.appeal_number} murojaati yangi mas'ullarga biriktirildi{extra}.",
                exclude_user_ids=[request.user.id],
            )
        except Exception:
            pass

        return Response(TelegramAppealDetailSerializer(appeal, context={'request': request}).data)
    
    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Murojaatni ko'rib chiqish"""
        appeal = self.get_object()
        serializer = AppealReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        priority = serializer.validated_data.get('priority')
        response_text = serializer.validated_data.get('response', '')
        forward_to_site = serializer.validated_data.get('forward_to_site', False)
        create_task = serializer.validated_data.get('create_task', False)
        organization_ids = serializer.validated_data.get('organization_ids', [])
        
        # Admin topish
        admin = None
        if hasattr(request.user, 'bot_admin_profiles'):
            admin = request.user.bot_admin_profiles.first()
        
        if action == 'approve':
            appeal.status = 'approved'
            if priority:
                appeal.priority = priority
        elif action == 'reject':
            appeal.status = 'rejected'
            appeal.admin_response = response_text
        elif action == 'respond':
            appeal.status = 'responded'
            appeal.admin_response = response_text
        
        appeal.reviewed_by = admin
        appeal.reviewed_at = timezone.now()
        appeal.save()

        # Biriktirilgan tashkilotlarni yangilash (agar yuborilgan bo'lsa)
        if 'organization_ids' in request.data:
            appeal.assigned_organizations.set(self._normalize_organization_ids(organization_ids))
        elif not appeal.assigned_organizations.exists() and getattr(appeal, 'category_id', None):
            # Soha bo'yicha mas'ul tashkilotlar oldindan sozlangan bo'lsa, default biriktiramiz.
            try:
                mapped_orgs = appeal.category.responsible_organizations.filter(is_active=True)  # type: ignore[attr-defined]
            except Exception:
                mapped_orgs = None
            if mapped_orgs is not None and mapped_orgs.exists():
                appeal.assigned_organizations.set(mapped_orgs)
        
        # Javob xabarini saqlash
        if response_text:
            AppealMessage.objects.create(
                appeal=appeal,
                is_from_admin=True,
                admin=admin,
                sender_user=request.user,
                text=response_text
            )
        
        # Saytga yuborish
        if forward_to_site:
            self._forward_to_site(appeal, create_task, organization_ids, request.user)

        status_messages = {
            'approve': f"#{appeal.appeal_number} murojaati ko'rib chiqildi va tasdiqlandi.",
            'reject': f"#{appeal.appeal_number} murojaati rad etildi.",
            'respond': f"#{appeal.appeal_number} murojaatiga javob yozildi.",
        }
        notify_appeal_status_update(
            appeal=appeal,
            title="Murojaat holati yangilandi",
            message=status_messages.get(action, f"#{appeal.appeal_number} murojaati yangilandi."),
            exclude_user_ids=[request.user.id],
        )

        if response_text:
            notify_appeal_message(
                appeal=appeal,
                sender_name=request.user.full_name,
                preview=response_text,
                exclude_user_ids=[request.user.id],
            )
        
        return Response(TelegramAppealDetailSerializer(appeal, context={'request': request}).data)
    
    def _forward_to_site(self, appeal, create_task=False, organization_ids=None, user=None):
        """Murojaatni saytga yuborish"""
        if create_task and organization_ids and user is not None:
            default_title = f"Murojaat #{appeal.appeal_number}: {appeal.text[:100]}..."
            deadline = timezone.now() + timedelta(days=7)
            self._create_task_for_appeal(
                appeal=appeal,
                user=user,
                title=default_title,
                deadline=deadline,
                priority='ODDIY',
                organization_ids=organization_ids,
            )
            return

        appeal.forwarded_to_site = True
        appeal.status = 'forwarded'
        if organization_ids:
            appeal.assigned_organizations.set(self._normalize_organization_ids(organization_ids))
        appeal.save()
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Foydalanuvchiga xabar yuborish (matn va/yoki fayl)"""
        appeal = self.get_object()
        text = request.data.get('text', '')
        uploaded_file = request.FILES.get('file')
        
        if not text and not uploaded_file:
            return Response(
                {'error': 'Xabar matni yoki fayl kiritilmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Admin topish
        admin = None
        if hasattr(request.user, 'bot_admin_profiles'):
            admin = request.user.bot_admin_profiles.first()
        
        # Xabarni saqlash
        message = AppealMessage.objects.create(
            appeal=appeal,
            is_from_admin=True,
            admin=admin,
            sender_user=request.user,
            text=text or ''
        )
        
        # Telegram orqali yuborish
        try:
            settings = BotSettings.objects.first()
            if settings and settings.bot_token:
                import requests as req
                
                # Javob berish tugmasi
                keyboard = {
                    'inline_keyboard': [
                        [
                            {'text': '💬 Javob berish', 'callback_data': f'user_reply:{appeal.id}'}  # type: ignore[attr-defined]
                        ]
                    ]
                }
                
                chat_id = appeal.telegram_user.telegram_id
                
                # Fayl bor bo'lsa
                if uploaded_file:
                    file_name = uploaded_file.name.lower()
                    content_type = uploaded_file.content_type or ''
                    
                    # Rasm
                    if content_type.startswith('image/') or file_name.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                        req.post(
                            f'https://api.telegram.org/bot{settings.bot_token}/sendPhoto',
                            data={
                                'chat_id': chat_id,
                                'caption': f"📨 #{appeal.appeal_number} raqamli murojaatingizga javob:\n\n{text}" if text else f"📨 #{appeal.appeal_number} raqamli murojaatingizga rasm yuborildi",
                                'parse_mode': 'HTML',
                                'reply_markup': str(keyboard).replace("'", '"')
                            },
                            files={'photo': (uploaded_file.name, uploaded_file.read(), content_type)},
                            timeout=30
                        )
                    # Video
                    elif content_type.startswith('video/') or file_name.endswith(('.mp4', '.avi', '.mov', '.mkv')):
                        req.post(
                            f'https://api.telegram.org/bot{settings.bot_token}/sendVideo',
                            data={
                                'chat_id': chat_id,
                                'caption': f"📨 #{appeal.appeal_number} raqamli murojaatingizga javob:\n\n{text}" if text else f"📨 #{appeal.appeal_number} raqamli murojaatingizga video yuborildi",
                                'parse_mode': 'HTML',
                                'reply_markup': str(keyboard).replace("'", '"')
                            },
                            files={'video': (uploaded_file.name, uploaded_file.read(), content_type)},
                            timeout=60
                        )
                    # Audio
                    elif content_type.startswith('audio/') or file_name.endswith(('.mp3', '.ogg', '.wav', '.webm', '.m4a')):
                        req.post(
                            f'https://api.telegram.org/bot{settings.bot_token}/sendVoice',
                            data={
                                'chat_id': chat_id,
                                'caption': f"📨 #{appeal.appeal_number} raqamli murojaatingizga javob" if not text else text,
                                'reply_markup': str(keyboard).replace("'", '"')
                            },
                            files={'voice': (uploaded_file.name, uploaded_file.read(), content_type)},
                            timeout=30
                        )
                    # Boshqa fayl
                    else:
                        req.post(
                            f'https://api.telegram.org/bot{settings.bot_token}/sendDocument',
                            data={
                                'chat_id': chat_id,
                                'caption': f"📨 #{appeal.appeal_number} raqamli murojaatingizga javob:\n\n{text}" if text else f"📨 #{appeal.appeal_number} raqamli murojaatingizga fayl yuborildi",
                                'parse_mode': 'HTML',
                                'reply_markup': str(keyboard).replace("'", '"')
                            },
                            files={'document': (uploaded_file.name, uploaded_file.read(), content_type)},
                            timeout=30
                        )
                else:
                    # Faqat matn
                    req.post(
                        f'https://api.telegram.org/bot{settings.bot_token}/sendMessage',
                        json={
                            'chat_id': chat_id,
                            'text': f"📨 Sizning #{appeal.appeal_number} raqamli murojaatingizga javob:\n\n{text}",
                            'parse_mode': 'HTML',
                            'reply_markup': keyboard
                        },
                        timeout=10
                    )
        except Exception as e:
            import logging
            logging.error(f"Telegram xabar yuborishda xato: {e}")

        notify_appeal_message(
            appeal=appeal,
            sender_name=request.user.full_name,
            preview=text,
            exclude_user_ids=[request.user.id],
        )
        
        return Response({'success': True, 'message_id': message.id})
    
    @action(detail=True, methods=['post'])
    def close_appeal(self, request, pk=None):
        """Murojaatni yopish va qoniqish so'rash"""
        appeal = self.get_object()
        response_text = request.data.get('response', '')
        
        # Admin topish
        admin = None
        if hasattr(request.user, 'bot_admin_profiles'):
            admin = request.user.bot_admin_profiles.first()
        
        # Javobni saqlash
        if response_text:
            appeal.admin_response = response_text
            AppealMessage.objects.create(
                appeal=appeal,
                is_from_admin=True,
                admin=admin,
                sender_user=request.user,
                text=response_text
            )
        
        # Holatni "javob berildi" ga o'zgartirish
        appeal.status = 'responded'
        appeal.reviewed_by = admin
        appeal.reviewed_at = timezone.now()
        appeal.save()
        
        # Telegram orqali qoniqish so'rash
        try:
            settings = BotSettings.objects.first()
            if settings and settings.bot_token:
                import requests
                keyboard = {
                    'inline_keyboard': [
                        [
                            {'text': '✅ Ha, mamnunman', 'callback_data': f'satisfied:{appeal.id}'},  # type: ignore[attr-defined]
                            {'text': "❌ Yo'q, mamnun emasman", 'callback_data': f'unsatisfied:{appeal.id}'}  # type: ignore[attr-defined]
                        ]
                    ]
                }
                
                message = f"📨 Sizning <b>#{appeal.appeal_number}</b> raqamli murojaatingizga javob berildi!\n\n"
                if response_text:
                    message += f"<b>Javob:</b>\n{response_text}\n\n"
                message += "Javobdan mamnunmisiz?"
                
                requests.post(
                    f'https://api.telegram.org/bot{settings.bot_token}/sendMessage',
                    json={
                        'chat_id': appeal.telegram_user.telegram_id,
                        'text': message,
                        'parse_mode': 'HTML',
                        'reply_markup': keyboard
                    },
                    timeout=10
                )
        except Exception as e:
            pass  # Log xato

        notify_appeal_status_update(
            appeal=appeal,
            title="Murojaat bo'yicha yopish jarayoni boshlandi",
            message=f"#{appeal.appeal_number} murojaati bo'yicha fuqaro qoniqishi so'raldi.",
            exclude_user_ids=[request.user.id],
        )

        if response_text:
            notify_appeal_message(
                appeal=appeal,
                sender_name=request.user.full_name,
                preview=response_text,
                exclude_user_ids=[request.user.id],
            )
        
        return Response(TelegramAppealDetailSerializer(appeal, context={'request': request}).data)
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Murojaat xabarlari"""
        appeal = self.get_object()
        # O'qildi deb belgilash (dashboard tomoni)
        try:
            if request.user and request.user.is_authenticated:
                AppealReadState.objects.update_or_create(
                    appeal=appeal,
                    user=request.user,
                    defaults={'last_read_at': timezone.now()},
                )
        except Exception:
            pass
        messages = AppealMessage.objects.filter(appeal=appeal).select_related('admin', 'sender_user', 'appeal__telegram_user').order_by('created_at')
        
        # Fuqaro ismi
        citizen_name = None
        if appeal.telegram_user:
            citizen_name = appeal.telegram_user.full_name or appeal.telegram_user.username or "Fuqaro"
        
        data = []
        for msg in messages:
            # Haqiqiy yuboruvchi ismini aniqlash
            sender_name = None
            sender_avatar_url = None
            if msg.is_from_admin:
                # Admin/operator xabari
                if msg.sender_user:
                    sender_name = msg.sender_user.full_name
                    if msg.sender_user.avatar:
                        sender_avatar_url = request.build_absolute_uri(msg.sender_user.avatar.url)
                        if sender_avatar_url and sender_avatar_url.startswith('http://'):
                            sender_avatar_url = sender_avatar_url.replace('http://', 'https://', 1)
                elif msg.admin:
                    sender_name = msg.admin.full_name
                    # BotAdmin orqali User'ning avatarini olishga urinish
                    if msg.admin.user and hasattr(msg.admin.user, 'avatar') and msg.admin.user.avatar:
                        sender_avatar_url = request.build_absolute_uri(msg.admin.user.avatar.url)
                        if sender_avatar_url and sender_avatar_url.startswith('http://'):
                            sender_avatar_url = sender_avatar_url.replace('http://', 'https://', 1)
            else:
                # Fuqaro xabari
                sender_name = citizen_name
            
            data.append({
                'id': msg.id,  # type: ignore[attr-defined]
                'text': msg.text,
                'is_from_admin': msg.is_from_admin,
                'admin_name': sender_name,
                'sender_name': sender_name,
                'sender_avatar_url': sender_avatar_url,
                'created_at': msg.created_at.isoformat()
            })
        
        return Response(data)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """O'qilmagan murojaat xabarlar soni (fuqaro xabarlari)."""
        user = request.user
        if not user or not user.is_authenticated:
            return Response({'unread_count': 0})

        try:
            qs = self.get_queryset()
            total = qs.aggregate(total=Coalesce(Sum('unread_user_messages_count'), 0))['total']  # type: ignore[index]
            return Response({'unread_count': int(total or 0)})
        except Exception:
            return Response({'unread_count': 0})
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Murojaat tarixi (AI va admin harakatlari)"""
        appeal = self.get_object()
        
        history = []
        
        # AI tahlili
        if appeal.ai_analysis:
            history.append({
                'type': 'ai_analysis',
                'title': 'AI tahlili',
                'description': appeal.ai_analysis,
                'score': appeal.ai_score,
                'priority': appeal.ai_priority,
                'is_valid': appeal.ai_is_valid,
                'rejection_reason': appeal.ai_rejection_reason,
                'created_at': appeal.created_at.isoformat()
            })
        
        # Admin ko'rib chiqishi
        if appeal.reviewed_at:
            history.append({
                'type': 'admin_review',
                'title': 'Admin ko\'rib chiqdi',
                'admin': appeal.reviewed_by.full_name if appeal.reviewed_by else None,
                'status': appeal.status,
                'response': appeal.admin_response,
                'created_at': appeal.reviewed_at.isoformat()
            })
        
        # Xabarlar
        messages = AppealMessage.objects.filter(appeal=appeal).order_by('created_at')
        for msg in messages:
            history.append({
                'type': 'message',
                'title': 'Admin xabari' if msg.is_from_admin else 'Foydalanuvchi xabari',
                'text': msg.text,
                'admin': msg.admin.full_name if msg.admin else None,
                'created_at': msg.created_at.isoformat()
            })
        
        # Tarixni vaqt bo'yicha saralash
        history.sort(key=lambda x: x['created_at'])
        
        return Response(history)

    @action(detail=True, methods=['post'])
    def create_task(self, request, pk=None):
        """Murojaatdan topshiriq yaratish"""
        appeal = self.get_object()

        if request.user.role not in ['HOKIM', 'HOKIM_YORDAMCHISI', 'ADMIN']:
            return Response(
                {'error': "Faqat hokim va hokim o'rinbosari topshiriq yaratishi mumkin"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Ma'lumotlarni olish
        title = request.data.get('title', '')
        deadline = request.data.get('deadline')
        priority = self._normalize_task_priority(request.data.get('priority', 'ODDIY'))
        organization_ids = request.data.get('organization_ids', [])
        comment = request.data.get('comment', '')
        
        if not title:
            title = f"Murojaat #{appeal.appeal_number}: {appeal.text[:100]}..."
        
        if not deadline:
            return Response(
                {'error': 'Bajarilish muddati kiritilmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not organization_ids:
            return Response(
                {'error': 'Tashkilot tanlanmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not str(comment or '').strip():
            return Response(
                {'error': 'Hokim yoki AI izohi kiritilmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            task, organizations = self._create_task_for_appeal(
                appeal=appeal,
                user=request.user,
                title=title,
                deadline=deadline,
                priority=priority,
                organization_ids=organization_ids,
                comment=comment,
            )
            
            # Foydalanuvchiga xabar yuborish
            try:
                settings_obj = BotSettings.objects.first()
                if settings_obj and settings_obj.bot_token:
                    import requests
                    message = (
                        f"✅ Sizning <b>#{appeal.appeal_number}</b> raqamli murojaatingiz "
                        f"topshiriq sifatida kiritildi!\n\n"
                        f"📋 <b>Sarlavha:</b> {title}\n"
                        f"📅 <b>Muddat:</b> {deadline[:10] if isinstance(deadline, str) else deadline.strftime('%Y-%m-%d')}\n"
                        f"🏢 <b>Tashkilotlar:</b> {', '.join(org.name for org in organizations)}\n\n"
                        f"Murojaatingiz ijrosi ta'minlanadi."
                    )
                    requests.post(
                        f'https://api.telegram.org/bot{settings_obj.bot_token}/sendMessage',
                        json={
                            'chat_id': appeal.telegram_user.telegram_id,
                            'text': message,
                            'parse_mode': 'HTML'
                        },
                        timeout=10
                    )
            except Exception as e:
                pass  # Log xato

            notify_appeal_status_update(
                appeal=appeal,
                title="Murojaatdan topshiriq yaratildi",
                message=f"#{appeal.appeal_number} murojaati asosida yangi topshiriq shakllantirildi.",
                exclude_user_ids=[request.user.id],
            )
            
            return Response({
                'success': True,
                'task_id': task.id,  # type: ignore[attr-defined]
                'message': 'Topshiriq muvaffaqiyatli yaratildi'
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # ==========================================================================
    # AI YORDAMCHI ENDPOINTLARI
    # ==========================================================================
    
    @action(detail=True, methods=['get'])
    def ai_analysis(self, request, pk=None):
        """
        AI orqali murojaatni qayta tahlil qilish.
        Adminlar uchun qo'shimcha ma'lumot.
        """
        appeal = self.get_object()
        
        try:
            from .bot.ai_service import analyze_appeal
            settings_obj = BotSettings.objects.first()
            
            if not settings_obj:
                return Response(
                    {'error': 'Bot sozlamalari topilmadi'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            result = analyze_appeal(appeal, settings_obj)
            
            return Response({
                'appeal_id': appeal.id,
                'appeal_number': appeal.appeal_number,
                'analysis': result
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def ai_suggested_response(self, request, pk=None):
        """
        AI tomonidan tavsiya etiladigan javob olish.
        Admin tasdiqlashi kerak.
        """
        appeal = self.get_object()
        admin_notes = request.query_params.get('notes', '')
        
        try:
            from .bot.ai_service import generate_ai_response_for_appeal
            
            suggested_response = generate_ai_response_for_appeal(appeal)
            
            return Response({
                'appeal_id': appeal.id,
                'appeal_number': appeal.appeal_number,
                'suggested_response': suggested_response,
                'admin_notes': admin_notes
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def use_ai_response(self, request, pk=None):
        """
        AI tavsiyasidan foydalanib javob yuborish.
        """
        appeal = self.get_object()
        suggested_text = request.data.get('suggested_text', '')
        edited_text = request.data.get('edited_text', '')
        
        # Agar admin tahrirlamasa, original AI javobdan foydalanish
        response_text = edited_text if edited_text else suggested_text
        
        if not response_text:
            # AI javobni olish
            try:
                from .bot.ai_service import generate_ai_response_for_appeal
                response_text = generate_ai_response_for_appeal(appeal)
            except Exception:
                return Response(
                    {'error': 'Javob matni kiritilmagan'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Admin topish
        admin = None
        if hasattr(request.user, 'bot_admin_profiles'):
            admin = request.user.bot_admin_profiles.first()
        
        # Javobni saqlash
        appeal.admin_response = response_text
        appeal.status = 'responded'
        appeal.reviewed_by = admin
        appeal.reviewed_at = timezone.now()
        appeal.save()
        
        # Xabar saqlash
        AppealMessage.objects.create(
            appeal=appeal,
            is_from_admin=True,
            admin=admin,
            sender_user=request.user,
            text=response_text
        )
        
        # Telegram orqali yuborish
        try:
            settings_obj = BotSettings.objects.first()
            if settings_obj and settings_obj.bot_token:
                import requests
                
                keyboard = {
                    'inline_keyboard': [
                        [
                            {'text': '✅ Ha, mamnunman', 'callback_data': f'satisfied:{appeal.id}'},
                            {'text': "❌ Yo'q, mamnun emasman", 'callback_data': f'unsatisfied:{appeal.id}'}
                        ],
                        [
                            {'text': '⭐️ Baholash', 'callback_data': f'rate_appeal:{appeal.id}'}
                        ]
                    ]
                }
                
                message = f"📨 Sizning <b>#{appeal.appeal_number}</b> raqamli murojaatingizga javob:\n\n{response_text}\n\nJavobdan mamnunmisiz?"
                
                requests.post(
                    f'https://api.telegram.org/bot{settings_obj.bot_token}/sendMessage',
                    json={
                        'chat_id': appeal.telegram_user.telegram_id,
                        'text': message,
                        'parse_mode': 'HTML',
                        'reply_markup': keyboard
                    },
                    timeout=10
                )
        except Exception as e:
            pass  # Log xato

        notify_appeal_status_update(
            appeal=appeal,
            title="AI tavsiyasi bilan javob yuborildi",
            message=f"#{appeal.appeal_number} murojaatiga AI tavsiyasi asosida javob jo'natildi.",
            exclude_user_ids=[request.user.id],
        )
        notify_appeal_message(
            appeal=appeal,
            sender_name=request.user.full_name,
            preview=response_text,
            exclude_user_ids=[request.user.id],
        )
        
        return Response(TelegramAppealDetailSerializer(appeal, context={'request': request}).data)
    
    @action(detail=True, methods=['get'])
    def check_auto_close(self, request, pk=None):
        """
        Murojaatni avtomatik yopish kerakmi tekshirish.
        """
        appeal = self.get_object()
        
        try:
            from .bot.ai_service import check_appeal_for_auto_close
            
            result = check_appeal_for_auto_close(appeal)
            
            return Response({
                'appeal_id': appeal.id,
                'appeal_number': appeal.appeal_number,
                'should_close': result.get('should_close', False),
                'reason': result.get('reason', ''),
                'confidence': result.get('confidence', 0)
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def ai_daily_briefing(self, request):
        """
        Kunlik AI briefing - barcha murojaatlar haqida qisqacha.
        """
        try:
            from .bot.ai_service import get_daily_briefing
            
            briefing = get_daily_briefing()
            
            return Response({
                'briefing': briefing,
                'generated_at': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def bulk_ai_analysis(self, request):
        """
        Bir nechta murojaatni birdan AI orqali tahlil qilish.
        """
        appeal_ids = request.data.get('appeal_ids', [])
        
        if not appeal_ids:
            return Response(
                {'error': 'Murojaat ID-lari kiritilmagan'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        results = []
        settings_obj = BotSettings.objects.first()
        
        if not settings_obj:
            return Response(
                {'error': 'Bot sozlamalari topilmadi'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .bot.ai_service import analyze_appeal
        
        for appeal_id in appeal_ids[:10]:  # Max 10 ta
            try:
                appeal = TelegramAppeal.objects.get(id=appeal_id)
                analysis = analyze_appeal(appeal, settings_obj)
                
                # Natijani saqlash
                appeal.ai_analysis = analysis.get('analysis', '')
                appeal.ai_score = analysis.get('score', 0)
                appeal.ai_priority = analysis.get('priority', 'medium')
                appeal.save()
                
                results.append({
                    'appeal_id': appeal_id,
                    'appeal_number': appeal.appeal_number,
                    'status': 'success',
                    'analysis': analysis
                })
            except TelegramAppeal.DoesNotExist:
                results.append({
                    'appeal_id': appeal_id,
                    'status': 'error',
                    'message': 'Murojaat topilmadi'
                })
            except Exception as e:
                results.append({
                    'appeal_id': appeal_id,
                    'status': 'error',
                    'message': str(e)
                })
        
        return Response({
            'processed': len(results),
            'results': results
        })


class BotStatsView(APIView):
    """Bot statistikasi"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=now.weekday())
        month_start = today_start.replace(day=1)
        
        stats = {
            'total_users': TelegramUser.objects.count(),
            'registered_users': TelegramUser.objects.filter(is_registered=True).count(),
            'total_appeals': TelegramAppeal.objects.count(),
            'pending_appeals': TelegramAppeal.objects.filter(
                status__in=['pending_ai', 'pending_review', 'pending']
            ).count(),
            'approved_appeals': TelegramAppeal.objects.filter(status='approved').count(),
            'rejected_appeals': TelegramAppeal.objects.filter(status='rejected').count(),
            'forwarded_appeals': TelegramAppeal.objects.filter(forwarded_to_site=True).count(),
            'today_appeals': TelegramAppeal.objects.filter(created_at__gte=today_start).count(),
            'this_week_appeals': TelegramAppeal.objects.filter(created_at__gte=week_start).count(),
            'this_month_appeals': TelegramAppeal.objects.filter(created_at__gte=month_start).count(),
        }
        
        serializer = BotStatsSerializer(stats)
        return Response(serializer.data)


class WebhookView(APIView):
    """Telegram webhook endpoint"""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Telegram'dan kelgan yangilanishlarni qayta ishlash"""
        from .bot.handlers import process_update
        settings = BotSettings.objects.first()
        if not settings or not settings.is_active:
            return Response({'ok': True})
        if settings.use_webhook and settings.webhook_secret:
            secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
            if secret != settings.webhook_secret:
                return Response({'ok': False}, status=403)
        
        try:
            update = request.data
            process_update(update)
            return Response({'ok': True})
        except Exception as e:
            return Response({'ok': False, 'error': str(e)}, status=500)
