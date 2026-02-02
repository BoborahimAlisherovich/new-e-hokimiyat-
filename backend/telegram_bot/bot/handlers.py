"""
Telegram bot handlerlari
"""

import logging
import re
from typing import Optional, Dict, Any
from datetime import datetime
import requests
from django.conf import settings
from django.db import transaction

from ..models import (
    BotSettings, BotAdmin, BotRegion, TelegramUser,
    AppealCategory, AppealType, TelegramAppeal,
    AppealAttachment, AppealMessage, UserState
)
from .messages import get_text
from .keyboards import (
    main_menu_keyboard, gender_keyboard, phone_keyboard,
    regions_keyboard, appeal_types_keyboard, categories_keyboard,
    confirm_keyboard, attachment_keyboard, settings_keyboard,
    language_keyboard, back_keyboard, admin_review_keyboard,
    remove_keyboard, rating_keyboard, satisfaction_with_rating_keyboard
)

logger = logging.getLogger(__name__)


class TelegramBot:
    """Telegram Bot classi"""
    
    def __init__(self):
        self.settings = None
        self._load_settings()
    
    def _load_settings(self):
        """Bot sozlamalarini yuklash"""
        try:
            self.settings = BotSettings.objects.first()
        except Exception as e:
            logger.error(f"Bot sozlamalarini yuklashda xato: {e}")
    
    @property
    def token(self) -> str:
        """Bot tokeni"""
        if self.settings:
            return self.settings.bot_token
        return ""
    
    def send_message(
        self,
        chat_id: int,
        text: str,
        reply_markup: Optional[Dict] = None,
        parse_mode: str = 'HTML'
    ) -> Dict:
        """Xabar yuborish"""
        url = f'https://api.telegram.org/bot{self.token}/sendMessage'
        data = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': parse_mode
        }
        if reply_markup:
            data['reply_markup'] = reply_markup
        
        try:
            response = requests.post(url, json=data, timeout=10)
            return response.json()
        except Exception as e:
            logger.error(f"Xabar yuborishda xato: {e}")
            return {'ok': False, 'error': str(e)}
    
    def answer_callback_query(
        self,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False
    ) -> Dict[str, Any]:
        """Callback query'ga javob"""
        url = f'https://api.telegram.org/bot{self.token}/answerCallbackQuery'
        data: Dict[str, Any] = {
            'callback_query_id': callback_query_id
        }
        if text:
            data['text'] = text
            data['show_alert'] = show_alert
        
        try:
            response = requests.post(url, json=data, timeout=10)
            return response.json()
        except Exception as e:
            logger.error(f"Callback javobida xato: {e}")
            return {'ok': False}
    
    def edit_message_text(
        self,
        chat_id: int,
        message_id: int,
        text: str,
        reply_markup: Optional[Dict] = None,
        parse_mode: str = 'HTML'
    ) -> Dict:
        """Xabarni tahrirlash"""
        url = f'https://api.telegram.org/bot{self.token}/editMessageText'
        data = {
            'chat_id': chat_id,
            'message_id': message_id,
            'text': text,
            'parse_mode': parse_mode
        }
        if reply_markup:
            data['reply_markup'] = reply_markup
        
        try:
            response = requests.post(url, json=data, timeout=10)
            return response.json()
        except Exception as e:
            logger.error(f"Xabarni tahrirlashda xato: {e}")
            return {'ok': False}
    
    def get_file(self, file_id: str) -> Optional[str]:
        """Fayl URL'ini olish"""
        url = f'https://api.telegram.org/bot{self.token}/getFile'
        try:
            response = requests.get(url, params={'file_id': file_id}, timeout=10)
            data = response.json()
            if data.get('ok'):
                file_path = data['result']['file_path']
                return f'https://api.telegram.org/file/bot{self.token}/{file_path}'
        except Exception as e:
            logger.error(f"Fayl olishda xato: {e}")
        return None


# Global bot instansiyasi
bot = TelegramBot()


def get_or_create_user(telegram_data: Dict) -> TelegramUser:
    """Foydalanuvchini olish yoki yaratish"""
    telegram_id = str(telegram_data['id'])
    
    user, created = TelegramUser.objects.get_or_create(
        telegram_id=telegram_id,
        defaults={
            'first_name': telegram_data.get('first_name', ''),
            'last_name': telegram_data.get('last_name', ''),
            'username': telegram_data.get('username', ''),
            'language': telegram_data.get('language_code', 'uz')[:2]
        }
    )
    
    if not created:
        # Ma'lumotlarni yangilash
        user.username = telegram_data.get('username', '')
        user.save(update_fields=['username'])
    
    return user


def get_user_state(user: TelegramUser) -> Optional[UserState]:
    """Foydalanuvchi holatini olish"""
    try:
        return UserState.objects.get(telegram_id=user.telegram_id)
    except UserState.DoesNotExist:
        return None


def set_user_state(user: TelegramUser, state: str, data: Optional[Dict] = None):
    """Foydalanuvchi holatini o'rnatish"""
    UserState.objects.update_or_create(
        telegram_id=user.telegram_id,
        defaults={
            'state': state,
            'data': data if data is not None else {}
        }
    )


def clear_user_state(user: TelegramUser):
    """Foydalanuvchi holatini tozalash"""
    UserState.objects.filter(telegram_id=user.telegram_id).delete()


