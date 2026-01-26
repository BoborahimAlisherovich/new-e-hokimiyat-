from rest_framework import viewsets, status
from typing import Any, Dict, cast
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.db.models.query import QuerySet
from .models import DirectMessage, ChatConversation
from .serializers import (
    DirectMessageSerializer,
    DirectMessageCreateSerializer,
    ChatConversationSerializer,
)


class DirectMessageViewSet(viewsets.ModelViewSet):
    """
    API for direct messages between users.
    
    - List conversations
    - Retrieve conversation messages
    - Send message to a user
    """
    serializer_class = DirectMessageSerializer
    queryset = DirectMessage.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> QuerySet[DirectMessage]:  # type: ignore[reportIncompatibleMethodOverride]
        """Get messages for the current user."""
        return DirectMessage.objects.filter(
            Q(sender=self.request.user) | Q(recipient=self.request.user)
        ).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """Send a message to a user."""
        recipient_id = request.data.get('recipient_id')
        if not recipient_id:
            return Response(
                {'detail': 'recipient_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        recipient = get_object_or_404(User, id=recipient_id)
        
        serializer = DirectMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = cast(Dict[str, Any], serializer.validated_data or {})
        message = DirectMessage.objects.create(
            sender=request.user,
            recipient=recipient,
            content=data.get('content', ''),
            attachment=data.get('attachment'),
        )

        # Update conversation
        conversation = ChatConversation.get_or_create_conversation(request.user, recipient)
        conversation.last_message = message
        conversation.save()

        return Response(
            DirectMessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='conversations')
    def conversations(self, request):
        """Get all conversations for the current user."""
        conversations = ChatConversation.objects.filter(
            Q(participant1=request.user) | Q(participant2=request.user)
        ).order_by('-updated_at')
        
        serializer = ChatConversationSerializer(
            conversations,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='conversation/(?P<user_id>[^/.]+)')
    def conversation_with_user(self, request, user_id=None):
        """Get conversation with a specific user."""
        other_user = get_object_or_404(User, id=user_id)
        conversation = ChatConversation.get_or_create_conversation(request.user, other_user)
        
        # Get messages in this conversation
        messages = DirectMessage.objects.filter(
            Q(sender=request.user, recipient=other_user) |
            Q(sender=other_user, recipient=request.user)
        ).order_by('-created_at')
        
        # Mark received messages as read
        messages.filter(recipient=request.user).update(is_read=True)
        
        serializer = DirectMessageSerializer(
            messages,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='message/(?P<user_id>[^/.]+)')
    def send_message(self, request, user_id=None):
        """Send a message to a specific user."""
        recipient = get_object_or_404(User, id=user_id)
        
        serializer = DirectMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = cast(Dict[str, Any], serializer.validated_data or {})
        message = DirectMessage.objects.create(
            sender=request.user,
            recipient=recipient,
            content=data.get('content', ''),
            attachment=data.get('attachment'),
        )

        # Update conversation
        conversation = ChatConversation.get_or_create_conversation(request.user, recipient)
        conversation.last_message = message
        conversation.save()

        return Response(
            DirectMessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request):
        """Mark messages as read."""
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'detail': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        DirectMessage.objects.filter(
            recipient=request.user,
            sender_id=user_id,
            is_read=False
        ).update(is_read=True)

        return Response({'status': 'messages marked as read'})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """Get unread message count."""
        count = DirectMessage.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        return Response({'unread_count': count})


# Import User model at the end to avoid circular imports
from django.contrib.auth import get_user_model
User = get_user_model()
