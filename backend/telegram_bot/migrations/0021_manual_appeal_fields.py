from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('telegram_bot', '0020_appealcategory_responsible_organizations'),
    ]

    operations = [
        migrations.AlterField(
            model_name='telegramappeal',
            name='telegram_user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='appeals',
                to='telegram_bot.telegramuser',
                verbose_name='Telegram foydalanuvchi',
            ),
        ),
        migrations.AddField(
            model_name='telegramappeal',
            name='citizen_name',
            field=models.CharField(blank=True, default='', max_length=200, verbose_name="Fuqaro F.I.Sh (qo'lda)"),
        ),
        migrations.AddField(
            model_name='telegramappeal',
            name='citizen_phone',
            field=models.CharField(
                blank=True,
                default='',
                max_length=13,
                validators=[
                    django.core.validators.RegexValidator(
                        message="Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak",
                        regex='^\\+998[0-9]{9}$',
                    )
                ],
                verbose_name="Telefon raqam (qo'lda)",
            ),
        ),
        migrations.AddField(
            model_name='telegramappeal',
            name='citizen_region',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='manual_appeals',
                to='telegram_bot.botregion',
                verbose_name="Hudud (qo'lda)",
            ),
        ),
        migrations.AddField(
            model_name='telegramappeal',
            name='created_by_user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_telegram_appeals',
                to=settings.AUTH_USER_MODEL,
                verbose_name="Qo'lda kiritgan foydalanuvchi",
            ),
        ),
    ]

