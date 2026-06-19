from rest_framework import serializers
from .models import DirectMessage, ChatConversation
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()


class UserBriefSerializer(serializers.ModelSerializer):
    """Brief user information for chat."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name']


class DirectMessageSerializer(serializers.ModelSerializer):
    """Serializer for direct messages."""
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    sender = UserBriefSerializer(read_only=True)
    recipient = UserBriefSerializer(read_only=True)
    attachment = serializers.SerializerMethodField()

    class Meta:
        model = DirectMessage
        fields = [
            'id', 'sender', 'sender_name', 'recipient', 'recipient_name',
            'content', 'attachment', 'created_at', 'updated_at', 'is_read'
        ]
        read_only_fields = ['id', 'sender', 'sender_name', 'recipient', 'recipient_name', 'created_at', 'updated_at']

    def get_attachment(self, obj):
        """Attachment uchun to'liq URL qaytarish."""
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None


class DirectMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating direct messages."""

    class Meta:
        model = DirectMessage
        fields = ['content', 'attachment']


class ChatConversationSerializer(serializers.ModelSerializer):
    """Serializer for chat conversations."""
    participant1 = UserBriefSerializer(read_only=True)
    participant2 = UserBriefSerializer(read_only=True)
    last_message = DirectMessageSerializer(read_only=True)
    other_participant = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatConversation
        fields = [
            'id', 'participant1', 'participant2', 'other_participant',
            'created_at', 'updated_at', 'last_message', 'unread_count'
        ]

    def get_other_participant(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other = obj.get_other_participant(request.user)
            return UserBriefSerializer(other).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return DirectMessage.objects.filter(
                Q(sender=obj.participant1, recipient=obj.participant2) |
                Q(sender=obj.participant2, recipient=obj.participant1),
                recipient=request.user,
                is_read=False
            ).count()
        return 0
