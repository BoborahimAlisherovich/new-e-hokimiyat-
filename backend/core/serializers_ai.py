"""
AI Serializers.
"""

from rest_framework import serializers
from core.models import AIConversation, AIMessage, AIAction, AIReport, AITaskMonitor


class AIMessageSerializer(serializers.ModelSerializer):
    """AI Message Serializer"""
    
    class Meta:
        model = AIMessage
        fields = [
            'id', 'role', 'content', 'is_audio_message',
            'detected_intent', 'intent_confidence',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AIConversationSerializer(serializers.ModelSerializer):
    """AI Conversation Serializer"""
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = AIConversation
        fields = [
            'id', 'title', 'status', 'last_message',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        if last:
            return {
                'role': last.role,
                'content': last.content[:100] + '...' if len(last.content) > 100 else last.content,
                'created_at': last.created_at
            }
        return None


class AIConversationDetailSerializer(serializers.ModelSerializer):
    """AI Conversation Detail Serializer - with all messages"""
    messages = AIMessageSerializer(many=True, read_only=True)
    pending_actions = serializers.SerializerMethodField()
    
    class Meta:
        model = AIConversation
        fields = [
            'id', 'title', 'status', 'context',
            'messages', 'pending_actions',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_pending_actions(self, obj):
        actions = obj.actions.filter(status='PENDING')
        return AIActionSerializer(actions, many=True).data


class AIActionSerializer(serializers.ModelSerializer):
    """AI Action Serializer"""
    initiated_by_name = serializers.CharField(source='initiated_by.get_full_name', read_only=True)
    
    class Meta:
        model = AIAction
        fields = [
            'id', 'action_type', 'status', 'parameters', 'result',
            'initiated_by', 'initiated_by_name',
            'created_at', 'executed_at'
        ]
        read_only_fields = ['id', 'created_at', 'executed_at']


class AIReportSerializer(serializers.ModelSerializer):
    """AI Report Serializer"""
    requested_by_name = serializers.CharField(source='requested_by.get_full_name', read_only=True)
    
    class Meta:
        model = AIReport
        fields = [
            'id', 'report_type', 'title', 'summary', 'content',
            'period_start', 'period_end',
            'requested_by', 'requested_by_name',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AITaskMonitorSerializer(serializers.ModelSerializer):
    """AI Task Monitor Serializer"""
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_status = serializers.CharField(source='task.status', read_only=True)
    task_deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    
    class Meta:
        model = AITaskMonitor
        fields = [
            'id', 'task', 'task_title', 'task_status', 'task_deadline',
            'risk_level', 'needs_attention', 'ai_notes',
            'warning_sent', 'warning_sent_at',
            'comments_analyzed', 'comments_analysis_result',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChatInputSerializer(serializers.Serializer):
    """Chat input validation"""
    message = serializers.CharField(max_length=5000, required=True)


class AudioInputSerializer(serializers.Serializer):
    """Audio input validation"""
    audio = serializers.FileField(required=True)
