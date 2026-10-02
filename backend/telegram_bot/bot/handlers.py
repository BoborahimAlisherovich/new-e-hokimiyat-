"""
Telegram bot handlerlari
"""

import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, Any
from datetime import datetime
import requests
from django.conf import settings
from django.db import transaction
from django.db import close_old_connections
from ..models import (
    BotSettings, BotAdmin, BotRegion, TelegramUser,
    AppealCategory, AppealType, TelegramAppeal,
    AppealMessage, UserState
)
from .messages import get_text
from ..media import save_appeal_attachment
from ..region_sync import build_region_fields, load_map_region_names
from .keyboards import (
    main_menu_keyboard, gender_keyboard, phone_keyboard,
    regions_keyboard, appeal_types_keyboard, categories_keyboard,
    confirm_keyboard, attachment_keyboard, settings_keyboard,
    language_keyboard, admin_review_keyboard,
    remove_keyboard, rating_keyboard,
    location_keyboard, comment_keyboard
)

logger = logging.getLogger(__name__)
background_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="telegram-bot")

# Bot orqali keladigan fayl chegarasi 20 MB — bu TELEGRAM cheklovi:
# Bot API `getFile` shundan katta faylni bermaydi, ya'ni biz uni na
# yuklab ola olamiz, na saytda ko'rsata olamiz. Saytdan yuklashda
# chegara 40 MB (`core/file_validators.MAX_FILE_SIZE`).
MAX_BOT_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024
ALLOWED_BOT_ATTACHMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"}
ALLOWED_BOT_ATTACHMENT_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
}


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

    def edit_message_caption(
        self,
        chat_id: int,
        message_id: int,
        caption: str,
        reply_markup: Optional[Dict] = None,
        parse_mode: str = 'HTML'
    ) -> Dict:
        """Media xabar captionini tahrirlash (rasm, video, audio, hujjat)"""
        url = f'https://api.telegram.org/bot{self.token}/editMessageCaption'
        data = {
            'chat_id': chat_id,
            'message_id': message_id,
            'caption': caption,
            'parse_mode': parse_mode
        }
        if reply_markup:
            data['reply_markup'] = reply_markup
        
        try:
            response = requests.post(url, json=data, timeout=10)
            return response.json()
        except Exception as e:
            logger.error(f"Caption tahrirlashda xato: {e}")
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


def run_in_background(func, *args, **kwargs):
    def wrapped():
        close_old_connections()
        try:
            func(*args, **kwargs)
        except Exception as exc:
            logger.error(f"Background task failed: {func.__name__}: {exc}", exc_info=True)
        finally:
            close_old_connections()

    background_executor.submit(wrapped)


def bot_error_text(lang: str, reason: str = "") -> str:
    detail = (reason or "").strip() or "Sababi aniqlanmadi."
    if len(detail) > 180:
        detail = detail[:177] + "..."
    return get_text('error_something_wrong', lang, reason=detail)


def format_file_size_mb(size_bytes: int) -> str:
    return f"{size_bytes / (1024 * 1024):.1f}"


def get_media_payload(message: Dict) -> Optional[Dict[str, Any]]:
    if "photo" in message:
        photos = message.get("photo") or []
        if not photos:
            return None
        largest = photos[-1]
        return {
            "file_id": largest.get("file_id"),
            "file_type": "photo",
            "file_name": None,
            "mime_type": "image/jpeg",
            "file_size": largest.get("file_size") or 0,
        }
    if "video" in message:
        video = message["video"]
        return {
            "file_id": video.get("file_id"),
            "file_type": "video",
            "file_name": video.get("file_name"),
            "mime_type": (video.get("mime_type") or "").lower(),
            "file_size": video.get("file_size") or 0,
        }
    if "video_note" in message:
        video_note = message["video_note"]
        return {
            "file_id": video_note.get("file_id"),
            "file_type": "video_note",
            "file_name": None,
            "mime_type": (video_note.get("mime_type") or "").lower(),
            "file_size": video_note.get("file_size") or 0,
        }
    if "audio" in message:
        audio = message["audio"]
        return {
            "file_id": audio.get("file_id"),
            "file_type": "audio",
            "file_name": audio.get("file_name"),
            "mime_type": (audio.get("mime_type") or "").lower(),
            "file_size": audio.get("file_size") or 0,
        }
    if "voice" in message:
        voice = message["voice"]
        return {
            "file_id": voice.get("file_id"),
            "file_type": "voice",
            "file_name": None,
            "mime_type": (voice.get("mime_type") or "").lower(),
            "file_size": voice.get("file_size") or 0,
        }
    if "document" in message:
        document = message["document"]
        return {
            "file_id": document.get("file_id"),
            "file_type": "document",
            "file_name": document.get("file_name"),
            "mime_type": (document.get("mime_type") or "").lower(),
            "file_size": document.get("file_size") or 0,
        }
    return None


