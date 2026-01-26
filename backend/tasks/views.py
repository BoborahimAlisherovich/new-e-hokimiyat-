"""
Task views for E-Hokimiyat API.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import (
    Task, TaskOrganization, TaskExecution,
    TaskAttachment, TaskMessage, DeadlineExtensionRequest
)
from .serializers import (
    TaskSerializer, TaskCreateSerializer, TaskDetailSerializer,
    TaskMinimalSerializer, TaskOrganizationSerializer,
    TaskExecutionSerializer, TaskMessageSerializer,
    TaskAttachmentSerializer, DeadlineExtensionRequestSerializer,
    TaskReportSerializer, TaskAcceptSerializer,
    ExtensionRequestCreateSerializer, ExtensionReviewSerializer,
    TaskTimelineSerializer
)
from core.permissions import CanCreateTasks, CanExecuteTasks, CanCloseTask
from audit.models import AuditLog
from notifications.models import Notification


def _guess_message_type(file_obj):
    content_type = getattr(file_obj, 'content_type', '') or ''
    name = getattr(file_obj, 'name', '') or ''
    lower = name.lower()
    if content_type.startswith('audio/') or lower.endswith(('.mp3', '.wav', '.ogg', '.m4a', '.aac')):
        return 'AUDIO'
    return 'FILE'


def _guess_attachment_type(file_obj):
    content_type = getattr(file_obj, 'content_type', '') or ''
    name = getattr(file_obj, 'name', '') or ''
    lower = name.lower()
    if content_type.startswith('image/') or lower.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg')):
        return 'IMAGE'
    if content_type.startswith('video/') or lower.endswith(('.mp4', '.mov', '.avi', '.mkv', '.webm')):
        return 'VIDEO'
    if content_type.startswith('audio/') or lower.endswith(('.mp3', '.wav', '.ogg', '.m4a', '.aac')):
        return 'AUDIO'
    if content_type.startswith('application/') or lower.endswith(('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx')):
        return 'DOCUMENT'
    return 'OTHER'


class TaskViewSet(viewsets.ModelViewSet):
    """
    Task management endpoints.
    """
    queryset = Task.objects.all()
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'priority', 'category']
    search_fields = ['title', 'description']
    ordering_fields = ['deadline', 'created_at', 'priority']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TaskCreateSerializer
        elif self.action == 'retrieve':
            return TaskDetailSerializer
        elif self.action == 'list':
            return TaskMinimalSerializer
        return TaskSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), CanCreateTasks()]
        return [IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        """Override create to log validation errors."""
        print(f"TaskViewSet.create: request.data = {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print(f"TaskViewSet.create: Validation errors = {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def get_queryset(self):
        """Filter tasks based on user role."""
        user = self.request.user
        queryset = Task.objects.select_related('created_by', 'closed_by').prefetch_related(
            'assigned_organizations__organization'
        )
        
        # Hokim and Hokimlik mas'uli can see all tasks
        if user.role in ['HOKIM', 'HOKIMLIK_MASUL', 'ADMIN']:
            return queryset
        
        # Tashkilot rahbari and mas'uli can only see tasks assigned to their organization
        if user.role in ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']:
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

            return Response(TaskMessageSerializer(message).data, status=status.HTTP_201_CREATED)

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
