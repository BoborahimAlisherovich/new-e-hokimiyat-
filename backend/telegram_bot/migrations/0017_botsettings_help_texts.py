from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("telegram_bot", "0016_update_about_text_uz"),
    ]

    operations = [
        migrations.AddField(
            model_name="botsettings",
            name="help_text_en",
            field=models.TextField(default="❓ <b>Help</b>", verbose_name="Yordam matni (Inglizcha)"),
        ),
        migrations.AddField(
            model_name="botsettings",
            name="help_text_ru",
            field=models.TextField(default="❓ <b>Помощь</b>", verbose_name="Yordam matni (Ruscha)"),
        ),
        migrations.AddField(
            model_name="botsettings",
            name="help_text_uz",
            field=models.TextField(
                default=(
                    "❓ <b>Yordam</b>\n\n"
                    "<b>Bot imkoniyatlari:</b>\n"
                    "📝 Murojaat yuborish - Hokimiyatga shikoyat, taklif yoki savollar yuborish\n"
                    "📋 Murojaatlarim - O'z murojaatlaringiz holatini kuzatish\n"
                    "⚙️ Sozlamalar - Shaxsiy ma'lumotlarni tahrirlash\n\n"
                    "<b>Buyruqlar:</b>\n"
                    "/start - Botni qayta ishga tushirish\n"
                    "/menu - Asosiy menyu\n"
                    "/help - Yordam\n"
                    "/settings - Sozlamalar\n\n"
                    "<b>Muammo bo'lsa:</b>\n"
                    "+99879 544-40-10 raqamiga qo'ng'iroq qiling."
                ),
                verbose_name="Yordam matni (O'zbekcha)",
            ),
        ),
    ]
