from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('organizations', '0001_initial'),
        ('users', '0005_alter_role_name_alter_user_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='sector',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='users',
                to='organizations.sector',
                verbose_name='Soha / kompleks',
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='supervisor',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='subordinates',
                to='users.user',
                verbose_name='Bevosita rahbar',
            ),
        ),
    ]
