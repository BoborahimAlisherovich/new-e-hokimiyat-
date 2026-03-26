"""
Telegram bot matn konstantalari
Ko'p tilli qo'llab-quvvatlash
"""

MESSAGES = {
    'uz': {
        # Umumiy
        'welcome': """🏛 <b>Hatirchi tumani Hokimiyatiga xush kelibsiz!</b>

Bu bot orqali siz:
📝 Murojaat yuborishingiz
📊 Murojaatlaringiz holatini kuzatishingiz
📞 Hokimiyat bilan bog'lanishingiz mumkin

Davom etish uchun ro'yxatdan o'ting.""",
        
        'welcome_registered': """🏛 <b>Hatirchi tumani Hokimiyati</b>

Assalomu alaykum, {name}!

Quyidagi bo'limlardan birini tanlang:""",
        
        # Ro'yxatdan o'tish
        'registration_start': """📝 <b>Ro'yxatdan o'tish</b>

Iltimos, ismingiz va familiyangizni kiriting.

<i>Misol: Aliyev Vali</i>""",
        
        'ask_gender': """👤 Jinsingizni tanlang:""",
        
        'ask_phone': """📱 <b>Telefon raqamingiz</b>

Pastdagi tugmani bosib telefon raqamingizni yuboring yoki qo'lda kiriting.

<i>Misol: +998901234567</i>""",
        
        'ask_region': """🏘 <b>Qaysi mahalla/qishloqda yashaysiz?</b>

Ro'yxatdan tanlang:""",
        
        'registration_success': """✅ <b>Ro'yxatdan muvaffaqiyatli o'tdingiz!</b>

{name}, endi siz murojaatlar yuborishingiz mumkin.""",
        
        'registration_cancelled': """❌ Ro'yxatdan o'tish bekor qilindi.

Qayta boshlash uchun /start buyrug'ini yuboring.""",
        
        # Asosiy menyu
        'main_menu': """🏠 <b>Asosiy menyu</b>

Quyidagi bo'limlardan birini tanlang:""",
        
        'btn_new_appeal': "📝 Murojaat yuborish",
        'btn_my_appeals': "📋 Mening murojaatlarim",
        'btn_about': "ℹ️ Biz haqimizda",
        'btn_settings': "⚙️ Sozlamalar",
        'btn_help': "❓ Yordam",
        
        # Murojaat
        'select_appeal_type': """📝 <b>Murojaat yuborish</b>

Murojaat turini tanlang:""",
        
        'select_category': """📁 <b>Soha tanlang</b>

Murojaatingiz qaysi sohaga tegishli?""",
        
        'enter_appeal_text': """✍️ <b>Murojaat matni</b>

Murojaatingiz mazmunini yozing.

<i>Kamida 20 ta belgi kiritilishi kerak.</i>""",
        
        'ask_attachment': """📎 <b>Fayl qo'shmoqchimisiz?</b>

Rasm, video, audio yoki hujjat yuborishingiz mumkin.

Tugatish uchun "✅ Tugatish" tugmasini bosing.""",
        
        'attachment_received': """✅ Fayl qabul qilindi!

Yana fayl qo'shishingiz yoki "✅ Tugatish" tugmasini bosishingiz mumkin.""",
        
        'confirm_appeal': """📋 <b>Murojaatni tasdiqlash</b>

<b>Tur:</b> {type}
<b>Soha:</b> {category}
<b>Matn:</b>
{text}

<b>Fayllar:</b> {attachments_count} ta

Yuborishni tasdiqlaysizmi?""",
        
        'appeal_submitted': """✅ <b>Murojaatingiz qabul qilindi!</b>

📌 <b>Murojaat raqami:</b> #{number}

Tez orada ko'rib chiqiladi va sizga javob yuboriladi.

Holat: ⏳ Ko'rib chiqilmoqda""",
        
        'appeal_cancelled': """❌ Murojaat bekor qilindi.

Asosiy menyuga qaytish uchun /start buyrug'ini yuboring.""",
        
        # Mening murojaatlarim
        'my_appeals_empty': """📋 <b>Mening murojaatlarim</b>

Sizda hali murojaatlar yo'q.

Murojaat yuborish uchun pastdagi tugmani bosing.""",
        
        'my_appeals_list': """📋 <b>Mening murojaatlarim</b>

Jami: {count} ta murojaat

{appeals}""",
        
        'appeal_status_pending': "⏳ Ko'rib chiqilmoqda",
        'appeal_status_approved': "✅ Tasdiqlangan",
        'appeal_status_rejected': "❌ Rad etilgan",
        'appeal_status_responded': "💬 Javob berilgan",
        'appeal_status_forwarded': "📤 Yuborilgan",
        'appeal_status_completed': "✔️ Bajarilgan",
        
        # Sozlamalar
        'settings_menu': """⚙️ <b>Sozlamalar</b>

Quyidagi sozlamalarni o'zgartirishingiz mumkin:""",

        'change_name_prompt': """📝 <b>Ismni o'zgartirish</b>

Iltimos, ismingiz va familiyangizni kiriting.

<i>Misol: Aliyev Vali</i>""",

        'name_updated': "✅ Ism muvaffaqiyatli o'zgartirildi!",

        'phone_updated': "✅ Telefon raqam muvaffaqiyatli o'zgartirildi!",

        'region_updated': "✅ Hudud muvaffaqiyatli o'zgartirildi!",
        
        'language_changed': "✅ Til muvaffaqiyatli o'zgartirildi!",
        
        'btn_change_name': "📝 Ismni o'zgartirish",
        'btn_change_phone': "📱 Telefon raqamni o'zgartirish",
        'btn_change_region': "🏘 Hududni o'zgartirish",
        'btn_change_language': "🌐 Tilni o'zgartirish",
        'btn_back': "🔙 Orqaga",
        
        # Yordam va biz haqimizda
        'about_text': """🏛 <b>Hatirchi tumani Hokimiyati</b>

📍 Manzil: Xatirchi tumani, Mustaqillik ko‘chasi 34-uy

📞 Telefon: +99879 544-40-10
📧 Email: xatirchi@nv.uz
🌐 Sayt: https://gov.uz/uz/xatirchi

🕐 Ish vaqti: Dushanba - Juma, 9:00 - 18:00

Bu bot orqali siz murojaatlar yuborishingiz va ularning holatini kuzatishingiz mumkin.""",
        
        'help_text': """❓ <b>Yordam</b>

<b>Bot imkoniyatlari:</b>
📝 Murojaat yuborish - Hokimiyatga shikoyat, taklif yoki savollar yuborish
📋 Murojaatlarim - O'z murojaatlaringiz holatini kuzatish
⚙️ Sozlamalar - Shaxsiy ma'lumotlarni tahrirlash

<b>Buyruqlar:</b>
/start - Botni qayta ishga tushirish
/menu - Asosiy menyu
/help - Yordam
/settings - Sozlamalar

<b>Muammo bo'lsa:</b>
+99879 544-40-10 raqamiga qo'ng'iroq qiling.""",
        
        # Xatolar
        'error_not_registered': """⚠️ Siz hali ro'yxatdan o'tmagansiz.

Davom etish uchun /start buyrug'ini yuboring.""",
        
        'error_invalid_input': """⚠️ Noto'g'ri ma'lumot kiritildi.

Qaytadan urinib ko'ring.""",
        
        'error_text_too_short': """⚠️ Matn juda qisqa!

Kamida 20 ta belgi kiriting.""",
        
        'error_something_wrong': """⚠️ Xatolik yuz berdi.

Iltimos, qaytadan urinib ko'ring yoki /start buyrug'ini yuboring.""",
        
        'error_blocked': """🚫 Sizning hisobingiz bloklangan.

Savollar uchun: +998 XX XXX XX XX""",
        
        # Tugmalar
        'btn_yes': "✅ Ha",
        'btn_no': "❌ Yo'q",
        'btn_confirm': "✅ Tasdiqlash",
        'btn_cancel': "❌ Bekor qilish",
        'btn_finish': "✅ Tugatish",
        'btn_main_menu': "🏠 Asosiy menyu",
        'btn_share_phone': "📱 Telefon raqamni yuborish",
        
        # Jinslar
        'gender_male': "👨 Erkak",
        'gender_female': "👩 Ayol",
        
        # Admin xabarlari
        'admin_new_appeal': """🆕 <b>Yangi murojaat!</b>

📌 <b>Raqam:</b> #{number}
👤 <b>Foydalanuvchi:</b> {user_name}
📱 <b>Telefon:</b> {phone}
🏘 <b>Hudud:</b> {region}

📁 <b>Soha:</b> {category}
📝 <b>Tur:</b> {type}

📄 <b>Matn:</b>
{text}

📎 <b>Fayllar:</b> {attachments_count} ta""",
        
        'admin_ai_analysis': """🤖 <b>AI tahlili:</b>
{analysis}

<b>AI baholagan prioritet:</b> {priority}
<b>AI bahosi (0-100):</b> {score}
""",
    },
    
    'ru': {
        'welcome': """🏛 <b>Добро пожаловать в Хокимият Хатырчинского района!</b>

Через этого бота вы можете:
📝 Отправить обращение
📊 Отслеживать статус ваших обращений
📞 Связаться с хокимиятом

Для продолжения пройдите регистрацию.""",
        
        'btn_new_appeal': "📝 Отправить обращение",
        'btn_my_appeals': "📋 Мои обращения",
        'btn_about': "ℹ️ О нас",
        'btn_settings': "⚙️ Настройки",
        'btn_help': "❓ Помощь",
        'language_changed': "✅ Язык успешно изменен!",
        'change_name_prompt': """📝 <b>Изменение имени</b>

Пожалуйста, введите имя и фамилию.

<i>Пример: Алиев Вали</i>""",
        'name_updated': "✅ Имя успешно изменено!",
        'phone_updated': "✅ Номер телефона успешно изменен!",
        'region_updated': "✅ Регион успешно изменен!",
        
        # ... qolgan ruscha tarjimalar
    },
    
    'en': {
        'welcome': """🏛 <b>Welcome to Hatirchi District Administration!</b>

Through this bot you can:
📝 Submit appeals
📊 Track your appeals status
📞 Contact the administration

Please register to continue.""",
        
        'btn_new_appeal': "📝 Submit Appeal",
        'btn_my_appeals': "📋 My Appeals",
        'btn_about': "ℹ️ About Us",
        'btn_settings': "⚙️ Settings",
        'btn_help': "❓ Help",
        'language_changed': "✅ Language successfully changed!",
        'change_name_prompt': """📝 <b>Change name</b>

Please enter your first and last name.

<i>Example: Aliyev Vali</i>""",
        'name_updated': "✅ Name successfully changed!",
        'phone_updated': "✅ Phone number successfully changed!",
        'region_updated': "✅ Region successfully changed!",
        
        # ... qolgan inglizcha tarjimalar
    }
}


def get_text(key: str, language: str = 'uz', **kwargs) -> str:
    """
    Til bo'yicha matnni olish
    
    Args:
        key: Matn kaliti
        language: Til kodi (uz, ru, en)
        **kwargs: Format parametrlari
    
    Returns:
        Formatlangan matn
    """
    texts = MESSAGES.get(language, MESSAGES['uz'])
    text = texts.get(key, MESSAGES['uz'].get(key, key))
    
    if kwargs:
        try:
            text = text.format(**kwargs)
        except KeyError:
            pass
    
    return text
