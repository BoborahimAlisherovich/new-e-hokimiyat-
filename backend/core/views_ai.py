"""
AI Chat API Views.

Hokim va xodimlar uchun AI bilan suhbat API.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
import logging
import json

from core.models import AIConversation, AIMessage, AIAction, AIReport, AITaskMonitor
from core.ai_service import AIService
from core.serializers_ai import (
    AIConversationSerializer,
    AIConversationDetailSerializer,
    AIMessageSerializer,
    AIActionSerializer,
    AIReportSerializer,
    AITaskMonitorSerializer,
    ChatInputSerializer,
    AudioInputSerializer
)

logger = logging.getLogger(__name__)


class AIConversationViewSet(viewsets.ModelViewSet):
    """AI Conversation CRUD"""
    serializer_class = AIConversationSerializer
    permission_classes = [IsAuthenticated]
    queryset = AIConversation.objects.none()  # For DRF type hints
    
    def get_queryset(self):  # type: ignore
        return AIConversation.objects.filter(user=self.request.user).order_by('-updated_at')
    
    def get_serializer_class(self):  # type: ignore
        if self.action == 'retrieve':
            return AIConversationDetailSerializer
        return AIConversationSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Suhbatga xabar yuborish"""
        conversation = self.get_object()
        serializer = ChatInputSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        message_text = serializer.validated_data['message']

        # Agar pending action bo'lsa va foydalanuvchi tasdiqlasa/bekor qilsa, darhol bajarish
        pending_action = AIAction.objects.filter(
            conversation=conversation,
            status='PENDING'
        ).order_by('-created_at').first()

        normalized = message_text.strip().lower()
        yes_words = {'ha', 'xa', 'yes', 'ok', 'okay', 'mayli', 'tasdiq', 'tasdiqlayman', 'bajar', 'bajaring'}
        no_words = {'yoq', "yo'q", 'no', 'bekor', 'cancel', 'rad', 'rad et', 'kerak emas'}

        if pending_action and (normalized in yes_words or normalized in no_words):
            # Foydalanuvchi xabarini saqlash
            user_message = AIMessage.objects.create(
                conversation=conversation,
                role='user',
                content=message_text
            )

            if normalized in no_words:
                pending_action.status = 'CANCELLED'
                pending_action.save()
                ai_message = AIMessage.objects.create(
                    conversation=conversation,
                    role='assistant',
                    content='Bekor qilindi. Agar boshqa topshiriq bo‘lsa, yozing.'
                )
            else:
                ai_service = AIService()
                result = ai_service.execute_action(pending_action)

                pending_action.status = 'COMPLETED' if result.get('success') else 'FAILED'
                pending_action.result = result
                pending_action.executed_at = timezone.now()
                pending_action.save()

                if result.get('success'):
                    ai_message = AIMessage.objects.create(
                        conversation=conversation,
                        role='assistant',
                        content=f"✅ {result.get('message', 'Bajarildi')}"
                    )
                else:
                    ai_message = AIMessage.objects.create(
                        conversation=conversation,
                        role='assistant',
                        content=f"❌ Xatolik: {result.get('error', 'Noma\'lum xatolik')}"
                    )

            conversation.updated_at = timezone.now()
            conversation.save()

            return Response({
                'user_message': AIMessageSerializer(user_message).data,
                'ai_message': AIMessageSerializer(ai_message).data,
                'detected_intent': {'intent': 'CONFIRM_ACTION'}
            })
        
        # Foydalanuvchi xabarini saqlash
        user_message = AIMessage.objects.create(
            conversation=conversation,
            role='user',
            content=message_text
        )
        
        # AI javobini olish
        ai_service = AIService()
        
        # Suhbat tarixini olish
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in conversation.messages.order_by('created_at')
        ]

        # Intent aniqlash
        intent_result = ai_service.detect_intent(message_text)

        query_intents = {
            'STATUS_CHECK',
            'ORGANIZATION_STATUS',
            'USERS_STATUS',
            'APPEALS_STATUS',
            'TASKS_STATUS',
            'NOTIFICATIONS_STATUS',
            'TELEGRAM_STATUS',
            'LIST_ORGANIZATIONS',
            'LIST_USERS',
            'ANALYTICS_QUERY',
        }

        # AI javob
        if intent_result.get('intent') in query_intents:
            ai_response = ai_service.handle_query(
                intent_result.get('intent'),
                intent_result.get('parameters', {}),
                request.user,
            )
        else:
            ai_response = ai_service.chat(messages, request.user)
        
        # AI xabarini saqlash
        ai_message = AIMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content=ai_response,
            detected_intent=intent_result.get('intent'),
            intent_confidence=intent_result.get('confidence', 0)
        )
        
        # Agar action kerak bo'lsa
        if intent_result.get('intent') not in ['UNKNOWN', 'STATUS_CHECK'] and intent_result.get('confidence', 0) > 0.7:
            action = AIAction.objects.create(
                conversation=conversation,
                action_type=intent_result.get('intent'),
                parameters=intent_result.get('parameters', {}),
                initiated_by=request.user,
                status='PENDING'
            )

            # Tasdiqlash so'rash (AI oldindan bajarildi deb yozmasin)
            params = intent_result.get('parameters', {})
            preview_lines = []
            if intent_result.get('intent') == 'CREATE_TASK':
                if params.get('title'):
                    preview_lines.append(f"Topshiriq nomi: {params.get('title')}")
                if params.get('description'):
                    preview_lines.append(f"Topshiriq tavsifi: {params.get('description')}")
                if params.get('deadline_days'):
                    preview_lines.append(f"Muddat: {params.get('deadline_days')} kun")
                if params.get('assign_all'):
                    preview_lines.append("Tayinlash: barchaga")
            if intent_result.get('intent') == 'CREATE_RECURRING_TASK':
                if params.get('title'):
                    preview_lines.append(f"Takrorlanuvchi topshiriq: {params.get('title')}")
                if params.get('description'):
                    preview_lines.append(f"Tavsif: {params.get('description')}")
                if params.get('frequency'):
                    preview_lines.append(f"Takrorlanish: {params.get('frequency')}")
                if params.get('start_date'):
                    preview_lines.append(f"Boshlanish: {params.get('start_date')}")
                if params.get('end_date'):
                    preview_lines.append(f"Tugash: {params.get('end_date')}")
                if params.get('deadline_days'):
                    preview_lines.append(f"Muddat: {params.get('deadline_days')} kun")
                if params.get('cron_expression'):
                    preview_lines.append(f"Cron: {params.get('cron_expression')}")
                if params.get('assign_all'):
                    preview_lines.append("Tayinlash: barchaga")
            if intent_result.get('intent') == 'EXPORT_ANALYTICS':
                preview_lines.append(
                    f"Format: {params.get('format', 'xlsx')}"
                )

            preview_text = "\n".join(preview_lines)
            ai_message.content = (
                "Buyruq bajarilishi uchun tasdiq kerak. "
                "Tasdiqlash uchun 'ha', bekor qilish uchun 'yo‘q' deb yozing."
            )
            if preview_text:
                ai_message.content += f"\n\n{preview_text}"
            ai_message.content += f"\n\n⚡ {intent_result['intent']} buyrug'ini bajarishni xohlaysizmi?"
            ai_message.save()
        
        conversation.updated_at = timezone.now()
        conversation.save()
        
        return Response({
            'user_message': AIMessageSerializer(user_message).data,
            'ai_message': AIMessageSerializer(ai_message).data,
            'detected_intent': intent_result
        })
    
    @action(detail=True, methods=['post'])
    def send_audio(self, request, pk=None):
        """Audio xabar yuborish"""
        conversation = self.get_object()
        
        if 'audio' not in request.FILES:
            return Response({'error': 'Audio fayl kerak'}, status=status.HTTP_400_BAD_REQUEST)
        
        audio_file = request.FILES['audio']
        
        # Audio transkripsiya
        ai_service = AIService()
        transcription = ai_service.transcribe_audio(audio_file)
        
        # Foydalanuvchi xabarini saqlash
        user_message = AIMessage.objects.create(
            conversation=conversation,
            role='user',
            content=transcription,
            audio_file=audio_file,
            is_audio_message=True
        )
        
        # AI javobini olish
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in conversation.messages.order_by('created_at')
        ]
        
        ai_response = ai_service.chat(messages, request.user)
        intent_result = ai_service.detect_intent(transcription)
        
        # AI xabarini saqlash
        ai_message = AIMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content=ai_response,
            detected_intent=intent_result.get('intent'),
            intent_confidence=intent_result.get('confidence', 0)
        )
        
        conversation.updated_at = timezone.now()
        conversation.save()
        
        return Response({
            'transcription': transcription,
            'user_message': AIMessageSerializer(user_message).data,
            'ai_message': AIMessageSerializer(ai_message).data,
            'detected_intent': intent_result
        })
    
    @action(detail=True, methods=['post'])
    def confirm_action(self, request, pk=None):
        """AI action-ni tasdiqlash"""
        conversation = self.get_object()
        action_id = request.data.get('action_id')
        confirmed = request.data.get('confirmed', False)
        
        try:
            action = AIAction.objects.get(id=action_id, conversation=conversation)
        except AIAction.DoesNotExist:
            return Response({'error': 'Action topilmadi'}, status=status.HTTP_404_NOT_FOUND)
        
        if not confirmed:
            action.status = 'CANCELLED'
            action.save()
            return Response({'message': 'Action bekor qilindi'})
        
        # Action bajarish
        ai_service = AIService()
        result = ai_service.execute_action(action)
        
        action.status = 'COMPLETED' if result.get('success') else 'FAILED'
        action.result = result
        action.executed_at = timezone.now()
        action.save()
        
        # AI javob qo'shish
        if result.get('success'):
            AIMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=f"✅ {result.get('message', 'Bajarildi')}"
            )
        else:
            AIMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=f"❌ Xatolik: {result.get('error', 'Noma\'lum xatolik')}"
            )
        
        return Response({
            'action': AIActionSerializer(action).data,
            'result': result
        })


