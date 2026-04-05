"""
AI Chat API Views.

Hokim va xodimlar uchun AI bilan suhbat API.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from django.db import transaction
import logging
import json
import mimetypes

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

MAX_AI_ATTACHMENT_SIZE = 50 * 1024 * 1024


def _describe_attachment(uploaded_file) -> str:
    file_name = getattr(uploaded_file, 'name', 'fayl')
    content_type = getattr(uploaded_file, 'content_type', '') or mimetypes.guess_type(file_name)[0] or 'application/octet-stream'
    size_mb = (getattr(uploaded_file, 'size', 0) or 0) / (1024 * 1024)
    return f"Biriktirilgan fayl: {file_name} ({content_type}, {size_mb:.1f} MB)"


def _validate_ai_attachment(uploaded_file) -> str | None:
    if not uploaded_file:
        return None
    if uploaded_file.size > MAX_AI_ATTACHMENT_SIZE:
        return "Fayl hajmi 50MB dan oshmasligi kerak"
    return None


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
        try:
            conversation = self.get_object()
        except Exception as e:
            logger.exception("AI send_message get_object error")
            now = timezone.now().isoformat()
            fallback_user = {
                'id': f'error-user-{int(timezone.now().timestamp())}',
                'role': 'user',
                'content': (request.data or {}).get('message', ''),
                'is_audio_message': False,
                'detected_intent': None,
                'intent_confidence': None,
                'created_at': now,
            }
            fallback_ai = {
                'id': f'error-ai-{int(timezone.now().timestamp())}',
                'role': 'assistant',
                'content': f"❌ Xatolik: {str(e) or 'Noma\'lum xatolik'}",
                'is_audio_message': False,
                'detected_intent': 'ERROR',
                'intent_confidence': 0,
                'created_at': now,
            }
            return Response({
                'user_message': fallback_user,
                'ai_message': fallback_ai,
                'detected_intent': {'intent': 'ERROR'}
            })

        payload = request.data.copy()
        if 'attachment' not in payload and request.FILES.get('attachment'):
            payload['attachment'] = request.FILES.get('attachment')

        serializer = ChatInputSerializer(data=payload)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        message_text = serializer.validated_data.get('message', '').strip()
        attachment = serializer.validated_data.get('attachment') or request.FILES.get('attachment')
        attachment_error = _validate_ai_attachment(attachment)
        if attachment_error:
            return Response({'error': attachment_error}, status=status.HTTP_400_BAD_REQUEST)
        user_message = None

        try:
            # Агар pending action bo'lsa va foydalanuvchi tasdiqlasa/bekor qilsa, darhol bajarish
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
                    content=message_text or (attachment.name if attachment else ''),
                    audio_file=attachment,
                    is_audio_message=bool(attachment and (attachment.content_type or '').startswith('audio/'))
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
                    if not getattr(ai_service, 'enabled', True):
                        pending_action.status = 'CANCELLED'
                        pending_action.save()
                        ai_message = AIMessage.objects.create(
                            conversation=conversation,
                            role='assistant',
                            content="AI xizmati o‘chirilgan yoki sozlanmagan. Buyruq bajarilmadi."
                        )
                        conversation.updated_at = timezone.now()
                        conversation.save()
                        return Response({
                            'user_message': AIMessageSerializer(user_message).data,
                            'ai_message': AIMessageSerializer(ai_message).data,
                            'detected_intent': {'intent': 'AI_DISABLED'}
                        })
                    result = ai_service.execute_action(pending_action)

                    pending_action.status = 'COMPLETED' if result.get('success') else 'FAILED'
                    pending_action.result = result
                    pending_action.executed_at = timezone.now()
                    pending_action.save()

                    if result.get('success'):
                        extra_lines = []
                        if result.get('report_id'):
                            extra_lines.append(f"[REPORT_ID:{result.get('report_id')}] ")
                        if result.get('summary'):
                            extra_lines.append(f"\n{result.get('summary')}")
                        extra_text = f"\n\n" + "\n".join(extra_lines) if extra_lines else ""
                        ai_message = AIMessage.objects.create(
                            conversation=conversation,
                            role='assistant',
                            content=f"✅ {result.get('message', 'Bajarildi')}" + extra_text
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
                content=message_text or (attachment.name if attachment else ''),
                audio_file=attachment,
                is_audio_message=bool(attachment and (attachment.content_type or '').startswith('audio/'))
            )
            
            # AI javobini olish
            ai_service = AIService()

            if not getattr(ai_service, 'enabled', True):
                ai_message = AIMessage.objects.create(
                    conversation=conversation,
                    role='assistant',
                    content="AI xizmati o‘chirilgan yoki sozlanmagan. Administrator sozlamalarda yoqishi kerak."
                )
                conversation.updated_at = timezone.now()
                conversation.save()
                return Response({
                    'user_message': AIMessageSerializer(user_message).data,
                    'ai_message': AIMessageSerializer(ai_message).data,
                    'detected_intent': {'intent': 'AI_DISABLED'}
                })
            
            # Suhbat tarixini olish
            messages = [
                {
                    "role": msg.role,
                    "content": (
                        msg.content
                        + (
                            f"\n[{_describe_attachment(msg.audio_file)}]"
                            if msg.audio_file else ""
                        )
                    ).strip()
                }
                for msg in conversation.messages.order_by('created_at')
            ]

            # Intent aniqlash
            intent_result = ai_service.detect_intent(message_text, request.user)

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
            if attachment and not message_text:
                ai_response = (
                    f"Fayl qabul qilindi. {_describe_attachment(attachment)}. "
                    "Agar shu fayl asosida topshiriq yaratmoqchi bo'lsangiz, qisqa izoh ham yozing."
                )
            elif intent_result.get('intent') in query_intents:
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
            
            # Агар action kerak bo'lsa
            if (
                intent_result.get('intent') not in ['UNKNOWN', 'STATUS_CHECK']
                and intent_result.get('intent') not in query_intents
                and intent_result.get('confidence', 0) > 0.7
            ):
                action = AIAction.objects.create(
                    conversation=conversation,
                    action_type=intent_result.get('intent'),
                    parameters=intent_result.get('parameters', {}),
                    initiated_by=request.user,
                    status='PENDING'
                )

                auto_execute = (
                    intent_result.get('intent') in {'CREATE_TASK', 'CREATE_RECURRING_TASK'}
                    and request.user.role in {'HOKIM', 'HOKIMLIK_MASUL', 'HOKIM_YORDAMCHISI', 'ADMIN'}
                    and intent_result.get('confidence', 0) >= 0.75
                )

                if auto_execute:
                    action.status = 'IN_PROGRESS'
                    action.save(update_fields=['status'])

                    result = ai_service.execute_action(action)
                    action.status = 'COMPLETED' if result.get('success') else 'FAILED'
                    action.result = result
                    action.executed_at = timezone.now()
                    action.save()

                    if result.get('success'):
                        extra_lines = []
                        if result.get('report_id'):
                            extra_lines.append(f"[REPORT_ID:{result.get('report_id')}] ")
                        if result.get('summary'):
                            extra_lines.append(f"\n{result.get('summary')}")
                        extra_text = f"\n\n" + "\n".join(extra_lines) if extra_lines else ""
                        ai_message.content = f"✅ {result.get('message', 'Bajarildi')}" + extra_text
                    else:
                        ai_message.content = f"❌ Xatolik: {result.get('error', 'Noma\'lum xatolik')}"
                    ai_message.save(update_fields=['content'])
                    conversation.updated_at = timezone.now()
                    conversation.save()
                    return Response({
                        'user_message': AIMessageSerializer(user_message, context={'request': request}).data,
                        'ai_message': AIMessageSerializer(ai_message, context={'request': request}).data,
                        'detected_intent': intent_result
                    })

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
                'user_message': AIMessageSerializer(user_message, context={'request': request}).data,
                'ai_message': AIMessageSerializer(ai_message, context={'request': request}).data,
                'detected_intent': intent_result
            })
        except Exception as e:
            logger.exception("AI send_message fatal error")
            now = timezone.now().isoformat()
            fallback_user = {
                'id': f'error-user-{int(timezone.now().timestamp())}',
                'role': 'user',
                'content': message_text,
                'is_audio_message': False,
                'detected_intent': None,
                'intent_confidence': None,
                'created_at': now,
            }
            fallback_ai = {
                'id': f'error-ai-{int(timezone.now().timestamp())}',
                'role': 'assistant',
                'content': f"❌ Xatolik: {str(e) or 'Noma\'lum xatolik'}",
                'is_audio_message': False,
                'detected_intent': 'ERROR',
                'intent_confidence': 0,
                'created_at': now,
            }
            return Response({
                'user_message': fallback_user,
                'ai_message': fallback_ai,
                'detected_intent': {'intent': 'ERROR'}
            })
    
    @action(detail=True, methods=['post'])
    def send_audio(self, request, pk=None):
        """Audio xabar yuborish"""
        conversation = self.get_object()

        if 'audio' not in request.FILES:
            return Response({'error': 'Audio fayl kerak'}, status=status.HTTP_400_BAD_REQUEST)

        audio_file = request.FILES['audio']
        transcript_fallback = (request.data.get('transcript') or '').strip()

        ai_service = AIService()
        transcription = ai_service.transcribe_audio(audio_file).strip()

        # Browser SpeechRecognition transkripti bilan fallback
        if (
            (not transcription or transcription.startswith('Xatolik:') or transcription.startswith('Audio transkripsiya'))
            and transcript_fallback
        ):
            transcription = transcript_fallback

        if not transcription:
            return Response({'error': 'Audio transkripsiya qilinmadi'}, status=status.HTTP_400_BAD_REQUEST)
        if transcription.startswith('Xatolik:'):
            return Response({'error': transcription}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            audio_file.seek(0)
        except Exception:
            pass

        # Foydalanuvchi xabarini saqlash
        user_message = AIMessage.objects.create(
            conversation=conversation,
            role='user',
            content=transcription,
            audio_file=audio_file,
            is_audio_message=True
        )

        pending_action = AIAction.objects.filter(
            conversation=conversation,
            status='PENDING'
        ).order_by('-created_at').first()
        normalized = transcription.strip().lower()
        yes_words = {'ha', 'xa', 'yes', 'ok', 'okay', 'mayli', 'tasdiq', 'tasdiqlayman', 'bajar', 'bajaring'}
        no_words = {'yoq', "yo'q", 'no', 'bekor', 'cancel', 'rad', 'rad et', 'kerak emas'}

        if pending_action and (normalized in yes_words or normalized in no_words):
            if normalized in no_words:
                pending_action.status = 'CANCELLED'
                pending_action.save()
                ai_message = AIMessage.objects.create(
                    conversation=conversation,
                    role='assistant',
                    content='Bekor qilindi. Agar boshqa topshiriq bo‘lsa, yozing.'
                )
            else:
                result = ai_service.execute_action(pending_action)
                pending_action.status = 'COMPLETED' if result.get('success') else 'FAILED'
                pending_action.result = result
                pending_action.executed_at = timezone.now()
                pending_action.save()

                if result.get('success'):
                    extra_lines = []
                    if result.get('report_id'):
                        extra_lines.append(f"[REPORT_ID:{result.get('report_id')}] ")
                    if result.get('summary'):
                        extra_lines.append(f"\n{result.get('summary')}")
                    extra_text = f"\n\n" + "\n".join(extra_lines) if extra_lines else ""
                    ai_message = AIMessage.objects.create(
                        conversation=conversation,
                        role='assistant',
                        content=f"✅ {result.get('message', 'Bajarildi')}" + extra_text
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
                'transcription': transcription,
                'user_message': AIMessageSerializer(user_message, context={'request': request}).data,
                'ai_message': AIMessageSerializer(ai_message, context={'request': request}).data,
                'detected_intent': {'intent': 'CONFIRM_ACTION'}
            })

        # Suhbat tarixini olish
        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in conversation.messages.order_by('created_at')
        ]

        # Intent aniqlash (audio uchun AI fallback bilan)
        intent_result = ai_service.detect_intent(transcription, request.user, prefer_ai=True)

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

        ai_content = ""
        intent_name = intent_result.get('intent')
        intent_conf = float(intent_result.get('confidence', 0) or 0)
        params = intent_result.get('parameters', {})

        should_create_action = (
            intent_name not in ['UNKNOWN', 'STATUS_CHECK']
            and intent_name not in query_intents
            and intent_conf > 0.7
        )

        if should_create_action:
            action = AIAction.objects.create(
                conversation=conversation,
                action_type=intent_name,
                parameters=params,
                initiated_by=request.user,
                status='PENDING'
            )

            auto_execute = (
                intent_name in {'CREATE_TASK', 'CREATE_RECURRING_TASK'}
                and request.user.role in {'HOKIM', 'HOKIMLIK_MASUL', 'HOKIM_YORDAMCHISI', 'ADMIN'}
                and intent_conf >= 0.75
            )

            if auto_execute:
                action.status = 'IN_PROGRESS'
                action.save()

                result = ai_service.execute_action(action)
                action.status = 'COMPLETED' if result.get('success') else 'FAILED'
                action.result = result
                action.executed_at = timezone.now()
                action.save()

                if result.get('success'):
                    extra_lines = []
                    if result.get('report_id'):
                        extra_lines.append(f"[REPORT_ID:{result.get('report_id')}] ")
                    if result.get('summary'):
                        extra_lines.append(f"\n{result.get('summary')}")
                    extra_text = f"\n\n" + "\n".join(extra_lines) if extra_lines else ""
                    ai_content = f"✅ {result.get('message', 'Bajarildi')}" + extra_text
                else:
                    ai_content = f"❌ Xatolik: {result.get('error', 'Noma\'lum xatolik')}"
            else:
                preview_lines = []
                if intent_name == 'CREATE_TASK':
                    if params.get('title'):
                        preview_lines.append(f"Topshiriq nomi: {params.get('title')}")
                    if params.get('description'):
                        preview_lines.append(f"Topshiriq tavsifi: {params.get('description')}")
                    if params.get('deadline_days'):
                        preview_lines.append(f"Muddat: {params.get('deadline_days')} kun")
                    org_names = params.get('organization_names') or []
                    if org_names:
                        preview_lines.append(f"Tayinlanadigan tashkilotlar: {', '.join(org_names)}")
                    if params.get('assign_all'):
                        preview_lines.append("Tayinlash: barchaga")
                elif intent_name == 'CREATE_RECURRING_TASK':
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
                    if params.get('assign_all'):
                        preview_lines.append("Tayinlash: barchaga")
                elif intent_name == 'EXPORT_ANALYTICS':
                    preview_lines.append(f"Format: {params.get('format', 'xlsx')}")

                preview_text = "\n".join(preview_lines)
                ai_content = (
                    "Buyruq bajarilishi uchun tasdiq kerak. "
                    "Tasdiqlash uchun 'ha', bekor qilish uchun 'yo‘q' deb yozing."
                )
                if preview_text:
                    ai_content += f"\n\n{preview_text}"
                ai_content += f"\n\n⚡ {intent_name} buyrug'ini bajarishni xohlaysizmi?"
        else:
            if intent_name in query_intents:
                ai_content = ai_service.handle_query(
                    intent_name,
                    params,
                    request.user,
                )
            else:
                ai_content = ai_service.chat(messages, request.user)

        ai_message = AIMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content=ai_content,
            detected_intent=intent_name,
            intent_confidence=intent_conf
        )

        conversation.updated_at = timezone.now()
        conversation.save()

        return Response({
            'transcription': transcription,
            'user_message': AIMessageSerializer(user_message, context={'request': request}).data,
            'ai_message': AIMessageSerializer(ai_message, context={'request': request}).data,
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
            extra_lines = []
            if result.get('report_id'):
                extra_lines.append(f"[REPORT_ID:{result.get('report_id')}] ")
            if result.get('summary'):
                extra_lines.append(f"\n{result.get('summary')}")
            extra_text = f"\n\n" + "\n".join(extra_lines) if extra_lines else ""
            AIMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=f"✅ {result.get('message', 'Bajarildi')}" + extra_text
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

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Hisobotni PDF shaklida yuklab olish - Professional dizayn"""
        report = self.get_object()

        from io import BytesIO
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm, mm
        from reportlab.lib.utils import simpleSplit
        from reportlab.lib.colors import HexColor, white, black
        from reportlab.pdfgen import canvas
        from reportlab.graphics.shapes import Drawing, Rect, String, Line
        from reportlab.graphics import renderPDF
        import json

        # Hisobot turiga qarab rang sxemasi
        REPORT_THEMES = {
            'DAILY_SUMMARY': {
                'primary': '#0284c7',    # Sky blue
                'secondary': '#0891b2',  # Cyan
                'accent': '#06b6d4',     # Teal
                'icon': '📅',
                'title': 'Kunlik Hisobot'
            },
            'WEEKLY_SUMMARY': {
                'primary': '#1a56db',    # Blue
                'secondary': '#047857',  # Green
                'accent': '#7c3aed',     # Purple
                'icon': '📊',
                'title': 'Haftalik Hisobot'
            },
            'MONTHLY_SUMMARY': {
                'primary': '#7c3aed',    # Purple
                'secondary': '#6366f1',  # Indigo
                'accent': '#8b5cf6',     # Violet
                'icon': '📈',
                'title': 'Oylik Hisobot'
            },
            'TASK_ANALYSIS': {
                'primary': '#059669',    # Emerald
                'secondary': '#10b981',  # Green
                'accent': '#14b8a6',     # Teal
                'icon': '📋',
                'title': 'Topshiriqlar Tahlili'
            },
            'CUSTOM': {
                'primary': '#dc2626',    # Red
                'secondary': '#ea580c',  # Orange
                'accent': '#f59e0b',     # Amber
                'icon': '📑',
                'title': 'Maxsus Hisobot'
            }
        }

        theme = REPORT_THEMES.get(report.report_type, REPORT_THEMES['WEEKLY_SUMMARY'])
        
        PRIMARY_COLOR = HexColor(theme['primary'])
        SECONDARY_COLOR = HexColor(theme['secondary'])
        ACCENT_COLOR = HexColor(theme['accent'])
        WARNING_COLOR = HexColor('#dc2626')
        BG_LIGHT = HexColor('#f8fafc')
        BG_CARD = HexColor('#ffffff')
        TEXT_PRIMARY = HexColor('#1e293b')
        TEXT_SECONDARY = HexColor('#64748b')
        BORDER_COLOR = HexColor('#e2e8f0')

        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        margin = 2 * cm
        content_width = width - 2 * margin

        def draw_header():
            """Sahifa yuqorisidagi sarlavha"""
            # Gradient effect - asosiy rang
            c.setFillColor(PRIMARY_COLOR)
            c.rect(0, height - 3.5 * cm, width, 3.5 * cm, fill=1, stroke=0)
            
            # Dekorativ chiziq
            c.setFillColor(ACCENT_COLOR)
            c.rect(0, height - 3.7 * cm, width, 0.2 * cm, fill=1, stroke=0)

            # Title
            c.setFillColor(white)
            c.setFont("Helvetica-Bold", 20)
            c.drawString(margin, height - 2 * cm, "E-HOKIMIYAT HATIRCHI")
            c.setFont("Helvetica", 11)
            c.drawString(margin, height - 2.7 * cm, f"{theme['icon']} {report.get_report_type_display()}")

            # Sana va vaqt
            c.setFont("Helvetica-Bold", 12)
            c.drawRightString(width - margin, height - 1.8 * cm, report.created_at.strftime('%Y-%m-%d'))
            c.setFont("Helvetica", 10)
            c.drawRightString(width - margin, height - 2.5 * cm, f"Vaqt: {report.created_at.strftime('%H:%M')}")

        def draw_footer(page_num):
            """Sahifa pastidagi footer"""
            c.setFillColor(BORDER_COLOR)
            c.rect(0, 0, width, 1.5 * cm, fill=1, stroke=0)
            c.setFillColor(PRIMARY_COLOR)
            c.rect(0, 1.5 * cm - 0.1 * cm, width, 0.1 * cm, fill=1, stroke=0)
            c.setFillColor(TEXT_SECONDARY)
            c.setFont("Helvetica", 8)
            c.drawString(margin, 0.6 * cm, f"© 2026 E-Hokimiyat Hatirchi | {report.get_report_type_display()}")
            c.drawRightString(width - margin, 0.6 * cm, f"Sahifa {page_num}")

        def new_page(page_num):
            nonlocal y
            c.showPage()
            draw_header()
            draw_footer(page_num)
            y = height - 5 * cm
            return page_num + 1

        def draw_section_title(text, icon="📊"):
            nonlocal y
            if y < 4 * cm:
                nonlocal page_num
                page_num = new_page(page_num)
            
            # Section background with left border
            c.setFillColor(BG_LIGHT)
            c.roundRect(margin - 0.3*cm, y - 0.5*cm, content_width + 0.6*cm, 1.2*cm, 5, fill=1, stroke=0)
            
            # Left color bar
            c.setFillColor(PRIMARY_COLOR)
            c.rect(margin - 0.3*cm, y - 0.5*cm, 0.15*cm, 1.2*cm, fill=1, stroke=0)
            
            c.setFillColor(PRIMARY_COLOR)
            c.setFont("Helvetica-Bold", 13)
            c.drawString(margin + 0.2*cm, y, f"{icon} {text}")
            y -= 1.8 * cm

        def draw_text(text, font_name="Helvetica", font_size=10, leading=14, indent=0, color=TEXT_PRIMARY):
            nonlocal y, page_num
            c.setFillColor(color)
            c.setFont(font_name, font_size)
            lines = simpleSplit(text, font_name, font_size, content_width - indent)
            for line in lines:
                if y < 2.5 * cm:
                    page_num = new_page(page_num)
                    c.setFillColor(color)
                    c.setFont(font_name, font_size)
                c.drawString(margin + indent, y, line)
                y -= leading

        def draw_stat_card(label, value, x_pos, card_width, color, show_icon=None):
            """Statistika kartochkasi"""
            nonlocal y
            card_height = 2.4 * cm
            
            # Card shadow effect
            c.setFillColor(HexColor('#e5e7eb'))
            c.roundRect(x_pos + 2, y - card_height - 2, card_width, card_height, 8, fill=1, stroke=0)
            
            # Card background
            c.setFillColor(BG_CARD)
            c.roundRect(x_pos, y - card_height, card_width, card_height, 8, fill=1, stroke=0)
            
            # Top color bar
            c.setFillColor(color)
            c.roundRect(x_pos, y - 0.4*cm, card_width, 0.4*cm, 4, fill=1, stroke=0)
            c.rect(x_pos, y - 0.4*cm, card_width, 0.2*cm, fill=1, stroke=0)
            
            # Icon (if provided)
            if show_icon:
                c.setFont("Helvetica", 12)
                c.drawCentredString(x_pos + card_width/2, y - 0.8*cm, show_icon)
            
            # Value
            c.setFillColor(TEXT_PRIMARY)
            c.setFont("Helvetica-Bold", 26)
            value_y = y - 1.4*cm if show_icon else y - 1.3*cm
            c.drawCentredString(x_pos + card_width/2, value_y, str(value))
            
            # Label
            c.setFillColor(TEXT_SECONDARY)
            c.setFont("Helvetica", 9)
            c.drawCentredString(x_pos + card_width/2, y - 2.1*cm, label)

        def draw_bar_chart(title, data, bar_colors):
            """Professional bar chart"""
            nonlocal y, page_num
            if not data:
                return
            
            if y < 6 * cm:
                page_num = new_page(page_num)

            chart_height = 0.8*cm + len(data) * 1.2*cm
            
            # Chart container
            c.setFillColor(BG_CARD)
            c.setStrokeColor(BORDER_COLOR)
            c.roundRect(margin, y - chart_height - 0.5*cm, content_width, chart_height + 1*cm, 6, fill=1, stroke=1)
            
            # Title
            c.setFillColor(TEXT_PRIMARY)
            c.setFont("Helvetica-Bold", 11)
            c.drawString(margin + 0.5*cm, y - 0.1*cm, title)
            
            chart_y = y - 1.2*cm
            max_value = max(data.values()) if data.values() else 1
            bar_width = content_width - 5*cm
            
            color_idx = 0
            for label, value in data.items():
                # Label
                c.setFillColor(TEXT_PRIMARY)
                c.setFont("Helvetica", 10)
                display_label = str(label)[:20]
                c.drawString(margin + 0.5*cm, chart_y, display_label)
                
                # Bar background
                bar_x = margin + 4*cm
                c.setFillColor(HexColor('#f1f5f9'))
                c.roundRect(bar_x, chart_y - 0.15*cm, bar_width, 0.6*cm, 3, fill=1, stroke=0)
                
                # Bar fill
                fill_width = max((value / max_value) * bar_width, 0.5*cm) if max_value > 0 else 0.5*cm
                color = bar_colors[color_idx % len(bar_colors)]
                c.setFillColor(color)
                c.roundRect(bar_x, chart_y - 0.15*cm, fill_width, 0.6*cm, 3, fill=1, stroke=0)
                
                # Value
                c.setFillColor(TEXT_PRIMARY)
                c.setFont("Helvetica-Bold", 10)
                c.drawString(bar_x + fill_width + 0.3*cm, chart_y, str(value))
                
                chart_y -= 1.2*cm
                color_idx += 1
            
            y -= chart_height + 1.5*cm

        def draw_table(headers, rows, col_widths):
            """Professional jadval"""
            nonlocal y, page_num
            if not rows:
                return
            
            row_height = 0.8 * cm
            table_height = row_height * (len(rows) + 1)
            
            if y < 4 * cm:
                page_num = new_page(page_num)
            
            # Header row
            x = margin
            c.setFillColor(PRIMARY_COLOR)
            c.rect(margin, y - row_height, content_width, row_height, fill=1, stroke=0)
            
            c.setFillColor(white)
            c.setFont("Helvetica-Bold", 10)
            for i, header in enumerate(headers):
                c.drawString(x + 0.3*cm, y - 0.55*cm, header)
                x += col_widths[i]
            y -= row_height
            
            # Data rows
            for row_idx, row in enumerate(rows):
                if y < 2.5 * cm:
                    page_num = new_page(page_num)
                
                # Alternating row colors
                if row_idx % 2 == 0:
                    c.setFillColor(BG_LIGHT)
                else:
                    c.setFillColor(BG_CARD)
                c.rect(margin, y - row_height, content_width, row_height, fill=1, stroke=0)
                
                x = margin
                c.setFillColor(TEXT_PRIMARY)
                c.setFont("Helvetica", 9)
                for i, cell in enumerate(row):
                    cell_text = str(cell)[:int(col_widths[i]/6)]
                    c.drawString(x + 0.3*cm, y - 0.55*cm, cell_text)
                    x += col_widths[i]
                y -= row_height
            
            # Border
            c.setStrokeColor(BORDER_COLOR)
            c.rect(margin, y, content_width, table_height, fill=0, stroke=1)
            y -= 0.8*cm

        # ===== HISOBOT YARATISH =====
        page_num = 1
        draw_header()
        draw_footer(page_num)
        y = height - 5 * cm

        # Report title with decorative underline
        c.setFillColor(TEXT_PRIMARY)
        c.setFont("Helvetica-Bold", 20)
        title = report.title or theme['title']
        # Clean up title
        if title.startswith(report.report_type):
            title = theme['title']
        c.drawString(margin, y, title)
        y -= 0.5 * cm
        
        # Decorative line under title
        c.setStrokeColor(PRIMARY_COLOR)
        c.setLineWidth(2)
        c.line(margin, y, margin + 6*cm, y)
        y -= 0.8 * cm

        # Period info box
        c.setFillColor(BG_LIGHT)
        c.roundRect(margin, y - 1.2*cm, content_width, 1.4*cm, 5, fill=1, stroke=0)
        c.setStrokeColor(BORDER_COLOR)
        c.roundRect(margin, y - 1.2*cm, content_width, 1.4*cm, 5, fill=0, stroke=1)
        
        c.setFillColor(TEXT_SECONDARY)
        c.setFont("Helvetica", 11)
        info_y = y - 0.3 * cm
        if report.period_start and report.period_end:
            c.drawString(margin + 0.5*cm, info_y, f"Davr: {report.period_start} — {report.period_end}")
            period_days = (report.period_end - report.period_start).days + 1
            c.drawRightString(width - margin - 0.5*cm, info_y, f"{period_days} kun")
        info_y -= 0.5 * cm
        c.setFont("Helvetica", 10)
        c.drawString(margin + 0.5*cm, info_y, f"Hisobot turi: {report.get_report_type_display()}")
        if report.requested_by:
            c.drawRightString(width - margin - 0.5*cm, info_y, f"So'ragan: {report.requested_by.full_name or report.requested_by.username}")
        y -= 2.2 * cm

        # Data extraction
        content = report.content or {}
        tasks = content.get('tasks', {})
        appeals = content.get('appeals', {})
        by_status = tasks.get('by_status', {})
        by_priority = tasks.get('by_priority', {})
        appeal_status = appeals.get('by_status', {})

        # Calculate additional metrics
        total_tasks = tasks.get('total', 0)
        total_appeals = appeals.get('total', 0)
        completed = by_status.get('Bajarildi', 0) + by_status.get('Nazoratdan yechildi', 0)
        in_progress = by_status.get('Ijroda', 0)
        overdue = by_status.get("Muddati o'tgan", 0)
        resolved_appeals = appeal_status.get('Hal etilgan', 0)
        
        # Completion rate
        completion_rate = round((completed / total_tasks * 100) if total_tasks > 0 else 0)
        appeal_resolution_rate = round((resolved_appeals / total_appeals * 100) if total_appeals > 0 else 0)

        # ===== STATISTIKA KARTOCHKALARI =====
        draw_section_title("Asosiy Ko'rsatkichlar", "📈")
        
        card_width = (content_width - 1.5*cm) / 4
        cards_y = y
        
        # 4 ta kartochka
        draw_stat_card("Jami Topshiriqlar", total_tasks, margin, card_width, PRIMARY_COLOR)
        y = cards_y
        draw_stat_card("Bajarilgan", completed, margin + card_width + 0.5*cm, card_width, SECONDARY_COLOR)
        y = cards_y
        draw_stat_card("Jami Murojaatlar", total_appeals, margin + 2*card_width + 1*cm, card_width, ACCENT_COLOR)
        y = cards_y
        draw_stat_card("Samaradorlik", f"{completion_rate}%", margin + 3*card_width + 1.5*cm, card_width, HexColor('#f59e0b'))
        
        y -= 3.8 * cm

        # ===== QISQACHA XULOSA (har bir hisobot turi uchun) =====
        if report.report_type == 'DAILY_SUMMARY':
            draw_section_title("Kunlik Natijalar", "📅")
            summary_items = [
                f"Bugun {total_tasks} ta topshiriq mavjud",
                f"Shundan {completed} tasi bajarildi ({completion_rate}%)",
                f"Ijroda: {in_progress} ta topshiriq" if in_progress > 0 else None,
                f"Muddati o'tgan: {overdue} ta" if overdue > 0 else None,
                f"Murojaatlar: {total_appeals} ta, hal etilgan: {resolved_appeals} ta"
            ]
        elif report.report_type == 'WEEKLY_SUMMARY':
            draw_section_title("Haftalik Natijalar", "📊")
            summary_items = [
                f"Hafta davomida {total_tasks} ta topshiriq qayd etildi",
                f"Bajarildi: {completed} ta ({completion_rate}% samaradorlik)",
                f"Ijroda: {in_progress} ta topshiriq" if in_progress > 0 else None,
                f"Muddati o'tgan: {overdue} ta - diqqat talab etadi!" if overdue > 0 else None,
                f"Murojaatlar soni: {total_appeals} ta",
                f"Murojaatlar hal etildi: {resolved_appeals} ta ({appeal_resolution_rate}%)"
            ]
        elif report.report_type == 'MONTHLY_SUMMARY':
            draw_section_title("Oylik Natijalar", "📈")
            summary_items = [
                f"Oy davomida {total_tasks} ta topshiriq bilan ishlandi",
                f"Muvaffaqiyatli bajarildi: {completed} ta",
                f"Samaradorlik darajasi: {completion_rate}%",
                f"Murojaatlar: {total_appeals} ta qabul qilindi",
                f"Hal etilgan murojaatlar: {resolved_appeals} ta ({appeal_resolution_rate}%)",
                f"Diqqat! {overdue} ta topshiriq muddati o'tgan" if overdue > 0 else "Barcha topshiriqlar muddatida bajarilmoqda"
            ]
        elif report.report_type == 'TASK_ANALYSIS':
            draw_section_title("Topshiriqlar Tahlili", "📋")
            high_priority = by_priority.get('Yuqori', 0) + by_priority.get('Favqulodda', 0)
            summary_items = [
                f"Jami topshiriqlar: {total_tasks} ta",
                f"Yuqori muhimlikdagi topshiriqlar: {high_priority} ta",
                f"Bajarilganlar: {completed} ta ({completion_rate}%)",
                f"Jarayonda: {in_progress} ta",
                f"Muddati o'tgan: {overdue} ta" if overdue > 0 else "Muddati o'tgan topshiriqlar yo'q"
            ]
        else:
            draw_section_title("Hisobot Ma'lumotlari", "📑")
            summary_items = [
                f"Topshiriqlar soni: {total_tasks} ta",
                f"Bajarilganlar: {completed} ta",
                f"Murojaatlar: {total_appeals} ta"
            ]
        
        for item in summary_items:
            if item:
                bullet_color = WARNING_COLOR if "o'tgan" in item.lower() or "diqqat" in item.lower() else TEXT_PRIMARY
                draw_text(f"• {item}", font_size=10, leading=16, indent=0.3*cm, color=bullet_color)
        y -= 0.8*cm

        # ===== TOPSHIRIQLAR BO'LIMI =====
        draw_section_title("Topshiriqlar Statistikasi", "📋")
        
        if by_status:
            draw_bar_chart(
                "Holat bo'yicha taqsimot",
                by_status,
                [HexColor('#22c55e'), HexColor('#3b82f6'), HexColor('#f59e0b'), HexColor('#ef4444'), HexColor('#8b5cf6'), HexColor('#6b7280')]
            )
        
        if by_priority:
            draw_bar_chart(
                "Muhimlik darajasi",
                by_priority,
                [HexColor('#dc2626'), HexColor('#f59e0b'), HexColor('#22c55e'), HexColor('#6b7280')]
            )

        # ===== TASHKILOTLAR BO'LIMI =====
        organizations = content.get('organizations', {})
        top_orgs = organizations.get('top_performers', [])
        if top_orgs:
            draw_section_title("Tashkilotlar Faoliyati", "🏢")
            org_data = {org['name'][:25]: org['count'] for org in top_orgs[:5]}
            if org_data:
                draw_bar_chart(
                    "Eng faol tashkilotlar (topshiriqlar soni)",
                    org_data,
                    [HexColor('#0ea5e9'), HexColor('#14b8a6'), HexColor('#8b5cf6'), HexColor('#f43f5e'), HexColor('#eab308')]
                )

        # ===== TREND TAHLILI =====
        trends = content.get('trends', {})
        daily_trend = trends.get('daily', [])
        if daily_trend and len(daily_trend) > 1:
            draw_section_title("Haftalik Trend", "📈")
            trend_data = {item['date']: item['count'] for item in daily_trend}
            if trend_data:
                draw_bar_chart(
                    "Kunlar bo'yicha topshiriqlar dinamikasi",
                    trend_data,
                    [HexColor('#6366f1'), HexColor('#8b5cf6'), HexColor('#a855f7'), HexColor('#c084fc'), HexColor('#d8b4fe'), HexColor('#e9d5ff'), HexColor('#f3e8ff')]
                )

        # ===== TAQQOSLASH BO'LIMI =====
        comparison = content.get('comparison', {})
        task_change = comparison.get('task_change', 0)
        appeal_change = comparison.get('appeal_change', 0)
        
        if task_change != 0 or appeal_change != 0:
            draw_section_title("Oldingi Davr Bilan Taqqoslash", "📊")
            
            # Comparison cards - 2 ta kartochka yonma-yon
            comp_card_width = (content_width - 0.5*cm) / 2
            comp_cards_y = y
            
            # Task change card
            task_change_color = SECONDARY_COLOR if task_change >= 0 else WARNING_COLOR
            task_arrow = "↑" if task_change >= 0 else "↓"
            c.setFillColor(BG_CARD)
            c.roundRect(margin, y - 2*cm, comp_card_width, 2*cm, 5, fill=1, stroke=0)
            c.setStrokeColor(task_change_color)
            c.setLineWidth(2)
            c.roundRect(margin, y - 2*cm, comp_card_width, 2*cm, 5, fill=0, stroke=1)
            c.setFillColor(task_change_color)
            c.setFont("Helvetica-Bold", 18)
            c.drawCentredString(margin + comp_card_width/2, y - 0.9*cm, f"{task_arrow} {abs(task_change)}%")
            c.setFillColor(TEXT_SECONDARY)
            c.setFont("Helvetica", 9)
            c.drawCentredString(margin + comp_card_width/2, y - 1.6*cm, "Topshiriqlar o'zgarishi")
            
            # Appeal change card
            y = comp_cards_y
            appeal_change_color = SECONDARY_COLOR if appeal_change <= 0 else HexColor('#f59e0b')
            appeal_arrow = "↓" if appeal_change <= 0 else "↑"
            c.setFillColor(BG_CARD)
            c.roundRect(margin + comp_card_width + 0.5*cm, y - 2*cm, comp_card_width, 2*cm, 5, fill=1, stroke=0)
            c.setStrokeColor(appeal_change_color)
            c.setLineWidth(2)
            c.roundRect(margin + comp_card_width + 0.5*cm, y - 2*cm, comp_card_width, 2*cm, 5, fill=0, stroke=1)
            c.setFillColor(appeal_change_color)
            c.setFont("Helvetica-Bold", 18)
            c.drawCentredString(margin + comp_card_width*1.5 + 0.5*cm, y - 0.9*cm, f"{appeal_arrow} {abs(appeal_change)}%")
            c.setFillColor(TEXT_SECONDARY)
            c.setFont("Helvetica", 9)
            c.drawCentredString(margin + comp_card_width*1.5 + 0.5*cm, y - 1.6*cm, "Murojaatlar o'zgarishi")
            
            y -= 2.8*cm

        # ===== MUROJAATLAR BO'LIMI =====
        if total_appeals > 0:
            draw_section_title("Murojaatlar Statistikasi", "📩")
            
            if appeal_status:
                draw_bar_chart(
                    "Murojaatlar holati",
                    appeal_status,
                    [HexColor('#22c55e'), HexColor('#ef4444'), HexColor('#3b82f6'), HexColor('#f59e0b')]
                )

        # ===== TAVSIYALAR =====
        draw_section_title("Tavsiyalar va Izohlar", "💡")
        
        recommendations = []
        
        # Samaradorlik tahlili
        if completion_rate >= 90:
            recommendations.append(("✅", f"Ajoyib natija! {completion_rate}% samaradorlik darajasi", SECONDARY_COLOR))
        elif completion_rate >= 70:
            recommendations.append(("👍", f"Yaxshi natija - {completion_rate}% samaradorlik", PRIMARY_COLOR))
        elif completion_rate >= 50:
            recommendations.append(("⚠️", f"O'rtacha natija - {completion_rate}% samaradorlik, yaxshilash imkoni bor", HexColor('#f59e0b')))
        else:
            recommendations.append(("🔴", f"Samaradorlik past - {completion_rate}%, jarayonlarni optimallashtirish tavsiya etiladi", WARNING_COLOR))
        
        # Muddati o'tgan topshiriqlar
        if overdue > 0:
            recommendations.append(("⏰", f"Muddati o'tgan {overdue} ta topshiriqqa zudlik bilan e'tibor qarating", WARNING_COLOR))
        else:
            recommendations.append(("✅", "Barcha topshiriqlar muddatida bajarilmoqda", SECONDARY_COLOR))
        
        # Murojaatlar tahlili
        if total_appeals > 0:
            if appeal_resolution_rate >= 80:
                recommendations.append(("👍", f"Murojaatlar {appeal_resolution_rate}% hal etilgan - yaxshi natija", SECONDARY_COLOR))
            elif resolved_appeals < total_appeals:
                pending = total_appeals - resolved_appeals
                recommendations.append(("📩", f"{pending} ta murojaat hal etilishini kutmoqda", HexColor('#f59e0b')))
        
        # O'sish/pasayish tahlili
        if task_change > 20:
            recommendations.append(("📈", f"Topshiriqlar soni {task_change}% oshdi - yuklanish ortdi", HexColor('#f59e0b')))
        elif task_change < -20:
            recommendations.append(("📉", f"Topshiriqlar soni {abs(task_change)}% kamaydi", PRIMARY_COLOR))
        
        # Yuqori muhimlik
        high_priority = by_priority.get('Yuqori', 0) + by_priority.get('Favqulodda', 0)
        if high_priority > 0:
            recommendations.append(("🔥", f"{high_priority} ta yuqori muhimlikdagi topshiriq mavjud", HexColor('#f59e0b')))
        
        if not recommendations:
            recommendations.append(("✅", "Barcha ko'rsatkichlar me'yorda", SECONDARY_COLOR))
        
        for icon, text, color in recommendations:
            c.setFillColor(color)
            c.setFont("Helvetica", 10)
            if y < 2.5 * cm:
                page_num = new_page(page_num)
            c.drawString(margin + 0.3*cm, y, f"{icon} {text}")
            y -= 0.5*cm
        
        y -= 0.5*cm

        # ===== RASMIY XULOSA =====
        if report.summary:
            draw_section_title("Rasmiy Xulosa", "📝")
            for line in report.summary.split("\n"):
                if line.strip():
                    draw_text(line.strip(), font_size=10, leading=15, color=TEXT_PRIMARY)
            y -= 0.5*cm

        c.save()

        pdf = buffer.getvalue()
        buffer.close()

        response = HttpResponse(pdf, content_type='application/pdf')
        filename = f"hisobot-{report.created_at.strftime('%Y-%m-%d')}.pdf"
        response['Content-Disposition'] = f"attachment; filename=\"{filename}\""
        return response
    
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
    response_text = ai_service.chat([
        {"role": "user", "content": message}
    ], request.user)

    return Response({"response": response_text})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_status(request):
    """AI assistent uchun umumiy statistik ma'lumotlar"""
    from tasks.models import Task
    from telegram_bot.models import TelegramAppeal
    from organizations.models import Organization

    today = timezone.now().date()

    stats = {
        'tasks': {
            'active': Task.objects.filter(status__in=['YANGI', 'IJRODA']).count(),
            'overdue': Task.objects.filter(status='MUDDATI_KECH').count(),
            'completed_today': Task.objects.filter(
                status__in=['BAJARILDI', 'NAZORATDAN_YECHILDI'],
                updated_at__date=today
            ).count(),
        },
        'appeals': {
            'pending': TelegramAppeal.objects.filter(status__in=['pending_ai', 'pending_review']).count(),
            'resolved_today': TelegramAppeal.objects.filter(status='resolved', updated_at__date=today).count(),
        },
        'ai': {
            'conversations_today': AIConversation.objects.filter(created_at__date=today).count(),
            'actions_today': AIAction.objects.filter(created_at__date=today).count(),
            'reports_today': AIReport.objects.filter(created_at__date=today).count(),
        },
        'organizations': {
            'total': Organization.objects.count(),
            'active': Organization.objects.filter(is_active=True).count(),
        },
    }

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
