"""
Constants va Choices - Markazlashtirilgan konstantlar.

Barcha magic stringlar va choice'lar shu yerda saqlanadi.
Bu DRY (Don't Repeat Yourself) prinsipiga amal qiladi.

Usage:
    from core.constants import UserStatus, TaskStatus, AppealPriority
"""

from typing import Final


# =============================================================================
# USER CONSTANTS
# =============================================================================

class UserStatus:
    """Foydalanuvchi holatlari."""
    
    DRAFT: Final[str] = 'DRAFT'
    KUTILMOQDA: Final[str] = 'KUTILMOQDA'
    FAOL: Final[str] = 'FAOL'
    BLOKLANGAN: Final[str] = 'BLOKLANGAN'
    ARXIV: Final[str] = 'ARXIV'
    
    CHOICES: Final = [
        (DRAFT, 'Qoralama'),
        (KUTILMOQDA, 'Kutilmoqda'),
        (FAOL, 'Faol'),
        (BLOKLANGAN, 'Bloklangan'),
        (ARXIV, 'Arxiv'),
    ]
    
    # Faol foydalanuvchilar uchun filter
    ACTIVE_STATUSES: Final = [FAOL]


class UserRole:
    """Foydalanuvchi rollari."""
    
    HOKIM: Final[str] = 'HOKIM'
    HOKIM_YORDAMCHISI: Final[str] = 'HOKIM_YORDAMCHISI'
    HOKIMLIK_MASUL: Final[str] = 'HOKIMLIK_MASUL'
    TASHKILOT_RAHBARI: Final[str] = 'TASHKILOT_RAHBARI'
    TASHKILOT_MASUL: Final[str] = 'TASHKILOT_MASUL'
    ADMIN: Final[str] = 'ADMIN'
    
    CHOICES: Final = [
        (HOKIM, 'Hokim'),
        (HOKIM_YORDAMCHISI, "Hokim o'rinbosari"),
        (HOKIMLIK_MASUL, "Hokimlik mutaxassisi"),
        (TASHKILOT_RAHBARI, 'Tashkilot rahbari'),
        (TASHKILOT_MASUL, "Tashkilot mas'uli"),
        (ADMIN, 'Administrator'),
    ]
    
    # Barcha topshiriqlarni ko'ra oladigan rollar
    ADMIN_ROLES: Final = [HOKIM, ADMIN]
    
    # Topshiriq yaratish huquqiga ega rollar
    TASK_CREATOR_ROLES: Final = [HOKIM, HOKIM_YORDAMCHISI, TASHKILOT_RAHBARI, ADMIN]

    # Loyiha portfelini boshqarish huquqiga ega rollar
    PROJECT_MANAGER_ROLES: Final = [HOKIM, HOKIM_YORDAMCHISI, ADMIN]
    
    # Tashkilot xodimlari
    ORGANIZATION_ROLES: Final = [TASHKILOT_RAHBARI, TASHKILOT_MASUL]


# =============================================================================
# TASK CONSTANTS
# =============================================================================

class TaskStatus:
    """Topshiriq holatlari."""
    
    YANGI: Final[str] = 'YANGI'
    IJRODA: Final[str] = 'IJRODA'
    TEKSHIRUVDA: Final[str] = 'TEKSHIRUVDA'
    QAYTA_IJROGA_YUBORILDI: Final[str] = 'QAYTA_IJROGA_YUBORILDI'
    MUDDATI_KECH: Final[str] = 'MUDDATI_KECH'
    BAJARILDI: Final[str] = 'BAJARILDI'
    NAZORATDAN_YECHILDI: Final[str] = 'NAZORATDAN_YECHILDI'
    BAJARILMADI: Final[str] = 'BAJARILMADI'
    
    CHOICES: Final = [
        (YANGI, 'Yangi'),
        (IJRODA, 'Ijroda'),
        (TEKSHIRUVDA, 'Tekshiruvda'),
        (QAYTA_IJROGA_YUBORILDI, 'Qayta ijroga yuborildi'),
        (MUDDATI_KECH, "Muddati o'tgan"),
        (BAJARILDI, 'Bajarildi'),
        (NAZORATDAN_YECHILDI, 'Nazoratdan yechildi'),
        (BAJARILMADI, 'Bajarilmadi'),
    ]
    
    # Yopilgan/tugatilgan topshiriqlar
    CLOSED_STATUSES: Final = [BAJARILDI, NAZORATDAN_YECHILDI, BAJARILMADI]
    
    # Faol topshiriqlar
    ACTIVE_STATUSES: Final = [YANGI, IJRODA, TEKSHIRUVDA, QAYTA_IJROGA_YUBORILDI, MUDDATI_KECH]


