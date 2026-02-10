from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('telegram_bot', '0009_add_auto_response_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='botsettings',
            name='webhook_secret',
            field=models.CharField(blank=True, default='', max_length=128, verbose_name='Webhook secret'),
        ),
    ]
