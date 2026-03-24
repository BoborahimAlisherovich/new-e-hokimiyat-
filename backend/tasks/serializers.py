"""
Task serializers for E-Hokimiyat API.
"""

from rest_framework import serializers
from django.utils import timezone
from core.constants import UserRole
from .models import (
    Task, TaskOrganization, TaskExecution, 
    TaskAttachment, TaskMessage, DeadlineExtensionRequest
)
from users.serializers import UserMinimalSerializer
from organizations.serializers import OrganizationMinimalSerializer


def _guess_file_type(file_obj) -> str:
    """Infer attachment file type from content type or filename."""
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


class TaskAttachmentSerializer(serializers.ModelSerializer):
    """
    Task attachment serializer.
    """
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    
    class Meta:
        model = TaskAttachment
        fields = [
            'id', 'file', 'file_name', 'file_type', 'file_size',
            'uploaded_by', 'uploaded_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at']


class TaskExecutionSerializer(serializers.ModelSerializer):
    """
    Task execution serializer.
    """
    executed_by_name = serializers.CharField(source='executed_by.full_name', read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = TaskExecution
        fields = [
            'id', 'task', 'task_organization', 'executed_by', 'executed_by_name',
            'action_type', 'comment', 'old_status', 'new_status',
            'attachments', 'created_at'
        ]
        read_only_fields = ['id', 'executed_by', 'old_status', 'new_status', 'created_at']


class TaskMessageSerializer(serializers.ModelSerializer):
    """
    Task message serializer.
    """
    content = serializers.CharField(required=False, allow_blank=True)
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    attachment = TaskAttachmentSerializer(read_only=True)
    # Convert UUIDs to strings for msgpack serialization
    task = serializers.CharField(read_only=True)
    sender = serializers.CharField(read_only=True)
    id = serializers.CharField(read_only=True)
    
    class Meta:
        model = TaskMessage
        fields = [
            'id', 'task', 'sender', 'sender_name', 'sender_role',
            'message_type', 'content', 'attachment', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'sender', 'created_at']


class TaskOrganizationSerializer(serializers.ModelSerializer):
    """
    Task organization assignment serializer.
    """
    organization = OrganizationMinimalSerializer(read_only=True)
    organization_id = serializers.UUIDField(write_only=True)
    assigned_to = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = TaskOrganization
        fields = [
            'id', 'organization', 'organization_id', 'status',
            'assigned_to', 'accepted_at', 'completed_at', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'assigned_to', 'accepted_at', 'completed_at']


class TaskMinimalSerializer(serializers.ModelSerializer):
    """
    Minimal task serializer for lists.
    """
    created_by = UserMinimalSerializer(read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    assigned_organizations = TaskOrganizationSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'priority', 'category', 'status', 'deadline',
            'created_by', 'created_by_name', 'assigned_organizations', 
            'is_overdue', 'days_remaining', 'created_at'
        ]


class TaskSerializer(serializers.ModelSerializer):
    """
    Full task serializer.
    """
    created_by = UserMinimalSerializer(read_only=True)
    closed_by = UserMinimalSerializer(read_only=True)
    assigned_organizations = TaskOrganizationSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'category', 'status',
            'deadline', 'completed_at', 'closed_at',
            'latitude', 'longitude', 'address',
            'created_by', 'closed_by', 'assigned_organizations',
            'is_overdue', 'days_remaining', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'completed_at', 'closed_at',
            'created_by', 'closed_by', 'created_at', 'updated_at'
        ]


class TaskCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating tasks.
    """
    # Accept organizations as comma-separated string or single UUID
    organizations = serializers.CharField(write_only=True)
    attachments = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'priority', 'category',
            'deadline', 'latitude', 'longitude', 'address',
            'organizations', 'attachments'
        ]
    
    def validate_deadline(self, value):
        """Validate that deadline is not in the past (allow today)."""
        from datetime import timedelta
        # Allow today's date - just check it's not more than 1 day in the past
        if value < timezone.now() - timedelta(days=1):
            raise serializers.ValidationError("Muddat o'tgan bo'lishi mumkin emas")
        return value
    
    def validate_organizations(self, value):
        """Validate that organizations exist and convert to UUIDs."""
        from organizations.models import Organization
        import uuid
        
        if not value:
            raise serializers.ValidationError("Kamida bitta tashkilot tanlanishi kerak")
        
        # Handle comma-separated UUIDs or single UUID
        org_ids = [v.strip() for v in value.split(',') if v.strip()]
        
        # Convert string UUIDs to UUID objects
        uuid_list = []
        for org_id in org_ids:
            try:
                uuid_list.append(uuid.UUID(str(org_id)))
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Noto'g'ri UUID formati: {org_id}")
        
        if not uuid_list:
            raise serializers.ValidationError("Kamida bitta tashkilot tanlanishi kerak")
        
        existing = Organization.objects.filter(id__in=uuid_list, is_active=True).values_list('id', flat=True)
        missing = set(str(v) for v in uuid_list) - set(str(e) for e in existing)
        
        if missing:
            raise serializers.ValidationError(f"Tashkilotlar topilmadi: {missing}")

        return uuid_list

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        organizations = attrs.get('organizations') or []

        if not user:
            return attrs

        from organizations.models import Organization

        orgs = list(Organization.objects.filter(id__in=organizations, is_active=True).select_related('sector'))

        if user.role == UserRole.HOKIM_YORDAMCHISI:
            if not user.sector_id:
                raise serializers.ValidationError({
                    'organizations': "Hokim o'rinbosariga soha/kompleks biriktirilmagan"
                })
            invalid_orgs = [org.name for org in orgs if org.sector_id != user.sector_id]
            if invalid_orgs:
                raise serializers.ValidationError({
                    'organizations': f"Siz faqat o'z komplekisingizdagi tashkilotlarga topshiriq bera olasiz: {', '.join(invalid_orgs)}"
                })

        if user.role == UserRole.TASHKILOT_RAHBARI:
            if not user.organization_id:
                raise serializers.ValidationError({
                    'organizations': "Tashkilot rahbariga tashkilot biriktirilmagan"
                })
            invalid_orgs = [org.name for org in orgs if org.id != user.organization_id]
            if invalid_orgs:
                raise serializers.ValidationError({
                    'organizations': "Tashkilot rahbari faqat o'z tashkiloti doirasida topshiriq yaratishi mumkin"
                })

        return attrs
    
    def create(self, validated_data):
        """Create task with organization assignments."""
        organizations = validated_data.pop('organizations')
        validated_data.pop('attachments', None)
        request = self.context.get('request')
        
        task = Task.objects.create(
            created_by=request.user,
            status='YANGI',
            **validated_data
        )
        
        # Create organization assignments
        from organizations.models import Organization
        for org_id in organizations:
            org = Organization.objects.get(id=org_id)
            TaskOrganization.objects.create(
                task=task,
                organization=org,
                status='YANGI'
            )

        # Handle attachments (optional)
        if request:
            files = request.FILES.getlist('attachments')
            for f in files:
                TaskAttachment.objects.create(
                    task=task,
                    uploaded_by=request.user,
                    file=f,
                    file_name=f.name,
                    file_size=f.size,
                    file_type=_guess_file_type(f)
                )
        
        return task


class TaskDetailSerializer(TaskSerializer):
    """
    Detailed task serializer with executions and messages.
    """
    executions = TaskExecutionSerializer(many=True, read_only=True)
    attachments = TaskAttachmentSerializer(many=True, read_only=True)
    
    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + ['executions', 'attachments']


class DeadlineExtensionRequestSerializer(serializers.ModelSerializer):
    """
    Deadline extension request serializer.
    """
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    
    class Meta:
        model = DeadlineExtensionRequest
        fields = [
            'id', 'task', 'task_title', 'task_organization',
            'requested_by', 'requested_by_name',
            'current_deadline', 'requested_deadline', 'reason',
            'status', 'reviewed_by', 'reviewed_by_name',
            'reviewed_at', 'review_comment', 'created_at'
        ]
        read_only_fields = [
            'id', 'requested_by', 'current_deadline', 'status',
            'reviewed_by', 'reviewed_at', 'created_at'
        ]


class TaskTimelineSerializer(serializers.Serializer):
    """
    Unified timeline serializer (messages + executions).
    """
    type = serializers.CharField()  # 'message' or 'execution'
    id = serializers.UUIDField()
    timestamp = serializers.DateTimeField()
    user_name = serializers.CharField()
    user_role = serializers.CharField()
    content = serializers.CharField()
    action_type = serializers.CharField(required=False)
    message_type = serializers.CharField(required=False)
    attachment = TaskAttachmentSerializer(required=False)


class TaskReportSerializer(serializers.Serializer):
    """
    Serializer for submitting task report.
    """
    comment = serializers.CharField(required=True)
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False
    )


class TaskAcceptSerializer(serializers.Serializer):
    """
    Serializer for accepting a task.
    """
    comment = serializers.CharField(required=False, allow_blank=True)


class ExtensionRequestCreateSerializer(serializers.Serializer):
    """
    Serializer for creating extension request.
    """
    requested_deadline = serializers.DateTimeField()
    reason = serializers.CharField()
    
    def validate_requested_deadline(self, value):
        """Validate that requested deadline is in the future."""
        if value <= timezone.now():
            raise serializers.ValidationError("So'ralgan muddat kelajakda bo'lishi kerak")
        return value


class ExtensionReviewSerializer(serializers.Serializer):
    """
    Serializer for reviewing extension request.
    """
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    comment = serializers.CharField(required=False, allow_blank=True)
