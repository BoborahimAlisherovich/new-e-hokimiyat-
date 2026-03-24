from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0004_projectattachment_projectcomment'),
    ]

    operations = [
        migrations.AddField(
            model_name='projecthistory',
            name='metadata',
            field=models.JSONField(blank=True, default=dict, verbose_name='Qo‘shimcha ma’lumot'),
        ),
    ]
