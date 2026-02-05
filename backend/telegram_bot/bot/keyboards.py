"""
Telegram klaviatura tugmalari
"""

from typing import List, Optional


def create_keyboard(buttons: List[List[dict]], resize: bool = True, one_time: bool = False) -> dict:
    """
    ReplyKeyboardMarkup yaratish
    
    Args:
        buttons: Tugmalar ro'yxati [[{text, request_contact?, request_location?}]]
        resize: Klaviatura o'lchamini moslashtirish
        one_time: Bir marta bosishdan keyin yashirish
    """
    return {
        'keyboard': buttons,
        'resize_keyboard': resize,
        'one_time_keyboard': one_time
    }


def create_inline_keyboard(buttons: List[List[dict]]) -> dict:
    """
    InlineKeyboardMarkup yaratish
    
    Args:
        buttons: Tugmalar ro'yxati [[{text, callback_data?, url?}]]
    """
    inline_buttons = []
    for row in buttons:
        inline_row = []
        for btn in row:
            inline_btn = {'text': btn['text']}
            if 'callback_data' in btn:
                inline_btn['callback_data'] = btn['callback_data']
            if 'url' in btn:
                inline_btn['url'] = btn['url']
            inline_row.append(inline_btn)
        inline_buttons.append(inline_row)
    
    return {'inline_keyboard': inline_buttons}


def remove_keyboard() -> dict:
    """Klaviaturani o'chirish"""
    return {'remove_keyboard': True}


# ============ Klaviaturalar ============

def main_menu_keyboard(language: str = 'uz') -> dict:
    """Asosiy menyu klaviaturasi"""
    from .messages import get_text
    
    return create_keyboard([
        [{'text': get_text('btn_new_appeal', language)}],
        [{'text': get_text('btn_my_appeals', language)}],
        [
            {'text': get_text('btn_about', language)},
            {'text': get_text('btn_settings', language)}
        ],
        [{'text': get_text('btn_help', language)}]
    ])


def gender_keyboard(language: str = 'uz') -> dict:
    """Jins tanlash klaviaturasi"""
    from .messages import get_text
    
    return create_inline_keyboard([
        [
            {'text': get_text('gender_male', language), 'callback_data': 'gender:male'},
            {'text': get_text('gender_female', language), 'callback_data': 'gender:female'}
        ]
    ])


def phone_keyboard(language: str = 'uz') -> dict:
    """Telefon raqam so'rash klaviaturasi"""
    from .messages import get_text
    
    return create_keyboard([
        [{'text': get_text('btn_share_phone', language), 'request_contact': True}],
        [{'text': get_text('btn_cancel', language)}]
    ])


def regions_keyboard(regions: list, language: str = 'uz') -> dict:
    """Hududlar ro'yxati klaviaturasi"""
    from .messages import get_text
    
    buttons = []
    row = []
    for region in regions:
        # Tilga qarab nomni olish
        name = region.get(f'name_{language}') or region.get('name_uz') or region.get('name', '')
        row.append({
            'text': name,
            'callback_data': f"region:{region['id']}"
        })
        if len(row) == 2:
            buttons.append(row)
            row = []
    
    if row:
        buttons.append(row)
    
    # "Boshqa" tugmasi
    other_text = {
        'uz': '🔹 Boshqa',
        'ru': '🔹 Другое',
        'en': '🔹 Other'
    }
    buttons.append([{'text': other_text.get(language, '🔹 Boshqa'), 'callback_data': 'region:other'}])
    buttons.append([{'text': get_text('btn_cancel', language), 'callback_data': 'cancel'}])
    
    return create_inline_keyboard(buttons)


def appeal_types_keyboard(appeal_types: list, language: str = 'uz') -> dict:
    """Murojaat turlari klaviaturasi"""
    from .messages import get_text
    
    buttons = []
    for at in appeal_types:
        name = at.get(f'name_{language}') or at.get('name_uz') or at.get('name')
        buttons.append([{
            'text': f"{at.get('icon', '📝')} {name}",
            'callback_data': f"type:{at['id']}"
        }])
    
    buttons.append([{'text': get_text('btn_cancel', language), 'callback_data': 'cancel'}])
    
    return create_inline_keyboard(buttons)


def categories_keyboard(categories: list, language: str = 'uz') -> dict:
    """Sohalar klaviaturasi"""
    from .messages import get_text
    
    buttons = []
    for cat in categories:
        name = cat.get(f'name_{language}') or cat.get('name_uz') or cat.get('name')
        buttons.append([{
            'text': f"{cat.get('icon', '📁')} {name}",
            'callback_data': f"category:{cat['id']}"
        }])
    
    buttons.append([{'text': get_text('btn_cancel', language), 'callback_data': 'cancel'}])
    
    return create_inline_keyboard(buttons)


