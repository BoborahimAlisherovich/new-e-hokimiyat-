from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_user_visible_password'),
    ]

    operations = [
        migrations.CreateModel(
            name='Position',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200, unique=True, verbose_name='Lavozim nomi')),
                ('description', models.TextField(blank=True, verbose_name='Tavsif')),
                ('is_active', models.BooleanField(default=True, verbose_name='Faol')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Yaratilgan vaqt')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Yangilangan vaqt')),
            ],
            options={
                'verbose_name': 'Lavozim',
                'verbose_name_plural': 'Lavozimlar',
                'ordering': ['name'],
            },
        ),
    ]
