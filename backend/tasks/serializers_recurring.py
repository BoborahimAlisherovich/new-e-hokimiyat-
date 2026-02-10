"""
Recurring Task Serializers.
"""

from rest_framework import serializers
from tasks.models import RecurringTask, RecurringTaskHistory
from organizations.serializers import OrganizationSerializer


class RecurringTaskSerializer(serializers.ModelSerializer):
    """Takrorlanuvchi topshiriq serializer"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    organizations_count = serializers.IntegerField(source='organizations.count', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = RecurringTask
        fields = [
            'id', 'title', 'description',
            'frequency', 'frequency_display',
            'cron_expression', 'cron_description',
            'start_date', 'end_date',
            'next_run_date', 'last_run_date',
            'priority', 'category', 'deadline_days',
            'organizations', 'organizations_count',
            'created_by', 'created_by_name',
            'status', 'status_display',
            'total_created',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'next_run_date', 'last_run_date',
            'total_created', 'created_at', 'updated_at'
        ]


class RecurringTaskDetailSerializer(serializers.ModelSerializer):
    """Batafsil ma'lumot"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    organizations_list = OrganizationSerializer(source='organizations', many=True, read_only=True)
    recent_history = serializers.SerializerMethodField()
    
    class Meta:
        model = RecurringTask
        fields = [
            'id', 'title', 'description',
            'frequency', 'cron_expression', 'cron_description',
            'start_date', 'end_date',
            'next_run_date', 'last_run_date',
            'priority', 'category', 'deadline_days',
            'organizations', 'organizations_list',
            'created_by', 'created_by_name',
            'status', 'total_created',
            'recent_history',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_by', 'next_run_date', 'last_run_date',
            'total_created', 'created_at', 'updated_at'
        ]
    
    def get_recent_history(self, obj):
        history = obj.history.select_related('created_task').order_by('-created_at')[:5]
        return RecurringTaskHistorySerializer(history, many=True).data


class RecurringTaskHistorySerializer(serializers.ModelSerializer):
    """Tarix serializer"""
    task_title = serializers.CharField(source='created_task.title', read_only=True)
    task_status = serializers.CharField(source='created_task.status', read_only=True)
    
    class Meta:
        model = RecurringTaskHistory
        fields = [
            'id', 'created_task', 'task_title', 'task_status',
            'scheduled_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