def confirm_keyboard(language: str = 'uz') -> dict:
    """Tasdiqlash klaviaturasi"""
    from .messages import get_text
    
    return create_inline_keyboard([
        [
            {'text': get_text('btn_confirm', language), 'callback_data': 'confirm'},
            {'text': get_text('btn_cancel', language), 'callback_data': 'cancel'}
        ]
    ])


def attachment_keyboard(language: str = 'uz') -> dict:
    """Fayl qo'shish klaviaturasi"""
    from .messages import get_text
    
    return create_keyboard([
        [{'text': get_text('btn_finish', language)}],
        [{'text': get_text('btn_cancel', language)}]
    ])


def settings_keyboard(language: str = 'uz') -> dict:
    """Sozlamalar klaviaturasi"""
    from .messages import get_text
    
    return create_inline_keyboard([
        [{'text': get_text('btn_change_name', language), 'callback_data': 'settings:name'}],
        [{'text': get_text('btn_change_phone', language), 'callback_data': 'settings:phone'}],
        [{'text': get_text('btn_change_region', language), 'callback_data': 'settings:region'}],
        [{'text': get_text('btn_change_language', language), 'callback_data': 'settings:language'}],
        [{'text': get_text('btn_main_menu', language), 'callback_data': 'main_menu'}]
    ])


def language_keyboard() -> dict:
    """Til tanlash klaviaturasi"""
    return create_inline_keyboard([
        [{'text': "🇺🇿 O'zbekcha", 'callback_data': 'lang:uz'}],
        [{'text': "🇷🇺 Русский", 'callback_data': 'lang:ru'}],
        [{'text': "🇬🇧 English", 'callback_data': 'lang:en'}]
    ])


def back_keyboard(language: str = 'uz') -> dict:
    """Orqaga tugmasi"""
    from .messages import get_text
    
    return create_inline_keyboard([
        [{'text': get_text('btn_back', language), 'callback_data': 'back'}]
    ])


def admin_review_keyboard(appeal_id: int, language: str = 'uz') -> dict:
    """Admin ko'rib chiqish klaviaturasi"""
    return create_inline_keyboard([
        [
            {'text': '✅ Tasdiqlash', 'callback_data': f'review:{appeal_id}:approve'},
            {'text': '❌ Rad etish', 'callback_data': f'review:{appeal_id}:reject'}
        ],
        [
            {'text': '💬 Javob yozish', 'callback_data': f'review:{appeal_id}:respond'},
            {'text': '📤 Saytga yuborish', 'callback_data': f'review:{appeal_id}:forward'}
        ],
        [
            {'text': '🔴 Yuqori', 'callback_data': f'priority:{appeal_id}:high'},
            {'text': '🟡 O\'rta', 'callback_data': f'priority:{appeal_id}:medium'},
            {'text': '🟢 Past', 'callback_data': f'priority:{appeal_id}:low'}
        ]
    ])


def user_reply_keyboard(appeal_id: int, language: str = 'uz') -> dict:
    """Foydalanuvchi javob berish klaviaturasi"""
    return create_inline_keyboard([
        [
            {'text': '💬 Javob berish', 'callback_data': f'user_reply:{appeal_id}'}
        ]
    ])


def rating_keyboard(appeal_id: int, language: str = 'uz') -> dict:
    """Xizmatni baholash klaviaturasi (1-5 yulduz)"""
    return create_inline_keyboard([
        [
            {'text': '⭐', 'callback_data': f'rate:{appeal_id}:1'},
            {'text': '⭐⭐', 'callback_data': f'rate:{appeal_id}:2'},
            {'text': '⭐⭐⭐', 'callback_data': f'rate:{appeal_id}:3'},
        ],
        [
            {'text': '⭐⭐⭐⭐', 'callback_data': f'rate:{appeal_id}:4'},
            {'text': '⭐⭐⭐⭐⭐', 'callback_data': f'rate:{appeal_id}:5'},
        ],
        [
            {'text': '⏭ Baholamasdan yopish', 'callback_data': f'rate:{appeal_id}:skip'}
        ]
    ])


def satisfaction_with_rating_keyboard(appeal_id: int, language: str = 'uz') -> dict:
    """Qoniqish va baholash so'rash klaviaturasi"""
    return create_inline_keyboard([
        [
            {'text': '✅ Ha, rahmat', 'callback_data': f'close_satisfied:{appeal_id}'},
            {'text': '❌ Yo\'q, qayta ko\'ring', 'callback_data': f'close_unsatisfied:{appeal_id}'}
        ]
    ])
