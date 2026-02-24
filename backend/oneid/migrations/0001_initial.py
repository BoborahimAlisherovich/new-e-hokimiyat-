"""
Initial migration for OneID integration.

Generated manually for OneID models.
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0001_initial'),  # User modeliga bog'liq
    ]

    operations = [
        migrations.CreateModel(
            name='OneIDToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan vaqt')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Yangilangan vaqt')),
                ('access_token', models.TextField(help_text='OneID access token', verbose_name='Access Token')),
                ('refresh_token', models.TextField(blank=True, help_text='OneID refresh token', null=True, verbose_name='Refresh Token')),
                ('expires_at', models.DateTimeField(blank=True, help_text='Token muddati', null=True, verbose_name='Token muddati')),
                ('oneid_user_id', models.CharField(blank=True, max_length=255, verbose_name='OneID User ID')),
                ('session_id', models.UUIDField(default=uuid.uuid4, verbose_name='Sessiya ID')),
                ('is_active', models.BooleanField(default=True, verbose_name='Aktiv')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='oneid_token', to=settings.AUTH_USER_MODEL, verbose_name='Foydalanuvchi')),
            ],
            options={
                'verbose_name': 'OneID Token',
                'verbose_name_plural': 'OneID Tokenlar',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='OneIDSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan vaqt')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Yangilangan vaqt')),
                ('session_id', models.UUIDField(default=uuid.uuid4, unique=True, verbose_name='Sessiya ID')),
                ('state', models.CharField(max_length=255, unique=True, verbose_name='State')),
                ('authorization_code', models.CharField(blank=True, max_length=500, verbose_name='Authorization Code')),
                ('pnfl', models.CharField(blank=True, max_length=14, verbose_name='PNFL')),
                ('status', models.CharField(choices=[('PENDING', 'Kutilmoqda'), ('SUCCESS', 'Muvaffaqiyatli'), ('FAILED', 'Xatolik'), ('EXPIRED', 'Muddati o\'tgan')], default='PENDING', max_length=20, verbose_name='Status')),
                ('error_code', models.CharField(blank=True, max_length=50, verbose_name='Xatolik kodi')),
                ('error_message', models.TextField(blank=True, verbose_name='Xatolik xabari')),
                ('redirect_uri', models.URLField(verbose_name='Redirect URI')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True, verbose_name='IP manzil')),
                ('user_agent', models.TextField(blank=True, verbose_name='User Agent')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='oneid_sessions', to=settings.AUTH_USER_MODEL, verbose_name='Foydalanuvchi')),
            ],
            options={
                'verbose_name': 'OneID Sessiya',
                'verbose_name_plural': 'OneID Sessiyalar',
                'ordering': ['-created_at'],
                'indexes': [
                    migrations.models.Index(fields=['session_id'], name='oneid_on_session_id_idx'),
                    migrations.models.Index(fields=['state'], name='oneid_on_state_idx'),
                    migrations.models.Index(fields=['status'], name='oneid_on_status_idx'),
                    migrations.models.Index(fields=['pnfl'], name='oneid_on_pnfl_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='OneIDUserLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan vaqt')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Yangilangan vaqt')),
                ('action', models.CharField(choices=[('LOGIN', 'Login'), ('LOGOUT', 'Logout'), ('DATA_SYNC', 'Ma\'lumotlarni sinxronizatsiya'), ('TOKEN_REFRESH', 'Token yangilash'), ('PROFILE_UPDATE', 'Profil yangilash')], max_length=50, verbose_name='Operatsiya')),
                ('oneid_user_id', models.CharField(blank=True, max_length=255, verbose_name='OneID User ID')),
                ('old_data', models.JSONField(blank=True, default=dict, verbose_name='Eski ma\'lumotlar')),
                ('new_data', models.JSONField(blank=True, default=dict, verbose_name='Yangi ma\'lumotlar')),
                ('success', models.BooleanField(default=True, verbose_name='Muvaffaqiyatli')),
                ('error_message', models.TextField(blank=True, verbose_name='Xatolik xabari')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True, verbose_name='IP manzil')),
                ('user_agent', models.TextField(blank=True, verbose_name='User Agent')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='oneid_logs', to=settings.AUTH_USER_MODEL, verbose_name='Foydalanuvchi')),
            ],
            options={
                'verbose_name': 'OneID Log',
                'verbose_name_plural': 'OneID Loglar',
                'ordering': ['-created_at'],
                'indexes': [
                    migrations.models.Index(fields=['user', 'action'], name='oneid_on_user_action_idx'),
                    migrations.models.Index(fields=['created_at'], name='oneid_on_created_at_idx'),
                ],
            },
        ),
    ]
