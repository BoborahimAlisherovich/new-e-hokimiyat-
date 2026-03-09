"""
Migration: switch user auth to dedicated login/password fields.
"""

from django.db import migrations, models


def populate_login_from_pnfl(apps, schema_editor):
    User = apps.get_model('users', 'User')

    for user in User.objects.all().iterator():
        if user.login:
            continue

        base_login = user.pnfl or f"user-{user.pk}"
        login = base_login
        suffix = 1

        while User.objects.filter(login=login).exclude(pk=user.pk).exists():
            login = f"{base_login}-{suffix}"
            suffix += 1

        user.login = login
        user.save(update_fields=['login'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_avatar'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='login',
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=150,
                null=True,
                verbose_name='Login',
            ),
        ),
        migrations.RunPython(populate_login_from_pnfl, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='user',
            name='login',
            field=models.CharField(
                db_index=True,
                max_length=150,
                unique=True,
                verbose_name='Login',
            ),
        ),
        migrations.RemoveField(
            model_name='user',
            name='oneid_connected',
        ),
        migrations.AlterField(
            model_name='user',
            name='status',
            field=models.CharField(
                choices=[
                    ('DRAFT', 'Qoralama'),
                    ('KUTILMOQDA', 'Kutilmoqda'),
                    ('FAOL', 'Faol'),
                    ('BLOKLANGAN', 'Bloklangan'),
                    ('ARXIV', 'Arxiv'),
                ],
                default='FAOL',
                max_length=20,
                verbose_name='Holat',
            ),
        ),
    ]
