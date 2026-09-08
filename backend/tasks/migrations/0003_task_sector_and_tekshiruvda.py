"""Task.sector (Soha) qo'shish va TEKSHIRUVDA holatini choices ga kiritish.

- Task.sector / RecurringTask.sector -> organizations.Sector (FK, PROTECT, nullable)
- Task.status / TaskOrganization.status choices ga 'TEKSHIRUVDA' qo'shildi
  (bu qiymat bazaga yozilardi, lekin choices da yo'q edi)
- TaskExecution.action_type choices ga 'TAHRIRLANDI' qo'shildi
- Eski erkin matnli `category` kodlari Sector yozuvlariga ko'chiriladi
  (`category` ustuni o'chirilmaydi, orqaga moslik uchun saqlanadi)
"""

import django.db.models.deletion
from django.db import migrations, models


# Eski `category` kodlari -> Soha nomlari
CATEGORY_TO_SECTOR = {
    'TA_LIM': "Ta'lim",
    'SOG_LIQNI_SAQLASH': "Sog'liqni saqlash",
    'IJTIMOIY': 'Ijtimoiy himoya',
    'INFRASTRUKTURA': 'Infratuzilma',
    'IQTISODIY': 'Iqtisodiyot',
    'HUQUQIY': 'Adliya',
    'QURILISH': 'Qurilish',
    'BOSHQA': None,
}


def _resolve_sector_ids(apps):
    """Kerakli Soha yozuvlarini topish/yaratish va {category: sector_id} qaytarish."""
    Sector = apps.get_model('organizations', 'Sector')
    mapping = {}
    for category_code, sector_name in CATEGORY_TO_SECTOR.items():
        if not sector_name:
            continue
        sector = Sector.objects.filter(name__iexact=sector_name).first()
        if sector is None:
            sector = Sector.objects.create(
                name=sector_name,
                description='',
                is_active=True,
            )
        mapping[category_code] = sector.pk
    return mapping


def migrate_category_to_sector(apps, schema_editor):
    Task = apps.get_model('tasks', 'Task')
    RecurringTask = apps.get_model('tasks', 'RecurringTask')

    used_categories = set(
        Task.objects.exclude(category='')
        .exclude(category=None)
        .values_list('category', flat=True)
        .distinct()
    ) | set(
        RecurringTask.objects.exclude(category='')
        .exclude(category=None)
        .values_list('category', flat=True)
        .distinct()
    )
    if not used_categories:
        return

    sector_ids = _resolve_sector_ids(apps)

    for category_code, sector_id in sector_ids.items():
        Task.objects.filter(category__iexact=category_code, sector__isnull=True).update(sector_id=sector_id)
        RecurringTask.objects.filter(category__iexact=category_code, sector__isnull=True).update(sector_id=sector_id)


def reverse_category_to_sector(apps, schema_editor):
    """Orqaga qaytarish: `category` ustuni o'chirilmagani uchun hech narsa qilmaydi."""
    return None


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0001_initial'),
        ('tasks', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='status',
            field=models.CharField(
                choices=[
                    ('YANGI', 'Yangi'),
                    ('IJRODA', 'Ijroda'),
                    ('TEKSHIRUVDA', 'Tekshiruvda'),
                    ('BAJARILDI', 'Bajarildi'),
                    ('QAYTA_IJROGA_YUBORILDI', 'Qayta ijroga yuborildi'),
                    ('MUDDATI_KECH', 'Muddati kechikkan'),
                    ('BAJARILMADI', 'Bajarilmadi'),
                    ('NAZORATDAN_YECHILDI', 'Nazoratdan yechildi'),
                ],
                default='YANGI',
                max_length=30,
                verbose_name='Holat',
            ),
        ),
        migrations.AlterField(
            model_name='taskorganization',
            name='status',
            field=models.CharField(
                choices=[
                    ('YANGI', 'Yangi'),
                    ('IJRODA', 'Ijroda'),
                    ('TEKSHIRUVDA', 'Tekshiruvda'),
                    ('BAJARILDI', 'Bajarildi'),
                    ('QAYTA_IJROGA_YUBORILDI', 'Qayta ijroga yuborildi'),
                    ('MUDDATI_KECH', 'Muddati kechikkan'),
                    ('BAJARILMADI', 'Bajarilmadi'),
                    ('NAZORATDAN_YECHILDI', 'Nazoratdan yechildi'),
                ],
                default='YANGI',
                max_length=30,
                verbose_name='Holat',
            ),
        ),
        migrations.AlterField(
            model_name='taskexecution',
            name='action_type',
            field=models.CharField(
                choices=[
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
        migrations.AddField(
            model_name='task',
            name='sector',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='tasks',
                to='organizations.sector',
                verbose_name='Soha',
            ),
        ),
        migrations.AddField(
            model_name='recurringtask',
            name='sector',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='recurring_tasks',
                to='organizations.sector',
                verbose_name='Soha',
            ),
        ),
        migrations.RunPython(migrate_category_to_sector, reverse_category_to_sector),
    ]