def process_update(update: Dict):
    """Telegram update'ni qayta ishlash"""
    try:
        if 'message' in update:
            process_message(update['message'])
        elif 'callback_query' in update:
            process_callback_query(update['callback_query'])
    except Exception as e:
        logger.error(f"Update qayta ishlashda xato: {e}")


def process_message(message: Dict):
    """Xabarni qayta ishlash"""
    chat_id = message['chat']['id']
    user_data = message['from']
    user = get_or_create_user(user_data)
    
    # Bloklangan foydalanuvchilarni tekshirish
    if user.is_blocked:
        bot.send_message(chat_id, get_text('error_blocked', user.language))
        return
    
    # Kontakt xabari
    if 'contact' in message:
        handle_contact(user, message, chat_id)
        return
    
    # Fayl xabarlari
    if any(key in message for key in ['photo', 'video', 'audio', 'document', 'voice']):
        handle_media(user, message, chat_id)
        return
    
    # Matn xabari
    text = message.get('text', '')
    
    # Buyruqlar
    if text.startswith('/'):
        handle_command(user, text, chat_id)
        return
    
    # Menyu tugmalari
    if text in [get_text('btn_new_appeal', lang) for lang in ['uz', 'ru', 'en']]:
        start_appeal(user, chat_id)
        return
    
    if text in [get_text('btn_my_appeals', lang) for lang in ['uz', 'ru', 'en']]:
        show_my_appeals(user, chat_id)
        return
    
    if text in [get_text('btn_about', lang) for lang in ['uz', 'ru', 'en']]:
        bot.send_message(
            chat_id,
            get_text('about_text', user.language),
            reply_markup=main_menu_keyboard(user.language)
        )
        return
    
    if text in [get_text('btn_settings', lang) for lang in ['uz', 'ru', 'en']]:
        bot.send_message(
            chat_id,
            get_text('settings_menu', user.language),
            reply_markup=settings_keyboard(user.language)
        )
        return
    
    if text in [get_text('btn_help', lang) for lang in ['uz', 'ru', 'en']]:
        bot.send_message(
            chat_id,
            get_text('help_text', user.language),
            reply_markup=main_menu_keyboard(user.language)
        )
        return
    
    # Holatga qarab qayta ishlash
    state = get_user_state(user)
    if state:
        handle_state_input(user, state, text, chat_id)
        return
    
    # Standart javob
    if user.is_registered:
        bot.send_message(
            chat_id,
            get_text('main_menu', user.language),
            reply_markup=main_menu_keyboard(user.language)
        )
    else:
        bot.send_message(
            chat_id,
            get_text('welcome', user.language),
            reply_markup=main_menu_keyboard(user.language)
        )


def handle_command(user: TelegramUser, command: str, chat_id: int):
    """Buyruqlarni qayta ishlash"""
    command = command.split()[0].lower()
    
    if command == '/start':
        clear_user_state(user)
        
        if user.is_registered:
            bot.send_message(
                chat_id,
                get_text('welcome_registered', user.language, name=user.full_name),
                reply_markup=main_menu_keyboard(user.language)
            )
        else:
            # Ro'yxatdan o'tishni boshlash
            bot.send_message(
                chat_id,
                get_text('welcome', user.language)
            )
            bot.send_message(
                chat_id,
                get_text('registration_start', user.language),
                reply_markup=remove_keyboard()
            )
            set_user_state(user, 'registration:name')
    
    elif command == '/menu':
        if user.is_registered:
            bot.send_message(
                chat_id,
                get_text('main_menu', user.language),
                reply_markup=main_menu_keyboard(user.language)
            )
        else:
            bot.send_message(
                chat_id,
                get_text('error_not_registered', user.language)
            )
    
    elif command == '/help':
        bot.send_message(
            chat_id,
            get_text('help_text', user.language),
            reply_markup=main_menu_keyboard(user.language) if user.is_registered else None
        )
    
    elif command == '/settings':
        if user.is_registered:
            bot.send_message(
                chat_id,
                get_text('settings_menu', user.language),
                reply_markup=settings_keyboard(user.language)
            )
        else:
            bot.send_message(
                chat_id,
                get_text('error_not_registered', user.language)
            )
    
    elif command == '/cancel':
        clear_user_state(user)
        if user.is_registered:
            bot.send_message(
                chat_id,
                get_text('main_menu', user.language),
                reply_markup=main_menu_keyboard(user.language)
            )


