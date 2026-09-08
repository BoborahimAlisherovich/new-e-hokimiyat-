from rest_framework import serializers

from .models import Project, ProjectAttachment, ProjectComment, ProjectHistory


class ProjectHistorySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_type_display', read_only=True)

    class Meta:
        model = ProjectHistory
        fields = [
            'id',
            'action_type',
            'action_display',
            'title',
            'description',
            'actor_name',
            'created_at',
        ]


class ProjectAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ProjectAttachment
        fields = [
            'id',
            'file_name',
            'file_url',
            'uploaded_by_name',
            'created_at',
        ]

    def get_file_url(self, obj):
        request = self.context.get('request')
        if not obj.file:
            return None
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class ProjectCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True)

    class Meta:
        model = ProjectComment
        fields = [
            'id',
            'message',
            'author_name',
            'created_at',
        ]


class ProjectSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    history_entries = ProjectHistorySerializer(many=True, read_only=True)
    attachments = ProjectAttachmentSerializer(many=True, read_only=True)
    comments = ProjectCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = [
            'id',
            'title',
            'summary',
            'category',
            'category_display',
            'status',
            'status_display',
            'progress',
            'budget',
            'owner',
            'start_date',
            'end_date',
            'sort_order',
            'is_active',
            'history_entries',
            'attachments',
            'comments',
            'created_at',
            'updated_at',
        ]
