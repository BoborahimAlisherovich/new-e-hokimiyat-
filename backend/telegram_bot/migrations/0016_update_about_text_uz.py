from django.db import migrations


NEW_ABOUT_TEXT_UZ = (
    "🏛 <b>Hatirchi tumani Hokimiyati</b>\n\n"
    "📍 Manzil: Xatirchi tumani, Mustaqillik ko‘chasi 34-uy\n\n"
    "📞 Telefon: +99879 544-40-10\n"
    "📧 Email: xatirchi@nv.uz\n"
    "🌐 Sayt: https://gov.uz/uz/xatirchi\n\n"
    "🕐 Ish vaqti: Dushanba - Juma, 9:00 - 18:00\n\n"
    "Bu bot orqali siz murojaatlar yuborishingiz va ularning holatini kuzatishingiz mumkin."
)


def update_about_text(apps, schema_editor):
    BotSettings = apps.get_model("telegram_bot", "BotSettings")
    BotSettings.objects.all().update(about_text_uz=NEW_ABOUT_TEXT_UZ)


class Migration(migrations.Migration):

    dependencies = [
        ("telegram_bot", "0015_botsettings_about_texts"),
    ]

    operations = [
        migrations.RunPython(update_about_text, migrations.RunPython.noop),
    ]