def handle_state_input(user: TelegramUser, state: UserState, text: str, chat_id: int):
    """Holat bo'yicha kiritishni qayta ishlash"""
    current_state = state.state
    data = state.data or {}
    lang = user.language
    
    # Bekor qilish tugmasi
    if text in [get_text('btn_cancel', l) for l in ['uz', 'ru', 'en']]:
        clear_user_state(user)
        if 'registration' in current_state:
            bot.send_message(chat_id, get_text('registration_cancelled', lang))
        else:
            bot.send_message(
                chat_id,
                get_text('appeal_cancelled', lang),
                reply_markup=main_menu_keyboard(lang)
            )
        return
    
    # Ro'yxatdan o'tish holatlari
    if current_state == 'registration:name':
        # Ism va familiya
        parts = text.strip().split(maxsplit=1)
        if len(parts) >= 1:
            user.first_name = parts[0]
            if len(parts) > 1:
                user.last_name = parts[1]
            user.save()
            
            bot.send_message(
                chat_id,
                get_text('ask_gender', lang),
                reply_markup=gender_keyboard(lang)
            )
            set_user_state(user, 'registration:gender')
        else:
            bot.send_message(chat_id, get_text('error_invalid_input', lang))
    
    elif current_state == 'registration:phone':
        # Telefon raqam (qo'lda kiritilgan)
        phone = re.sub(r'[^\d+]', '', text)
        if len(phone) >= 9:
            user.phone = phone
            user.save()
            
            # Hududlarni ko'rsatish
            regions = list(BotRegion.objects.filter(is_active=True).values('id', 'name_uz', 'name_ru', 'name_en'))
            if regions:
                bot.send_message(
                    chat_id,
                    get_text('ask_region', lang),
                    reply_markup=regions_keyboard(regions, lang)
                )
                set_user_state(user, 'registration:region')
            else:
                # Hududlar yo'q, ro'yxatdan o'tishni yakunlash
                complete_registration(user, chat_id)
        else:
            bot.send_message(chat_id, get_text('error_invalid_input', lang))
    
    # Murojaat holatlari
    elif current_state == 'appeal:text':
        # Murojaat matni
        if len(text) < 20:
            bot.send_message(chat_id, get_text('error_text_too_short', lang))
            return
        
        data['text'] = text
        set_user_state(user, 'appeal:attachments', data)
        
        bot.send_message(
            chat_id,
            get_text('ask_attachment', lang),
            reply_markup=attachment_keyboard(lang)
        )
    
    elif current_state == 'appeal:attachments':
        # "Tugatish" tugmasi
        if text in [get_text('btn_finish', l) for l in ['uz', 'ru', 'en']]:
            # Tasdiqlash
            appeal_type = AppealType.objects.get(id=data.get('type_id'))
            category = AppealCategory.objects.get(id=data.get('category_id'))
            
            type_name = getattr(appeal_type, f'name_{lang}', None) or appeal_type.name_uz
            cat_name = getattr(category, f'name_{lang}', None) or category.name_uz
            
            attachments = data.get('attachments', [])
            
            bot.send_message(
                chat_id,
                get_text(
                    'confirm_appeal',
                    lang,
                    type=type_name,
                    category=cat_name,
                    text=data.get('text', '')[:500],
                    attachments_count=len(attachments)
                ),
                reply_markup=confirm_keyboard(lang)
            )
            set_user_state(user, 'appeal:confirm', data)
    
    # Foydalanuvchi javob berish holati
    elif current_state == 'user_reply':
        appeal_id = data.get('appeal_id')
        if not appeal_id:
            clear_user_state(user)
            bot.send_message(
                chat_id,
                "❌ Xatolik yuz berdi. Qaytadan urinib ko'ring.",
                reply_markup=main_menu_keyboard(lang)
            )
            return
        
        try:
            appeal = TelegramAppeal.objects.get(id=appeal_id, telegram_user=user)
            
            # Javobni saqlash
            AppealMessage.objects.create(
                appeal=appeal,
                is_from_admin=False,
                text=text
            )
            
            # Holatni tozalash
            clear_user_state(user)
            
            # Foydalanuvchiga tasdiqlash
            bot.send_message(
                chat_id,
                f"✅ Javobingiz #{appeal.appeal_number} raqamli murojaatga yuborildi.\n\n"
                f"Tez orada sizga javob beriladi.",
                reply_markup=main_menu_keyboard(lang)
            )
            
            # Adminlarga xabar yuborish
            notify_admins_user_reply(appeal, text)
            
        except TelegramAppeal.DoesNotExist:
            clear_user_state(user)
            bot.send_message(
                chat_id,
                "❌ Murojaat topilmadi.",
                reply_markup=main_menu_keyboard(lang)
            )


def handle_contact(user: TelegramUser, message: Dict, chat_id: int):
    """Kontakt xabarini qayta ishlash"""
    state = get_user_state(user)
    if not state or state.state != 'registration:phone':
        return
    
    contact = message['contact']
    phone = contact.get('phone_number', '')
    
    user.phone = phone
    user.save()
    
    # Hududlarni ko'rsatish
    regions = list(BotRegion.objects.filter(is_active=True).values('id', 'name_uz', 'name_ru', 'name_en'))
    if regions:
        bot.send_message(
            chat_id,
            get_text('ask_region', user.language),
            reply_markup=regions_keyboard(regions, user.language)
        )
        set_user_state(user, 'registration:region')
    else:
        complete_registration(user, chat_id)


def handle_media(user: TelegramUser, message: Dict, chat_id: int):
    """Media fayllarni qayta ishlash"""
    state = get_user_state(user)
    if not state or state.state != 'appeal:attachments':
        return
    
    data = state.data or {}
    attachments = data.get('attachments', [])
    
    # Fayl turini aniqlash
    if 'photo' in message:
        file_id = message['photo'][-1]['file_id']
        file_type = 'photo'
    elif 'video' in message:
        file_id = message['video']['file_id']
        file_type = 'video'
    elif 'audio' in message:
        file_id = message['audio']['file_id']
        file_type = 'audio'
    elif 'voice' in message:
        file_id = message['voice']['file_id']
        file_type = 'audio'
    elif 'document' in message:
        file_id = message['document']['file_id']
        file_type = 'document'
    else:
        return
    
    attachments.append({
        'file_id': file_id,
        'file_type': file_type
    })
    
    data['attachments'] = attachments
    set_user_state(user, 'appeal:attachments', data)
    
    bot.send_message(
        chat_id,
        get_text('attachment_received', user.language),
        reply_markup=attachment_keyboard(user.language)
    )


