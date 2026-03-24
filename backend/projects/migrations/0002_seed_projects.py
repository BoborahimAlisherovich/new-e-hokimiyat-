from django.db import migrations


def seed_projects(apps, schema_editor):
    # Demo ma'lumot qo'shmaymiz. Loyiha portfeli faqat real API orqali boshqariladi.
    return None


def unseed_projects(apps, schema_editor):
    return None


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_projects, unseed_projects),
    ]
