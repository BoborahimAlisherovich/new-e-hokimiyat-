"""
Task serializers for E-Hokimiyat API.
"""

from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from core.constants import UserRole
from .models import (
    Task, TaskOrganization, TaskExecution, 
    TaskAttachment, TaskMessage, DeadlineExtensionRequest
)
from users.serializers import UserMinimalSerializer
from organizations.models import Sector
from organizations.serializers import OrganizationMinimalSerializer
from core.file_validators import validate_uploads


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
    viewed_by = UserMinimalSerializer(read_only=True)

    class Meta:
        model = TaskOrganization
        fields = [
            'id', 'organization', 'organization_id', 'status',
            'assigned_to', 'viewed_at', 'viewed_by',
            'accepted_at', 'completed_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'assigned_to', 'viewed_at', 'viewed_by',
            'accepted_at', 'completed_at',
        ]


class TaskMinimalSerializer(serializers.ModelSerializer):
    """
    Minimal task serializer for lists.
    """
    created_by = UserMinimalSerializer(read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    assigned_deputies = UserMinimalSerializer(many=True, read_only=True)
    assigned_organizations = TaskOrganizationSerializer(many=True, read_only=True)
    status = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    days_remaining = serializers.IntegerField(read_only=True)
    sector_name = serializers.CharField(source='sector.name', read_only=True, default=None)

    def _effective_status(self, task: Task) -> str:
        """
        Return task status adjusted for the current user context.

        - Organization users see their own TaskOrganization.status.
        - Admin/creator roles see Task.status.
        - Overdue is computed from deadline even if background jobs are not running.
        """
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        base_status = task.status
        task_org_status = None

        if user and getattr(user, 'role', None) in [UserRole.TASHKILOT_RAHBARI, UserRole.TASHKILOT_MASUL] and getattr(user, 'organization_id', None):
            task_org = task.assigned_organizations.filter(organization_id=user.organization_id).only('status').first()
            if task_org:
                task_org_status = task_org.status
                base_status = task_org_status

        if base_status in ['NAZORATDAN_YECHILDI', 'BAJARILDI', 'BAJARILMADI']:
            return base_status

        now = timezone.now()
        if task.deadline and task.deadline < now:
            # If it's overdue, reflect it even when DB status wasn't updated yet.
            if base_status == 'MUDDATI_KECH':
                if task.deadline < (now - timedelta(days=7)):
                    return 'BAJARILMADI'
                return 'MUDDATI_KECH'
            if base_status in ['YANGI', 'IJRODA', 'QAYTA_IJROGA_YUBORILDI', 'TEKSHIRUVDA']:
                return 'MUDDATI_KECH'

        return base_status

    def get_status(self, obj: Task) -> str:
        return self._effective_status(obj)

    def get_is_overdue(self, obj: Task) -> bool:
        status_value = self._effective_status(obj)
        if status_value in ['NAZORATDAN_YECHILDI', 'BAJARILDI', 'BAJARILMADI']:
            return False
        return bool(obj.deadline and timezone.now() > obj.deadline)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'priority', 'category', 'sector', 'sector_name',
            'status', 'deadline',
            'created_by', 'created_by_name', 'assigned_deputies', 'assigned_organizations',
            'is_overdue', 'days_remaining', 'created_at'
        ]


