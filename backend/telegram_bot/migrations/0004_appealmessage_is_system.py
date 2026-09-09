"""AppealMessage.is_system — avtomatik xabarni odam yozganidan ajratish.

Murojaat holati o'zgarganda fuqaroga avtomatik xabar yuboriladi
(telegram_bot/citizen_notify.py). Bu xabar ham `AppealMessage` sifatida
saqlanadi, aks holda operator fuqaro nimadan xabardor qilinganini
ko'rmaydi. Lekin uni admin yozgan xabardan ajratish kerak.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('telegram_bot', '0003_botregion_passport_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='appealmessage',
            name='is_system',
            field=models.BooleanField(default=False, verbose_name='Tizim xabari'),
        ),
    ]
