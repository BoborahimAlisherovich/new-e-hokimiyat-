from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('telegram_bot', '0021_manual_appeal_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='telegramappeal',
            name='citizen_gender',
            field=models.CharField(
                blank=True,
                choices=[('male', 'Erkak'), ('female', 'Ayol')],
                default='',
                max_length=10,
                verbose_name="Jinsi (qo'lda)",
            ),
        ),
        migrations.AddField(
            model_name='telegramappeal',
            name='citizen_language',
            field=models.CharField(
                choices=[('uz', "O'zbekcha"), ('ru', 'Русский'), ('en', 'English')],
                default='uz',
                max_length=5,
                verbose_name="Til (qo'lda)",
            ),
        ),
    ]