def process_callback_query(callback_query: Dict):
    """Callback query'ni qayta ishlash"""
    callback_id = callback_query['id']
    chat_id = callback_query['message']['chat']['id']
    message_id = callback_query['message']['message_id']
    user_data = callback_query['from']
    data = callback_query.get('data', '')
    
    user = get_or_create_user(user_data)
    lang = user.language
    
    # Callback'ga javob
    bot.answer_callback_query(callback_id)
    
    # Bekor qilish
    if data == 'cancel':
        clear_user_state(user)
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('appeal_cancelled', lang) if user.is_registered else get_text('registration_cancelled', lang)
        )
        if user.is_registered:
            bot.send_message(
                chat_id,
                get_text('main_menu', lang),
                reply_markup=main_menu_keyboard(lang)
            )
        return
    
    # Asosiy menyu
    if data == 'main_menu':
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('main_menu', lang)
        )
        bot.send_message(
            chat_id,
            get_text('main_menu', lang),
            reply_markup=main_menu_keyboard(lang)
        )
        return
    
    # Jins tanlash
    if data.startswith('gender:'):
        gender = data.split(':')[1]
        user.gender = gender
        user.save()
        
        bot.edit_message_text(
            chat_id,
            message_id,
            f"✅ {get_text('gender_male' if gender == 'male' else 'gender_female', lang)}"
        )
        
        bot.send_message(
            chat_id,
            get_text('ask_phone', lang),
            reply_markup=phone_keyboard(lang)
        )
        set_user_state(user, 'registration:phone')
        return
    
    # Hudud tanlash
    if data.startswith('region:'):
        region_id = data.split(':')[1]
        
        # "Boshqa" tanlansa
        if region_id == 'other':
            user.region = None
            user.save()
            bot.edit_message_text(
                chat_id,
                message_id,
                "✅ Boshqa hudud"
            )
            complete_registration(user, chat_id)
            return
        
        try:
            region = BotRegion.objects.get(id=int(region_id))
            user.region = region
            user.save()
            
            bot.edit_message_text(
                chat_id,
                message_id,
                f"✅ {region.name_uz}"
            )
            
            complete_registration(user, chat_id)
        except BotRegion.DoesNotExist:
            bot.send_message(chat_id, get_text('error_something_wrong', lang))
        return
    
    # Murojaat turi tanlash
    if data.startswith('type:'):
        type_id = int(data.split(':')[1])
        state = get_user_state(user)
        state_data = state.data if state else {}
        state_data['type_id'] = type_id
        
        # Sohalarni ko'rsatish
        categories = list(AppealCategory.objects.filter(is_active=True).values(
            'id', 'name_uz', 'name_ru', 'name_en', 'icon'
        ))
        
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('select_category', lang),
            reply_markup=categories_keyboard(categories, lang)
        )
        set_user_state(user, 'appeal:category', state_data)
        return
    
    # Soha tanlash
    if data.startswith('category:'):
        category_id = int(data.split(':')[1])
        state = get_user_state(user)
        state_data = state.data if state else {}
        state_data['category_id'] = category_id
        
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('enter_appeal_text', lang)
        )
        set_user_state(user, 'appeal:text', state_data)
        return
    
    # Murojaatni tasdiqlash
    if data == 'confirm':
        state = get_user_state(user)
        if state and state.state == 'appeal:confirm':
            create_appeal(user, state.data, chat_id)
        return
    
    # Til o'zgartirish
    if data.startswith('lang:'):
        new_lang = data.split(':')[1]
        user.language = new_lang
        user.save()
        
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('settings_menu', new_lang),
            reply_markup=settings_keyboard(new_lang)
        )
        return
    
    # Qoniqish callbacklari
    if data.startswith('satisfied:'):
        appeal_id = int(data.split(':')[1])
        handle_satisfaction_callback(user, appeal_id, True, chat_id, message_id)
        return
    
    if data.startswith('unsatisfied:'):
        appeal_id = int(data.split(':')[1])
        handle_satisfaction_callback(user, appeal_id, False, chat_id, message_id)
        return
    
    # Murojaat yopish callbacklari (admin tomonidan yopilganda)
    if data.startswith('close_satisfied:'):
        appeal_id = int(data.split(':')[1])
        handle_close_appeal_callback(user, appeal_id, True, chat_id, message_id)
        return
    
    if data.startswith('close_unsatisfied:'):
        appeal_id = int(data.split(':')[1])
        handle_close_appeal_callback(user, appeal_id, False, chat_id, message_id)
        return
    
    # Baholash callbacklari
    if data.startswith('rate:'):
        parts = data.split(':')
        appeal_id = int(parts[1])
        rating_value = parts[2]
        
        if rating_value == 'skip':
            # Baholamasdan yopish
            from django.utils import timezone
            try:
                appeal = TelegramAppeal.objects.get(id=appeal_id, telegram_user=user)
                appeal.status = 'resolved'
                appeal.closed_at = timezone.now()
                appeal.save()
                
                bot.edit_message_text(
                    chat_id,
                    message_id,
                    f"✅ #{appeal.appeal_number} raqamli murojaatingiz yopildi.\n\n"
                    f"Bizga murojaat qilganingiz uchun tashakkur!"
                )
                notify_admins_appeal_closed(appeal, satisfied=True)
            except TelegramAppeal.DoesNotExist:
                bot.edit_message_text(chat_id, message_id, "❌ Murojaat topilmadi.")
        else:
            rating = int(rating_value)
            handle_rating_callback(user, appeal_id, rating, chat_id, message_id)
        return
    
    # Foydalanuvchi javob berish callbacki
    if data.startswith('user_reply:'):
        logger.info(f"user_reply callback received: data={data}")
        appeal_id = int(data.split(':')[1])
        handle_user_reply_callback(user, appeal_id, chat_id, message_id)
        return
    
    # Sozlamalar
    if data.startswith('settings:'):
        setting = data.split(':')[1]
        
        if setting == 'language':
            bot.edit_message_text(
                chat_id,
                message_id,
                "🌐 Tilni tanlang / Выберите язык / Choose language:",
                reply_markup=language_keyboard()
            )
        # ... boshqa sozlamalar
        return


