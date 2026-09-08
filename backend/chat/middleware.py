"""
JWT authentication middleware for Django Channels.
Extracts the access token from the WebSocket query string (?token=...) and
attaches the authenticated user to scope['user'].
"""
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]
        scope["user"] = await self.get_user(token)
        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user(self, token):
        if not token:
            return AnonymousUser()
        try:
            access = AccessToken(token)
            user_id = access["user_id"]
            User = get_user_model()
            return User.objects.get(pk=user_id)
        except Exception:
            return AnonymousUser()
