"""
Kalendar ilovasining birinchi migratsiyasi.

DIQQAT: tortib olgandan keyin `python manage.py migrate` ishga tushirilishi
SHART. Aks holda `/api/calendar/...` so'rovlari «relation does not exist»
bilan 500 qaytaradi (loyihadagi eng ko'p uchragan nosozlik).
"""

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('organizations', '0001_initial'),
        ('tasks', '0004_taskorganization_viewed'),
    ]

    operations = [
        migrations.CreateModel(
            name='CalendarEvent',
            fields=[
                (
                    'id',
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan vaqt')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Yangilangan vaqt')),
                ('title', models.CharField(max_length=300, verbose_name='Sarlavha')),
                ('description', models.TextField(blank=True, default='', verbose_name='Tavsif')),
                ('location', models.CharField(blank=True, default='', max_length=300, verbose_name='Joy')),
                (
                    'kind',
                    models.CharField(
                        choices=[
                            ('ESLATMA', 'Eslatma'),
                            ('YIGILISH', "Yig'ilish"),
                            ('TADBIR', 'Tadbir'),
                            ('QABUL', 'Fuqarolar qabuli'),
                            ('BOSHQA', 'Boshqa'),
                        ],
                        default='ESLATMA',
                        max_length=20,
                        verbose_name='Turi',
                    ),
                ),
                ('start_at', models.DateTimeField(verbose_name='Boshlanish')),
                ('end_at', models.DateTimeField(blank=True, null=True, verbose_name='Tugash')),
                ('all_day', models.BooleanField(default=False, verbose_name="Kun bo'yi")),
                (
                    'visibility',
                    models.CharField(
                        choices=[
                            ('PRIVATE', "Faqat o'zim"),
                            ('ORGANIZATION', 'Tashkilotim'),
                            ('EVERYONE', 'Hamma xodimlar'),
                        ],
                        default='PRIVATE',
                        max_length=20,
                        verbose_name="Ko'rinishi",
                    ),
                ),
                (
                    'remind_before_minutes',
                    models.PositiveIntegerField(
                        default=60, verbose_name='Necha daqiqa oldin eslatilsin'
                    ),
                ),
                (
                    'reminded_at',
                    models.DateTimeField(blank=True, null=True, verbose_name='Eslatma yuborilgan vaqt'),
                ),
                (
                    'created_by',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='created_calendar_events',
                        to=settings.AUTH_USER_MODEL,
                        verbose_name='Yaratgan',
                    ),
                ),
                (
                    'organization',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='calendar_events',
                        to='organizations.organization',
                        verbose_name='Tashkilot',
                    ),
                ),
                (
                    'owner',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='calendar_events',
                        to=settings.AUTH_USER_MODEL,
                        verbose_name='Egasi',
                    ),
                ),
                (
                    'participants',
                    models.ManyToManyField(
                        blank=True,
                        related_name='shared_calendar_events',
                        to=settings.AUTH_USER_MODEL,
                        verbose_name='Ishtirokchilar',
                    ),
                ),
                (
                    'related_task',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='calendar_events',
                        to='tasks.task',
                        verbose_name="Bog'liq topshiriq",
                    ),
                ),
            ],
            options={
                'verbose_name': 'Kalendar yozuvi',
                'verbose_name_plural': 'Kalendar yozuvlari',
                'ordering': ['start_at'],
            },
        ),
        migrations.CreateModel(
            name='TaskDeadlineNotice',
            fields=[
                (
                    'id',
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan vaqt')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Yangilangan vaqt')),
                (
                    'kind',
                    models.CharField(
                        choices=[
                            ('REMINDER', 'Muddat eslatmasi'),
                            ('OVERDUE', "Muddat o'tgani haqida"),
                        ],
                        max_length=16,
                        verbose_name='Turi',
                    ),
                ),
                ('days_left', models.SmallIntegerField(verbose_name='Qolgan kun')),
                ('deadline_snapshot', models.DateTimeField(verbose_name="O'sha paytdagi muddat")),
                (
                    'recipients_count',
                    models.PositiveIntegerField(default=0, verbose_name='Qabul qiluvchilar'),
                ),
                (
                    'task_organization',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='deadline_notices',
                        to='tasks.taskorganization',
                        verbose_name='Topshiriq — tashkilot',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Muddat eslatmasi belgisi',
                'verbose_name_plural': 'Muddat eslatmasi belgilari',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='calendarevent',
            index=models.Index(fields=['owner', 'start_at'], name='agenda_owner_start_idx'),
        ),
        migrations.AddIndex(
            model_name='calendarevent',
            index=models.Index(fields=['start_at'], name='agenda_start_idx'),
        ),
        migrations.AddIndex(
            model_name='calendarevent',
            index=models.Index(fields=['visibility', 'start_at'], name='agenda_vis_start_idx'),
        ),
        migrations.AddIndex(
            model_name='taskdeadlinenotice',
            index=models.Index(
                fields=['task_organization', 'kind'], name='agenda_notice_to_kind_idx'
            ),
        ),
        migrations.AddConstraint(
            model_name='taskdeadlinenotice',
            constraint=models.UniqueConstraint(
                fields=('task_organization', 'kind', 'days_left', 'deadline_snapshot'),
                name='agenda_deadline_notice_once',
            ),
        ),
    ]