def complete_registration(user: TelegramUser, chat_id: int):
    """Ro'yxatdan o'tishni yakunlash"""
    user.is_registered = True
    user.save()
    
    clear_user_state(user)
    
    bot.send_message(
        chat_id,
        get_text('registration_success', user.language, name=user.full_name),
        reply_markup=main_menu_keyboard(user.language)
    )


def handle_satisfaction_callback(user: TelegramUser, appeal_id: int, is_satisfied: bool, chat_id: int, message_id: int):
    """Qoniqish callback'ini qayta ishlash"""
    from django.utils import timezone
    
    try:
        appeal = TelegramAppeal.objects.get(id=appeal_id, telegram_user=user)
        lang = user.language
        
        if is_satisfied:
            # Baholash so'rash
            bot.edit_message_text(
                chat_id,
                message_id,
                f"⭐ <b>#{appeal.appeal_number} raqamli murojaat</b>\n\n"
                f"Xizmat ko'rsatishni qanday baholaysiz?\n\n"
                f"1 yulduz - Juda yomon\n"
                f"5 yulduz - A'lo",
                parse_mode='HTML',
                reply_markup=rating_keyboard(appeal.id)  # type: ignore[attr-defined]
            )
        else:
            # Murojaat qayta ochiladi
            appeal.status = 'pending_review'
            appeal.save()
            
            bot.edit_message_text(
                chat_id,
                message_id,
                f"❌ #{appeal.appeal_number} raqamli murojaatingiz qayta ko'rib chiqish uchun yuborildi.\n\nTez orada sizga javob beriladi."
            )
            
            # Adminlarga xabar
            notify_admins_appeal_reopened(appeal)
            
    except TelegramAppeal.DoesNotExist:
        bot.edit_message_text(
            chat_id,
            message_id,
            "❌ Murojaat topilmadi yoki siz ushbu murojaatning egasi emassiz."
        )


def handle_rating_callback(user: TelegramUser, appeal_id: int, rating: int, chat_id: int, message_id: int):
    """Baholash callback'ini qayta ishlash"""
    from django.utils import timezone
    
    try:
        appeal = TelegramAppeal.objects.get(id=appeal_id, telegram_user=user)
        
        # Bahoni saqlash
        appeal.rating = rating
        appeal.rated_at = timezone.now()
        appeal.closed_at = timezone.now()
        appeal.status = 'resolved'
        appeal.save()
        
        # Yulduzlar ko'rsatish
        stars = '⭐' * rating
        
        bot.edit_message_text(
            chat_id,
            message_id,
            f"✅ <b>Rahmat!</b>\n\n"
            f"#{appeal.appeal_number} raqamli murojaatingiz yopildi.\n"
            f"Sizning bahoyingiz: {stars}\n\n"
            f"Bizga murojaat qilganingiz uchun tashakkur!",
            parse_mode='HTML'
        )
        
        # Adminlarga xabar
        notify_admins_appeal_closed(appeal, satisfied=True, rating=rating)
        
        logger.info(f"Appeal {appeal.appeal_number} rated {rating} stars by user {user.telegram_id}")
        
    except TelegramAppeal.DoesNotExist:
        bot.edit_message_text(
            chat_id,
            message_id,
            "❌ Murojaat topilmadi."
        )


