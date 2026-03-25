from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("telegram_bot", "0014_alter_site_task_id_to_charfield"),
    ]

    operations = [
        migrations.AddField(
            model_name="botsettings",
            name="about_text_en",
            field=models.TextField(
                default=(
                    "🏛 <b>Hatirchi District Administration</b>\n\n"
                    "A digital platform for receiving, reviewing, and monitoring citizen appeals.\n\n"
                    "📍 Address: Hatirchi district\n"
                    "📞 Phone: +998 XX XXX XX XX\n"
                    "🌐 Platform: ehokimiyat.uz\n\n"
                    "The platform was developed by Aura group."
                ),
                verbose_name="Biz haqimizda matni (Inglizcha)",
            ),
        ),
        migrations.AddField(
            model_name="botsettings",
            name="about_text_ru",
            field=models.TextField(
                default=(
                    "🏛 <b>Хокимият Хатырчинского района</b>\n\n"
                    "Цифровая платформа для приема, рассмотрения и контроля обращений граждан.\n\n"
                    "📍 Адрес: Хатырчинский район\n"
                    "📞 Телефон: +998 XX XXX XX XX\n"
                    "🌐 Платформа: ehokimiyat.uz\n\n"
                    "Платформа разработана компанией Aura group."
                ),
                verbose_name="Biz haqimizda matni (Ruscha)",
            ),
        ),
        migrations.AddField(
            model_name="botsettings",
            name="about_text_uz",
            field=models.TextField(
                default=(
                    "🏛 <b>Hatirchi tumani Hokimiyati</b>\n\n"
                    "Fuqarolar murojaatlarini qabul qilish, ko'rib chiqish va nazorat qilish uchun raqamli platforma.\n\n"
                    "📍 Manzil: Hatirchi tumani\n"
                    "📞 Telefon: +998 XX XXX XX XX\n"
                    "🌐 Platforma: ehokimiyat.uz\n\n"
                    "Platforma Aura group tomonidan ishlab chiqilgan."
                ),
                verbose_name="Biz haqimizda matni (O'zbekcha)",
            ),
        ),
    ]
