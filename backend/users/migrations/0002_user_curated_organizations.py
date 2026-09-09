"""Foydalanuvchiga alohida tashkilotlar biriktirish (ixtiyoriy M2M).

Bo'sh qolsa — topshiriq berish doirasi soha bo'yicha aniqlanadi
(tasks/access.py). To'ldirilsa — faqat shu tashkilotlar.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
        ("organizations", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="curated_organizations",
            field=models.ManyToManyField(
                blank=True,
                related_name="curators",
                to="organizations.organization",
                verbose_name="Biriktirilgan tashkilotlar",
            ),
        ),
    ]
