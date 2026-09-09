from django.apps import AppConfig


class TelegramBotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'telegram_bot'

    def ready(self):
        # Murojaat holati o'zgarganda fuqaroni xabardor qilish signali.
        # Import shu yerda: model'lar yuklangandan keyin bo'lishi kerak.
        from . import signals  # noqa: F401