class TaskPriority:
    """Topshiriq muhimligi."""
    
    PAST: Final[str] = 'PAST'
    ODDIY: Final[str] = 'ODDIY'
    YUQORI: Final[str] = 'YUQORI'
    FAVQULODDA: Final[str] = 'FAVQULODDA'
    
    CHOICES: Final = [
        (PAST, 'Past'),
        (ODDIY, 'Oddiy'),
        (YUQORI, 'Yuqori'),
        (FAVQULODDA, 'Favqulodda'),
    ]


class TaskCategory:
    """Topshiriq kategoriyasi."""
    
    XALQ_BILAN_MULOQOT: Final[str] = 'XALQ_BILAN_MULOQOT'
    IJTIMOIY_SOHA: Final[str] = 'IJTIMOIY_SOHA'
    INFRATUZILMA: Final[str] = 'INFRATUZILMA'
    MOLIYA: Final[str] = 'MOLIYA'
    QURILISH: Final[str] = 'QURILISH'
    EKOLOGIYA: Final[str] = 'EKOLOGIYA'
    BOSHQA: Final[str] = 'BOSHQA'
    
    CHOICES: Final = [
        (XALQ_BILAN_MULOQOT, 'Xalq bilan muloqot'),
        (IJTIMOIY_SOHA, 'Ijtimoiy soha'),
        (INFRATUZILMA, 'Infratuzilma'),
        (MOLIYA, 'Moliya'),
        (QURILISH, 'Qurilish'),
        (EKOLOGIYA, 'Ekologiya'),
        (BOSHQA, 'Boshqa'),
    ]


# =============================================================================
# APPEAL CONSTANTS
# =============================================================================

class AppealStatus:
    """Murojaat holatlari."""
    
    PENDING: Final[str] = 'pending'
    APPROVED: Final[str] = 'approved'
    REJECTED: Final[str] = 'rejected'
    IN_PROGRESS: Final[str] = 'in_progress'
    RESPONDED: Final[str] = 'responded'
    CLOSED: Final[str] = 'closed'
    FORWARDED: Final[str] = 'forwarded'
    
    CHOICES: Final = [
        (PENDING, 'Kutilmoqda'),
        (APPROVED, 'Tasdiqlangan'),
        (REJECTED, 'Rad etilgan'),
        (IN_PROGRESS, 'Jarayonda'),
        (RESPONDED, 'Javob berildi'),
        (CLOSED, 'Yopilgan'),
        (FORWARDED, 'Yuborilgan'),
    ]


class AppealPriority:
    """Murojaat muhimligi."""
    
    LOW: Final[str] = 'low'
    NORMAL: Final[str] = 'normal'
    HIGH: Final[str] = 'high'
    URGENT: Final[str] = 'urgent'
    
    CHOICES: Final = [
        (LOW, 'Past'),
        (NORMAL, 'Oddiy'),
        (HIGH, 'Yuqori'),
        (URGENT, 'Favqulodda'),
    ]


class AppealSource:
    """Murojaat manbasi."""
    
    BOT: Final[str] = 'bot'
    WEBAPP: Final[str] = 'webapp'
    SMS: Final[str] = 'sms'
    CALL: Final[str] = 'call'
    MANUAL: Final[str] = 'manual'
    
    CHOICES: Final = [
        (BOT, 'Telegram bot'),
        (WEBAPP, 'Web ilova'),
        (SMS, 'SMS'),
        (CALL, "Qo'ng'iroq"),
        (MANUAL, 'Qo\'lda'),
    ]


