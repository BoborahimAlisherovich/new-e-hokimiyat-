"""
Django settings for E-Hokimiyat project.
"""

from pathlib import Path
from datetime import timedelta
import os
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env
load_dotenv(BASE_DIR / '.env')


def env_bool(name: str, default: bool = False) -> bool:
    """Read boolean env values safely."""
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def env_csv(name: str, default: str = '') -> list[str]:
    """Read comma separated env values."""
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(',') if item.strip()]


def parse_database_url(url: str) -> dict:
    """Convert DATABASE_URL into Django DATABASES['default'] config."""
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()

    if scheme in {'sqlite', 'sqlite3'}:
        db_path = parsed.path or '/db.sqlite3'
        # sqlite:///relative/path or sqlite:////abs/path
        if db_path.startswith('//'):
            db_name = db_path[1:]
        else:
            db_name = db_path
        return {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': db_name,
        }

    if scheme in {'postgres', 'postgresql', 'pgsql'}:
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': (parsed.path or '/').lstrip('/'),
            'USER': unquote(parsed.username or ''),
            'PASSWORD': unquote(parsed.password or ''),
            'HOST': parsed.hostname or 'localhost',
            'PORT': str(parsed.port or 5432),
        }

    raise ValueError(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-change-this-in-production-ehokimiyat-2026')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env_bool('DJANGO_DEBUG', env_bool('DEBUG', False))

ALLOWED_HOSTS = env_csv(
    'ALLOWED_HOSTS',
    os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0,api.ehokimiyat.uz,ehokimiyat.uz,www.ehokimiyat.uz')
)

# Application definition
INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'channels',
    'django_celery_beat',
    'django_celery_results',
    
    # Local apps
    'core',
    'users',
    'organizations',
    'tasks',
    'audit',
    'analytics',
    'notifications',
    'chat',
    'telegram_bot',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'users.middleware.UpdateLastSeenMiddleware',  # Track user online status
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # 'audit.middleware.AuditMiddleware',
]

ROOT_URLCONF = 'ehokimiyat.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'ehokimiyat.wsgi.application'

# Database - DATABASE_URL first, then USE_POSTGRES fallback
database_url = os.environ.get('DATABASE_URL', '').strip()
use_postgres = env_bool('USE_POSTGRES', False)

if database_url or use_postgres:
    # Prefer DATABASE_URL, otherwise use DB_* variables
    db_name = os.environ.get('DB_NAME', 'ehokimiyat')
    db_user = os.environ.get('DB_USER', 'postgres')
    db_password = os.environ.get('DB_PASSWORD', 'postgres')
    db_host = os.environ.get('DB_HOST', 'localhost')
    db_port = os.environ.get('DB_PORT', '5432')

    if database_url:
        # Minimal DATABASE_URL parsing without external deps
        # Expected: postgres://USER:PASSWORD@HOST:PORT/NAME
        try:
            from urllib.parse import urlparse

            parsed = urlparse(database_url)
            if parsed.scheme in ('postgres', 'postgresql'):
                db_name = (parsed.path or '').lstrip('/') or db_name
                db_user = parsed.username or db_user
                db_password = parsed.password or db_password
                db_host = parsed.hostname or db_host
                db_port = str(parsed.port or db_port)
        except Exception:
            pass

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': db_name,
            'USER': db_user,
            'PASSWORD': db_password,
            'HOST': db_host,
            'PORT': db_port,
        }
    }
else:
    # Local fallback (no Postgres configured)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'uz'
TIME_ZONE = 'Asia/Tashkent'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.LimitOffsetPagination',
    'PAGE_SIZE': 100,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=12),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# CORS Settings - E-Hokimiyat Production
CORS_ALLOWED_ORIGINS = env_csv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:5173,http://127.0.0.1:5173,http://192.168.200.86:3000,http://192.168.200.86:3001,http://10.185.6.214:3000,http://10.185.6.214:3001,https://be80eeee622c.ngrok-free.app,https://gameroom.uz,https://api.gameroom.uz,https://pytech.uz,https://www.pytech.uz,https://api.pytech.uz,https://ehokimiyat.uz,https://api.ehokimiyat.uz,https://www.ehokimiyat.uz'
)
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.ngrok-free\.app$",
    r"^https://.*\.ngrok\.io$",
    r"^http://192\.168\.\d+\.\d+:\d+$",  # Local network IPs
    r"^http://10\.\d+\.\d+\.\d+:\d+$",  # 10.x.x.x network IPs
    r"^https://.*\.ehokimiyat\.uz$",  # E-Hokimiyat subdomains
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CSRF_TRUSTED_ORIGINS = env_csv(
    'CSRF_TRUSTED_ORIGINS',
    'https://gameroom.uz,https://api.gameroom.uz,https://pytech.uz,https://www.pytech.uz,https://api.pytech.uz,https://ehokimiyat.uz,https://api.ehokimiyat.uz,https://www.ehokimiyat.uz'
)

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB

# Channels Configuration (WebSocket)
ASGI_APPLICATION = 'ehokimiyat.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [os.environ.get('REDIS_URL', 'redis://localhost:6379/0')],
        },
    },
}

# Celery Configuration
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Tashkent'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'tasks': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
(BASE_DIR / 'logs').mkdir(exist_ok=True)

