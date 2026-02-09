"""
Migration: Add avatar field to User model.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_last_seen'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='avatars/%Y/%m/',
                verbose_name='Profil rasmi',
            ),
        ),
    ]
