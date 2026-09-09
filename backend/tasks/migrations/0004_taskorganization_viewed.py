"""Tashkilot topshiriqni ochgan payt + «Ko'rib chiqilmoqda» amali.

Ilgari topshiriq yuborilgandan keyin tashkilot uni ko'rdimi yoki yo'qmi —
bilishning imkoni yo'q edi. `viewed_at`/`viewed_by` shu bo'shliqni yopadi:
ijrochi topshiriq sahifasini ochganda qator `YANGI` dan `TEKSHIRUVDA`
(«Ko'rib chiqilmoqda») ga o'tadi va topshiriq bergan odam buni ko'radi.
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0003_task_sector_and_tekshiruvda'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='taskorganization',
            name='viewed_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name="Ko'rilgan vaqt"),
        ),
        migrations.AddField(
            model_name='taskorganization',
            name='viewed_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='viewed_task_assignments',
                to=settings.AUTH_USER_MODEL,
                verbose_name="Kim ko'rdi",
            ),
        ),
        migrations.AlterField(
            model_name='taskexecution',
            name='action_type',
            field=models.CharField(
                choices=[
                    ('KORIB_CHIQILMOQDA', "Ko'rib chiqilmoqda"),
                    ('IJROGA_OLINDI', 'Ijroga olindi'),
                    ('HISOBOT_TOPSHIRILDI', 'Hisobot topshirildi'),
                    ('QAYTA_YUBORILDI', 'Qayta yuborildi'),
                    ('NAZORATDAN_YECHILDI', 'Nazoratdan yechildi'),
                    ('MUDDAT_UZAYTIRISH_SOROVI', "Muddat uzaytirish so'rovi"),
                    ('MUDDAT_UZAYTIRILDI', 'Muddat uzaytirildi'),
                    ('IZOH_QOSHILDI', "Izoh qo'shildi"),
                    ('FAYL_YUKLANDI', 'Fayl yuklandi'),
                    ('TAHRIRLANDI', 'Tahrirlandi'),
                ],
                max_length=30,
                verbose_name='Amal turi',
            ),
        ),
    ]