def validate_bot_attachment(payload: Dict[str, Any]) -> tuple[bool, str]:
    file_size = int(payload.get("file_size") or 0)
    file_name = (payload.get("file_name") or "").strip()
    mime_type = (payload.get("mime_type") or "").strip().lower()
    file_type = payload.get("file_type") or "document"

    if file_size and file_size > MAX_BOT_ATTACHMENT_SIZE_BYTES:
        return False, get_text(
            "attachment_too_large",
            payload.get("language", "uz"),
            file_name=file_name or "fayl",
            size_mb=format_file_size_mb(file_size),
        )

    if file_type == "photo":
        return True, ""

    if file_type != "document":
        return False, get_text(
            "attachment_type_not_allowed",
            payload.get("language", "uz"),
            file_name=file_name or file_type,
        )

    extension = os.path.splitext(file_name)[1].lower() if file_name else ""
    if extension not in ALLOWED_BOT_ATTACHMENT_EXTENSIONS:
        return False, get_text(
            "attachment_type_not_allowed",
            payload.get("language", "uz"),
            file_name=file_name or "document",
        )

    if mime_type and mime_type not in ALLOWED_BOT_ATTACHMENT_MIME_TYPES:
        return False, get_text(
            "attachment_type_not_allowed",
            payload.get("language", "uz"),
            file_name=file_name or "document",
        )

    if file_size > MAX_BOT_ATTACHMENT_SIZE_BYTES:
        return False, get_text(
            "attachment_too_large",
            payload.get("language", "uz"),
            file_name=file_name or "fayl",
            size_mb=format_file_size_mb(file_size),
        )

    return True, ""


def get_or_create_user(telegram_data: Dict) -> TelegramUser:
    """Foydalanuvchini olish yoki yaratish"""
    telegram_id = str(telegram_data['id'])
    
    user, created = TelegramUser.objects.get_or_create(
        telegram_id=telegram_id,
        defaults={
            'first_name': telegram_data.get('first_name', ''),
            'last_name': telegram_data.get('last_name', ''),
            'username': telegram_data.get('username', ''),
            'language': 'uz'
        }
    )
    
    if not created:
        # Ma'lumotlarni yangilash
        user.username = telegram_data.get('username', '')
        user.save(update_fields=['username'])
    
    return user


def normalize_phone(raw_phone: str) -> Optional[str]:
    """Telefon raqamini +998XXXXXXXXX formatiga keltirish."""
    digits = re.sub(r"\D+", "", raw_phone or "")
    if digits.startswith("998") and len(digits) == 12:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 10:
        return f"+998{digits[1:]}"
    if len(digits) == 9:
        return f"+998{digits}"
    return None


def get_active_regions() -> list[dict]:
    regions = list(
        BotRegion.objects.filter(is_active=True)
        .order_by('order', 'name_uz')
        .values('id', 'name_uz', 'name_ru', 'name_en')
    )
    names = load_map_region_names()
    if names and len(regions) < len(names):
        for index, name in enumerate(names, 1):
            fields = build_region_fields(name, order=index)
            BotRegion.objects.update_or_create(code=fields['code'], defaults=fields)
        regions = list(
            BotRegion.objects.filter(is_active=True)
            .order_by('order', 'name_uz')
            .values('id', 'name_uz', 'name_ru', 'name_en')
        )
    return regions


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


def get_bot_about_text(language: str = "uz") -> str:
    """Bot sozlamalaridan 'Biz haqimizda' matnini olish."""
    return get_bot_template_text("about_text", language, "about_text")


def get_bot_template_text(prefix: str, language: str = "uz", fallback_key: str | None = None) -> str:
    """Bot sozlamalaridan matn shablonini olish."""
    settings = BotSettings.objects.first()
    field_name = f"{prefix}_{language}"

    if settings and hasattr(settings, field_name):
        text = getattr(settings, field_name, "")
        if text:
            return text

    return get_text(fallback_key or prefix, language)


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

    # Lokatsiya xabari
    if 'location' in message:
        handle_location(user, message, chat_id)
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
            get_bot_about_text(user.language),
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
            get_bot_template_text('help_text', user.language, 'help_text'),
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
            get_bot_template_text('welcome_message', user.language, 'welcome'),
            reply_markup=main_menu_keyboard(user.language)
        )


