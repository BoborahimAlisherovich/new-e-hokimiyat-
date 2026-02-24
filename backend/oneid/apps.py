"""
OneID Django app configuration.
"""

from django.apps import AppConfig


class OneidConfig(AppConfig):
    """OneID app configuration."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'oneid'
    verbose_name = 'OneID Integratsiya'
    
    def ready(self):
        """App is ready."""
        # Import signal handlers
        try:
            from . import signals
        except ImportError:
            pass
