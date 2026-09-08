"""
WSGI config for E-Hokimiyat project.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ehokimiyat.settings')

application = get_wsgi_application()
