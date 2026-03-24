from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name="Yaratilgan vaqt")),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name="Yangilangan vaqt")),
                ('title', models.CharField(max_length=255, verbose_name='Nomi')),
                ('summary', models.TextField(blank=True, verbose_name='Qisqa tavsif')),
                ('category', models.CharField(choices=[('MAHALLIY', 'Mahalliy loyiha'), ('XALQARO', 'Xalqaro loyiha'), ('DRIVER', 'Driver loyiha')], max_length=20, verbose_name='Kategoriya')),
                ('status', models.CharField(choices=[('REJA', 'Rejada'), ('TASDIQLANGAN', 'Tasdiqlangan'), ('IJRODA', 'Ijroda'), ('MONITORING', 'Monitoring'), ('YAKUNLANGAN', 'Yakunlangan')], default='REJA', max_length=20, verbose_name='Holati')),
                ('progress', models.PositiveSmallIntegerField(default=0, verbose_name='Progress foizi')),
                ('budget', models.CharField(blank=True, max_length=120, verbose_name='Byudjet/qiymat')),
                ('owner', models.CharField(blank=True, max_length=180, verbose_name="Mas'ul bo'lim")),
                ('start_date', models.DateField(blank=True, null=True, verbose_name='Boshlanish sanasi')),
                ('end_date', models.DateField(blank=True, null=True, verbose_name='Yakun sanasi')),
                ('sort_order', models.PositiveSmallIntegerField(default=0, verbose_name='Tartib')),
                ('is_active', models.BooleanField(default=True, verbose_name='Faol')),
            ],
            options={
                'verbose_name': 'Loyiha',
                'verbose_name_plural': 'Loyihalar',
                'ordering': ['category', 'sort_order', '-created_at'],
            },
        ),
    ]

