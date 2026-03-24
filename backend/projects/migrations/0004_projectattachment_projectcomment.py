from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0003_projecthistory'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectAttachment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name="Yangilangan vaqt")),
                ('file', models.FileField(upload_to='projects/attachments/%Y/%m/', verbose_name='Fayl')),
                ('file_name', models.CharField(blank=True, max_length=255, verbose_name='Fayl nomi')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attachments', to='projects.project', verbose_name='Loyiha')),
                ('uploaded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='uploaded_project_attachments', to=settings.AUTH_USER_MODEL, verbose_name='Yuklagan foydalanuvchi')),
            ],
            options={
                'verbose_name': 'Loyiha fayli',
                'verbose_name_plural': 'Loyiha fayllari',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ProjectComment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name="Yangilangan vaqt")),
                ('message', models.TextField(verbose_name='Xabar')),
                ('author', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='project_comments', to=settings.AUTH_USER_MODEL, verbose_name='Muallif')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='projects.project', verbose_name='Loyiha')),
            ],
            options={
                'verbose_name': 'Loyiha kommentariyasi',
                'verbose_name_plural': 'Loyiha kommentariyalari',
                'ordering': ['created_at'],
            },
        ),
    ]