# Jazzmin Configuration
JAZZMIN_SETTINGS = {
    # title of the window (Will default to current_admin_site.site_title if absent or None)
    "site_title": "E-Hokimiyat Admin",
    # Title on the login screen (19 chars max) (defaults to current_admin_site.site_header if absent or None)
    "site_header": "E-Hokimiyat",
    # Title on the brand (19 chars max) (defaults to current_admin_site.site_header if absent or None)
    "site_brand": "E-Hokimiyat Platformasi",
    # Logo to use for your site, must be present in static files, used for brand on top left
    # "site_logo": "images/logo.png",
    # Logo to use for your site, must be present in static files, used for login form logo (defaults to site_logo)
    # "login_logo": None,
    # Logo to use for login form in dark themes (defaults to login_logo)
    # "login_logo_dark": None,
    # CSS classes that are applied to the logo above
    "site_logo_classes": "img-circle",
    # Relative path to a favicon for your site, will default to site_logo if absent (ideally 32x32 px)
    # "site_icon": None,
    # Welcome text on the login screen
    "welcome_sign": "E-Hokimiyat tizimiga xush kelibsiz",
    # Copyright on the footer
    "copyright": "E-Hokimiyat Ltd",
    # List of model admins to search from the search bar, search bar omitted if excluded
    # If you want to use a single search field you dont need to use a list, you can use a simple string 
    "search_model": ["users.User", "tasks.Task"],
    # Field name on user model that contains avatar ImageField/URLField/Charfield or a callable that receives the user
    "user_avatar": None,

    ############
    # Top Menu #
    ############

    # Links to put along the top menu
    "topmenu_links": [
        # Url that gets reversed (Permissions can be added)
        {"name": "Bosh sahifa", "url": "admin:index", "permissions": ["auth.view_user"]},
        # external url that opens in a new window (Permissions can be added)
        {"name": "Saytga o'tish", "url": "http://localhost:3000", "new_window": True},
        # model admin to link to (Permissions checked against model)
        {"model": "users.User"},
        {"model": "tasks.Task"},
    ],

    #############
    # User Menu #
    #############

    # Additional links to include in the user menu on the top right ("app" url type is not allowed)
    "usermenu_links": [
        {"name": "Qo'llab-quvvatlash", "url": "https://t.me/ehokimiyat_support", "new_window": True},
        {"model": "users.User"}
    ],

    #############
    # Side Menu #
    #############

    # Whether to display the side menu
    "show_sidebar": True,
    # Whether to aut expand the menu
    "navigation_expanded": True,
    # Hide these apps when generating side menu e.g (auth)
    "hide_apps": [],
    # Hide these models when generating side menu (e.g auth.user)
    "hide_models": [],
    # List of apps (and/or models) to base side menu ordering off of (does not need to contain all apps/models)
    "order_with_respect_to": ["users", "organizations", "tasks", "appeals", "chat", "core"],
    # Custom links to append to app groups, keyed on app name
    # "custom_links": {
    #     "books": [{
    #         "name": "Make Messages", 
    #         "url": "make_messages", 
    #         "icon": "fas fa-comments",
    #         "permissions": ["books.view_book"]
    #     }]
    # },
    # Custom icons for side menu apps/models See https://fontawesome.com/icons?d=gallery&m=free&v=5.0.0,5.0.1,5.0.10,5.0.11,5.0.12,5.0.13,5.1.0,5.1.1,5.2.0,5.3.0,5.3.1,5.4.0,5.4.1,5.4.2,5.13.0,5.12.0,5.11.2,5.11.1,5.10.0,5.9.0,5.8.2,5.8.1,5.7.2,5.7.1,5.7.0,5.6.3,5.5.0,5.4.2
    # for the full list of 5.13.0 free icon classes
    "icons": {
        "auth": "fas fa-users-cog",
        "users.User": "fas fa-user",
        "users.Role": "fas fa-user-tag",
        "core.SystemSettings": "fas fa-cogs",
        "tasks.Task": "fas fa-tasks",
        "tasks.TaskCategory": "fas fa-list",
        "organizations.Organization": "fas fa-building",
        "chat.ChatRoom": "fas fa-comments",
        "notifications.Notification": "fas fa-bell",
    },
    # Icons that are used when one is not specified
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",

    #################
    # Related Modal #
    #################
    # Use modals instead of popups
    "related_modal_active": True,

    #############
    # UI Tweaks #
    #############
    # Relative paths to custom CSS/JS scripts (all optional)
    "custom_css": None,
    "custom_js": None,
    # Whether to link font from fonts.googleapis.com (use custom_css to supply font otherwise)
    "use_google_fonts_cdn": True,
    # Whether to show the UI customizer on the sidebar
    "show_ui_builder": False,

    "changeform_format": "horizontal_tabs",
    # override change forms on a per modeladmin basis
    "changeform_format_overrides": {"auth.user": "collapsible", "auth.group": "vertical_tabs"},
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-dark",
    "accent": "accent-primary",
    "navbar": "navbar-white navbar-light",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": False,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "default",
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success"
    }
}


# ==============================================================================
# AI SOZLAMALARI
# ==============================================================================

# AI Provider: 'openai' yoki 'anthropic'
AI_PROVIDER = os.environ.get('AI_PROVIDER', 'openai')

# AI API Key
AI_API_KEY = os.environ.get('AI_API_KEY', os.environ.get('OPENAI_API_KEY', ''))

# AI Model
AI_MODEL = os.environ.get('AI_MODEL', 'gpt-4o-mini')

# Whisper transkripsiya uchun til ('auto' bo'lsa avtomatik aniqlanadi)
AI_TRANSCRIPTION_LANGUAGE = os.environ.get('AI_TRANSCRIPTION_LANGUAGE', 'auto')
