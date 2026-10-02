"""
JAVOB MUALLIFI — fuqaro kim javob berganini bilishi kerak.

Ilgari botdan keladigan javob imzosiz edi: «Sizning murojaatingizga
javob: ...». Fuqaro uchun bu anonim hokimlik ovozi — na kimga
murojaat qilishni, na kimdan hisobot so'rashni biladi. Rasmiy
yozishmada javob har doim imzolanadi; bu yerda ham shunday bo'lishi
kerak.

Imzo FAQAT bazadagi haqiqiy ma'lumotdan yig'iladi: xodimning ismi,
lavozimi va tashkiloti. Hech narsa o'ylab chiqarilmaydi — lavozim
kiritilmagan bo'lsa qator umuman chiqmaydi.
"""

from __future__ import annotations

from typing import Optional

#: Imzo sarlavhasi — fuqaro tilida.
_ANSWERED_BY = {
    'uz': 'Javob berdi',
    'ru': 'Ответил(а)',
    'en': 'Answered by',
}

_LANGUAGES = ('uz', 'ru', 'en')


def citizen_language(appeal) -> str:
    """Fuqaroning tili. Aniqlanmasa — o'zbekcha."""
    telegram_user = getattr(appeal, 'telegram_user', None)
    language = (getattr(telegram_user, 'language', '') or '') if telegram_user else ''
    if not language:
        language = getattr(appeal, 'citizen_language', '') or ''
    return language if language in _LANGUAGES else 'uz'


def author_display(user) -> str:
    """Xodimning ko'rsatiladigan nomi: «F.I.Sh — lavozim».

    Lavozim bo'sh bo'lsa faqat ism qaytadi. Ism ham bo'lmasa — bo'sh
    satr (imzo umuman qo'yilmaydi).
    """
    if user is None:
        return ''

    name = (getattr(user, 'full_name', '') or '').strip()
    if not name:
        parts = [getattr(user, 'last_name', '') or '', getattr(user, 'first_name', '') or '']
        name = ' '.join(part for part in parts if part).strip()
    if not name:
        return ''

    position = (getattr(user, 'position', '') or '').strip()
    if not position:
        # Lavozim kiritilmagan bo'lsa rolning ko'rinadigan nomidan
        # foydalanamiz — u ham bazadagi haqiqiy qiymat.
        try:
            position = user.get_role_display()
        except Exception:  # noqa: BLE001
            position = ''

    organization = ''
    org = getattr(user, 'organization', None)
    if org is not None:
        organization = (getattr(org, 'short_name', '') or getattr(org, 'name', '') or '').strip()

    tail = ', '.join(part for part in (position, organization) if part)
    return f"{name} — {tail}" if tail else name


def build_signature(user, language: str = 'uz') -> str:
    """Telegram xabariga qo'shiladigan imzo bloki.

    Muallif aniqlanmasa bo'sh satr qaytadi — «Noma'lum» deb yozish
    imzosiz qoldirishdan yomonroq.
    """
    display = author_display(user)
    if not display:
        return ''

    label = _ANSWERED_BY.get(language, _ANSWERED_BY['uz'])
    return f"\n\n👤 {label}: {display}"


def sign_for_citizen(text: str, user, appeal) -> str:
    """Fuqaroga ketadigan matnga muallif imzosini qo'shish."""
    signature = build_signature(user, citizen_language(appeal))
    if not signature:
        return text
    return f"{text}{signature}"


def resolve_author(appeal) -> Optional[object]:
    """Murojaatni ko'rib chiqqan xodim (signal kontekstida aktor yo'q).

    `reviewed_by` — `BotAdmin`, uning orqasida tizim foydalanuvchisi
    turishi mumkin. Bo'lmasa — oxirgi javob yozgan xodim.
    """
    reviewer = getattr(appeal, 'reviewed_by', None)
    linked_user = getattr(reviewer, 'user', None) if reviewer is not None else None
    if linked_user is not None:
        return linked_user

    try:
        last_reply = (
            appeal.messages
            .filter(is_from_admin=True, is_system=False, sender_user__isnull=False)
            .select_related('sender_user')
            .order_by('-created_at')
            .first()
        )
    except Exception:  # noqa: BLE001
        return reviewer

    if last_reply is not None and last_reply.sender_user is not None:
        return last_reply.sender_user
    return reviewer


__all__ = [
    'author_display',
    'build_signature',
    'citizen_language',
    'resolve_author',
    'sign_for_citizen',
]