def handle_close_appeal_callback(user: TelegramUser, appeal_id: int, is_satisfied: bool, chat_id: int, message_id: int):
    """Murojaatni yopish callback'ini qayta ishlash (Admin tomonidan yopilganda)"""
    from django.utils import timezone
    
    try:
        appeal = TelegramAppeal.objects.get(id=appeal_id, telegram_user=user)
        
        if is_satisfied:
            # Baholash so'rash
            bot.edit_message_text(
                chat_id,
                message_id,
                f"⭐ <b>#{appeal.appeal_number} raqamli murojaat</b>\n\n"
                f"Xizmat ko'rsatishni qanday baholaysiz?\n\n"
                f"1 yulduz - Juda yomon\n"
                f"5 yulduz - A'lo",
                parse_mode='HTML',
                reply_markup=rating_keyboard(appeal.id)  # type: ignore[attr-defined]
            )
        else:
            # Murojaat qayta ochiladi
            appeal.status = 'pending_review'
            appeal.save()
            
            bot.edit_message_text(
                chat_id,
                message_id,
                f"❌ #{appeal.appeal_number} raqamli murojaatingiz qayta ko'rib chiqish uchun yuborildi.\n\nTez orada sizga javob beriladi."
            )
            
            notify_admins_appeal_reopened(appeal)
            
    except TelegramAppeal.DoesNotExist:
        bot.edit_message_text(
            chat_id,
            message_id,
            "❌ Murojaat topilmadi."
        )


def handle_user_reply_callback(user: TelegramUser, appeal_id: int, chat_id: int, message_id: int):
    """Foydalanuvchi javob berish callback'ini qayta ishlash"""
    logger.info(f"handle_user_reply_callback: user={user.telegram_id}, appeal_id={appeal_id}")
    try:
        appeal = TelegramAppeal.objects.get(id=appeal_id, telegram_user=user)
        logger.info(f"Appeal topildi: #{appeal.appeal_number}, status={appeal.status}")
        
        # Murojaat yopilganmi tekshirish
        if appeal.status in ['resolved', 'closed']:
            logger.info(f"Murojaat yopilgan: {appeal.status}")
            bot.send_message(
                chat_id,
                "❌ Bu murojaat allaqachon yopilgan",
            )
            return
        
        # Javob yozish holatiga o'tkazish
        set_user_state(user, 'user_reply', {'appeal_id': appeal_id})
        logger.info(f"User state set: user_reply, appeal_id={appeal_id}")
        
        result = bot.edit_message_text(
            chat_id,
            message_id,
            f"✍️ <b>#{appeal.appeal_number} raqamli murojaatga javob</b>\n\n"
            f"Javobingizni yozing va yuboring.\n\n"
            f"Bekor qilish uchun /cancel buyrug'ini yuboring.",
            parse_mode='HTML'
        )
        logger.info(f"edit_message_text result: {result}")
        
    except TelegramAppeal.DoesNotExist:
        logger.error(f"Appeal topilmadi: id={appeal_id}, user={user.telegram_id}")
        bot.edit_message_text(
            chat_id,
            message_id,
            "❌ Murojaat topilmadi yoki siz ushbu murojaatning egasi emassiz."
        )


def notify_admins_appeal_closed(appeal: TelegramAppeal, satisfied: bool = True, rating: Optional[int] = None):
    """Adminlarga murojaat yopilgani haqida xabar"""
    admins = BotAdmin.objects.filter(is_active=True)
    
    for admin in admins:
        try:
            user = appeal.telegram_user
            message = f"{'✅' if satisfied else '❌'} <b>Murojaat yopildi</b>\n\n"
            message += f"📌 <b>#{appeal.appeal_number}</b>\n"
            message += f"👤 {user.full_name}\n"
            message += f"📞 {user.phone or '-'}\n"
            message += f"{'✅ Foydalanuvchi qoniqdi' if satisfied else '❌ Foydalanuvchi qoniqmadi'}\n"
            
            if rating:
                stars = '⭐' * rating
                message += f"\n📊 <b>Baho:</b> {stars} ({rating}/5)"
            
            bot.send_message(int(admin.telegram_id), message, parse_mode='HTML')
        except Exception as e:
            logger.error(f"Admin {admin.telegram_id} ga xabar yuborishda xato: {e}")


def notify_admins_appeal_reopened(appeal: TelegramAppeal):
    """Adminlarga murojaat qayta ochilgani haqida xabar"""
    admins = BotAdmin.objects.filter(is_active=True)
    
    for admin in admins:
        try:
            user = appeal.telegram_user
            region_name = user.region.name_uz if user.region else '-'
            
            message = f"🔄 <b>Murojaat qayta ochildi!</b>\n\n"
            message += f"📌 <b>#{appeal.appeal_number}</b>\n"
            message += f"👤 {user.full_name}\n"
            message += f"📞 {user.phone or '-'}\n"
            message += f"🏘 {region_name}\n\n"
            message += f"❌ Foydalanuvchi javobdan qoniqmadi.\nIltimos, qayta ko'rib chiqing."
            
            bot.send_message(
                int(admin.telegram_id),
                message,
                reply_markup=admin_review_keyboard(appeal.id)  # type: ignore[attr-defined]
            )
        except Exception as e:
            logger.error(f"Admin {admin.telegram_id} ga xabar yuborishda xato: {e}")


def notify_admins_user_reply(appeal: TelegramAppeal, reply_text: str):
    """Adminlarga foydalanuvchi javobi haqida xabar"""
    admins = BotAdmin.objects.filter(is_active=True)
    
    for admin in admins:
        try:
            user = appeal.telegram_user
            region_name = user.region.name_uz if user.region else '-'
            
            message = f"💬 <b>Foydalanuvchidan javob!</b>\n\n"
            message += f"📌 <b>#{appeal.appeal_number}</b>\n"
            message += f"👤 {user.full_name}\n"
            message += f"📞 {user.phone or '-'}\n"
            message += f"🏘 {region_name}\n\n"
            message += f"<b>Javob:</b>\n{reply_text[:500]}"
            
            bot.send_message(
                int(admin.telegram_id),
                message,
                reply_markup=admin_review_keyboard(appeal.id)  # type: ignore[attr-defined]
            )
        except Exception as e:
            logger.error(f"Admin {admin.telegram_id} ga xabar yuborishda xato: {e}")


