from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0006_recurringtask_category"),
        ("users", "0008_position"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="assigned_deputies",
            field=models.ManyToManyField(
                blank=True,
                related_name="deputy_tasks",
                to="users.user",
                verbose_name="Biriktirilgan hokim o'rinbosarlari",
            ),
        ),
        migrations.AddField(
            model_name="recurringtask",
            name="assigned_deputies",
            field=models.ManyToManyField(
                blank=True,
                related_name="deputy_recurring_tasks",
                to="users.user",
                verbose_name="Biriktirilgan hokim o'rinbosarlari",
            ),
        ),
    ]