class TaskSerializer(serializers.ModelSerializer):
    """
    Full task serializer.
    """
    created_by = UserMinimalSerializer(read_only=True)
    closed_by = UserMinimalSerializer(read_only=True)
    assigned_deputies = UserMinimalSerializer(many=True, read_only=True)
    assigned_organizations = TaskOrganizationSerializer(many=True, read_only=True)
    status = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    days_remaining = serializers.IntegerField(read_only=True)
    sector_name = serializers.CharField(source='sector.name', read_only=True, default=None)
    # Frontend tugmalarni shu bayroqlar bo'yicha ko'rsatadi — rol bo'yicha
    # taxmin qilmaydi (qoidalar: tasks/access.py)
    can_edit = serializers.SerializerMethodField()
    can_approve = serializers.SerializerMethodField()
    # Yaratishda biriktirilgan hujjatlar (ijro hisobotining isbotlari emas —
    # ular execution.attachments da). Ilgari detail javobida umuman yo'q edi,
    # ijrochi topshiriqqa qo'shilgan faylni ko'ra olmasdi.
    attachments = serializers.SerializerMethodField()

    def get_attachments(self, task: Task):
        # execution'siz (isbot emas) va xabarga bog'lanmagan (chat fayli emas)
        qs = (task.attachments.filter(execution__isnull=True, messages__isnull=True)
              .order_by('created_at').distinct())
        return TaskAttachmentSerializer(qs, many=True, context=self.context).data

    def get_can_edit(self, task: Task) -> bool:
        from tasks.access import can_edit_task
        user = getattr(self.context.get('request'), 'user', None)
        return bool(user and user.is_authenticated and can_edit_task(user, task))

    def get_can_approve(self, task: Task) -> bool:
        from tasks.access import can_approve_task
        user = getattr(self.context.get('request'), 'user', None)
        return bool(user and user.is_authenticated and can_approve_task(user, task))

    def _effective_status(self, task: Task) -> str:
        # Keep logic in sync with TaskMinimalSerializer.
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        base_status = task.status
        if user and getattr(user, 'role', None) in [UserRole.TASHKILOT_RAHBARI, UserRole.TASHKILOT_MASUL] and getattr(user, 'organization_id', None):
            task_org = task.assigned_organizations.filter(organization_id=user.organization_id).only('status').first()
            if task_org:
                base_status = task_org.status

        if base_status in ['NAZORATDAN_YECHILDI', 'BAJARILDI', 'BAJARILMADI']:
            return base_status

        now = timezone.now()
        if task.deadline and task.deadline < now:
            if base_status == 'MUDDATI_KECH':
                if task.deadline < (now - timedelta(days=7)):
                    return 'BAJARILMADI'
                return 'MUDDATI_KECH'
            if base_status in ['YANGI', 'IJRODA', 'QAYTA_IJROGA_YUBORILDI', 'TEKSHIRUVDA']:
                return 'MUDDATI_KECH'

        return base_status

    def get_status(self, obj: Task) -> str:
        return self._effective_status(obj)

    def get_is_overdue(self, obj: Task) -> bool:
        status_value = self._effective_status(obj)
        if status_value in ['NAZORATDAN_YECHILDI', 'BAJARILDI', 'BAJARILMADI']:
            return False
        return bool(obj.deadline and timezone.now() > obj.deadline)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'category',
            'sector', 'sector_name', 'status',
            'deadline', 'completed_at', 'closed_at',
            'latitude', 'longitude', 'address',
            'created_by', 'closed_by', 'assigned_deputies', 'assigned_organizations',
            'is_overdue', 'days_remaining', 'created_at', 'updated_at',
            'can_edit', 'can_approve', 'attachments',
        ]
        read_only_fields = [
            'id', 'status', 'completed_at', 'closed_at',
            'created_by', 'closed_by', 'created_at', 'updated_at',
            'can_edit', 'can_approve', 'attachments',
        ]


class TaskCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating tasks.
    """
    # Accept organizations as comma-separated string or single UUID
    organizations = serializers.CharField(write_only=True)
    deputy_ids = serializers.CharField(write_only=True, required=False, allow_blank=True)
    attachments = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False
    )
    # Soha (Sector) - topshiriq yaratishda majburiy
    sector = serializers.PrimaryKeyRelatedField(
        queryset=Sector.objects.filter(is_active=True),
        required=True,
        allow_null=False,
        error_messages={
            'required': 'Soha tanlanishi shart',
            'null': 'Soha tanlanishi shart',
            'does_not_exist': 'Tanlangan soha topilmadi yoki faol emas',
            'incorrect_type': "Soha noto'g'ri formatda yuborildi",
        },
    )
    # Orqaga moslik uchun: eski frontend `category` yuborishi mumkin.
    category = serializers.CharField(required=False, allow_blank=True, max_length=100)
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'priority', 'category',
            'sector', 'sector_name',
            'deadline', 'latitude', 'longitude', 'address',
            'organizations', 'deputy_ids', 'attachments'
        ]
    
    def validate_attachments(self, value):
        """Yuklangan fayllarni umumiy qoidalar bo'yicha tekshirish."""
        if value:
            validate_uploads(value)
        return value
    
    def validate_deadline(self, value):
        """Validate that deadline is not in the past (allow today)."""
        # Treat deadlines as calendar dates instead of exact timestamps so
        # timezone conversions from the frontend do not move them to "yesterday".
        if value.date() < timezone.localdate():
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

    def validate_deputy_ids(self, value):
        """Validate selected deputy users and convert to UUIDs."""
        from users.models import User
        import uuid

        if not value:
            return []

        deputy_ids = [v.strip() for v in value.split(',') if v.strip()]
        uuid_list = []
        for deputy_id in deputy_ids:
            try:
                uuid_list.append(uuid.UUID(str(deputy_id)))
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Noto'g'ri deputy UUID formati: {deputy_id}")

        deputies = User.objects.filter(
            id__in=uuid_list,
            role=UserRole.HOKIM_YORDAMCHISI,
            status='FAOL',
        )
        existing_ids = set(str(item) for item in deputies.values_list('id', flat=True))
        missing = [str(item) for item in uuid_list if str(item) not in existing_ids]
        if missing:
            raise serializers.ValidationError(
                f"Hokim o'rinbosarlari topilmadi yoki nofaol: {', '.join(missing)}"
            )

        return uuid_list

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        organizations = attrs.get('organizations') or []
        deputy_ids = attrs.get('deputy_ids') or []
        sector = attrs.get('sector')

        from organizations.models import Organization
        from users.models import User

        orgs = list(Organization.objects.filter(id__in=organizations, is_active=True).select_related('sector'))

        # Tanlangan barcha tashkilotlar topshiriq sohasiga tegishli bo'lishi shart.
        # Quyidagi hokim o'rinbosari qoidalari ham shu moslikni nazarda tutadi.
        if sector is not None and orgs:
            mismatched = [
                org.name for org in orgs
                if org.sector_id is None or str(org.sector_id) != str(sector.pk)
            ]
            if mismatched:
                raise serializers.ValidationError({
                    'sector': (
                        f"Quyidagi tashkilotlar «{sector.name}» sohasiga tegishli emas: "
                        + ", ".join(sorted(mismatched))
                        + ". Sohani o'zgartiring yoki shu sohadagi tashkilotlarni tanlang."
                    )
                })

        if not user:
            return attrs

        deputy_map = {
            str(item.id): item
            for item in User.objects.filter(id__in=deputy_ids, role=UserRole.HOKIM_YORDAMCHISI).select_related('sector')
        }
        deputies = [deputy_map[str(item)] for item in deputy_ids if str(item) in deputy_map]

        if user.role == UserRole.HOKIM_YORDAMCHISI:
            # Doira tasks/access.py da: alohida biriktirilgan tashkilotlar
            # bo'lsa — faqat ular, bo'lmasa o'z sohasi.
            from tasks.access import assignable_organizations
            allowed = set(str(pk) for pk in assignable_organizations(user).values_list('id', flat=True))
            if not allowed:
                raise serializers.ValidationError({
                    'organizations': "Sizga soha yoki tashkilot biriktirilmagan — administratorga murojaat qiling"
                })
            invalid_orgs = [org.name for org in orgs if str(org.id) not in allowed]
            if invalid_orgs:
                raise serializers.ValidationError({
                    'organizations': (
                        "Siz faqat o'zingizga biriktirilgan tashkilotlarga topshiriq bera olasiz. "
                        "Doiradan tashqari: " + ', '.join(invalid_orgs)
                    )
                })
            attrs['deputy_ids'] = [user.id]

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

        if user.role in [UserRole.HOKIM, UserRole.ADMIN]:
            if not deputies:
                raise serializers.ValidationError({
                    'deputy_ids': "Kamida bitta hokim o'rinbosarini ism bilan tanlang"
                })

        if deputies:
            deputy_sector_ids = {str(item.sector_id) for item in deputies if item.sector_id}
            uncovered_orgs = [
                org.name for org in orgs
                if org.sector_id and str(org.sector_id) not in deputy_sector_ids
            ]
            if uncovered_orgs:
                raise serializers.ValidationError({
                    'deputy_ids': (
                        "Tanlangan hokim o'rinbosarlari quyidagi tashkilotlar sohasi bilan mos emas: "
                        + ", ".join(uncovered_orgs)
                    )
                })

        return attrs
    
    def create(self, validated_data):
        """Create task with organization assignments."""
        organizations = validated_data.pop('organizations')
        deputy_ids = validated_data.pop('deputy_ids', [])
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

        if deputy_ids:
            task.assigned_deputies.set(deputy_ids)

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
    comment = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        error_messages={
            'required': 'Hisobot izohi talab qilinadi',
            'blank': 'Hisobot izohi talab qilinadi',
        },
    )
    attachments = serializers.ListField(
        child=serializers.FileField(),
        required=False
    )

    def validate_attachments(self, value):
        """Hisobot ilovalarini umumiy qoidalar bo'yicha tekshirish."""
        if value:
            validate_uploads(value)
        return value


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
