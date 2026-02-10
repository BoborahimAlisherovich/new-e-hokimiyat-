from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0005_task_source_recurringtask_task_recurring_task_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='recurringtask',
            name='category',
            field=models.CharField(blank=True, default='', max_length=100, verbose_name='Kategoriya'),
        ),
    ]
