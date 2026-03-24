from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0002_seed_projects'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectHistory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name="Yangilangan vaqt")),
                ('action_type', models.CharField(choices=[('CREATED', 'Yaratildi'), ('UPDATED', 'Yangilandi'), ('STATUS_CHANGED', "Holati o'zgardi"), ('PROGRESS_CHANGED', 'Progress yangilandi'), ('DELETED', "O'chirildi")], max_length=30, verbose_name='Amal turi')),
                ('title', models.CharField(max_length=255, verbose_name='Sarlavha')),
                ('description', models.TextField(blank=True, verbose_name='Tavsif')),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='project_history_entries', to=settings.AUTH_USER_MODEL, verbose_name='Amalni bajargan foydalanuvchi')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='history_entries', to='projects.project', verbose_name='Loyiha')),
            ],
            options={
                'verbose_name': 'Loyiha tarixi',
                'verbose_name_plural': 'Loyiha tarixlari',
                'ordering': ['-created_at'],
            },
        ),
    ]
