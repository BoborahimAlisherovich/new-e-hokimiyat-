from rest_framework import viewsets, status
from typing import Any, Dict, cast
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.db.models.query import QuerySet
from django.contrib.auth import get_user_model
from .models import DirectMessage, ChatConversation
from .serializers import (
    DirectMessageSerializer,
    DirectMessageCreateSerializer,
    ChatConversationSerializer,
)

User = get_user_model()

# Maksimal fayl hajmi (50MB)
MAX_FILE_SIZE = 50 * 1024 * 1024

# Ruxsat etilgan fayl turlari
ALLOWED_FILE_TYPES = {
    # Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
    # Videos
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    # Audio
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a',
    # Documents
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
}


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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self) -> QuerySet[DirectMessage]:  # type: ignore[reportIncompatibleMethodOverride]
        """Get messages for the current user."""
        return DirectMessage.objects.filter(
            Q(sender=self.request.user) | Q(recipient=self.request.user)
        ).order_by('-created_at')

    def validate_attachment(self, file):
        """Fayl hajmi va turini tekshirish."""
        if not file:
            return None
        
        # Hajm tekshiruvi
        if file.size > MAX_FILE_SIZE:
            raise ValueError(f"Fayl hajmi 50MB dan oshmasligi kerak. Hozirgi: {file.size / (1024*1024):.1f}MB")
        
        # Tur tekshiruvi
        content_type = file.content_type
        if content_type not in ALLOWED_FILE_TYPES:
            raise ValueError(f"Ruxsat etilmagan fayl turi: {content_type}")
        
        return file

    def create(self, request, *args, **kwargs):
        """Send a message to a user."""
        recipient_id = request.data.get('recipient_id')
        if not recipient_id:
            return Response(
                {'detail': 'recipient_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        recipient = get_object_or_404(User, id=recipient_id)
        
        # Fayl validatsiyasi
        attachment = request.FILES.get('attachment')
        try:
            attachment = self.validate_attachment(attachment)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        content = request.data.get('content', '')
        
        # Agar content va attachment ikkalasi ham bo'sh bo'lsa
        if not content.strip() and not attachment:
            return Response(
                {'detail': 'content yoki attachment talab qilinadi'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message = DirectMessage.objects.create(
            sender=request.user,
            recipient=recipient,
            content=content,
            attachment=attachment,
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
        
        # Fayl validatsiyasi
        attachment = request.FILES.get('attachment')
        try:
            attachment = self.validate_attachment(attachment)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        content = request.data.get('content', '')
        
        # Agar content va attachment ikkalasi ham bo'sh bo'lsa
        if not content.strip() and not attachment:
            return Response(
                {'detail': 'content yoki attachment talab qilinadi'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message = DirectMessage.objects.create(
            sender=request.user,
            recipient=recipient,
            content=content,
            attachment=attachment,
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

    @action(detail=True, methods=['delete'], url_path='delete')
    def delete_message(self, request, pk=None):
        """Delete a message (only sender can delete their own message)."""
        message = get_object_or_404(DirectMessage, pk=pk)
        
        # Faqat o'zi yuborgan xabarni o'chirishi mumkin
        if message.sender != request.user:
            return Response(
                {'detail': 'Siz faqat o\'zingiz yuborgan xabarlarni o\'chira olasiz'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Agar bu xabar conversation.last_message bo'lsa, uni yangilash kerak
        try:
            conversation = ChatConversation.objects.filter(
                Q(participant1=message.sender, participant2=message.recipient) |
                Q(participant1=message.recipient, participant2=message.sender)
            ).first()
            
            if conversation and conversation.last_message_id == message.id:
                # Keyingi oxirgi xabarni topish
                next_last_message = DirectMessage.objects.filter(
                    Q(sender=message.sender, recipient=message.recipient) |
                    Q(sender=message.recipient, recipient=message.sender)
                ).exclude(id=message.id).order_by('-created_at').first()
                
                conversation.last_message = next_last_message
                conversation.save()
        except Exception:
            pass  # Conversation yangilanmasa ham xabar o'chirilsin
        
        message.delete()
        return Response({'status': 'message deleted'}, status=status.HTTP_200_OK)