class AIReportViewSet(viewsets.ReadOnlyModelViewSet):
    """AI Reports"""
    serializer_class = AIReportSerializer
    permission_classes = [IsAuthenticated]
    queryset = AIReport.objects.none()  # For DRF type hints
    
    def get_queryset(self):  # type: ignore
        return AIReport.objects.order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Hisobot yaratish"""
        report_type = request.data.get('report_type', 'DAILY_SUMMARY')
        period_days = request.data.get('period_days', 7)
        
        ai_service = AIService()
        params = {
            'report_type': report_type,
            'period_days': period_days
        }
        
        # Action yaratish
        action = AIAction.objects.create(
            action_type='GENERATE_REPORT',
            parameters=params,
            initiated_by=request.user,
            status='IN_PROGRESS'
        )
        
        result = ai_service._generate_report(params, request.user, None)
        
        if result.get('success'):
            action.status = 'COMPLETED'
            action.result = result
            action.executed_at = timezone.now()
            action.save()
            
            report = AIReport.objects.get(id=result['report_id'])
            return Response(AIReportSerializer(report).data)
        else:
            action.status = 'FAILED'
            action.result = result
            action.save()
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class AITaskMonitorViewSet(viewsets.ReadOnlyModelViewSet):
    """AI Task Monitoring"""
    serializer_class = AITaskMonitorSerializer
    permission_classes = [IsAuthenticated]
    queryset = AITaskMonitor.objects.none()  # For DRF type hints
    
    def get_queryset(self):  # type: ignore
        return AITaskMonitor.objects.select_related('task').order_by('-updated_at')
    
    @action(detail=False, methods=['get'])
    def high_risk(self, request):
        """Yuqori riskli topshiriqlar"""
        monitors = self.get_queryset().filter(risk_level__in=['HIGH', 'CRITICAL'])
        return Response(AITaskMonitorSerializer(monitors, many=True).data)
    
    @action(detail=False, methods=['get'])
    def needs_attention(self, request):
        """E'tibor kerak bo'lgan topshiriqlar"""
        monitors = self.get_queryset().filter(needs_attention=True)
        return Response(AITaskMonitorSerializer(monitors, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quick_chat(request):
    """Tezkor suhbat - yangi conversation yaratmasdan"""
    message = request.data.get('message', '')
    if not message:
        return Response({'error': 'Xabar kerak'}, status=status.HTTP_400_BAD_REQUEST)
    
    ai_service = AIService()
    
    # Faqat bitta xabar
    response = ai_service.chat([{"role": "user", "content": message}], request.user)
    intent = ai_service.detect_intent(message)
    
    return Response({
        'response': response,
        'intent': intent
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_status(request):
    """AI xizmati holati"""
    from tasks.models import Task
    from telegram_bot.models import TelegramAppeal
    from organizations.models import Organization
    
    now = timezone.now()
    today = now.date()
    
    # Statistika
    stats = {
        'tasks': {
            'active': Task.objects.filter(status__in=['YANGI', 'IJRODA']).count(),
            'overdue': Task.objects.filter(status='MUDDATI_KECH').count(),
            'completed_today': Task.objects.filter(
                status='BAJARILDI',
                updated_at__date=today
            ).count()
        },
        'appeals': {
            'pending': TelegramAppeal.objects.filter(
                status__in=['pending_ai', 'pending_review']
            ).count(),
            'resolved_today': TelegramAppeal.objects.filter(
                status='resolved',
                closed_at__date=today
            ).count()
        },
        'ai': {
            'conversations_today': AIConversation.objects.filter(
                created_at__date=today
            ).count(),
            'actions_today': AIAction.objects.filter(
                created_at__date=today
            ).count(),
            'reports_today': AIReport.objects.filter(
                created_at__date=today
            ).count()
        },
        'organizations': {
            'total': Organization.objects.count(),
            'active': Organization.objects.filter(is_active=True).count()
        }
    }
    
    # Ogohlantirish kerak bo'lgan topshiriqlar
    high_risk = AITaskMonitor.objects.filter(
        risk_level__in=['HIGH', 'CRITICAL']
    ).count()
    
    stats['alerts'] = {
        'high_risk_tasks': high_risk
    }
    
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_summary(request):
    """Kunlik qisqacha hisobot"""
    ai_service = AIService()
    summary = ai_service.get_daily_summary()
    return Response({"summary": summary})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def execute_command(request):
    """Bevosita buyruq bajarish (tasdiqlash shart emas)"""
    command = request.data.get('command', '')
    params = request.data.get('params', {})
    
    valid_commands = [
        'CREATE_RECURRING_TASK',
        'EXPORT_ANALYTICS',
        'CREATE_TASK', 'CLOSE_TASK', 'REMOVE_CONTROL',
        'GENERATE_REPORT', 'CLOSE_APPEAL', 'SEND_NOTIFICATION'
    ]
    
    if command not in valid_commands:
        return Response(
            {'error': f"Noto'g'ri buyruq. Ruxsat etilgan: {valid_commands}"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Action yaratish va bajarish
    action = AIAction.objects.create(
        action_type=command,
        parameters=params,
        initiated_by=request.user,
        status='IN_PROGRESS'
    )
    
    ai_service = AIService()
    result = ai_service.execute_action(action)
    
    action.status = 'COMPLETED' if result.get('success') else 'FAILED'
    action.result = result
    action.executed_at = timezone.now()
    action.save()
    
    return Response({
        'action': AIActionSerializer(action).data,
        'result': result
    })
