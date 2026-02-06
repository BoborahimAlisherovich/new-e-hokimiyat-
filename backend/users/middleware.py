"""
Middleware for tracking user activity and last seen.
"""
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin


class UpdateLastSeenMiddleware(MiddlewareMixin):
    """
    Middleware to update user's last_seen timestamp on each request.
    This helps track online status in real-time.
    """
    
    def process_request(self, request):
        if request.user.is_authenticated:
            # Update last_seen asynchronously to avoid slowing down requests
            from users.models import User
            User.objects.filter(id=request.user.id).update(last_seen=timezone.now())
        return None