def handle_command(user: TelegramUser, command: str, chat_id: int):
    """Buyruqlarni qayta ishlash"""
    command = command.split()[0].lower()
    
    if command == '/start':
        clear_user_state(user)

        if not user.is_registered and user.language != 'uz':
            user.language = 'uz'
            user.save(update_fields=['language'])
        
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
                get_bot_template_text('welcome_message', user.language, 'welcome')
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
            get_bot_template_text('help_text', user.language, 'help_text'),
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
        elif current_state.startswith('settings:'):
            bot.send_message(
                chat_id,
                get_text('settings_menu', lang),
                reply_markup=settings_keyboard(lang)
            )
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
        phone = normalize_phone(text)
        if phone:
            user.phone = phone
            user.save()
            
            # Hududlarni ko'rsatish
            regions = get_active_regions()
            if regions:
                bot.send_message(
                    chat_id,
                    get_text('ask_region', lang),
                    reply_markup=regions_keyboard(regions, lang, page=0)
                )
                set_user_state(user, 'registration:region')
            else:
                # Hududlar yo'q, ro'yxatdan o'tishni yakunlash
                complete_registration(user, chat_id)
        else:
            bot.send_message(chat_id, get_text('error_invalid_input', lang))

    elif current_state == 'settings:name':
        parts = text.strip().split(maxsplit=1)
        if len(parts) >= 1:
            user.first_name = parts[0]
            if len(parts) > 1:
                user.last_name = parts[1]
            user.save()
            clear_user_state(user)
            bot.send_message(
                chat_id,
                get_text('name_updated', lang),
                reply_markup=settings_keyboard(lang)
            )
        else:
            bot.send_message(chat_id, get_text('error_invalid_input', lang))

    elif current_state == 'settings:phone':
        phone = normalize_phone(text)
        if phone:
            user.phone = phone
            user.save()
            clear_user_state(user)
            bot.send_message(
                chat_id,
                get_text('phone_updated', lang),
                reply_markup=settings_keyboard(lang)
            )
        else:
            bot.send_message(chat_id, get_text('error_invalid_input', lang))
    
    # Murojaat holatlari
    elif current_state == 'appeal:location':
        # Lokatsiyani o'tkazib yuborish
        if text in [get_text('btn_skip_location', l) for l in ['uz', 'ru', 'en']]:
            set_user_state(user, 'appeal:text', data)
            bot.send_message(
                chat_id,
                get_text('enter_appeal_text', lang),
                reply_markup=remove_keyboard()
            )
            return

        # Boshqa matn kiritilsa, lokatsiya tugmasidan foydalanishni eslatamiz
        bot.send_message(
            chat_id,
            get_text('ask_location', lang),
            reply_markup=location_keyboard(lang)
        )
        return

    elif current_state == 'appeal:feedback_comment':
        appeal_id = data.get('appeal_id')
        if not appeal_id:
            clear_user_state(user)
            bot.send_message(chat_id, get_text('error_something_wrong', lang), reply_markup=main_menu_keyboard(lang))
            return

        if text in [get_text('btn_skip_comment', l) for l in ['uz', 'ru', 'en']]:
            data['comment'] = ''
        else:
            data['comment'] = (text or '').strip()

        set_user_state(user, 'appeal:feedback_attachments', data)
        try:
            appeal = TelegramAppeal.objects.get(id=int(appeal_id), telegram_user=user)
            number = appeal.appeal_number
        except Exception:
            number = str(appeal_id)

        bot.send_message(
            chat_id,
            get_text('feedback_attachments_prompt', lang, number=number),
            reply_markup=attachment_keyboard(lang)
        )
        return

    elif current_state == 'appeal:feedback_attachments':
        # "Tugatish" tugmasi
        if text in [get_text('btn_finish', l) for l in ['uz', 'ru', 'en']]:
            from django.utils import timezone
            appeal_id = data.get('appeal_id')
            satisfied = bool(data.get('satisfied', True))
            rating = data.get('rating')
            comment = (data.get('comment') or '').strip()

            try:
                appeal = TelegramAppeal.objects.get(id=int(appeal_id), telegram_user=user)
            except Exception:
                clear_user_state(user)
                bot.send_message(chat_id, get_text('appeal_not_found', lang), reply_markup=main_menu_keyboard(lang))
                return

            stars = ('⭐' * int(rating)) if rating else '-'

            feedback_lines = []
            feedback_lines.append("Fuqaro feedback:")
            feedback_lines.append("✅ Ha, mamnunman" if satisfied else "❌ Yo'q, mamnun emasman")
            if rating:
                feedback_lines.append(f"⭐ Baho: {stars} ({int(rating)}/5)")
            if comment:
                feedback_lines.append("")
                feedback_lines.append("Izoh:")
                feedback_lines.append(comment)
            AppealMessage.objects.create(
                appeal=appeal,
                is_from_admin=False,
                text="\n".join(feedback_lines)
            )
            try:
                from notifications.services import notify_appeal_message

                notify_appeal_message(
                    appeal=appeal,
                    sender_name=appeal.telegram_user.full_name,
                    preview="\n".join(feedback_lines)[:500],
                )
            except Exception:
                pass

            appeal.rating = int(rating) if rating else None
            appeal.rating_comment = comment
            appeal.rated_at = timezone.now()

            if satisfied:
                appeal.status = 'resolved'
                appeal.closed_at = timezone.now()
                appeal.save(update_fields=['rating', 'rating_comment', 'rated_at', 'status', 'closed_at', 'updated_at'])

                bot.send_message(
                    chat_id,
                    get_text('feedback_received_resolved', lang, number=appeal.appeal_number, stars=stars),
                    reply_markup=main_menu_keyboard(lang)
                )
                notify_admins_appeal_closed(appeal, satisfied=True, rating=int(rating) if rating else None)
            else:
                appeal.status = 'pending_review'
                appeal.closed_at = None
                appeal.save(update_fields=['rating', 'rating_comment', 'rated_at', 'status', 'closed_at', 'updated_at'])

                bot.send_message(
                    chat_id,
                    get_text('feedback_received_reopened', lang, number=appeal.appeal_number),
                    reply_markup=main_menu_keyboard(lang)
                )
                notify_admins_appeal_reopened(appeal)

            try:
                from notifications.services import notify_appeal_feedback
                if satisfied:
                    notify_appeal_feedback(appeal=appeal, rating=int(rating) if rating else None)
            except Exception:
                pass

            clear_user_state(user)
            return

        bot.send_message(
            chat_id,
            get_text('feedback_attachments_prompt', lang, number=data.get('appeal_number') or data.get('appeal_id')),
            reply_markup=attachment_keyboard(lang)
        )
        return

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
            loc = data.get('location') or {}
            location_text = '-'
            try:
                lat = loc.get('latitude')
                lon = loc.get('longitude')
                if lat is not None and lon is not None:
                    location_text = f"{lat}, {lon}"
            except Exception:
                location_text = '-'
            
            bot.send_message(
                chat_id,
                get_text(
                    'confirm_appeal',
                    lang,
                    type=type_name,
                    category=cat_name,
                    location=location_text,
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
                get_text('reply_state_error', lang),
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
                get_text('reply_sent', lang, number=appeal.appeal_number),
                reply_markup=main_menu_keyboard(lang)
            )
            
            # Adminlarga xabar yuborish
            notify_admins_user_reply(appeal, text)
            try:
                from notifications.services import notify_appeal_message

                notify_appeal_message(
                    appeal=appeal,
                    sender_name=appeal.telegram_user.full_name,
                    preview=text,
                )
            except Exception:
                pass
            
        except TelegramAppeal.DoesNotExist:
            clear_user_state(user)
            bot.send_message(
                chat_id,
                get_text('appeal_not_found', lang),
                reply_markup=main_menu_keyboard(lang)
            )


def handle_contact(user: TelegramUser, message: Dict, chat_id: int):
    """Kontakt xabarini qayta ishlash"""
    state = get_user_state(user)
    if not state or state.state not in ['registration:phone', 'settings:phone']:
        return
    
    contact = message['contact']
    phone = normalize_phone(contact.get('phone_number', ''))
    if not phone:
        bot.send_message(chat_id, get_text('error_invalid_input', user.language))
        return
    
    user.phone = phone
    user.save()

    if state.state == 'settings:phone':
        clear_user_state(user)
        bot.send_message(
            chat_id,
            get_text('phone_updated', user.language),
            reply_markup=settings_keyboard(user.language)
        )
        return
    
    # Hududlarni ko'rsatish
    regions = get_active_regions()
    if regions:
        bot.send_message(
            chat_id,
            get_text('ask_region', user.language),
            reply_markup=regions_keyboard(regions, user.language, page=0)
        )
        set_user_state(user, 'registration:region')
        return

    complete_registration(user, chat_id)


def handle_location(user: TelegramUser, message: Dict, chat_id: int):
    """Lokatsiya xabarini qayta ishlash"""
    state = get_user_state(user)
    if not state or state.state != 'appeal:location':
        return

    location = message.get('location') or {}
    data = state.data if state else {}
    try:
        data['location'] = {
            'latitude': location.get('latitude'),
            'longitude': location.get('longitude'),
        }
    except Exception:
        data['location'] = {}

    set_user_state(user, 'appeal:text', data)
    bot.send_message(
        chat_id,
        get_text('enter_appeal_text', user.language),
        reply_markup=remove_keyboard()
    )


def handle_media(user: TelegramUser, message: Dict, chat_id: int):
    """Media fayllarni qayta ishlash"""
    state = get_user_state(user)
    if not state or state.state not in ['appeal:attachments', 'appeal:feedback_attachments']:
        return
    
    data = state.data or {}
    attachments = data.get('attachments', [])
    
    payload = get_media_payload(message)
    if not payload or not payload.get("file_id"):
        return

    payload["language"] = user.language
    is_allowed, rejection_reason = validate_bot_attachment(payload)
    if not is_allowed:
        bot.send_message(
            chat_id,
            rejection_reason,
            reply_markup=attachment_keyboard(user.language)
        )
        return

    file_id = payload["file_id"]
    file_type = payload["file_type"]
    file_name = payload.get("file_name")
    mime_type = payload.get("mime_type")
    file_size = int(payload.get("file_size") or 0)

    attachments.append({
        'file_id': file_id,
        'file_type': file_type,
        'file_name': file_name,
        'mime_type': mime_type,
        'file_size': file_size,
    })

    if state.state == 'appeal:attachments':
        data['attachments'] = attachments
        set_user_state(user, 'appeal:attachments', data)

        bot.send_message(
            chat_id,
            get_text('attachment_received', user.language),
            reply_markup=attachment_keyboard(user.language)
        )
        return

    appeal_id = data.get('appeal_id')
    try:
        appeal = TelegramAppeal.objects.get(id=int(appeal_id), telegram_user=user)
    except Exception:
        bot.send_message(chat_id, get_text('appeal_not_found', user.language), reply_markup=main_menu_keyboard(user.language))
        return

    # Fayl BAYTLARI ko'chirilmaydi — Telegram serverida qoladi va saytda
    # ko'rilganda `telegram_bot/media.py` orqali oqim bilan uzatiladi.
    # Ilgari har bir video diskka yozilardi va `media/` katalogi
    # boshqarib bo'lmas darajada o'sardi.
    if file_size and file_size > MAX_BOT_ATTACHMENT_SIZE_BYTES:
        bot.send_message(
            chat_id,
            get_text(
                'attachment_too_large',
                user.language,
                file_name=file_name or "fayl",
                size_mb=format_file_size_mb(file_size),
            ),
            reply_markup=attachment_keyboard(user.language)
        )
        return

    try:
        save_appeal_attachment(
            appeal,
            file_id=file_id,
            file_type=file_type,
            file_name=file_name or '',
            mime_type=mime_type or '',
            file_size=file_size,
        )
    except Exception as e:
        logger.error(f"Feedback attachment save error: {e}")

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
    
    # Hudud sahifalash (pagination)
    if data.startswith('region_page:'):
        page = int(data.split(':')[1])
        regions = get_active_regions()
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('ask_region', lang),
            reply_markup=regions_keyboard(regions, lang, page=page)
        )
        return
    
    # Hudud info tugmasi (hech narsa qilmaydi)
    if data == 'region:info':
        return
    
    # Hudud tanlash
    if data.startswith('region:'):
        region_id = data.split(':')[1]
        state = get_user_state(user)
        is_settings_flow = bool(state and state.state == 'settings:region')
        
        # "Boshqa" tanlansa
        if region_id == 'other':
            user.region = None
            user.save()
            bot.edit_message_text(
                chat_id,
                message_id,
                get_text('region_other_selected', lang)
            )
            if is_settings_flow:
                clear_user_state(user)
                bot.send_message(
                    chat_id,
                    get_text('region_updated', lang),
                    reply_markup=settings_keyboard(lang)
                )
            else:
                complete_registration(user, chat_id)
            return
        
        try:
            region = BotRegion.objects.get(id=int(region_id))
            user.region = region
            user.save()
            
            bot.edit_message_text(
                chat_id,
                message_id,
                f"✅ {getattr(region, f'name_{lang}', None) or region.name_uz}"
            )

            if is_settings_flow:
                clear_user_state(user)
                bot.send_message(
                    chat_id,
                    get_text('region_updated', lang),
                    reply_markup=settings_keyboard(lang)
                )
            else:
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

        # Lokatsiya (ixtiyoriy)
        bot.send_message(
            chat_id,
            get_text('ask_location', lang),
            reply_markup=location_keyboard(lang)
        )
        set_user_state(user, 'appeal:location', state_data)
        return
    
    # Murojaatni tasdiqlash
    if data == 'confirm':
        state = get_user_state(user)
        logger.info(f"Confirm callback: state={state.state if state else None}, data_type={type(state.data) if state else None}")
        if state and state.state == 'appeal:confirm':
            logger.info(f"Creating appeal with data: {state.data}")
            create_appeal(user, state.data, chat_id)
        else:
            logger.warning(f"Confirm pressed but state is wrong: state={state}")
            bot.send_message(
                chat_id,
                get_text('error_something_wrong', lang),
                reply_markup=main_menu_keyboard(lang)
            )
        return
    
    # Til o'zgartirish
    if data.startswith('lang:'):
        new_lang = data.split(':')[1]
        user.language = new_lang
        user.save()
        
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('language_changed', new_lang)
        )
        
        # Yangi tilda main menyu ko'rsatish
        bot.send_message(
            chat_id,
            get_text('main_menu', new_lang),
            reply_markup=main_menu_keyboard(new_lang)
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

        state = get_user_state(user)
        feedback_data = {}
        if state and state.state in ['appeal:feedback_rating', 'appeal:feedback_comment', 'appeal:feedback_attachments']:
            feedback_data = state.data or {}

        if str(feedback_data.get('appeal_id')) != str(appeal_id):
            feedback_data = {'appeal_id': appeal_id, 'satisfied': True}

        rating = None if rating_value == 'skip' else int(rating_value)
        feedback_data['rating'] = rating
        set_user_state(user, 'appeal:feedback_comment', feedback_data)

        try:
            appeal = TelegramAppeal.objects.get(id=appeal_id, telegram_user=user)
            number = appeal.appeal_number
        except TelegramAppeal.DoesNotExist:
            bot.edit_message_text(chat_id, message_id, get_text('appeal_not_found', lang))
            return

        prompt = get_text('feedback_comment_prompt', lang, number=number)
        bot.edit_message_text(
            chat_id,
            message_id,
            prompt,
            parse_mode='HTML'
        )
        bot.send_message(
            chat_id,
            prompt,
            reply_markup=comment_keyboard(lang)
        )
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
                get_text('language_prompt', lang),
                reply_markup=language_keyboard()
            )
            return
        if setting == 'name':
            bot.edit_message_text(
                chat_id,
                message_id,
                get_text('change_name_prompt', lang)
            )
            set_user_state(user, 'settings:name')
            return
        if setting == 'phone':
            bot.send_message(
                chat_id,
                get_text('ask_phone', lang),
                reply_markup=phone_keyboard(lang)
            )
            set_user_state(user, 'settings:phone')
            return
        if setting == 'region':
            regions = get_active_regions()
            bot.edit_message_text(
                chat_id,
                message_id,
                get_text('ask_region', lang),
                reply_markup=regions_keyboard(regions, lang, page=0)
            )
            set_user_state(user, 'settings:region')
            return
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

        set_user_state(user, 'appeal:feedback_rating', {'appeal_id': appeal.id, 'satisfied': is_satisfied})
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('rating_prompt', lang, number=appeal.appeal_number),
            parse_mode='HTML',
            reply_markup=rating_keyboard(appeal.id, lang)  # type: ignore[attr-defined]
        )
            
    except TelegramAppeal.DoesNotExist:
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('appeal_not_found_or_denied', lang)
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
            get_text('rating_thanks', user.language, number=appeal.appeal_number, stars=stars),
            parse_mode='HTML'
        )
        
        # Adminlarga xabar
        notify_admins_appeal_closed(appeal, satisfied=True, rating=rating)
        from notifications.services import notify_appeal_feedback
        notify_appeal_feedback(appeal=appeal, rating=rating)
        
        logger.info(f"Appeal {appeal.appeal_number} rated {rating} stars by user {user.telegram_id}")
        
    except TelegramAppeal.DoesNotExist:
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('appeal_not_found', user.language)
        )


