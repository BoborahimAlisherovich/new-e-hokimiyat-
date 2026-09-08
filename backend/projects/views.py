from django.db.models import Avg, Count, Q
from rest_framework import permissions, response, status, viewsets
from rest_framework.decorators import action

from core.constants import UserRole
from notifications.services import notify_project_update

from .models import Project, ProjectAttachment, ProjectComment, ProjectHistory
from .serializers import (
    ProjectAttachmentSerializer,
    ProjectCommentSerializer,
    ProjectHistorySerializer,
    ProjectSerializer,
)


class CanManageProjects(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in UserRole.PROJECT_MANAGER_ROLES


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [CanManageProjects]
    queryset = Project.objects.prefetch_related('history_entries').filter(is_active=True)
    filterset_fields = ['category', 'status', 'is_active']
    search_fields = ['title', 'summary', 'owner']
    ordering_fields = ['sort_order', 'progress', 'created_at', 'updated_at']
    ordering = ['category', 'sort_order', '-created_at']

    def _base_queryset(self):
        return Project.objects.prefetch_related(
            'history_entries',
            'attachments',
            'comments',
        )

    def _is_manager(self):
        user = getattr(self.request, 'user', None)
        return bool(user and user.is_authenticated and user.role in UserRole.PROJECT_MANAGER_ROLES)

    def get_queryset(self):
        queryset = self._base_queryset()

        if not self._is_manager():
            return queryset.filter(is_active=True)

        if self.action in ['retrieve', 'history', 'comments', 'attachments', 'kpi', 'restore']:
            return queryset

        scope = (self.request.query_params.get('scope') or 'active').lower()
        if scope == 'archived':
            return queryset.filter(is_active=False)
        if scope == 'all':
            return queryset
        return queryset.filter(is_active=True)

    def perform_create(self, serializer):
        project = serializer.save()
        ProjectHistory.objects.create(
            project=project,
            action_type='CREATED',
            title="Loyiha yaratildi",
            description=f'"{project.title}" loyihasi portfelga qo‘shildi.',
            metadata={'progress': project.progress, 'status': project.status},
            actor=self.request.user,
        )
        notify_project_update(
            project=project,
            title="Yangi loyiha yaratildi",
            message=f'"{project.title}" loyihasi portfelga qo‘shildi.',
            exclude_user_ids=[self.request.user.id],
        )

    def perform_update(self, serializer):
        before = self.get_object()
        old_status = before.status
        old_progress = before.progress
        old_title = before.title

        project = serializer.save()

        action_type = 'UPDATED'
        title = "Loyiha yangilandi"
        description = f'"{old_title}" loyihasi ma’lumotlari yangilandi.'
        if old_status != project.status:
            action_type = 'STATUS_CHANGED'
            title = "Loyiha holati o'zgardi"
            description = f'"{project.title}" loyihasi {project.get_status_display()} holatiga o‘tdi.'
        elif old_progress != project.progress:
            action_type = 'PROGRESS_CHANGED'
            title = "Loyiha progressi yangilandi"
            description = f'"{project.title}" loyihasi progressi {project.progress}% ga yetdi.'

        ProjectHistory.objects.create(
            project=project,
            action_type=action_type,
            title=title,
            description=description,
            metadata={'progress': project.progress, 'status': project.status},
            actor=self.request.user,
        )
        notify_project_update(
            project=project,
            title=title,
            message=description,
            exclude_user_ids=[self.request.user.id],
        )

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        project.is_active = False
        project.save(update_fields=['is_active', 'updated_at'])
        ProjectHistory.objects.create(
            project=project,
            action_type='DELETED',
            title="Loyiha arxivlandi",
            description=f'"{project.title}" loyihasi faol ro‘yxatdan olib tashlandi.',
            metadata={'progress': project.progress, 'status': project.status},
            actor=request.user,
        )
        notify_project_update(
            project=project,
            title="Loyiha arxivlandi",
            message=f'"{project.title}" loyihasi faol ro‘yxatdan olib tashlandi.',
            exclude_user_ids=[request.user.id],
        )
        return response.Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        project = self.get_object()
        if not self._is_manager():
            return response.Response({'detail': 'Sizda bu amal uchun ruxsat yo‘q'}, status=status.HTTP_403_FORBIDDEN)
        if project.is_active:
            return response.Response({'detail': 'Loyiha allaqachon faol holatda'}, status=status.HTTP_400_BAD_REQUEST)

        project.is_active = True
        project.save(update_fields=['is_active', 'updated_at'])
        ProjectHistory.objects.create(
            project=project,
            action_type='UPDATED',
            title="Loyiha qayta faollashtirildi",
            description=f'"{project.title}" loyihasi portfelga qayta tiklandi.',
            metadata={'progress': project.progress, 'status': project.status},
            actor=request.user,
        )
        notify_project_update(
            project=project,
            title="Loyiha qayta tiklandi",
            message=f'"{project.title}" loyihasi qayta faol ro‘yxatga kiritildi.',
            exclude_user_ids=[request.user.id],
        )
        serializer = self.get_serializer(project)
        return response.Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.get_queryset()
        summary = queryset.aggregate(
            total=Count('id'),
            active_count=Count('id', filter=Q(is_active=True)),
            archived_count=Count('id', filter=Q(is_active=False)),
            completed_count=Count('id', filter=Q(status='YAKUNLANGAN')),
            driver_count=Count('id', filter=Q(category='DRIVER')),
            average_progress=Avg('progress'),
        )
        return response.Response({
            'total': summary['total'] or 0,
            'active_count': summary['active_count'] or 0,
            'archived_count': summary['archived_count'] or 0,
            'completed_count': summary['completed_count'] or 0,
            'driver_count': summary['driver_count'] or 0,
            'average_progress': round(summary['average_progress'] or 0),
        })

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        project = self.get_object()
        serializer = ProjectHistorySerializer(project.history_entries.all(), many=True)
        return response.Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        project = self.get_object()
        if request.method == 'GET':
            serializer = ProjectCommentSerializer(project.comments.all(), many=True)
            return response.Response(serializer.data)

        message = (request.data.get('message') or '').strip()
        if not message:
            return response.Response({'error': 'Kommentariya matni kiritilmagan'}, status=status.HTTP_400_BAD_REQUEST)

        comment = ProjectComment.objects.create(
            project=project,
            author=request.user,
            message=message,
        )
        ProjectHistory.objects.create(
            project=project,
            action_type='UPDATED',
            title="Loyihaga kommentariya qo'shildi",
            description=message[:240],
            metadata={'progress': project.progress, 'status': project.status},
            actor=request.user,
        )
        notify_project_update(
            project=project,
            title="Loyihada yangi kommentariya",
            message=f'"{project.title}" loyihasida yangi izoh qoldirildi.',
            exclude_user_ids=[request.user.id],
        )
        serializer = ProjectCommentSerializer(comment)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'])
    def attachments(self, request, pk=None):
        project = self.get_object()
        if request.method == 'GET':
            serializer = ProjectAttachmentSerializer(project.attachments.all(), many=True, context={'request': request})
            return response.Response(serializer.data)

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return response.Response({'error': 'Fayl biriktirilmagan'}, status=status.HTTP_400_BAD_REQUEST)

        attachment = ProjectAttachment.objects.create(
            project=project,
            file=uploaded_file,
            file_name=uploaded_file.name,
            uploaded_by=request.user,
        )
        ProjectHistory.objects.create(
            project=project,
            action_type='UPDATED',
            title='Loyihaga fayl biriktirildi',
            description=f'{uploaded_file.name} fayli yuklandi.',
            metadata={'progress': project.progress, 'status': project.status},
            actor=request.user,
        )
        notify_project_update(
            project=project,
            title="Loyihaga fayl qo'shildi",
            message=f'"{project.title}" loyihasiga {uploaded_file.name} fayli biriktirildi.',
            exclude_user_ids=[request.user.id],
        )
        serializer = ProjectAttachmentSerializer(attachment, context={'request': request})
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def kpi(self, request, pk=None):
        project = self.get_object()
        history = list(project.history_entries.order_by('created_at'))
        grouped = {}
        for entry in history:
            key = entry.created_at.date().isoformat()
            grouped.setdefault(key, {
                'label': entry.created_at.strftime('%d.%m'),
                'progress': entry.metadata.get('progress', project.progress),
                'events': 0,
            })
            grouped[key]['events'] += 1
            grouped[key]['progress'] = entry.metadata.get('progress', grouped[key]['progress'])

        data = list(grouped.values())
        if not data:
            data = [{
                'label': project.created_at.strftime('%d.%m'),
                'progress': project.progress,
                'events': 1,
            }]

        return response.Response({
            'project_id': str(project.id),
            'progress': project.progress,
            'status': project.status,
            'timeline': data,
        })
