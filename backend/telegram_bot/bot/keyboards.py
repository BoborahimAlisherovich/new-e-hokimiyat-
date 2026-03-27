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
        [
            {'text': get_text('btn_new_appeal', language)},
            {'text': get_text('btn_my_appeals', language)}
        ],
        [
            {'text': get_text('btn_settings', language)},
            {'text': get_text('btn_help', language)}
        ],
        [{'text': get_text('btn_about', language)}]
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


def regions_keyboard(regions: list, language: str = 'uz', page: int = 0, per_page: int = 20) -> dict:
    """
    Hududlar ro'yxati klaviaturasi (sahifalash bilan)
    
    Args:
        regions: Barcha hududlar ro'yxati
        language: Til kodi
        page: Joriy sahifa raqami (0 dan boshlanadi)
        per_page: Har sahifadagi hududlar soni
    """
    from .messages import get_text
    
    total = len(regions)
    total_pages = max(1, (total + per_page - 1) // per_page)
    page = max(0, min(page, total_pages - 1))
    
    start = page * per_page
    end = min(start + per_page, total)
    page_regions = regions[start:end]
    
    buttons = []
    row = []
    for region in page_regions:
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
    
    # Sahifa ma'lumoti
    page_info_text = {
        'uz': f'📄 {page + 1}/{total_pages} sahifa ({total} ta mahalla)',
        'ru': f'📄 {page + 1}/{total_pages} стр. ({total} махалля)',
        'en': f'📄 Page {page + 1}/{total_pages} ({total} mahallas)'
    }
    buttons.append([{'text': page_info_text.get(language, page_info_text['uz']), 'callback_data': 'region:info'}])
    
    # Sahifalash tugmalari
    nav_row = []
    if page > 0:
        prev_text = {'uz': '⬅️ Oldingi', 'ru': '⬅️ Назад', 'en': '⬅️ Previous'}
        nav_row.append({'text': prev_text.get(language, '⬅️ Oldingi'), 'callback_data': f'region_page:{page - 1}'})
    if page < total_pages - 1:
        next_text = {'uz': 'Keyingi ➡️', 'ru': 'Далее ➡️', 'en': 'Next ➡️'}
        nav_row.append({'text': next_text.get(language, 'Keyingi ➡️'), 'callback_data': f'region_page:{page + 1}'})
    if nav_row:
        buttons.append(nav_row)
    
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


def comment_keyboard(language: str = 'uz') -> dict:
    """Feedback izohini kiritish uchun klaviatura"""
    from .messages import get_text

    return create_keyboard([
        [{'text': get_text('btn_skip_comment', language)}],
        [{'text': get_text('btn_cancel', language)}],
    ], one_time=True)


def location_keyboard(language: str = 'uz') -> dict:
    """Lokatsiya so'rash klaviaturasi"""
    from .messages import get_text

    return create_keyboard([
        [{'text': get_text('btn_share_location', language), 'request_location': True}],
        [{'text': get_text('btn_skip_location', language)}],
        [{'text': get_text('btn_cancel', language)}],
    ], one_time=True)


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
    from .messages import get_text

    return create_inline_keyboard([
        [
            {'text': get_text('btn_admin_approve', language), 'callback_data': f'review:{appeal_id}:approve'},
            {'text': get_text('btn_admin_reject', language), 'callback_data': f'review:{appeal_id}:reject'}
        ],
        [
            {'text': get_text('btn_admin_respond', language), 'callback_data': f'review:{appeal_id}:respond'},
            {'text': get_text('btn_admin_forward', language), 'callback_data': f'review:{appeal_id}:forward'}
        ],
        [
            {'text': get_text('btn_priority_high', language), 'callback_data': f'priority:{appeal_id}:high'},
            {'text': get_text('btn_priority_medium', language), 'callback_data': f'priority:{appeal_id}:medium'},
            {'text': get_text('btn_priority_low', language), 'callback_data': f'priority:{appeal_id}:low'}
        ]
    ])


def user_reply_keyboard(appeal_id: int, language: str = 'uz') -> dict:
    """Foydalanuvchi javob berish klaviaturasi"""
    from .messages import get_text

    return create_inline_keyboard([
        [
            {'text': get_text('btn_user_reply', language), 'callback_data': f'user_reply:{appeal_id}'}
        ]
    ])


def rating_keyboard(appeal_id: int, language: str = 'uz') -> dict:
    """Xizmatni baholash klaviaturasi (1-5 yulduz)"""
    from .messages import get_text

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
            {'text': get_text('btn_skip_rating', language), 'callback_data': f'rate:{appeal_id}:skip'}
        ]
    ])


def satisfaction_with_rating_keyboard(appeal_id: int, language: str = 'uz') -> dict:
    """Qoniqish va baholash so'rash klaviaturasi"""
    from .messages import get_text

    return create_inline_keyboard([
        [
            {'text': get_text('btn_satisfied_yes', language), 'callback_data': f'close_satisfied:{appeal_id}'},
            {'text': get_text('btn_satisfied_no', language), 'callback_data': f'close_unsatisfied:{appeal_id}'}
        ]
    ])