# =============================================================================
# NOTIFICATION CONSTANTS
# =============================================================================

class NotificationType:
    """Bildirishnoma turlari."""
    
    TASK: Final[str] = 'TASK'
    APPEAL: Final[str] = 'APPEAL'
    SYSTEM: Final[str] = 'SYSTEM'
    DEADLINE: Final[str] = 'DEADLINE'
    MESSAGE: Final[str] = 'MESSAGE'
    
    CHOICES: Final = [
        (TASK, 'Topshiriq'),
        (APPEAL, 'Murojaat'),
        (SYSTEM, 'Tizim'),
        (DEADLINE, 'Muddat'),
        (MESSAGE, 'Xabar'),
    ]


# =============================================================================
# AUDIT CONSTANTS
# =============================================================================

class AuditAction:
    """Audit log amallar."""
    
    # User actions
    USER_LOGIN: Final[str] = 'USER_LOGIN'
    USER_LOGOUT: Final[str] = 'USER_LOGOUT'
    USER_CREATED: Final[str] = 'USER_CREATED'
    USER_UPDATED: Final[str] = 'USER_UPDATED'
    USER_DELETED: Final[str] = 'USER_DELETED'
    
    # Task actions
    TASK_CREATED: Final[str] = 'TASK_CREATED'
    TASK_UPDATED: Final[str] = 'TASK_UPDATED'
    TASK_ACCEPTED: Final[str] = 'TASK_ACCEPTED'
    TASK_COMPLETED: Final[str] = 'TASK_COMPLETED'
    REPORT_SUBMITTED: Final[str] = 'REPORT_SUBMITTED'
    
    # Appeal actions
    APPEAL_CREATED: Final[str] = 'APPEAL_CREATED'
    APPEAL_REVIEWED: Final[str] = 'APPEAL_REVIEWED'
    APPEAL_RESPONDED: Final[str] = 'APPEAL_RESPONDED'


# =============================================================================
# TELEGRAM CONSTANTS
# =============================================================================

class TelegramMediaType:
    """Telegram media turlari."""
    
    PHOTO: Final[str] = 'photo'
    VIDEO: Final[str] = 'video'
    DOCUMENT: Final[str] = 'document'
    AUDIO: Final[str] = 'audio'
    VOICE: Final[str] = 'voice'
    
    # Telegram API method nomlari
    METHOD_MAP: Final = {
        PHOTO: 'sendPhoto',
        VIDEO: 'sendVideo',
        DOCUMENT: 'sendDocument',
        AUDIO: 'sendAudio',
        VOICE: 'sendVoice',
    }
    
    # Telegram API field nomlari
    FIELD_MAP: Final = {
        PHOTO: 'photo',
        VIDEO: 'video',
        DOCUMENT: 'document',
        AUDIO: 'audio',
        VOICE: 'voice',
    }


class TelegramLanguage:
    """Telegram bot tillari."""
    
    UZ: Final[str] = 'uz'
    RU: Final[str] = 'ru'
    EN: Final[str] = 'en'
    
    CHOICES: Final = [
        (UZ, "O'zbek"),
        (RU, 'Русский'),
        (EN, 'English'),
    ]
    
    DEFAULT: Final[str] = UZ


# =============================================================================
# FILE CONSTANTS
# =============================================================================

