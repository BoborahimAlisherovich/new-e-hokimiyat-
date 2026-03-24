from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_user_login_auth_cleanup'),
    ]

    operations = [
        migrations.AlterField(
            model_name='role',
            name='name',
            field=models.CharField(
                choices=[
                    ('HOKIM', 'Hokim'),
                    ('HOKIM_YORDAMCHISI', "Hokim o'rinbosari"),
                    ('HOKIMLIK_MASUL', "Hokimlik mutaxassisi"),
                    ('TASHKILOT_RAHBARI', 'Tashkilot rahbari'),
                    ('TASHKILOT_MASUL', "Tashkilot mas'uli"),
                    ('ADMIN', 'Administrator'),
                ],
                max_length=50,
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('HOKIM', 'Hokim'),
                    ('HOKIM_YORDAMCHISI', "Hokim o'rinbosari"),
                    ('HOKIMLIK_MASUL', "Hokimlik mutaxassisi"),
                    ('TASHKILOT_RAHBARI', 'Tashkilot rahbari'),
                    ('TASHKILOT_MASUL', "Tashkilot mas'uli"),
                    ('ADMIN', 'Administrator'),
                ],
                max_length=20,
                verbose_name='Rol',
            ),
        ),
    ]
