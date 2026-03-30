from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_initial"),
        ("telegram_bot", "0019_appealreadstate"),
    ]

    operations = [
        migrations.AddField(
            model_name="appealcategory",
            name="responsible_organizations",
            field=models.ManyToManyField(
                blank=True,
                related_name="responsible_appeal_categories",
                to="organizations.organization",
                verbose_name="Mas'ul tashkilotlar",
            ),
        ),
    ]