def start_appeal(user: TelegramUser, chat_id: int):
    """Murojaat yuborishni boshlash"""
    if not user.is_registered:
        bot.send_message(
            chat_id,
            get_text('error_not_registered', user.language)
        )
        return
    
    # Murojaat turlarini ko'rsatish
    appeal_types = list(AppealType.objects.filter(is_active=True).values(
        'id', 'name_uz', 'name_ru', 'name_en', 'icon'
    ))
    
    bot.send_message(
        chat_id,
        get_text('select_appeal_type', user.language),
        reply_markup=appeal_types_keyboard(appeal_types, user.language)
    )
    set_user_state(user, 'appeal:type')


def show_my_appeals(user: TelegramUser, chat_id: int):
    """Foydalanuvchi murojaatlarini ko'rsatish"""
    if not user.is_registered:
        bot.send_message(
            chat_id,
            get_text('error_not_registered', user.language)
        )
        return
    
    appeals = TelegramAppeal.objects.filter(telegram_user=user).order_by('-created_at')[:10]
    
    if not appeals:
        bot.send_message(
            chat_id,
            get_text('my_appeals_empty', user.language),
            reply_markup=main_menu_keyboard(user.language)
        )
        return
    
    lang = user.language
    status_map = {
        'pending_ai': get_text('appeal_status_pending', lang),
        'pending_review': get_text('appeal_status_pending', lang),
        'approved': get_text('appeal_status_approved', lang),
        'rejected': get_text('appeal_status_rejected', lang),
        'responded': get_text('appeal_status_responded', lang),
        'forwarded': get_text('appeal_status_forwarded', lang),
        'completed': get_text('appeal_status_completed', lang),
    }
    
    appeals_text = ""
    for appeal in appeals:
        status_text = status_map.get(appeal.status, appeal.status)
        appeals_text += f"\n📌 <b>#{appeal.appeal_number}</b>\n"
        appeals_text += f"   {status_text}\n"
        appeals_text += f"   {appeal.created_at.strftime('%d.%m.%Y %H:%M')}\n"
    
    bot.send_message(
        chat_id,
        get_text('my_appeals_list', lang, count=len(appeals), appeals=appeals_text),
        reply_markup=main_menu_keyboard(lang)
    )


@transaction.atomic
def create_appeal(user: TelegramUser, data: Dict, chat_id: int):
    """Murojaatni yaratish"""
    lang = user.language
    
    try:
        appeal_type = AppealType.objects.get(id=data.get('type_id'))
        category = AppealCategory.objects.get(id=data.get('category_id'))
        
        # Murojaat yaratish
        appeal = TelegramAppeal.objects.create(
            telegram_user=user,
            appeal_type=appeal_type,
            category=category,
            text=data.get('text', ''),
            source='telegram',
            status='pending_ai'
        )
        
        # Fayllarni saqlash
        attachments = data.get('attachments', [])
        for att in attachments:
            file_url = bot.get_file(att['file_id'])
            AppealAttachment.objects.create(
                appeal=appeal,
                file_type=att['file_type'],
                telegram_file_id=att['file_id'],
                file_url=file_url or ''
            )
        
        clear_user_state(user)
        
        bot.send_message(
            chat_id,
            get_text('appeal_submitted', lang, number=appeal.appeal_number),
            reply_markup=main_menu_keyboard(lang)
        )
        
        # AI tahlili va adminlarga xabar
        process_appeal_with_ai(appeal)
        notify_admins_about_appeal(appeal)
        
    except Exception as e:
        logger.error(f"Murojaat yaratishda xato: {e}")
        bot.send_message(
            chat_id,
            get_text('error_something_wrong', lang),
            reply_markup=main_menu_keyboard(lang)
        )


def process_appeal_with_ai(appeal: TelegramAppeal):
    """AI orqali murojaatni tahlil qilish"""
    from .ai_service import analyze_appeal
    from django.utils import timezone
    
    try:
        settings_obj = BotSettings.objects.first()
        if not settings_obj or settings_obj.ai_provider == 'disabled':
            appeal.status = 'pending_review'
            appeal.save()
            return
        
        result = analyze_appeal(appeal, settings_obj)
        
        appeal.ai_analysis = result.get('analysis', '')
        appeal.ai_score = result.get('score', 0)
        appeal.ai_priority = result.get('priority', 'medium')
        appeal.priority = result.get('priority', 'medium')
        appeal.ai_is_valid = result.get('is_valid', True)
        appeal.ai_rejection_reason = result.get('reject_reason', '')
        
        # AI ballga qarab avtomatik rad etish (30 dan past bo'lsa)
        if result.get('score', 100) < 30 and not result.get('is_valid', True):
            appeal.status = 'rejected'
            appeal.admin_response = result.get('reject_reason', 'AI tahlili asosida rad etildi')
            appeal.save()
            
            # Foydalanuvchiga ogohlantirish yuborish
            user = appeal.telegram_user
            send_ai_rejection_warning(user, appeal, result.get('reject_reason', ''))
        else:
            appeal.status = 'pending_review'
            appeal.save()
        
    except Exception as e:
        logger.error(f"AI tahlilida xato: {e}")
        appeal.status = 'pending_review'
        appeal.save()