class FileType:
    """Fayl turlari."""
    
    IMAGE: Final[str] = 'IMAGE'
    VIDEO: Final[str] = 'VIDEO'
    AUDIO: Final[str] = 'AUDIO'
    DOCUMENT: Final[str] = 'DOCUMENT'
    OTHER: Final[str] = 'OTHER'
    
    # Kengaytmalar
    IMAGE_EXTENSIONS: Final = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg')
    VIDEO_EXTENSIONS: Final = ('.mp4', '.mov', '.avi', '.mkv', '.webm')
    AUDIO_EXTENSIONS: Final = ('.mp3', '.wav', '.ogg', '.m4a', '.aac')
    DOCUMENT_EXTENSIONS: Final = ('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx')
    
    @classmethod
    def get_type_from_filename(cls, filename: str) -> str:
        """Fayl nomidan turini aniqlash.
        
        Args:
            filename: Fayl nomi
            
        Returns:
            Fayl turi (IMAGE, VIDEO, AUDIO, DOCUMENT, OTHER)
        """
        lower = filename.lower()
        
        if lower.endswith(cls.IMAGE_EXTENSIONS):
            return cls.IMAGE
        elif lower.endswith(cls.VIDEO_EXTENSIONS):
            return cls.VIDEO
        elif lower.endswith(cls.AUDIO_EXTENSIONS):
            return cls.AUDIO
        elif lower.endswith(cls.DOCUMENT_EXTENSIONS):
            return cls.DOCUMENT
        else:
            return cls.OTHER
    
    @classmethod
    def get_type_from_content_type(cls, content_type: str, filename: str = '') -> str:
        """Content-Type dan fayl turini aniqlash.
        
        Args:
            content_type: HTTP Content-Type
            filename: Fayl nomi (qo'shimcha tekshirish uchun)
            
        Returns:
            Fayl turi
        """
        if content_type.startswith('image/'):
            return cls.IMAGE
        elif content_type.startswith('video/'):
            return cls.VIDEO
        elif content_type.startswith('audio/'):
            return cls.AUDIO
        elif content_type.startswith('application/'):
            return cls.DOCUMENT
        
        # Content-type aniqlanmasa, fayl nomi bo'yicha
        if filename:
            return cls.get_type_from_filename(filename)
        
        return cls.OTHER


# =============================================================================
# PAGINATION CONSTANTS
# =============================================================================

class Pagination:
    """Paginatsiya sozlamalari."""
    
    DEFAULT_PAGE_SIZE: Final[int] = 10
    MAX_PAGE_SIZE: Final[int] = 100
    PAGE_SIZE_PARAM: Final[str] = 'page_size'
    PAGE_PARAM: Final[str] = 'page'


# =============================================================================
# HTTP STATUS MESSAGES
# =============================================================================

class Messages:
    """Standart javob xabarlari."""
    
    # Success
    SUCCESS: Final[str] = 'Muvaffaqiyatli bajarildi'
    CREATED: Final[str] = 'Muvaffaqiyatli yaratildi'
    UPDATED: Final[str] = 'Muvaffaqiyatli yangilandi'
    DELETED: Final[str] = "Muvaffaqiyatli o'chirildi"
    
    # Auth
    LOGIN_SUCCESS: Final[str] = 'Tizimga kirish muvaffaqiyatli'
    LOGOUT_SUCCESS: Final[str] = 'Tizimdan chiqildi'
    UNAUTHORIZED: Final[str] = 'Avtorizatsiya talab qilinadi'
    FORBIDDEN: Final[str] = 'Ruxsat berilmagan'
    
    # Errors
    NOT_FOUND: Final[str] = 'Topilmadi'
    BAD_REQUEST: Final[str] = "Noto'g'ri so'rov"
    INTERNAL_ERROR: Final[str] = 'Server xatosi'
    VALIDATION_ERROR: Final[str] = "Ma'lumotlar noto'g'ri"
    
    # Task specific
    TASK_NOT_ASSIGNED: Final[str] = 'Bu topshiriq sizning tashkilotingizga berilmagan'
    TASK_CANNOT_ACCEPT: Final[str] = "Bu topshiriqni qabul qilib bo'lmaydi"
    TASK_CANNOT_REPORT: Final[str] = "Bu topshiriq uchun hisobot topshirish mumkin emas"
    
    # Bot specific
    BOT_TOKEN_MISSING: Final[str] = 'Bot token kiritilmagan'
    BOT_SETTINGS_NOT_FOUND: Final[str] = 'Bot sozlamalari topilmadi'
    MESSAGE_TEXT_REQUIRED: Final[str] = 'Xabar matni kiritilmagan'
