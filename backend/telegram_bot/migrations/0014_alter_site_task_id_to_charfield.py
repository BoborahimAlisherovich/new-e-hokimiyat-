from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('telegram_bot', '0013_add_bandlik_category'),
    ]

    operations = [
        migrations.AlterField(
            model_name='telegramappeal',
            name='site_task_id',
            field=models.CharField(blank=True, max_length=64, null=True, verbose_name='Saytdagi topshiriq ID'),
        ),
    ]
