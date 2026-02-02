"""
Telegram Bot API helper sinfi.

Bu modul Telegram Bot API bilan ishlash uchun yordamchi
funksiyalar va sinflarni o'z ichiga oladi.

Usage:
    from telegram_bot.telegram_api import TelegramAPI
    
    api = TelegramAPI.get_instance()
    result = api.send_message(chat_id=12345, text="Salom!")
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, TypedDict, Union

import requests

from core.constants import TelegramMediaType, Messages


logger = logging.getLogger(__name__)


# =============================================================================
# TYPE DEFINITIONS
# =============================================================================

class TelegramResponse(TypedDict, total=False):
    """Telegram API javob turi."""
    ok: bool
    result: Any
    description: str
    error_code: int


class InlineKeyboardButton(TypedDict, total=False):
    """Inline keyboard tugmasi."""
    text: str
    callback_data: str
    url: str


@dataclass(frozen=True)
class SendResult:
    """Xabar yuborish natijasi.
    
    Attributes:
        success: Muvaffaqiyatli yuborilganmi
        message_id: Telegram xabar ID'si (agar muvaffaqiyatli bo'lsa)
        error: Xato xabari (agar xato bo'lsa)
        file_id: Yuborilgan fayl ID'si (media uchun)
    """
    success: bool
    message_id: Optional[int] = None
    error: Optional[str] = None
    file_id: Optional[str] = None


# =============================================================================
# TELEGRAM API CLASS
# =============================================================================

class TelegramAPI:
    """Telegram Bot API bilan ishlash uchun sinf.
    
    Bu sinf Telegram Bot API ga so'rovlar yuborish uchun
    markazlashtirilgan interfeys taqdim etadi.
    
    Attributes:
        bot_token: Telegram bot tokeni
        base_url: Telegram API base URL
        timeout: So'rov timeout (soniyada)
    
    Example:
        >>> api = TelegramAPI(bot_token="123456:ABC-DEF")
        >>> result = api.send_message(chat_id=12345, text="Salom!")
        >>> if result.success:
        ...     print(f"Xabar yuborildi: {result.message_id}")
    """
    
    BASE_URL: str = "https://api.telegram.org/bot{token}/{method}"
    DEFAULT_TIMEOUT: int = 30
    
    _instance: Optional['TelegramAPI'] = None
    
    def __init__(self, bot_token: str, timeout: int = DEFAULT_TIMEOUT) -> None:
        """TelegramAPI obyektini yaratish.
        
        Args:
            bot_token: Telegram BotFather dan olingan token
            timeout: So'rovlar uchun timeout (soniyada)
        """
        self.bot_token = bot_token
        self.timeout = timeout
    
    @classmethod
    def get_instance(cls) -> Optional['TelegramAPI']:
        """Singleton instance olish.
        
        Bot sozlamalaridan token olib, TelegramAPI instance qaytaradi.
        
        Returns:
            TelegramAPI instance yoki None (agar sozlamalar topilmasa)
        """
        # Lazy import to avoid circular imports
        from .models import BotSettings
        
        settings = BotSettings.objects.first()
        if not settings or not settings.bot_token:
            return None
        
        if cls._instance is None or cls._instance.bot_token != settings.bot_token:
            cls._instance = cls(bot_token=settings.bot_token)
        
        return cls._instance
    
    def _make_request(
        self,
        method: str,
        data: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None,
        timeout: Optional[int] = None
    ) -> TelegramResponse:
        """Telegram API ga so'rov yuborish.
        
        Args:
            method: API method nomi (masalan: sendMessage)
            data: So'rov ma'lumotlari
            files: Yuklash uchun fayllar
            timeout: Maxsus timeout (ixtiyoriy)
            
        Returns:
            Telegram API javobi
        """
        url = self.BASE_URL.format(token=self.bot_token, method=method)
        request_timeout = timeout or self.timeout
        
        try:
            if files:
                response = requests.post(
                    url,
                    data=data,
                    files=files,
                    timeout=request_timeout
                )
            else:
                response = requests.post(
                    url,
                    json=data,
                    timeout=request_timeout
                )
            
            return response.json()
            
        except requests.Timeout:
            logger.error(f"Telegram API timeout: {method}")
            return {"ok": False, "description": "Request timeout"}
        except requests.RequestException as e:
            logger.error(f"Telegram API error: {method} - {e}")
            return {"ok": False, "description": str(e)}
    
    # =========================================================================
    # MESSAGE METHODS
    # =========================================================================
    
    def send_message(
        self,
        chat_id: int,
        text: str,
        parse_mode: str = 'HTML',
        reply_markup: Optional[Dict] = None,
        disable_notification: bool = False
    ) -> SendResult:
        """Matn xabari yuborish.
        
        Args:
            chat_id: Telegram chat ID
            text: Xabar matni
            parse_mode: Parse rejimi (HTML yoki Markdown)
            reply_markup: Klaviatura (inline yoki reply)
            disable_notification: Ovozsiz yuborish
            
        Returns:
            SendResult obyekti
        """
        data: Dict[str, Any] = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': parse_mode,
            'disable_notification': disable_notification
        }
        
        if reply_markup:
            data['reply_markup'] = reply_markup
        
        response = self._make_request('sendMessage', data)
        
        if response.get('ok'):
            result = response.get('result', {})
            return SendResult(
                success=True,
                message_id=result.get('message_id')
            )
        
        return SendResult(
            success=False,
            error=response.get('description', 'Noma\'lum xato')
        )
    
    def send_photo(
        self,
        chat_id: int,
        photo: Union[str, bytes],
        caption: str = '',
        parse_mode: str = 'HTML',
        reply_markup: Optional[Dict] = None,
        filename: str = 'photo.jpg'
    ) -> SendResult:
        """Rasm yuborish.
        
        Args:
            chat_id: Telegram chat ID
            photo: Rasm URL'i, file_id yoki bytes
            caption: Rasm tavsifi
            parse_mode: Parse rejimi
            reply_markup: Klaviatura
            filename: Fayl nomi (bytes uchun)
            
        Returns:
            SendResult obyekti
        """
        return self._send_media(
            chat_id=chat_id,
            media=photo,
            media_type=TelegramMediaType.PHOTO,
            caption=caption,
            parse_mode=parse_mode,
            reply_markup=reply_markup,
            filename=filename
        )
    
    def send_document(
        self,
        chat_id: int,
        document: Union[str, bytes],
        caption: str = '',
        parse_mode: str = 'HTML',
        reply_markup: Optional[Dict] = None,
        filename: str = 'document'
    ) -> SendResult:
        """Hujjat yuborish.
        
        Args:
            chat_id: Telegram chat ID
            document: Hujjat URL'i, file_id yoki bytes
            caption: Hujjat tavsifi
            parse_mode: Parse rejimi
            reply_markup: Klaviatura
            filename: Fayl nomi
            
        Returns:
            SendResult obyekti
        """
        return self._send_media(
            chat_id=chat_id,
            media=document,
            media_type=TelegramMediaType.DOCUMENT,
            caption=caption,
            parse_mode=parse_mode,
            reply_markup=reply_markup,
            filename=filename
        )
    
    def send_video(
        self,
        chat_id: int,
        video: Union[str, bytes],
        caption: str = '',
        parse_mode: str = 'HTML',
        reply_markup: Optional[Dict] = None,
        filename: str = 'video.mp4'
    ) -> SendResult:
        """Video yuborish.
        
        Args:
            chat_id: Telegram chat ID
            video: Video URL'i, file_id yoki bytes
            caption: Video tavsifi
            parse_mode: Parse rejimi
            reply_markup: Klaviatura
            filename: Fayl nomi
            
        Returns:
            SendResult obyekti
        """
        return self._send_media(
            chat_id=chat_id,
            media=video,
            media_type=TelegramMediaType.VIDEO,
            caption=caption,
            parse_mode=parse_mode,
            reply_markup=reply_markup,
            filename=filename
        )
    
    def _send_media(
        self,
        chat_id: int,
        media: Union[str, bytes],
        media_type: str,
        caption: str = '',
        parse_mode: str = 'HTML',
        reply_markup: Optional[Dict] = None,
        filename: str = 'file'
    ) -> SendResult:
        """Umumiy media yuborish metodi.
        
        Args:
            chat_id: Telegram chat ID
            media: Media (URL, file_id yoki bytes)
            media_type: Media turi (photo, video, document)
            caption: Tavsif
            parse_mode: Parse rejimi
            reply_markup: Klaviatura
            filename: Fayl nomi
            
        Returns:
            SendResult obyekti
        """
        method = TelegramMediaType.METHOD_MAP.get(media_type, 'sendDocument')
        field = TelegramMediaType.FIELD_MAP.get(media_type, 'document')
        
        data: Dict[str, Any] = {
            'chat_id': chat_id,
            'caption': caption,
            'parse_mode': parse_mode
        }
        
        if reply_markup:
            data['reply_markup'] = reply_markup
        
        files = None
        
        if isinstance(media, bytes):
            # Bytes - fayl sifatida yuborish
            files = {field: (filename, media)}
        else:
            # String - URL yoki file_id
            data[field] = media
        
        response = self._make_request(method, data, files, timeout=60)
        
        if response.get('ok'):
            result = response.get('result', {})
            
            # File ID olish
            file_id = None
            if media_type == TelegramMediaType.PHOTO:
                photos = result.get('photo', [])
                if photos:
                    file_id = photos[-1].get('file_id')
            else:
                media_result = result.get(field, {})
                file_id = media_result.get('file_id')
            
            return SendResult(
                success=True,
                message_id=result.get('message_id'),
                file_id=file_id
            )
        
        return SendResult(
            success=False,
            error=response.get('description', 'Noma\'lum xato')
        )
    
    # =========================================================================
    # INLINE KEYBOARD HELPERS
    # =========================================================================
    
    @staticmethod
    def create_inline_keyboard(
        buttons: List[List[Dict[str, str]]]
    ) -> Dict[str, List[List[Dict[str, str]]]]:
        """Inline keyboard yaratish.
        
        Args:
            buttons: Tugmalar matritsasi (har bir tugma {'text': str, 'callback_data': str} formatida)
            
        Returns:
            Inline keyboard dict
            
        Example:
            >>> keyboard = TelegramAPI.create_inline_keyboard([
            ...     [{'text': 'Ha', 'callback_data': 'yes'}],
            ...     [{'text': 'Yo\'q', 'callback_data': 'no'}]
            ... ])
        """
        return {'inline_keyboard': buttons}
    
    @staticmethod
    def create_reply_button(
        appeal_id: int,
        text: str = '💬 Javob berish'
    ) -> Dict[str, List[List[Dict[str, str]]]]:
        """Murojaat uchun javob berish tugmasi yaratish.
        
        Args:
            appeal_id: Murojaat ID'si
            text: Tugma matni
            
        Returns:
            Inline keyboard dict
        """
        return TelegramAPI.create_inline_keyboard([
            [{'text': text, 'callback_data': f'user_reply:{appeal_id}'}]
        ])
    
    @staticmethod
    def create_satisfaction_keyboard(
        appeal_id: int
    ) -> Dict[str, List[List[Dict[str, str]]]]:
        """Qoniqish so'rash klaviaturasi.
        
        Args:
            appeal_id: Murojaat ID'si
            
        Returns:
            Inline keyboard dict
        """
        return TelegramAPI.create_inline_keyboard([
            [
                {'text': '✅ Qoniqarli', 'callback_data': f'satisfied:{appeal_id}'},
                {'text': '❌ Qoniqarsiz', 'callback_data': f'unsatisfied:{appeal_id}'}
            ]
        ])
    
    # =========================================================================
    # BOT INFO METHODS
    # =========================================================================
    
    def get_me(self) -> Dict[str, Any]:
        """Bot ma'lumotlarini olish.
        
        Returns:
            Bot info dict yoki xato
        """
        response = self._make_request('getMe', timeout=10)
        
        if response.get('ok'):
            return {'success': True, 'bot_info': response.get('result')}
        
        return {
            'success': False,
            'error': response.get('description', 'Noma\'lum xato')
        }
    
    def set_webhook(self, url: str) -> Dict[str, Any]:
        """Webhook o'rnatish.
        
        Args:
            url: Webhook URL
            
        Returns:
            Natija dict
        """
        response = self._make_request('setWebhook', {'url': url}, timeout=10)
        
        if response.get('ok'):
            return {'success': True}
        
        return {
            'success': False,
            'error': response.get('description', 'Noma\'lum xato')
        }
    
    def delete_webhook(self) -> Dict[str, Any]:
        """Webhook o'chirish.
        
        Returns:
            Natija dict
        """
        response = self._make_request('deleteWebhook', timeout=10)
        
        if response.get('ok'):
            return {'success': True}
        
        return {
            'success': False,
            'error': response.get('description', 'Noma\'lum xato')
        }


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def send_appeal_message(
    appeal_id: int,
    text: str,
    include_reply_button: bool = True
) -> SendResult:
    """Murojaatga tegishli xabar yuborish.
    
    Bu funksiya murojaat foydalanuvchisiga xabar yuboradi
    va kerak bo'lsa "Javob berish" tugmasini qo'shadi.
    
    Args:
        appeal_id: Murojaat ID'si
        text: Xabar matni
        include_reply_button: Javob berish tugmasini qo'shish
        
    Returns:
        SendResult obyekti
    """
    # Lazy import
    from .models import TelegramAppeal
    
    try:
        appeal = TelegramAppeal.objects.select_related('telegram_user').get(id=appeal_id)
    except TelegramAppeal.DoesNotExist:
        return SendResult(success=False, error='Murojaat topilmadi')
    
    api = TelegramAPI.get_instance()
    if not api:
        return SendResult(success=False, error=Messages.BOT_SETTINGS_NOT_FOUND)
    
    reply_markup = None
    if include_reply_button:
        reply_markup = TelegramAPI.create_reply_button(appeal_id)
    
    return api.send_message(
        chat_id=appeal.telegram_user.telegram_id,
        text=f"📨 Sizning #{appeal.appeal_number} raqamli murojaatingizga javob:\n\n{text}",
        reply_markup=reply_markup
    )


def send_appeal_close_message(
    appeal_id: int,
    text: str
) -> SendResult:
    """Murojaat yopilganda qoniqish so'rash xabarini yuborish.
    
    Args:
        appeal_id: Murojaat ID'si
        text: Admin javobi
        
    Returns:
        SendResult obyekti
    """
    from .models import TelegramAppeal
    
    try:
        appeal = TelegramAppeal.objects.select_related('telegram_user').get(id=appeal_id)
    except TelegramAppeal.DoesNotExist:
        return SendResult(success=False, error='Murojaat topilmadi')
    
    api = TelegramAPI.get_instance()
    if not api:
        return SendResult(success=False, error=Messages.BOT_SETTINGS_NOT_FOUND)
    
    keyboard = TelegramAPI.create_satisfaction_keyboard(appeal_id)
    
    message = f"📨 Sizning #{appeal.appeal_number} raqamli murojaatingiz ko'rib chiqildi:\n\n{text}\n\n"
    message += "Iltimos, javobdan qoniqishingizni baholang:"
    
    return api.send_message(
        chat_id=appeal.telegram_user.telegram_id,
        text=message,
        reply_markup=keyboard
    )
