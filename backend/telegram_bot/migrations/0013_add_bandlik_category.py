from django.db import migrations


def add_bandlik_category(apps, schema_editor):
    AppealCategory = apps.get_model('telegram_bot', 'AppealCategory')
    AppealCategory.objects.update_or_create(
        code='bandlik',
        defaults={
            'name_uz': 'Bandlik',
            'name_ru': 'Занятость',
            'name_en': 'Employment',
            'icon': '💼',
            'order': 11,
            'is_active': True,
        },
    )


def remove_bandlik_category(apps, schema_editor):
    AppealCategory = apps.get_model('telegram_bot', 'AppealCategory')
    AppealCategory.objects.filter(code='bandlik').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('telegram_bot', '0012_merge_0010_webhook_secret_0011_assigned_orgs'),
    ]

    operations = [
        migrations.RunPython(add_bandlik_category, remove_bandlik_category),
    ]
