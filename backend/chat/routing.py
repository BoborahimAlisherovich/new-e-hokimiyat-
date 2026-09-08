"""
WebSocket URL routing for real-time chat.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/tasks/(?P<task_id>[0-9a-f-]+)/chat/$', consumers.TaskChatConsumer.as_asgi()),
    re_path(r'ws/chat/$', consumers.DirectChatConsumer.as_asgi()),
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
]
