from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0006_user_sector_supervisor"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="visible_password",
            field=models.CharField(blank=True, default="", max_length=128, verbose_name="Ko'rinadigan parol"),
        ),
    ]
