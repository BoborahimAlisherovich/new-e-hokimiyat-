"""
WebSocket consumers for real-time chat and notifications.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class TaskChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for task-specific chat.
    
    Each task has its own chat room.
    Messages are persisted to the database and broadcast to all connected users.
    """
    
    async def connect(self):
        self.task_id = self.scope['url_route']['kwargs']['task_id']
        self.room_group_name = f'task_chat_{self.task_id}'
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        
        # Verify user has access to this task
        has_access = await self.check_task_access()
        if not has_access:
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send recent messages
        messages = await self.get_recent_messages()
        await self.send(text_data=json.dumps({
            'type': 'history',
            'messages': messages
        }))
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'text')
        content = data.get('content', '')
        
        if not content.strip():
            return
        
        # Save message to database
        message = await self.save_message(content, message_type)
        
        # Broadcast to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
            }
        )
    
    async def chat_message(self, event):
        """Handle chat message event."""
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message']
        }))
    
    @database_sync_to_async
    def check_task_access(self):
        """Check if user has access to this task."""
        from tasks.models import Task
        
        try:
            task = Task.objects.get(id=self.task_id)
            
            # Hokim and Hokimlik mas'uli can access all tasks
            if self.user.role in ['HOKIM', 'HOKIMLIK_MASUL', 'ADMIN']:
                return True
            
            # Check if user's organization is assigned to this task
            if self.user.organization:
                return task.assigned_organizations.filter(
                    organization=self.user.organization
                ).exists()
            
            return False
        except Task.DoesNotExist:
            return False
    
    @database_sync_to_async
    def get_recent_messages(self, limit=50):
        """Get recent messages for this task."""
        from tasks.models import TaskMessage
        
        messages = TaskMessage.objects.filter(
            task_id=self.task_id
        ).select_related('sender').order_by('-created_at')[:limit]
        
        return [
            {
                'id': str(msg.id),
                'content': msg.content,
                'message_type': msg.message_type,
                'sender': {
                    'id': str(msg.sender.id),
                    'name': msg.sender.full_name,
                    'role': msg.sender.role,
                } if msg.sender else None,
                'attachment': {
                    'id': str(msg.attachment.id),
                    'file': msg.attachment.file.url if msg.attachment else None,
                    'file_name': msg.attachment.file_name if msg.attachment else None,
                    'file_type': msg.attachment.file_type if msg.attachment else None,
                    'file_size': msg.attachment.file_size if msg.attachment else None,
                } if msg.attachment else None,
                'created_at': msg.created_at.isoformat(),
            }
            for msg in reversed(messages)
        ]
    
    @database_sync_to_async
    def save_message(self, content, message_type='TEXT'):
        """Save message to database."""
        from tasks.models import Task, TaskMessage
        from notifications.services import notify_task_chat_message
        
        task = Task.objects.get(id=self.task_id)
        
        message = TaskMessage.objects.create(
            task=task,
            sender=self.user,
            content=content,
            message_type=message_type.upper()
        )

        notify_task_chat_message(
            task=task,
            sender=self.user,
            preview=content,
            link=f"/dashboard/tasks/{task.id}",
        )
        
        return {
            'id': str(message.id),
            'content': message.content,
            'message_type': message.message_type,
            'sender': {
                'id': str(self.user.id),
                'name': self.user.full_name,
                'role': self.user.role,
            },
            'created_at': message.created_at.isoformat(),
        }


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    
    Each user has their own notification channel.
    """
    
    async def connect(self):
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        
        self.room_group_name = f'notifications_{self.user.id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send unread count
        unread_count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': unread_count
        }))
    
    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        
        if action == 'mark_read':
            notification_id = data.get('notification_id')
            await self.mark_notification_read(notification_id)
            
            unread_count = await self.get_unread_count()
            await self.send(text_data=json.dumps({
                'type': 'unread_count',
                'count': unread_count
            }))
        
        elif action == 'mark_all_read':
            await self.mark_all_read()
            await self.send(text_data=json.dumps({
                'type': 'unread_count',
                'count': 0
            }))
    
    async def notification_message(self, event):
        """Handle new notification event."""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))
        unread_count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': unread_count
        }))
    
    @database_sync_to_async
    def get_unread_count(self):
        """Get unread notification count."""
        from notifications.models import Notification
        return Notification.objects.filter(
            user=self.user,
            is_read=False
        ).count()
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark a notification as read."""
        from notifications.models import Notification
        try:
            notification = Notification.objects.get(id=notification_id, user=self.user)
            notification.mark_as_read()
        except Notification.DoesNotExist:
            pass
    
    @database_sync_to_async
    def mark_all_read(self):
        """Mark all notifications as read."""
        from notifications.models import Notification
        Notification.objects.filter(
            user=self.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())


class DirectChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for direct user-to-user chat updates."""

    async def connect(self):
        self.user = self.scope.get('user')

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.room_group_name = f'direct_chat_{self.user.id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if data.get('action') == 'mark_read':
            other_user_id = data.get('user_id')
            if other_user_id:
                await self.mark_messages_as_read(other_user_id)

    async def direct_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'direct_message',
            'message': event['message'],
        }))

    async def message_deleted(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
            'other_user_id': event['other_user_id'],
        }))

    async def messages_read(self, event):
        await self.send(text_data=json.dumps({
            'type': 'messages_read',
            'user_id': event['user_id'],
            'message_ids': event['message_ids'],
        }))

    @database_sync_to_async
    def mark_messages_as_read(self, other_user_id):
        from .models import DirectMessage

        unread_messages = list(
            DirectMessage.objects.filter(
                sender_id=other_user_id,
                recipient=self.user,
                is_read=False,
            ).values_list('id', flat=True)
        )
        if not unread_messages:
            return

        DirectMessage.objects.filter(id__in=unread_messages).update(is_read=True)
