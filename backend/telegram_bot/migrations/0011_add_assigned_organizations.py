from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('telegram_bot', '0010_add_sender_user_to_appeal_message'),
        ('organizations', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='telegramappeal',
            name='assigned_organizations',
            field=models.ManyToManyField(
                blank=True,
                related_name='telegram_appeals',
                to='organizations.organization',
                verbose_name='Biriktirilgan tashkilotlar'
            ),
        ),
    ]
