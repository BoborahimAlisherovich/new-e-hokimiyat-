from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta
import json

from .models import (
    BotSettings, BotAdmin, BotRegion, TelegramUser,
    AppealCategory, AppealType, TelegramAppeal,
    AppealAttachment, AppealMessage
)
from .serializers import (
    BotSettingsSerializer, BotAdminSerializer, BotRegionSerializer,
    TelegramUserSerializer, AppealCategorySerializer, AppealTypeSerializer,
    TelegramAppealListSerializer, TelegramAppealDetailSerializer,
    AppealReviewSerializer, BotStatsSerializer
)


class BotSettingsViewSet(viewsets.ModelViewSet):
    """Bot sozlamalari API"""
    
    queryset = BotSettings.objects.all()
    serializer_class = BotSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
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
            import requests
            response = requests.post(
                f'https://api.telegram.org/bot{settings.bot_token}/setWebhook',
                json={'url': webhook_url},
                timeout=10
            )
            data = response.json()
            
            if data.get('ok'):
                settings.webhook_url = webhook_url
                settings.use_webhook = True
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


class AppealCategoryViewSet(viewsets.ModelViewSet):
    """Murojaat sohalari API"""
    
    queryset = AppealCategory.objects.all()
    serializer_class = AppealCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_active']
    
    def get_permissions(self):
        if self.action == 'list':
            return [permissions.AllowAny()]
        return super().get_permissions()


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
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TelegramAppealDetailSerializer
        return TelegramAppealListSerializer
    
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
        
        # Javob xabarini saqlash
        if response_text:
            AppealMessage.objects.create(
                appeal=appeal,
                is_from_admin=True,
                admin=admin,
                text=response_text
            )
        
        # Saytga yuborish
        if forward_to_site:
            self._forward_to_site(appeal, create_task, serializer.validated_data.get('organization_ids', []))
        
        return Response(TelegramAppealDetailSerializer(appeal, context={'request': request}).data)
    
    def _forward_to_site(self, appeal, create_task=False, organization_ids=None):
        """Murojaatni saytga yuborish"""
        # Bu yerda saytdagi Appeal modeliga yozish logikasi
        # Hozircha faqat flagni o'zgartiramiz
        appeal.forwarded_to_site = True
        appeal.status = 'forwarded'
        appeal.save()
        
        # Agar topshiriq yaratish kerak bo'lsa
        if create_task and organization_ids:
            # Task yaratish logikasi
            pass
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Foydalanuvchiga xabar yuborish"""
        appeal = self.get_object()
        text = request.data.get('text')
        
        if not text:
            return Response(
                {'error': 'Xabar matni kiritilmagan'},
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
            text=text
        )
        
        # Telegram orqali yuborish
        try:
            settings = BotSettings.objects.first()
            if settings and settings.bot_token:
                import requests
                requests.post(
                    f'https://api.telegram.org/bot{settings.bot_token}/sendMessage',
                    json={
                        'chat_id': appeal.telegram_user.telegram_id,
                        'text': f"📨 Sizning #{appeal.appeal_number} raqamli murojaatingizga javob:\n\n{text}",
                        'parse_mode': 'HTML'
                    },
                    timeout=10
                )
        except Exception as e:
            pass  # Log xato
        
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
                            {'text': '✅ Qoniqdim', 'callback_data': f'satisfied:{appeal.id}'},  # type: ignore[attr-defined]
                            {'text': '❌ Qoniqmadim', 'callback_data': f'unsatisfied:{appeal.id}'}  # type: ignore[attr-defined]
                        ]
                    ]
                }
                
                message = f"📨 Sizning <b>#{appeal.appeal_number}</b> raqamli murojaatingizga javob berildi!\n\n"
                if response_text:
                    message += f"<b>Javob:</b>\n{response_text}\n\n"
                message += "Javobdan qoniqdingizmi?"
                
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
        
        return Response(TelegramAppealDetailSerializer(appeal, context={'request': request}).data)
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Murojaat xabarlari"""
        appeal = self.get_object()
        messages = AppealMessage.objects.filter(appeal=appeal).order_by('created_at')
        
        data = []
        for msg in messages:
            data.append({
                'id': msg.id,  # type: ignore[attr-defined]
                'text': msg.text,
                'is_from_admin': msg.is_from_admin,
                'admin_name': msg.admin.full_name if msg.admin else None,
                'created_at': msg.created_at.isoformat()
            })
        
        return Response(data)
    
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
        from tasks.models import Task, TaskOrganization
        from organizations.models import Organization
        
        appeal = self.get_object()
        
        # Ma'lumotlarni olish
        title = request.data.get('title', '')
        deadline = request.data.get('deadline')
        priority = request.data.get('priority', 'ODDIY')
        organization_ids = request.data.get('organization_ids', [])
        
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
        
        try:
            # Topshiriq yaratish
            task = Task.objects.create(
                title=title,
                description=f"Telegram murojaat #{appeal.appeal_number}\n\n"
                           f"Fuqaro: {appeal.telegram_user.full_name}\n"
                           f"Telefon: {appeal.telegram_user.phone}\n"
                           f"Hudud: {appeal.telegram_user.region.name_uz if appeal.telegram_user.region else 'Noma\'lum'}\n\n"
                           f"Murojaat matni:\n{appeal.text}",
                priority=priority,
                deadline=deadline,
                created_by=request.user,
                category=appeal.category.name_uz if appeal.category else 'Boshqa'
            )
            
            # Tashkilotlarni biriktirish
            for org_id in organization_ids:
                try:
                    organization = Organization.objects.get(id=org_id)
                    TaskOrganization.objects.create(
                        task=task,
                        organization=organization,
                        status='YANGI'
                    )
                except Organization.DoesNotExist:
                    pass
            
            # Murojaatni yangilash
            appeal.forwarded_to_site = True
            appeal.status = 'forwarded'
            appeal.site_task_id = task.id  # type: ignore[attr-defined]
            appeal.save()
            
            # Foydalanuvchiga xabar yuborish
            try:
                settings_obj = BotSettings.objects.first()
                if settings_obj and settings_obj.bot_token:
                    import requests
                    message = (
                        f"✅ Sizning <b>#{appeal.appeal_number}</b> raqamli murojaatingiz "
                        f"topshiriq sifatida kiritildi!\n\n"
                        f"📋 <b>Sarlavha:</b> {title}\n"
                        f"📅 <b>Muddat:</b> {deadline[:10] if isinstance(deadline, str) else deadline.strftime('%Y-%m-%d')}\n\n"
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
        
        try:
            update = request.data
            process_update(update)
            return Response({'ok': True})
        except Exception as e:
            return Response({'ok': False, 'error': str(e)}, status=500)