def send_ai_rejection_warning(user: TelegramUser, appeal: TelegramAppeal, reason: str):
    """AI rad etganda foydalanuvchiga ogohlantirish yuborish"""
    from django.utils import timezone
    
    # Ogohlantirish sonini oshirish
    user.warning_count += 1
    user.last_warning_date = timezone.now()
    
    lang = user.language
    chat_id = int(user.telegram_id)
    
    if user.warning_count >= 3:
        # 3-chi ogohlantirish - bloklash
        user.is_blocked = True
        user.block_reason = f"3 marta noto'g'ri murojaat yuborilgani uchun bloklandi. Oxirgi sabab: {reason}"
        user.save()
        
        # Bloklash xabari
        warning_text = f"""🚫 <b>Siz bloklangansiz!</b>

Sizning #{appeal.appeal_number} raqamli murojaatingiz AI tomonidan rad etildi.

<b>Sabab:</b> {reason}

⚠️ Siz 3 marta noto'g'ri murojaat yubordingiz:
• Xaqorat, haqoratli so'zlar
• Mazmuni bo'lmagan xabarlar
• Mazmunsiz/keraksiz murojaatlar

❌ <b>Siz endi murojaat yuborolmaysiz.</b>

Agar bu xato deb hisoblasangiz, hokimiyatga shaxsan murojaat qiling."""

        bot.send_message(chat_id, warning_text)
        
        # Adminlarga xabar
        notify_admins_user_blocked(user, appeal, reason)
    else:
        user.save()
        
        remaining = 3 - user.warning_count
        
        # Ogohlantirish xabari
        warning_text = f"""⚠️ <b>Ogohlantirish! ({user.warning_count}/3)</b>

Sizning #{appeal.appeal_number} raqamli murojaatingiz AI tomonidan rad etildi.

<b>Sabab:</b> {reason}

🚨 Quyidagi holatlarda murojaatlar rad etiladi:
• Xaqorat, haqoratli so'zlar ishlatilsa
• Mazmuni bo'lmagan xabarlar
• Mazmunsiz/keraksiz murojaatlar

⚠️ <b>Yana {remaining} marta noto'g'ri murojaat yuborsangiz bloklanasiiz!</b>

Iltimos, murojaatlaringizni to'g'ri va aniq yozing."""

        bot.send_message(chat_id, warning_text)


def notify_admins_user_blocked(user: TelegramUser, appeal: TelegramAppeal, reason: str):
    """Adminlarga foydalanuvchi bloklangani haqida xabar"""
    admins = BotAdmin.objects.filter(is_active=True)
    
    for admin in admins:
        try:
            region_name = user.region.name_uz if user.region else '-'
            
            text = f"""🚫 <b>Foydalanuvchi bloklandi!</b>

👤 <b>Foydalanuvchi:</b> {user.full_name}
📞 <b>Telefon:</b> {user.phone or '-'}
🏘 <b>Hudud:</b> {region_name}
⚠️ <b>Ogohlantirishlar:</b> {user.warning_count}

📌 <b>Oxirgi murojaat:</b> #{appeal.appeal_number}
❌ <b>Rad etish sababi:</b> {reason}

<i>Foydalanuvchi 3 marta noto'g'ri murojaat yuborgani uchun avtomatik bloklandi.</i>"""

            bot.send_message(int(admin.telegram_id), text)
        except Exception as e:
            logger.error(f"Admin {admin.telegram_id} ga xabar yuborishda xato: {e}")


def notify_admins_about_appeal(appeal: TelegramAppeal):
    """Adminlarga yangi murojaat haqida xabar"""
    admins = BotAdmin.objects.filter(is_active=True)
    
    for admin in admins:
        try:
            user = appeal.telegram_user
            appeal_type = appeal.appeal_type
            category = appeal.category
            
            type_name = appeal_type.name_uz if appeal_type else ''
            cat_name = category.name_uz if category else ''
            region_name = user.region.name_uz if user.region else '-'
            
            text = get_text(
                'admin_new_appeal',
                'uz',
                number=appeal.appeal_number,
                user_name=user.full_name,
                phone=user.phone or '-',
                region=region_name,
                category=cat_name,
                type=type_name,
                text=appeal.text[:500],
                attachments_count=appeal.attachments.count()  # type: ignore[attr-defined]
            )
            
            # AI tahlili mavjud bo'lsa
            if appeal.ai_analysis:
                text += get_text(
                    'admin_ai_analysis',
                    'uz',
                    analysis=appeal.ai_analysis[:500],
                    priority=appeal.ai_priority or '-',
                    score=appeal.ai_score or 0
                )
            
            bot.send_message(
                int(admin.telegram_id),
                text,
                reply_markup=admin_review_keyboard(appeal.id)  # type: ignore[attr-defined]
            )
        except Exception as e:
            logger.error(f"Admin {admin.telegram_id} ga xabar yuborishda xato: {e}")