def handle_close_appeal_callback(user: TelegramUser, appeal_id: int, is_satisfied: bool, chat_id: int, message_id: int):
    """Murojaatni yopish callback'ini qayta ishlash (Admin tomonidan yopilganda)"""
    from django.utils import timezone
    
    try:
        appeal = TelegramAppeal.objects.get(id=appeal_id, telegram_user=user)

        set_user_state(user, 'appeal:feedback_rating', {'appeal_id': appeal.id, 'satisfied': is_satisfied})
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('rating_prompt', user.language, number=appeal.appeal_number),
            parse_mode='HTML',
            reply_markup=rating_keyboard(appeal.id, user.language)  # type: ignore[attr-defined]
        )
            
    except TelegramAppeal.DoesNotExist:
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('appeal_not_found', user.language)
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
                get_text('appeal_already_closed', user.language),
            )
            return
        
        # Javob yozish holatiga o'tkazish
        set_user_state(user, 'user_reply', {'appeal_id': appeal_id})
        logger.info(f"User state set: user_reply, appeal_id={appeal_id}")
        
        reply_prompt = (
            get_text('reply_prompt', user.language, number=appeal.appeal_number)
        )
        
        # Avval matnli xabarni tahrirlashga urinamiz
        result = bot.edit_message_text(
            chat_id, message_id, reply_prompt, parse_mode='HTML'
        )
        
        # Agar muvaffaqiyatsiz bo'lsa (rasm/video/audio xabar), captionni tahrirlaymiz
        if not result.get('ok'):
            logger.info(f"edit_message_text failed, trying edit_message_caption")
            result = bot.edit_message_caption(
                chat_id, message_id, reply_prompt, parse_mode='HTML'
            )
        
        # Agar u ham ishlamasa, yangi xabar yuboramiz
        if not result.get('ok'):
            logger.info(f"edit_message_caption also failed, sending new message")
            bot.send_message(chat_id, reply_prompt, parse_mode='HTML')
        
        logger.info(f"user_reply callback handled, result: {result}")
        
    except TelegramAppeal.DoesNotExist:
        logger.error(f"Appeal topilmadi: id={appeal_id}, user={user.telegram_id}")
        bot.edit_message_text(
            chat_id,
            message_id,
            get_text('appeal_not_found_or_denied', user.language)
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

            comment = (getattr(appeal, 'rating_comment', '') or '').strip()
            if comment:
                safe_comment = comment[:500] + ('...' if len(comment) > 500 else '')
                message += f"\n\n💬 <b>Izoh:</b>\n{safe_comment}"
            
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

            if getattr(appeal, 'rating', None):
                stars = '⭐' * int(appeal.rating)
                message += f"\n\n📊 <b>Baho:</b> {stars} ({int(appeal.rating)}/5)"
            comment = (getattr(appeal, 'rating_comment', '') or '').strip()
            if comment:
                safe_comment = comment[:500] + ('...' if len(comment) > 500 else '')
                message += f"\n\n💬 <b>Izoh:</b>\n{safe_comment}"
            
            bot.send_message(
                int(admin.telegram_id),
                message,
                reply_markup=admin_review_keyboard(appeal.id)  # type: ignore[attr-defined]
            )
        except Exception as e:
            logger.error(f"Admin {admin.telegram_id} ga xabar yuborishda xato: {e}")

    try:
        from notifications.services import notify_appeal_status_update

        notify_appeal_status_update(
            appeal=appeal,
            title="Murojaat qayta ochildi",
            message=f"#{appeal.appeal_number} murojaati fuqaro qoniqmagani uchun qayta ko'rib chiqishga qaytdi.",
        )
    except Exception as e:
        logger.error(f"Dashboardga qayta ochilish bildirishnomasi yuborilmadi: {e}")


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

    try:
        from notifications.services import notify_appeal_message

        notify_appeal_message(
            appeal=appeal,
            sender_name=appeal.telegram_user.full_name,
            preview=reply_text,
        )
    except Exception as e:
        logger.error(f"Dashboardga foydalanuvchi javobi bildirishnomasi yuborilmadi: {e}")


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
        'draft': get_text('appeal_status_pending', lang),
        'pending_ai': get_text('appeal_status_pending', lang),
        'pending_review': get_text('appeal_status_pending', lang),
        'approved': get_text('appeal_status_approved', lang),
        'rejected': get_text('appeal_status_rejected', lang),
        'responded': get_text('appeal_status_responded', lang),
        'forwarded': get_text('appeal_status_forwarded', lang),
        'resolved': get_text('appeal_status_completed', lang),
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
    
    logger.info(f"create_appeal called with data: {data}")
    
    try:
        type_id = data.get('type_id')
        category_id = data.get('category_id')
        
        logger.info(f"Looking for type_id={type_id}, category_id={category_id}")
        
        if not type_id or not category_id:
            logger.error(f"Missing type_id or category_id: type_id={type_id}, category_id={category_id}")
            bot.send_message(chat_id, bot_error_text(lang, "Murojaat turi yoki soha tanlanmagan"), reply_markup=main_menu_keyboard(lang))
        category = AppealCategory.objects.get(id=category_id)

        loc = data.get('location') or {}
        lat = loc.get('latitude')
        lon = loc.get('longitude')
        
        # Murojaat yaratish
        appeal = TelegramAppeal.objects.create(
            telegram_user=user,
            appeal_type=appeal_type,
            category=category,
            text=data.get('text', ''),
            latitude=str(lat) if lat is not None else None,
            longitude=str(lon) if lon is not None else None,
            source='telegram',
            status='pending_ai'
        )

        # Boshlang'ich xabar (dashboardda "yangi xabar" kabi ko'rinishi uchun)
        try:
            AppealMessage.objects.create(
                appeal=appeal,
                is_from_admin=False,
                text=appeal.text,
            )
        except Exception:
            pass

        def _auto_assign_organizations() -> None:
            try:
                from organizations.models import Organization

                if appeal.assigned_organizations.exists():
                    return

                # Faqat tanlangan soha uchun oldindan biriktirilgan tashkilotlargina olinadi.
                try:
                    mapped_orgs = category.responsible_organizations.filter(is_active=True)  # type: ignore[attr-defined]
                except Exception:
                    mapped_orgs = Organization.objects.none()
                if mapped_orgs.exists():
                    appeal.assigned_organizations.set(mapped_orgs)
            except Exception as e:
                logger.warning(f"Auto-assign organizations failed for appeal_id={appeal.id}: {e}")

        _auto_assign_organizations()

        # Dashboardga bildirishnoma (admin + biriktirilgan tashkilotlar)
        try:
            from notifications.services import notify_appeal_status_update

            cat_name = getattr(category, 'name_uz', '') or ''
            type_name = getattr(appeal_type, 'name_uz', '') or ''
            notify_appeal_status_update(
                appeal=appeal,
                title="Yangi murojaat",
                message=f"#{appeal.appeal_number} - {user.full_name} ({user.phone or '-'}) {cat_name} / {type_name}",
            )
        except Exception:
            pass
        
        # Fayllarni saqlash
        attachments = data.get('attachments', [])
        for att in attachments:
            try:
                file_id = att.get('file_id')
                if not file_id:
                    logger.warning("Attachment skipped: missing file_id")
                    continue
                file_type = att.get('file_type') or 'document'
                if file_type not in {'photo', 'document'}:
                    logger.warning(f"Attachment skipped: invalid file_type={file_type}")
                    continue

                is_allowed, rejection_reason = validate_bot_attachment({
                    'file_type': file_type,
                    'file_name': att.get('file_name'),
                    'mime_type': att.get('mime_type'),
                    'file_size': att.get('file_size') or 0,
                    'language': lang,
                })
                if not is_allowed:
                    logger.warning(
                        "Attachment skipped after validation: %s",
                        rejection_reason,
                    )
                    continue

                # Fayl BAYTLARI ko'chirilmaydi. Ilova faqat `file_id` bilan
                # saqlanadi, baytlar Telegram serverida qoladi va saytda
                # ko'rilganda `telegram_bot/media.py` orqali oqim bilan
                # uzatiladi. Ilgari har bir ilova diskka yozilar edi —
                # `media/` katalogi oyiga o'nlab gigabaytga o'sardi.
                save_appeal_attachment(
                    appeal,
                    file_id=file_id,
                    file_type=file_type,
                    file_name=att.get('file_name') or '',
                    mime_type=att.get('mime_type') or '',
                    file_size=int(att.get('file_size') or 0),
                )
            except Exception as e:
                logger.error(f"Attachment saqlashda xato: {e}")
        
        clear_user_state(user)
        
        bot.send_message(
            chat_id,
            get_text('appeal_submitted', lang, number=appeal.appeal_number),
            reply_markup=main_menu_keyboard(lang)
        )
        
        # AI tahlili va adminlarga xabar fon rejimida bajariladi.
        run_in_background(process_appeal_with_ai, appeal)
        run_in_background(notify_admins_about_appeal, appeal)
        
    except AppealType.DoesNotExist:
        logger.error(f"AppealType topilmadi: type_id={data.get('type_id')}")
        bot.send_message(
            chat_id,
            bot_error_text(lang, "Murojaat turi topilmadi"),
            reply_markup=main_menu_keyboard(lang)
        )
    except AppealCategory.DoesNotExist:
        logger.error(f"AppealCategory topilmadi: category_id={data.get('category_id')}")
        bot.send_message(
            chat_id,
            bot_error_text(lang, "Murojaat sohasi topilmadi"),
            reply_markup=main_menu_keyboard(lang)
        )
    except Exception as e:
        logger.error(f"Murojaat yaratishda xato: {type(e).__name__}: {e}", exc_info=True)
        bot.send_message(
            chat_id,
            bot_error_text(lang, str(e)),
            reply_markup=main_menu_keyboard(lang)
        )


def process_appeal_with_ai(appeal: TelegramAppeal):
    """AI orqali murojaatni tahlil qilish va mas'ul tashkilotga biriktirish.

    Tahlildan keyin murojaat `pending_review` da turib qolmaydi: soha
    aniqlanadi, mas'ul tashkilot topiladi va topshiriq yaratiladi
    (`auto_assign_appeal`). Tashkilot topilmasa — qo'lda ko'rib chiqish
    uchun qoladi, tasodifiy biriktirish qilinmaydi.
    """
    from .ai_service import analyze_appeal
    from ..auto_assign import auto_assign_appeal

    result = {}
    try:
        settings_obj = BotSettings.objects.first()

        if not settings_obj or settings_obj.ai_provider == 'disabled':
            # AI o'chirilgan bo'lsa ham yo'naltirish ishlaydi: fuqaro
            # sohani botda o'zi tanlagan, ya'ni mas'ul tashkilot
            # jadvaldan topiladi.
            appeal.status = 'pending_review'
            appeal.save()
            auto_assign_appeal(appeal, None)
            return

        result = analyze_appeal(appeal, settings_obj) or {}

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
            return

        appeal.status = 'pending_review'
        appeal.save()

    except Exception as e:
        logger.error(f"AI tahlilida xato: {e}")
        appeal.status = 'pending_review'
        appeal.save()

    # Tahlil muvaffaqiyatli bo'ldimi yoki xato berdimi — murojaat baribir
    # mas'ul tashkilotga yetib borishi kerak.
    auto_assign_appeal(appeal, result)


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
        bot.send_message(
            chat_id,
            get_text('warning_blocked', lang, number=appeal.appeal_number, reason=reason)
        )
        
        # Adminlarga xabar
        notify_admins_user_blocked(user, appeal, reason)
    else:
        user.save()
        
        remaining = 3 - user.warning_count
        
        # Ogohlantirish xabari
        bot.send_message(
            chat_id,
            get_text(
                'warning_notice',
                lang,
                count=user.warning_count,
                number=appeal.appeal_number,
                reason=reason,
                remaining=remaining,
            )
        )


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
    from django.utils import timezone as tz
    admins = BotAdmin.objects.filter(is_active=True)
    appeal_id = getattr(appeal, "id", None) or getattr(appeal, "pk", None)
    
    # Admin xabardor qilingan vaqtni belgilash (auto-response timeout uchun)
    appeal.admin_notified_at = tz.now()
    appeal.save(update_fields=['admin_notified_at'])
    
    for admin in admins:
        try:
            user = appeal.telegram_user
            appeal_type = appeal.appeal_type
            category = appeal.category
            
            type_name = appeal_type.name_uz if appeal_type else ''
            cat_name = category.name_uz if category else ''
            region_name = user.region.name_uz if user.region else '-'
            location_text = '-'
            if getattr(appeal, 'latitude', None) is not None and getattr(appeal, 'longitude', None) is not None:
                location_text = f"{appeal.latitude}, {appeal.longitude}"
            
            text = get_text(
                'admin_new_appeal',
                'uz',
                number=appeal.appeal_number,
                user_name=user.full_name,
                phone=user.phone or '-',
                region=region_name,
                location=location_text,
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
            
            if appeal_id is not None:
                bot.send_message(
                    int(admin.telegram_id),
                    text,
                    reply_markup=admin_review_keyboard(appeal_id)
                )
            else:
                bot.send_message(
                    int(admin.telegram_id),
                    text,
                )
        except Exception as e:
            logger.error(f"Admin {admin.telegram_id} ga xabar yuborishda xato: {e}")
