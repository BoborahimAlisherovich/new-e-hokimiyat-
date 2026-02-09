"""
Migration: Add auto-response fields to BotSettings and TelegramAppeal

BotSettings:
  - auto_response_enabled: AI avtomatik javob yoqilganmi
  - auto_response_timeout_minutes: Admin javob berish kutish vaqti (daqiqa)

TelegramAppeal:
  - admin_notified_at: Adminlarga xabar yuborilgan vaqt
  - ai_auto_responded: AI avtomatik javob berganmi
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('telegram_bot', '0008_add_default_data'),
    ]

    operations = [
        # BotSettings - Auto-response settings
        migrations.AddField(
            model_name='botsettings',
            name='auto_response_enabled',
            field=models.BooleanField(
                default=True,
                help_text='Admin javob bermasa AI avtomatik javob beradi',
                verbose_name='AI avtomatik javob',
            ),
        ),
        migrations.AddField(
            model_name='botsettings',
            name='auto_response_timeout_minutes',
            field=models.PositiveIntegerField(
                default=5,
                help_text="Admin javob berish uchun kutish vaqti (daqiqada). O'tgandan so'ng AI javob beradi.",
                verbose_name='Kutish vaqti (daqiqa)',
            ),
        ),
        
        # TelegramAppeal - Tracking fields
        migrations.AddField(
            model_name='telegramappeal',
            name='admin_notified_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name='Adminlarga xabar yuborilgan vaqt',
            ),
        ),
        migrations.AddField(
            model_name='telegramappeal',
            name='ai_auto_responded',
            field=models.BooleanField(
                default=False,
                verbose_name='AI avtomatik javob bergan',
            ),
        ),
    ]
