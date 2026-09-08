"""
WebSocket consumers for real-time chat and notifications.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.db.models import Q


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
    """
    To'g'ridan-to'g'ri chat uchun WebSocket.

    Bu konsumer ilgari juda kam ish qilardi: faqat uchta hodisani uzatardi
    va `mark_read` amalini bajarganda hech kimga xabar bermasdi (shuning
    uchun jo'natuvchining ikki belgisi (✓✓) hech qachon yangilanmasdi).
    Presence esa umuman socket'ga bog'lanmagan edi — `last_seen` faqat HTTP
    so'rovlarda yangilanardi va frontend foydalanuvchilar ro'yxatini qayta
    so'ramaganidan onlayn nuqtalar sahifa yuklangan holatda qotib qolardi.

    KLIENT -> SERVER amallari:
      {action: "ping", ts}                              -> pong
      {action: "mark_read", user_id, last_message_id?}  -> o'qilgan deb belgilash
      {action: "typing", user_id, is_typing}            -> suhbatdoshga yozilmoqda
      {action: "resync", since_id}                      -> uzilishdan keyingi bo'shliq

    SERVER -> KLIENT hodisalari (services.py dan):
      direct_message · conversation_updated · message_edited ·
      message_deleted · messages_read · delivered · chat_typing ·
      chat_presence · pong · resync_result · ready
    """

    async def connect(self):
        self.user = self.scope.get('user')

        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.room_group_name = f'direct_chat_{self.user.id}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Klient socket tayyor bo'lganini bilishi kerak (reconnect mantiqi uchun)
        await self.send(text_data=json.dumps({
            'type': 'ready',
            'user_id': str(self.user.id),
        }))

        # Onlayn holat + ulanish paytida yetkazilmagan xabarlarni belgilash
        await self._set_presence(True)
        await self._mark_delivered()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        if getattr(self, 'user', None) and self.user.is_authenticated:
            await self._set_presence(False)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        action = data.get('action')

        if action == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong', 'ts': data.get('ts')}))
            return

        if action in ('mark_read', 'read'):
            peer = data.get('user_id')
            if peer:
                await self._mark_read(peer, data.get('last_message_id'))
            return

        if action == 'typing':
            peer = data.get('user_id')
            if peer:
                await self._typing(peer, bool(data.get('is_typing', True)))
            return

        if action == 'resync':
            await self._resync(data.get('since_id'), data.get('user_id'))
            return

    # ------------------------------------------------------------ hodisalar
    # Har bir handler nomi services.py dagi payload['type'] bilan bir xil.

    async def _forward(self, event):
        await self.send(text_data=json.dumps(event))

    async def direct_message(self, event):
        await self._forward(event)

    async def conversation_updated(self, event):
        await self._forward(event)

    async def message_edited(self, event):
        await self._forward(event)

    async def message_deleted(self, event):
        await self._forward(event)

    async def messages_read(self, event):
        await self._forward(event)

    async def delivered(self, event):
        await self._forward(event)

    async def chat_typing(self, event):
        await self._forward(event)

    async def chat_presence(self, event):
        await self._forward(event)

    # ------------------------------------------------------------- yordamchi

    @database_sync_to_async
    def _set_presence_sync(self, is_online):
        from . import services

        try:
            type(self.user).objects.filter(pk=self.user.pk).update(last_seen=timezone.now())
            self.user.last_seen = timezone.now()
        except Exception:
            pass
        services.broadcast_presence(self.user, is_online)

    async def _set_presence(self, is_online):
        await self._set_presence_sync(is_online)

    @database_sync_to_async
    def _mark_read_sync(self, other_user_id, up_to_id):
        from . import services

        ids = services.mark_conversation_read(
            reader=self.user,
            other_user_id=other_user_id,
            up_to_id=up_to_id,
        )
        if ids:
            services.broadcast_messages_read(
                self.user.id, other_user_id, ids, last_message_id=max(ids)
            )
        return ids

    async def _mark_read(self, other_user_id, up_to_id=None):
        await self._mark_read_sync(other_user_id, up_to_id)

    @database_sync_to_async
    def _mark_delivered_sync(self):
        from collections import defaultdict
        from . import services
        from .models import DirectMessage

        ids = services.mark_delivered(recipient=self.user)
        if not ids:
            return
        by_sender = defaultdict(list)
        for mid, sender_id in DirectMessage.objects.filter(
            id__in=ids
        ).values_list('id', 'sender_id'):
            by_sender[sender_id].append(mid)
        for sender_id, message_ids in by_sender.items():
            services.broadcast_delivered(self.user.id, sender_id, message_ids)

    async def _mark_delivered(self):
        await self._mark_delivered_sync()

    @database_sync_to_async
    def _resync_sync(self, since_id, other_user_id):
        """
        Uzilish davomida kelgan xabarlarni qaytaradi. Ilgani reconnect
        umuman yo'q edi: socket uzilsa chat jim o'lardi va sahifa qo'lda
        yangilanmaguncha xabarlar yetib kelmasdi.
        """
        from . import services
        from .models import DirectMessage

        try:
            since = int(since_id)
        except (TypeError, ValueError):
            return []

        qs = services.message_queryset().filter(
            Q(sender=self.user) | Q(recipient=self.user),
            id__gt=since,
        )
        if other_user_id:
            try:
                other = type(self.user).objects.get(pk=other_user_id)
                qs = qs.filter(services.pair_filter(self.user, other))
            except Exception:
                pass

        rows = list(qs.order_by('id')[:200])
        return [services.serialize_message(m) for m in rows]

    async def _resync(self, since_id, other_user_id=None):
        messages = await self._resync_sync(since_id, other_user_id)
        await self.send(text_data=json.dumps({
            'type': 'resync_result',
            'messages': messages,
        }))
