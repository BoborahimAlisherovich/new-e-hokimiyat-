"""BotRegion ga xarita yon paneli uchun passport maydonlari.

Ikkisi ham `null=True`: qiymat kiritilmaguncha xaritada "—" ko'rinadi.
Nol (0) qo'yish xato bo'lardi — u "aholi yo'q" degan ma'noni beradi.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("telegram_bot", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="botregion",
            name="population",
            field=models.PositiveIntegerField(
                blank=True, null=True, verbose_name="Aholi soni"
            ),
        ),
        migrations.AddField(
            model_name="botregion",
            name="area_km2",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=9,
                null=True,
                verbose_name="Maydoni (km²)",
            ),
        ),
    ]
