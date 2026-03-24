from django.db import migrations


SEED_TITLES = [
    "Ichimlik suvi tarmog'ini yangilash",
    "Mahalla yo'llarini ta'mirlash",
    "Agrologistika markazi",
    "Yashil energiya pilot dasturi",
    "Bandlikni tezlashtirish dasturi",
    "Sun'iy intellekt asosidagi murojaat marshrutizatsiyasi",
]


def remove_seed_projects(apps, schema_editor):
    Project = apps.get_model('projects', 'Project')
    Project.objects.filter(title__in=SEED_TITLES).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0005_projecthistory_metadata'),
    ]

    operations = [
        migrations.RunPython(remove_seed_projects, migrations.RunPython.noop),
    ]
