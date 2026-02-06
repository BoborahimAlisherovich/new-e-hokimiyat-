"""
Task views for E-Hokimiyat API.

Bu modul topshiriqlar (tasks) bilan ishlash uchun API endpointlarni
o'z ichiga oladi.

Endpointlar:
    - GET/POST /api/tasks/ - Topshiriqlar ro'yxati va yaratish
    - GET/PUT/DELETE /api/tasks/{id}/ - Topshiriq detallari
    - POST /api/tasks/{id}/accept/ - Topshiriqni qabul qilish
    - POST /api/tasks/{id}/report/ - Hisobot topshirish
    - POST /api/tasks/{id}/close/ - Topshiriqni yopish
    - POST /api/tasks/{id}/reassign/ - Qayta ijroga yuborish
    - GET/POST /api/tasks/{id}/timeline/ - Timeline xabarlari
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional, Type

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Case, IntegerField, Q, Value, When
from django.db.models.query import QuerySet
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import Serializer

from audit.models import AuditLog
from core.constants import FileType, Messages, TaskStatus, UserRole
from core.permissions import CanCloseTask, CanCreateTasks, CanExecuteTasks
from core.ai_service import AIService
from notifications.models import Notification

from .models import (
    DeadlineExtensionRequest,
    Task,
    TaskAttachment,
    TaskExecution,
    TaskMessage,
    TaskOrganization,
)
from .serializers import (
    DeadlineExtensionRequestSerializer,
    ExtensionRequestCreateSerializer,
    ExtensionReviewSerializer,
    TaskAcceptSerializer,
    TaskAttachmentSerializer,
    TaskCreateSerializer,
    TaskDetailSerializer,
    TaskMessageSerializer,
    TaskMinimalSerializer,
    TaskOrganizationSerializer,
    TaskReportSerializer,
    TaskSerializer,
    TaskTimelineSerializer,
)

if TYPE_CHECKING:
    from django.core.files.uploadedfile import UploadedFile


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _guess_message_type(file_obj: 'UploadedFile') -> str:
    """Fayl turidan xabar turini aniqlash.
    
    Args:
        file_obj: Django yuklangan fayl obyekti
        
    Returns:
        Xabar turi (AUDIO, FILE)
    """
    content_type = getattr(file_obj, 'content_type', '') or ''
    name = getattr(file_obj, 'name', '') or ''
    
    if content_type.startswith('audio/') or name.lower().endswith(FileType.AUDIO_EXTENSIONS):
        return 'AUDIO'
    return 'FILE'


def _guess_attachment_type(file_obj: 'UploadedFile') -> str:
    """Fayl turidan attachment turini aniqlash.
    
    Args:
        file_obj: Django yuklangan fayl obyekti
        
    Returns:
        Attachment turi (IMAGE, VIDEO, AUDIO, DOCUMENT, OTHER)
    """
    content_type = getattr(file_obj, 'content_type', '') or ''
    name = getattr(file_obj, 'name', '') or ''
    
    return FileType.get_type_from_content_type(content_type, name)


class TaskViewSet(viewsets.ModelViewSet):
    """Topshiriqlar bilan ishlash uchun ViewSet.
    
    Bu ViewSet quyidagi amallarni qo'llab-quvvatlaydi:
        - list: Topshiriqlar ro'yxatini olish
        - create: Yangi topshiriq yaratish
        - retrieve: Topshiriq tafsilotlarini olish
        - update/partial_update: Topshiriqni yangilash
        - destroy: Topshiriqni o'chirish
        
    Qo'shimcha action'lar:
        - accept: Topshiriqni qabul qilish
        - report: Hisobot topshirish
        - close: Topshiriqni yopish
        - reassign: Qayta ijroga yuborish
        - timeline: Xabarlar va amallar tarixi
        - extend_request: Muddat uzaytirish so'rovi
    
    Attributes:
        queryset: Barcha topshiriqlar
        permission_classes: Faqat autentifikatsiya qilingan foydalanuvchilar
        parser_classes: JSON, multipart va form data qabul qilish
    """
    
    queryset = Task.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'category']
    search_fields = ['title', 'description']
    ordering_fields = ['deadline', 'created_at', 'priority', 'status']
    ordering = ['status', 'deadline', '-created_at']

    @action(detail=False, methods=['get'])
    def stats(self, request: Request) -> Response:
        """Topshiriqlar statistikasi (filtrlar bilan)."""
        user = request.user
        queryset = self.filter_queryset(self.get_queryset())

        total = queryset.count()
        
        # Tashkilot xodimlari uchun TaskOrganization statusini hisoblash
        if user.role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'] and user.organization:
            from tasks.models import TaskOrganization
            task_ids = queryset.values_list('id', flat=True)
            task_orgs = TaskOrganization.objects.filter(
                task_id__in=task_ids,
                organization=user.organization
            )
            pending = task_orgs.filter(status='YANGI').count()
            in_progress = task_orgs.filter(status='IJRODA').count()
            completed = task_orgs.filter(status='BAJARILDI').count()
            overdue = task_orgs.filter(status='MUDDATI_KECH').count()
        else:
            # Admin rollar uchun umumiy Task statusini hisoblash
            pending = queryset.filter(status='YANGI').count()
            in_progress = queryset.filter(status='IJRODA').count()
            completed = queryset.filter(status__in=['BAJARILDI', 'NAZORATDAN_YECHILDI']).count()
            overdue = queryset.filter(status='MUDDATI_KECH').count()
        
        active_sectors = queryset.exclude(category='').values('category').distinct().count()

        return Response({
            'total': total,
            'pending': pending,
            'in_progress': in_progress,
            'completed': completed,
            'overdue': overdue,
            'active_sectors': active_sectors,
        })
    
    def get_serializer_class(self) -> Type[Serializer]:
        """So'rov turiga qarab serializer tanlash.
        
        Returns:
            Tegishli Serializer class
        """
        serializer_map = {
            'create': TaskCreateSerializer,
            'retrieve': TaskDetailSerializer,
            'list': TaskMinimalSerializer,
        }
        return serializer_map.get(self.action, TaskSerializer)
    
    def get_permissions(self) -> List:
        """Action turiga qarab permission'larni tanlash.
        
        Returns:
            Permission class'lar ro'yxati
        """
        if self.action == 'create':
            return [IsAuthenticated(), CanCreateTasks()]
        # Topshiriqni tahrirlash faqat yaratuvchilar uchun
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanCreateTasks()]
        return [IsAuthenticated()]
    
    def update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Topshiriqni yangilash.
        
        Faqat HOKIM, HOKIMLIK_MASUL va ADMIN tahrirlashi mumkin.
        """
        user = request.user
        if user.role not in ['HOKIM', 'HOKIMLIK_MASUL', 'ADMIN']:
            return Response(
                {'detail': "Topshiriqni tahrirlash huquqingiz yo'q"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Topshiriqni qisman yangilash.
        
        Faqat HOKIM, HOKIMLIK_MASUL va ADMIN tahrirlashi mumkin.
        """
        user = request.user
        if user.role not in ['HOKIM', 'HOKIMLIK_MASUL', 'ADMIN']:
            return Response(
                {'detail': "Topshiriqni tahrirlash huquqingiz yo'q"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Topshiriqni o'chirish.
        
        Faqat HOKIM va ADMIN o'chirishi mumkin.
        """
        user = request.user
        if user.role not in ['HOKIM', 'ADMIN']:
            return Response(
                {'detail': "Topshiriqni o'chirish huquqingiz yo'q"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
    
    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Yangi topshiriq yaratish.
        
        Args:
            request: HTTP so'rov
            
        Returns:
            Yaratilgan topshiriq ma'lumotlari
        """
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def get_queryset(self) -> QuerySet[Task]:
        """Foydalanuvchi roliga qarab topshiriqlarni filtrlash.
        
        Bajarilgan topshiriqlar ro'yxat oxirida ko'rsatiladi.
        
        Returns:
            Filtrlangan topshiriqlar queryset'i
        """
        user = self.request.user
        queryset = Task.objects.select_related('created_by', 'closed_by').prefetch_related(
            'assigned_organizations__organization'
        )
        
        # Faol topshiriqlar birinchi (0), bajarilganlar oxirda (1)
        queryset = queryset.annotate(
            status_order=Case(
                When(status__in=TaskStatus.CLOSED_STATUSES, then=Value(1)),
                default=Value(0),
                output_field=IntegerField()
            )
        ).order_by('status_order', 'deadline', '-created_at')
        
        # Hokim va Hokimlik mas'uli barcha topshiriqlarni ko'radi
        if user.role in UserRole.ADMIN_ROLES:
            return queryset
        
        # Tashkilot xodimlari faqat o'z tashkilotiga berilgan topshiriqlarni ko'radi
        if user.role in UserRole.ORGANIZATION_ROLES:
            if user.organization:
                return queryset.filter(
                    assigned_organizations__organization=user.organization
                ).distinct()
            return queryset.none()
        
        return queryset.none()
    
    def perform_create(self, serializer):
        """Create task and log the action."""
        task = serializer.save()
        
        AuditLog.log(
            user=self.request.user,
            action='TASK_CREATED',
            entity_type='TASK',
            entity_id=task.id,
            description=f"{self.request.user.full_name} yangi topshiriq yaratdi: {task.title}",
            new_values={
                'title': task.title,
                'priority': task.priority,
                'deadline': str(task.deadline),
                'organizations': list(task.assigned_organizations.values_list('organization__name', flat=True))
            },
            ip_address=getattr(self.request, 'client_ip', None)
        )
        
        # Create notifications for assigned organizations
        for task_org in task.assigned_organizations.all():
            for user in task_org.organization.employees.filter(
                status='FAOL',
                role__in=['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']
            ):
                Notification.objects.create(
                    user=user,
                    title='Yangi topshiriq',
                    message=f"Sizning tashkilotingizga yangi topshiriq berildi: {task.title}",
                    notification_type='TASK',
                    related_task=task,
                    link=f'/dashboard/tasks/{task.id}'
                )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanExecuteTasks])
    def accept(self, request, pk=None):
        """
        Accept task for execution.
        
        POST /api/tasks/{id}/accept/
        """
        task = self.get_object()
        user = request.user
        
        # Find task organization for user's organization
        try:
            task_org = task.assigned_organizations.get(organization=user.organization)
        except TaskOrganization.DoesNotExist:
            return Response(
                {'detail': "Bu topshiriq sizning tashkilotingizga berilmagan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if task_org.status not in ['YANGI', 'QAYTA_IJROGA_YUBORILDI']:
            return Response(
                {'detail': "Bu topshiriqni qabul qilib bo'lmaydi"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TaskAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_status = task_org.status
        task_org.accept(user)
        
        # Create execution record
        TaskExecution.objects.create(
            task=task,
            task_organization=task_org,
            executed_by=user,
            action_type='IJROGA_OLINDI',
            comment=serializer.validated_data.get('comment', ''),
            old_status=old_status,
            new_status=task_org.status
        )
        
        AuditLog.log(
            user=user,
            action='TASK_ACCEPTED',
            entity_type='TASK',
            entity_id=task.id,
            description=f"{user.full_name} topshiriqni qabul qildi: {task.title}",
            old_values={'status': old_status},
            new_values={'status': task_org.status},
            ip_address=getattr(request, 'client_ip', None)
        )
        
        return Response(TaskDetailSerializer(task).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanExecuteTasks])
    def report(self, request, pk=None):
        """
        Submit task completion report.
        
        POST /api/tasks/{id}/report/
        """
        task = self.get_object()
        user = request.user
        
        try:
            task_org = task.assigned_organizations.get(organization=user.organization)
        except TaskOrganization.DoesNotExist:
            return Response(
                {'detail': "Bu topshiriq sizning tashkilotingizga berilmagan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if task_org.status not in ['IJRODA', 'QAYTA_IJROGA_YUBORILDI', 'MUDDATI_KECH']:
            return Response(
                {'detail': "Bu topshiriq uchun hisobot topshirish mumkin emas"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TaskReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_status = task_org.status
        task_org.complete()
        
        # Create execution record
        execution = TaskExecution.objects.create(
            task=task,
            task_organization=task_org,
            executed_by=user,
            action_type='HISOBOT_TOPSHIRILDI',
            comment=serializer.validated_data['comment'],
            old_status=old_status,
            new_status=task_org.status
        )
        
        # Handle file attachments
        files = request.FILES.getlist('attachments')
        for f in files:
            TaskAttachment.objects.create(
                task=task,
                execution=execution,
                uploaded_by=user,
                file=f,
                file_name=f.name,
                file_size=f.size
            )
        
        AuditLog.log(
            user=user,
            action='REPORT_SUBMITTED',
            entity_type='TASK',
            entity_id=task.id,
            description=f"{user.full_name} topshiriq hisobotini topshirdi: {task.title}",
            old_values={'status': old_status},
            new_values={'status': task_org.status},
            ip_address=getattr(request, 'client_ip', None)
        )
        
        # Notify Hokim
        for hokim in task.created_by.organization.employees.filter(role='HOKIM', status='FAOL') if task.created_by.organization else []:
            Notification.objects.create(
                user=hokim,
                title='Hisobot topshirildi',
                message=f"{user.organization.name} topshiriq hisobotini topshirdi: {task.title}",
                notification_type='TASK',
                related_task=task,
                link=f'/dashboard/tasks/{task.id}'
            )
        
        return Response(TaskDetailSerializer(task).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanCloseTask])
    def close(self, request, pk=None):
        """
        Close task (remove from control).
        Only Hokim can do this.
        
        POST /api/tasks/{id}/close/
        """
        task = self.get_object()
        
        # Check if all organizations have completed
        all_completed = all(
            to.status == 'BAJARILDI' 
            for to in task.assigned_organizations.all()
        )
        
        if not all_completed:
            return Response(
                {'detail': "Barcha tashkilotlar topshiriqni bajarmaguncha yopib bo'lmaydi"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = task.status
        task.close(request.user)
        
        # Update all task organizations
        task.assigned_organizations.update(status='NAZORATDAN_YECHILDI')
        
        # Create execution record
        TaskExecution.objects.create(
            task=task,
            executed_by=request.user,
            action_type='NAZORATDAN_YECHILDI',
            old_status=old_status,
            new_status=task.status
        )
        
        AuditLog.log(
            user=request.user,
            action='TASK_CLOSED',
            entity_type='TASK',
            entity_id=task.id,
            description=f"{request.user.full_name} topshiriqni yopdi: {task.title}",
            old_values={'status': old_status},
            new_values={'status': task.status},
            ip_address=getattr(request, 'client_ip', None)
        )
        
        return Response(TaskDetailSerializer(task).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanCloseTask])
    def reassign(self, request, pk=None):
        """
        Send task back for re-execution.
        Only Hokim can do this.
        
        POST /api/tasks/{id}/reassign/
        """
        task = self.get_object()
        organization_id = request.data.get('organization_id')
        comment = request.data.get('comment', '')
        
        try:
            task_org = task.assigned_organizations.get(organization_id=organization_id)
        except TaskOrganization.DoesNotExist:
            return Response(
                {'detail': "Tashkilot topilmadi"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if task_org.status != 'BAJARILDI':
            return Response(
                {'detail': "Faqat bajarilgan topshiriqlarni qayta yuborish mumkin"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = task_org.status
        task_org.status = 'QAYTA_IJROGA_YUBORILDI'
        task_org.completed_at = None
        task_org.save()
        
        TaskExecution.objects.create(
            task=task,
            task_organization=task_org,
            executed_by=request.user,
            action_type='QAYTA_YUBORILDI',
            comment=comment,
            old_status=old_status,
            new_status=task_org.status
        )
        
        AuditLog.log(
            user=request.user,
            action='TASK_REASSIGNED',
            entity_type='TASK',
            entity_id=task.id,
            description=f"{request.user.full_name} topshiriqni qayta ijroga yubordi: {task.title}",
            old_values={'status': old_status},
            new_values={'status': task_org.status},
            ip_address=getattr(request, 'client_ip', None)
        )
        
        # Notify organization
        for user in task_org.organization.employees.filter(
            status='FAOL',
            role__in=['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']
        ):
            Notification.objects.create(
                user=user,
                title='Topshiriq qayta yuborildi',
                message=f"Topshiriq qayta ijroga yuborildi: {task.title}",
                notification_type='TASK',
                related_task=task,
                link=f'/dashboard/tasks/{task.id}'
            )
        
        return Response(TaskDetailSerializer(task).data)
    
    @action(detail=True, methods=['post'], url_path='mark-complete')
    def mark_complete(self, request, pk=None):
        """
        Tashkilot rahbari yoki mas'uli topshiriqni bajarildi deb belgilaydi.
        
        POST /api/tasks/{id}/mark-complete/
        """
        task = self.get_object()
        user = request.user
        comment = request.data.get('comment', '')
        
        # Faqat tashkilot rahbari yoki mas'uli
        if user.role not in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
            return Response(
                {'detail': "Faqat tashkilot rahbari yoki mas'uli topshiriqni bajarildi deb belgilashi mumkin"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Foydalanuvchi tashkilotini topish
        user_org = user.organization
        if not user_org:
            return Response(
                {'detail': "Foydalanuvchi tashkilotga biriktirilmagan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Topshiriqda tashkilotni topish
        task_org = task.assigned_organizations.filter(organization=user_org).first()
        if not task_org:
            return Response(
                {'detail': "Bu topshiriq sizning tashkilotingizga tayinlanmagan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if task_org.status == 'BAJARILDI':
            return Response(
                {'detail': "Topshiriq allaqachon bajarildi deb belgilangan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Statusni yangilash
        old_status = task_org.status
        task_org.status = 'BAJARILDI'
        task_org.completed_at = timezone.now()
        task_org.save()
        
        # Execution log
        TaskExecution.objects.create(
            task=task,
            task_organization=task_org,
            executed_by=user,
            action_type='BAJARILDI',
            comment=comment or f"{user_org.name} topshiriqni bajardi",
            old_status=old_status,
            new_status='BAJARILDI'
        )
        
        # Audit log
        AuditLog.objects.create(
            user=user,
            action='TASK_COMPLETED',
            entity_type='TASK_ORGANIZATION',
            entity_id=str(task_org.id),
            description=f'Tashkilot topshiriqni bajardi: {user_org.name}',
            extra_data={
                'task_id': str(task.id),
                'organization': user_org.name,
                'old_status': old_status,
                'new_status': task_org.status
            }
        )
        
        # Barcha tashkilotlar bajarilganligini tekshirish
        all_completed = all(
            to.status == 'BAJARILDI' 
            for to in task.assigned_organizations.all()
        )
        
        if all_completed:
            task.status = 'BAJARILDI'
            task.save()
        
        # HOKIM va HOKIMLIK_MASUL larga bildirishnoma yuborish
        from users.models import User as UserModel
        hokimlik_users = UserModel.objects.filter(
            role__in=['HOKIM', 'HOKIMLIK_MASUL'],
            status='FAOL'
        )
        for huser in hokimlik_users:
            Notification.objects.create(
                user=huser,
                title='Topshiriq bajarildi',
                message=f"{user_org.name} topshiriqni bajardi: {task.title}",
                notification_type='TASK',
                related_task=task,
                link=f'/dashboard/tasks/{task.id}'
            )
        
        return Response(TaskDetailSerializer(task).data)
    
    @action(detail=True, methods=['get', 'post'])
    def timeline(self, request, pk=None):
        """
        Get or add to task timeline (messages + executions).
        
        GET /api/tasks/{id}/timeline/
        POST /api/tasks/{id}/timeline/
        """
        task = self.get_object()
        
        if request.method == 'GET':
            # Combine messages and executions
            messages = list(task.messages.all())
            executions = list(task.executions.all())
            
            timeline = []
            
            for msg in messages:
                timeline.append({
                    'type': 'message',
                    'id': msg.id,
                    'timestamp': msg.created_at,
                    'user_name': msg.sender.full_name if msg.sender else 'Tizim',
                    'user_role': msg.sender.role if msg.sender else 'SYSTEM',
                    'content': msg.content,
                    'message_type': msg.message_type,
                    'attachment': TaskAttachmentSerializer(msg.attachment).data if msg.attachment else None
                })
            
            for exec in executions:
                timeline.append({
                    'type': 'execution',
                    'id': exec.id,
                    'timestamp': exec.created_at,
                    'user_name': exec.executed_by.full_name,
                    'user_role': exec.executed_by.role,
                    'content': exec.comment or exec.get_action_type_display(),
                    'action_type': exec.action_type
                })
            
            # Sort by timestamp
            timeline.sort(key=lambda x: x['timestamp'])
            
            return Response(timeline)
        
        else:  # POST
            content = request.data.get('content') or request.data.get('message', '')
            attachment_file = request.FILES.get('attachment') or request.FILES.get('file')
            attachment = None
            message_type = request.data.get('message_type', 'TEXT')

            if attachment_file:
                attachment = TaskAttachment.objects.create(
                    task=task,
                    uploaded_by=request.user,
                    file=attachment_file,
                    file_name=attachment_file.name,
                    file_size=attachment_file.size,
                    file_type=_guess_attachment_type(attachment_file)
                )
                message_type = _guess_message_type(attachment_file)

            if not (content or attachment):
                return Response(
                    {'detail': "Xabar matni yoki fayl talab qilinadi"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            message = TaskMessage.objects.create(
                task=task,
                sender=request.user,
                message_type=message_type,
                content=content or (attachment_file.name if attachment_file else ''),
                attachment=attachment
            )

            # Broadcast to WS clients
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"task_chat_{task.id}",
                    {"type": "chat_message", "message": TaskMessageSerializer(message).data}
                )

            # AI tahlil va action bajarish
            ai_response = self._process_chat_with_ai(task, message, request.user, channel_layer)

            return Response({
                **TaskMessageSerializer(message).data,
                'ai_response': ai_response
            }, status=status.HTTP_201_CREATED)
    
    def _process_chat_with_ai(self, task, message, user, channel_layer):
        """
        Chat xabarini AI bilan tahlil qilish va kerak bo'lsa action bajarish.
        
        AI quyidagilarni aniqlaydi:
        - Hokim "nazoratdan yechilsin" desa → topshiriqni yopish
        - Tashkilot rahbari "bajarildi" desa → statusni yangilash
        - Dalil/fayl bilan tasdiqlash → statusni yangilash
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            ai_service = AIService()
            content = message.content.lower()
            user_role = user.role
            
            # AI tahlil uchun kontekst
            task_context = f"""
Topshiriq: {task.title}
Status: {task.status}
Yaratilgan: {task.created_at}
Muddat: {task.deadline}
Xabar yuboruvchi: {user.full_name} ({user_role})
Xabar matni: {message.content}
"""
            
            # Hokim buyruqlarini tekshirish
            close_keywords = ['nazoratdan yechilsin', 'nazoratdan yech', 'yakunla', 'tugat', 'yopilsin', 'tasdiqlandi']
            complete_keywords = ['bajarildi', 'tugallandi', 'yakunlandi', 'topshiriq bajarildi', 'ish tugadi']
            
            ai_action = None
            ai_message = None
            
            # Hokim nazoratdan yechish buyrug'i
            if user_role == 'HOKIM':
                for keyword in close_keywords:
                    if keyword in content:
                        # Barcha tashkilotlar bajarilganligini tekshirish
                        all_completed = all(
                            to.status == 'BAJARILDI' 
                            for to in task.assigned_organizations.all()
                        )
                        
                        # Hokim buyrug'i bilan - tashkilotlar bajarilmagan bo'lsa ham yopish mumkin
                        # Avval barcha tashkilotlarni "BAJARILDI" ga o'zgartirish
                        if not all_completed and task.status != 'BAJARILDI':
                            for task_org in task.assigned_organizations.all():
                                if task_org.status != 'BAJARILDI':
                                    task_org.status = 'BAJARILDI'
                                    task_org.completed_at = timezone.now()
                                    task_org.save()
                            task.status = 'BAJARILDI'
                            task.save()
                        
                        try:
                            old_status = task.status
                            task.close(user)
                            ai_action = 'TASK_CLOSED'
                            ai_message = f"✅ Topshiriq muvaffaqiyatli nazoratdan yechildi. Hokim {user.full_name} tomonidan tasdiqlandi."
                            
                            # Audit log
                            AuditLog.objects.create(
                                user=user,
                                action='TASK_CLOSED',
                                entity_type='TASK',
                                entity_id=str(task.id),
                                description=f'Topshiriq AI orqali nazoratdan yechildi: {task.title}',
                                extra_data={
                                    'old_status': old_status,
                                    'new_status': task.status,
                                    'ai_triggered': True,
                                    'message_id': str(message.id)
                                }
                            )
                        except Exception as e:
                            ai_message = f"⚠️ Topshiriqni yopishda xatolik: {str(e)}"
                        break
            
            # Tashkilot rahbari bajarildi deyishi
            elif user_role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
                for keyword in complete_keywords:
                    if keyword in content:
                        # Foydalanuvchi tashkilotini topish
                        user_org = user.organization
                        if user_org:
                            task_org = task.assigned_organizations.filter(organization=user_org).first()
                            if task_org and task_org.status != 'BAJARILDI':
                                # Tashkilot statusini yangilash
                                old_status = task_org.status
                                task_org.status = 'BAJARILDI'
                                task_org.completed_at = timezone.now()
                                task_org.save()
                                
                                ai_action = 'ORG_COMPLETED'
                                ai_message = f"✅ {user_org.name} tomonidan topshiriq bajarildi deb belgilandi."
                                
                                # Barcha tashkilotlar bajarilganligini tekshirish
                                all_completed = all(
                                    to.status == 'BAJARILDI' 
                                    for to in task.assigned_organizations.all()
                                )
                                
                                if all_completed:
                                    task.status = 'BAJARILDI'
                                    task.save()
                                    ai_message += " 🎉 Barcha tashkilotlar topshiriqni bajardi. Hokim nazoratdan yechishi mumkin."
                                
                                # Audit log
                                AuditLog.objects.create(
                                    user=user,
                                    action='TASK_COMPLETED',
                                    entity_type='TASK_ORGANIZATION',
                                    entity_id=str(task_org.id),
                                    description=f'Tashkilot topshiriqni bajardi: {user_org.name}',
                                    extra_data={
                                        'task_id': str(task.id),
                                        'organization': user_org.name,
                                        'old_status': old_status,
                                        'new_status': task_org.status,
                                        'ai_triggered': True,
                                        'message_id': str(message.id)
                                    }
                                )
                        break
            
            # Agar AI action bajarilgan bo'lsa, xabar yuborish
            if ai_message:
                # AI xabarini yaratish
                ai_msg = TaskMessage.objects.create(
                    task=task,
                    sender=None,  # Tizim xabari
                    message_type='SYSTEM',
                    content=ai_message
                )
                
                # WS orqali broadcast
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"task_chat_{task.id}",
                        {"type": "chat_message", "message": TaskMessageSerializer(ai_msg).data}
                    )
                
                return {
                    'action': ai_action,
                    'message': ai_message,
                    'success': ai_action is not None
                }
            
            return None
            
        except Exception as e:
            logger.error(f"AI chat processing error: {str(e)}")
            return None

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated], url_path='messages/(?P<message_id>[^/.]+)')
    def update_message(self, request, pk=None, message_id=None):
        """Update a user's own message."""
        task = self.get_object()
        try:
            message = TaskMessage.objects.get(id=message_id, task=task)
        except TaskMessage.DoesNotExist:
            return Response({'detail': 'Xabar topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        if message.sender != request.user:
            return Response({'detail': "Faqat o'zingiz yozgan xabarni tahrirlashingiz mumkin"}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content') or request.data.get('message')
        if content is None:
            return Response({'detail': "Matn talab qilinadi"}, status=status.HTTP_400_BAD_REQUEST)

        message.content = content
        message.save(update_fields=['content', 'updated_at'])

        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"task_chat_{task.id}",
                {"type": "chat_message", "message": TaskMessageSerializer(message).data}
            )

        return Response(TaskMessageSerializer(message).data)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated], url_path='messages/(?P<message_id>[^/.]+)')
    def delete_message(self, request, pk=None, message_id=None):
        """Delete a user's own message."""
        task = self.get_object()
        try:
            message = TaskMessage.objects.get(id=message_id, task=task)
        except TaskMessage.DoesNotExist:
            return Response({'detail': 'Xabar topilmadi'}, status=status.HTTP_404_NOT_FOUND)

        if message.sender != request.user:
            return Response({'detail': "Faqat o'zingiz yozgan xabarni o'chirishingiz mumkin"}, status=status.HTTP_403_FORBIDDEN)

        message_id_value = str(message.id)
        if message.attachment:
            message.attachment.delete()
        message.delete()

        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"task_chat_{task.id}",
                {"type": "chat_message", "message": {"id": message_id_value, "deleted": True}}
            )

        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanExecuteTasks])
    def extend_request(self, request, pk=None):
        """
        Request deadline extension.
        
        POST /api/tasks/{id}/extend_request/
        """
        task = self.get_object()
        user = request.user
        
        try:
            task_org = task.assigned_organizations.get(organization=user.organization)
        except TaskOrganization.DoesNotExist:
            return Response(
                {'detail': "Bu topshiriq sizning tashkilotingizga berilmagan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ExtensionRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        extension = DeadlineExtensionRequest.objects.create(
            task=task,
            task_organization=task_org,
            requested_by=user,
            current_deadline=task.deadline,
            requested_deadline=serializer.validated_data['requested_deadline'],
            reason=serializer.validated_data['reason']
        )
        
        # Create execution record
        TaskExecution.objects.create(
            task=task,
            task_organization=task_org,
            executed_by=user,
            action_type='MUDDAT_UZAYTIRISH_SOROVI',
            comment=serializer.validated_data['reason']
        )
        
        AuditLog.log(
            user=user,
            action='EXTENSION_REQUESTED',
            entity_type='TASK',
            entity_id=task.id,
            description=f"{user.full_name} muddat uzaytirish so'radi: {task.title}",
            new_values={
                'current_deadline': str(task.deadline),
                'requested_deadline': str(serializer.validated_data['requested_deadline'])
            },
            ip_address=getattr(request, 'client_ip', None)
        )
        
        return Response(
            DeadlineExtensionRequestSerializer(extension).data,
            status=status.HTTP_201_CREATED
        )


class DeadlineExtensionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Deadline extension requests management.
    """
    queryset = DeadlineExtensionRequest.objects.all()
    serializer_class = DeadlineExtensionRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'task']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = DeadlineExtensionRequest.objects.select_related(
            'task', 'task_organization__organization', 'requested_by', 'reviewed_by'
        )
        
        if user.role in ['HOKIM', 'ADMIN']:
            return queryset
        
        if user.organization:
            return queryset.filter(task_organization__organization=user.organization)
        
        return queryset.none()
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanCloseTask])
    def review(self, request, pk=None):
        """
        Review extension request (approve/reject).
        Only Hokim can do this.
        
        POST /api/tasks/extensions/{id}/review/
        """
        extension = self.get_object()
        
        if extension.status != 'KUTILMOQDA':
            return Response(
                {'detail': "Bu so'rov allaqachon ko'rib chiqilgan"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ExtensionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        comment = serializer.validated_data.get('comment', '')
        
        if action == 'approve':
            extension.approve(request.user, comment)
            audit_action = 'EXTENSION_APPROVED'
            
            TaskExecution.objects.create(
                task=extension.task,
                task_organization=extension.task_organization,
                executed_by=request.user,
                action_type='MUDDAT_UZAYTIRILDI',
                comment=comment
            )
        else:
            extension.reject(request.user, comment)
            audit_action = 'EXTENSION_REJECTED'
        
        AuditLog.log(
            user=request.user,
            action=audit_action,
            entity_type='EXTENSION_REQUEST',
            entity_id=extension.id,
            description=f"{request.user.full_name} muddat uzaytirish so'rovini {action}",
            new_values={'status': extension.status, 'comment': comment},
            ip_address=getattr(request, 'client_ip', None)
        )
        
        return Response(DeadlineExtensionRequestSerializer(extension).data)
