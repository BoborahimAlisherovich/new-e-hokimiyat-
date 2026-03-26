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
        'btn_admin_approve': "✅ Tasdiqlash",
        'btn_admin_reject': "❌ Rad etish",
        'btn_admin_respond': "💬 Javob yozish",
        'btn_admin_forward': "📤 Saytga yuborish",
        'btn_priority_high': "🔴 Yuqori",
        'btn_priority_medium': "🟡 O'rta",
        'btn_priority_low': "🟢 Past",
        'btn_user_reply': "💬 Javob berish",
        'btn_skip_rating': "⏭ Baholamasdan yopish",
        'btn_satisfied_yes': "✅ Ha, rahmat",
        'btn_satisfied_no': "❌ Yo'q, qayta ko'ring",
        'btn_region_other': "🔹 Boshqa",
        'language_prompt': "🌐 Tilni tanlang / Выберите язык / Choose language:",
        'region_other_selected': "✅ Boshqa hudud",
        'reply_state_error': "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.",
        'reply_sent': "✅ Javobingiz #{number} raqamli murojaatga yuborildi.\n\nTez orada sizga javob beriladi.",
        'appeal_not_found': "❌ Murojaat topilmadi.",
        'appeal_not_found_or_denied': "❌ Murojaat topilmadi yoki siz ushbu murojaatning egasi emassiz.",
        'appeal_already_closed': "❌ Bu murojaat allaqachon yopilgan",
        'reply_prompt': "✍️ <b>#{number} raqamli murojaatga javob</b>\n\nJavobingizni yozing va yuboring.\n\nBekor qilish uchun /cancel buyrug'ini yuboring.",
        'rating_prompt': "⭐ <b>#{number} raqamli murojaat</b>\n\nXizmat ko'rsatishni qanday baholaysiz?\n\n1 yulduz - Juda yomon\n5 yulduz - A'lo",
        'appeal_reopened_for_review': "❌ #{number} raqamli murojaatingiz qayta ko'rib chiqish uchun yuborildi.\n\nTez orada sizga javob beriladi.",
        'appeal_closed_without_rating': "✅ #{number} raqamli murojaatingiz yopildi.\n\nBizga murojaat qilganingiz uchun tashakkur!",
        'rating_thanks': "✅ <b>Rahmat!</b>\n\n#{number} raqamli murojaatingiz yopildi.\nSizning bahoyingiz: {stars}\n\nBizga murojaat qilganingiz uchun tashakkur!",
        'warning_blocked': """🚫 <b>Siz bloklangansiz!</b>

Sizning #{number} raqamli murojaatingiz AI tomonidan rad etildi.

<b>Sabab:</b> {reason}

⚠️ Siz 3 marta noto'g'ri murojaat yubordingiz:
• Haqorat, haqoratli so'zlar
• Mazmuni bo'lmagan xabarlar
• Mazmunsiz yoki keraksiz murojaatlar

❌ <b>Siz endi murojaat yuborolmaysiz.</b>

Agar bu xato deb hisoblasangiz, hokimiyatga shaxsan murojaat qiling.""",
        'warning_notice': """⚠️ <b>Ogohlantirish! ({count}/3)</b>

Sizning #{number} raqamli murojaatingiz AI tomonidan rad etildi.

<b>Sabab:</b> {reason}

🚨 Quyidagi holatlarda murojaatlar rad etiladi:
• Haqorat, haqoratli so'zlar ishlatilsa
• Mazmuni bo'lmagan xabarlar
• Mazmunsiz yoki keraksiz murojaatlar

⚠️ <b>Yana {remaining} marta noto'g'ri murojaat yuborsangiz bloklanasiz!</b>

Iltimos, murojaatlaringizni to'g'ri va aniq yozing.""",
        
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
        'welcome_registered': """🏛 <b>Хокимият Хатырчинского района</b>

Здравствуйте, {name}!

Выберите один из разделов ниже:""",
        'registration_start': """📝 <b>Регистрация</b>

Пожалуйста, введите имя и фамилию.

<i>Пример: Алиев Вали</i>""",
        'ask_gender': "👤 Выберите ваш пол:",
        'ask_phone': """📱 <b>Ваш номер телефона</b>

Нажмите кнопку ниже, чтобы отправить номер телефона, или введите его вручную.

<i>Пример: +998901234567</i>""",
        'ask_region': """🏘 <b>В какой махалле/селе вы живете?</b>

Выберите из списка:""",
        'registration_success': """✅ <b>Вы успешно зарегистрировались!</b>

{name}, теперь вы можете отправлять обращения.""",
        'registration_cancelled': """❌ Регистрация отменена.

Чтобы начать заново, отправьте команду /start.""",
        'main_menu': """🏠 <b>Главное меню</b>

Выберите один из разделов ниже:""",
        'select_appeal_type': """📝 <b>Отправить обращение</b>

Выберите тип обращения:""",
        'select_category': """📁 <b>Выберите сферу</b>

К какой сфере относится ваше обращение?""",
        'enter_appeal_text': """✍️ <b>Текст обращения</b>

Напишите содержание вашего обращения.

<i>Нужно ввести минимум 20 символов.</i>""",
        'ask_attachment': """📎 <b>Хотите добавить файл?</b>

Вы можете отправить фото, видео, аудио или документ.

Для завершения нажмите кнопку "✅ Завершить".""",
        'attachment_received': """✅ Файл получен!

Вы можете добавить еще файл или нажать "✅ Завершить".""",
        'confirm_appeal': """📋 <b>Подтверждение обращения</b>

<b>Тип:</b> {type}
<b>Сфера:</b> {category}
<b>Текст:</b>
{text}

<b>Файлы:</b> {attachments_count} шт.

Подтверждаете отправку?""",
        'appeal_submitted': """✅ <b>Ваше обращение принято!</b>

📌 <b>Номер обращения:</b> #{number}

Оно будет рассмотрено в ближайшее время, и вам отправят ответ.

Статус: ⏳ На рассмотрении""",
        'appeal_cancelled': """❌ Обращение отменено.

Чтобы вернуться в главное меню, отправьте команду /start.""",
        'my_appeals_empty': """📋 <b>Мои обращения</b>

У вас пока нет обращений.

Нажмите кнопку ниже, чтобы отправить обращение.""",
        'my_appeals_list': """📋 <b>Мои обращения</b>

Всего: {count} обращений

{appeals}""",
        'appeal_status_pending': "⏳ На рассмотрении",
        'appeal_status_approved': "✅ Одобрено",
        'appeal_status_rejected': "❌ Отклонено",
        'appeal_status_responded': "💬 Получен ответ",
        'appeal_status_forwarded': "📤 Отправлено",
        'appeal_status_completed': "✔️ Выполнено",
        'settings_menu': """⚙️ <b>Настройки</b>

Вы можете изменить следующие параметры:""",
        'language_changed': "✅ Язык успешно изменен!",
        'change_name_prompt': """📝 <b>Изменение имени</b>

Пожалуйста, введите имя и фамилию.

<i>Пример: Алиев Вали</i>""",
        'name_updated': "✅ Имя успешно изменено!",
        'phone_updated': "✅ Номер телефона успешно изменен!",
        'region_updated': "✅ Регион успешно изменен!",
        'btn_change_name': "📝 Изменить имя",
        'btn_change_phone': "📱 Изменить номер телефона",
        'btn_change_region': "🏘 Изменить регион",
        'btn_change_language': "🌐 Изменить язык",
        'btn_back': "🔙 Назад",
        'about_text': """🏛 <b>Хокимият Хатырчинского района</b>

📍 Адрес: Хатырчинский район, улица Мустакиллик, дом 34

📞 Телефон: +99879 544-40-10
📧 Email: xatirchi@nv.uz
🌐 Сайт: https://gov.uz/uz/xatirchi

🕐 Время работы: Понедельник - Пятница, 9:00 - 18:00

Через этого бота вы можете отправлять обращения и отслеживать их статус.""",
        'help_text': """❓ <b>Помощь</b>

<b>Возможности бота:</b>
📝 Отправить обращение - отправка жалоб, предложений или вопросов в хокимият
📋 Мои обращения - отслеживание статуса ваших обращений
⚙️ Настройки - редактирование личных данных

<b>Команды:</b>
/start - Перезапустить бота
/menu - Главное меню
/help - Помощь
/settings - Настройки

<b>Если возникла проблема:</b>
Позвоните по номеру +99879 544-40-10.""",
        'error_not_registered': """⚠️ Вы еще не зарегистрированы.

Для продолжения отправьте команду /start.""",
        'error_invalid_input': """⚠️ Введены некорректные данные.

Попробуйте еще раз.""",
        'error_text_too_short': """⚠️ Текст слишком короткий!

Введите минимум 20 символов.""",
        'error_something_wrong': """⚠️ Произошла ошибка.

Пожалуйста, попробуйте еще раз или отправьте команду /start.""",
        'error_blocked': """🚫 Ваш аккаунт заблокирован.

Для вопросов: +99879 544-40-10""",
        'btn_yes': "✅ Да",
        'btn_no': "❌ Нет",
        'btn_confirm': "✅ Подтвердить",
        'btn_cancel': "❌ Отмена",
        'btn_finish': "✅ Завершить",
        'btn_main_menu': "🏠 Главное меню",
        'btn_share_phone': "📱 Отправить номер телефона",
        'gender_male': "👨 Мужчина",
        'gender_female': "👩 Женщина",
        'admin_new_appeal': """🆕 <b>Новое обращение!</b>

📌 <b>Номер:</b> #{number}
👤 <b>Пользователь:</b> {user_name}
📱 <b>Телефон:</b> {phone}
🏘 <b>Регион:</b> {region}

📁 <b>Сфера:</b> {category}
📝 <b>Тип:</b> {type}

📄 <b>Текст:</b>
{text}

📎 <b>Файлы:</b> {attachments_count} шт.""",
        'admin_ai_analysis': """🤖 <b>AI-анализ:</b>
{analysis}

<b>Приоритет по оценке AI:</b> {priority}
<b>Оценка AI (0-100):</b> {score}
""",
        'btn_admin_approve': "✅ Подтвердить",
        'btn_admin_reject': "❌ Отклонить",
        'btn_admin_respond': "💬 Ответить",
        'btn_admin_forward': "📤 Отправить на сайт",
        'btn_priority_high': "🔴 Высокий",
        'btn_priority_medium': "🟡 Средний",
        'btn_priority_low': "🟢 Низкий",
        'btn_user_reply': "💬 Ответить",
        'btn_skip_rating': "⏭ Закрыть без оценки",
        'btn_satisfied_yes': "✅ Да, спасибо",
        'btn_satisfied_no': "❌ Нет, пересмотрите",
        'btn_region_other': "🔹 Другое",
        'language_prompt': "🌐 Выберите язык:",
        'region_other_selected': "✅ Другой регион",
        'reply_state_error': "❌ Произошла ошибка. Попробуйте еще раз.",
        'reply_sent': "✅ Ваш ответ отправлен к обращению №{number}.\n\nСкоро вам ответят.",
        'appeal_not_found': "❌ Обращение не найдено.",
        'appeal_not_found_or_denied': "❌ Обращение не найдено или оно вам не принадлежит.",
        'appeal_already_closed': "❌ Это обращение уже закрыто",
        'reply_prompt': "✍️ <b>Ответ на обращение №{number}</b>\n\nНапишите и отправьте ваш ответ.\n\nДля отмены отправьте команду /cancel.",
        'rating_prompt': "⭐ <b>Обращение №{number}</b>\n\nКак вы оцените качество обслуживания?\n\n1 звезда - Очень плохо\n5 звезд - Отлично",
        'appeal_reopened_for_review': "❌ Ваше обращение №{number} отправлено на повторное рассмотрение.\n\nСкоро вам ответят.",
        'appeal_closed_without_rating': "✅ Ваше обращение №{number} закрыто.\n\nСпасибо за обращение!",
        'rating_thanks': "✅ <b>Спасибо!</b>\n\nВаше обращение №{number} закрыто.\nВаша оценка: {stars}\n\nСпасибо, что обратились к нам!",
        'warning_blocked': """🚫 <b>Вы заблокированы!</b>

Ваше обращение №{number} было отклонено AI.

<b>Причина:</b> {reason}

⚠️ Вы 3 раза отправили некорректные обращения:
• Оскорбления и грубые слова
• Сообщения без содержания
• Бессмысленные или ненужные обращения

❌ <b>Теперь вы не можете отправлять обращения.</b>

Если вы считаете это ошибкой, обратитесь в хокимият лично.""",
        'warning_notice': """⚠️ <b>Предупреждение! ({count}/3)</b>

Ваше обращение №{number} было отклонено AI.

<b>Причина:</b> {reason}

🚨 Обращения отклоняются в следующих случаях:
• Используются оскорбления и грубые слова
• Сообщение не имеет содержания
• Обращение бессмысленное или ненужное

⚠️ <b>Если вы еще {remaining} раз отправите некорректное обращение, вы будете заблокированы!</b>

Пожалуйста, пишите обращения ясно и корректно.""",
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
        'welcome_registered': """🏛 <b>Hatirchi District Administration</b>

Hello, {name}!

Choose one of the sections below:""",
        'registration_start': """📝 <b>Registration</b>

Please enter your first and last name.

<i>Example: Aliyev Vali</i>""",
        'ask_gender': "👤 Select your gender:",
        'ask_phone': """📱 <b>Your phone number</b>

Press the button below to send your phone number or enter it manually.

<i>Example: +998901234567</i>""",
        'ask_region': """🏘 <b>Which mahalla/village do you live in?</b>

Choose from the list:""",
        'registration_success': """✅ <b>You have successfully registered!</b>

{name}, you can now submit appeals.""",
        'registration_cancelled': """❌ Registration cancelled.

Send /start to begin again.""",
        'main_menu': """🏠 <b>Main Menu</b>

Choose one of the sections below:""",
        'select_appeal_type': """📝 <b>Submit Appeal</b>

Select the appeal type:""",
        'select_category': """📁 <b>Select Sector</b>

Which sector does your appeal belong to?""",
        'enter_appeal_text': """✍️ <b>Appeal Text</b>

Write the details of your appeal.

<i>At least 20 characters are required.</i>""",
        'ask_attachment': """📎 <b>Would you like to attach a file?</b>

You can send an image, video, audio, or document.

Press "✅ Finish" to complete.""",
        'attachment_received': """✅ File received!

You can add another file or press "✅ Finish".""",
        'confirm_appeal': """📋 <b>Confirm Appeal</b>

<b>Type:</b> {type}
<b>Sector:</b> {category}
<b>Text:</b>
{text}

<b>Files:</b> {attachments_count}

Do you confirm sending this appeal?""",
        'appeal_submitted': """✅ <b>Your appeal has been received!</b>

📌 <b>Appeal number:</b> #{number}

It will be reviewed soon and you will receive a response.

Status: ⏳ Under review""",
        'appeal_cancelled': """❌ Appeal cancelled.

Send /start to return to the main menu.""",
        'my_appeals_empty': """📋 <b>My Appeals</b>

You do not have any appeals yet.

Press the button below to submit one.""",
        'my_appeals_list': """📋 <b>My Appeals</b>

Total: {count} appeals

{appeals}""",
        'appeal_status_pending': "⏳ Under review",
        'appeal_status_approved': "✅ Approved",
        'appeal_status_rejected': "❌ Rejected",
        'appeal_status_responded': "💬 Responded",
        'appeal_status_forwarded': "📤 Forwarded",
        'appeal_status_completed': "✔️ Completed",
        'settings_menu': """⚙️ <b>Settings</b>

You can change the following settings:""",
        'language_changed': "✅ Language successfully changed!",
        'change_name_prompt': """📝 <b>Change name</b>

Please enter your first and last name.

<i>Example: Aliyev Vali</i>""",
        'name_updated': "✅ Name successfully changed!",
        'phone_updated': "✅ Phone number successfully changed!",
        'region_updated': "✅ Region successfully changed!",
        'btn_change_name': "📝 Change name",
        'btn_change_phone': "📱 Change phone number",
        'btn_change_region': "🏘 Change region",
        'btn_change_language': "🌐 Change language",
        'btn_back': "🔙 Back",
        'about_text': """🏛 <b>Hatirchi District Administration</b>

📍 Address: Hatirchi district, Mustaqillik street, 34

📞 Phone: +99879 544-40-10
📧 Email: xatirchi@nv.uz
🌐 Website: https://gov.uz/uz/xatirchi

🕐 Working hours: Monday - Friday, 9:00 - 18:00

Through this bot you can submit appeals and track their status.""",
        'help_text': """❓ <b>Help</b>

<b>Bot features:</b>
📝 Submit Appeal - send complaints, suggestions, or questions to the administration
📋 My Appeals - track the status of your appeals
⚙️ Settings - edit your personal information

<b>Commands:</b>
/start - Restart the bot
/menu - Main menu
/help - Help
/settings - Settings

<b>If you have a problem:</b>
Call +99879 544-40-10.""",
        'error_not_registered': """⚠️ You are not registered yet.

Send /start to continue.""",
        'error_invalid_input': """⚠️ Invalid data entered.

Please try again.""",
        'error_text_too_short': """⚠️ The text is too short!

Please enter at least 20 characters.""",
        'error_something_wrong': """⚠️ Something went wrong.

Please try again or send /start.""",
        'error_blocked': """🚫 Your account has been blocked.

For questions: +99879 544-40-10""",
        'btn_yes': "✅ Yes",
        'btn_no': "❌ No",
        'btn_confirm': "✅ Confirm",
        'btn_cancel': "❌ Cancel",
        'btn_finish': "✅ Finish",
        'btn_main_menu': "🏠 Main menu",
        'btn_share_phone': "📱 Send phone number",
        'gender_male': "👨 Male",
        'gender_female': "👩 Female",
        'admin_new_appeal': """🆕 <b>New appeal!</b>

📌 <b>Number:</b> #{number}
👤 <b>User:</b> {user_name}
📱 <b>Phone:</b> {phone}
🏘 <b>Region:</b> {region}

📁 <b>Sector:</b> {category}
📝 <b>Type:</b> {type}

📄 <b>Text:</b>
{text}

📎 <b>Files:</b> {attachments_count}""",
        'admin_ai_analysis': """🤖 <b>AI analysis:</b>
{analysis}

<b>AI priority:</b> {priority}
<b>AI score (0-100):</b> {score}
""",
        'btn_admin_approve': "✅ Approve",
        'btn_admin_reject': "❌ Reject",
        'btn_admin_respond': "💬 Reply",
        'btn_admin_forward': "📤 Send to site",
        'btn_priority_high': "🔴 High",
        'btn_priority_medium': "🟡 Medium",
        'btn_priority_low': "🟢 Low",
        'btn_user_reply': "💬 Reply",
        'btn_skip_rating': "⏭ Close without rating",
        'btn_satisfied_yes': "✅ Yes, thanks",
        'btn_satisfied_no': "❌ No, review again",
        'btn_region_other': "🔹 Other",
        'language_prompt': "🌐 Choose language:",
        'region_other_selected': "✅ Other region",
        'reply_state_error': "❌ An error occurred. Please try again.",
        'reply_sent': "✅ Your reply has been sent to appeal #{number}.\n\nYou will receive a response soon.",
        'appeal_not_found': "❌ Appeal not found.",
        'appeal_not_found_or_denied': "❌ Appeal not found or you do not own it.",
        'appeal_already_closed': "❌ This appeal has already been closed",
        'reply_prompt': "✍️ <b>Reply to appeal #{number}</b>\n\nWrite and send your reply.\n\nSend /cancel to cancel.",
        'rating_prompt': "⭐ <b>Appeal #{number}</b>\n\nHow would you rate the service?\n\n1 star - Very poor\n5 stars - Excellent",
        'appeal_reopened_for_review': "❌ Your appeal #{number} has been sent for re-review.\n\nYou will receive a response soon.",
        'appeal_closed_without_rating': "✅ Your appeal #{number} has been closed.\n\nThank you for contacting us!",
        'rating_thanks': "✅ <b>Thank you!</b>\n\nYour appeal #{number} has been closed.\nYour rating: {stars}\n\nThank you for contacting us!",
        'warning_blocked': """🚫 <b>You have been blocked!</b>

Your appeal #{number} was rejected by AI.

<b>Reason:</b> {reason}

⚠️ You submitted incorrect appeals 3 times:
• Offensive or abusive language
• Messages without meaningful content
• Meaningless or unnecessary appeals

❌ <b>You can no longer submit appeals.</b>

If you believe this is a mistake, please contact the administration in person.""",
        'warning_notice': """⚠️ <b>Warning! ({count}/3)</b>

Your appeal #{number} was rejected by AI.

<b>Reason:</b> {reason}

🚨 Appeals are rejected in these cases:
• Offensive or abusive language is used
• The message has no meaningful content
• The appeal is meaningless or unnecessary

⚠️ <b>If you send {remaining} more incorrect appeals, you will be blocked!</b>

Please write your appeals clearly and properly.""",
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
