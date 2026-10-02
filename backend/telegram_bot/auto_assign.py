"""
MUROJAATNI AVTOMATIK YO'NALTIRISH — AI tahlili asosida.

Oqim: bot murojaatni qabul qiladi -> AI uni tahlil qiladi (soha, muhimlik)
-> shu modul mas'ul tashkilotni topadi va TOPSHIRIQ yaratadi. Fuqaro
signal orqali «topshiriq sifatida yuborildi» xabarini oladi.

Ilgari murojaat `pending_review` holatida turib qolardi va kimdir uni
qo'lda tashkilotga biriktirmaguncha hech narsa bo'lmasdi. Kunlik oqim
o'nlab murojaatga yetganda bu «unutildi» degani.

Tashkilot uch bosqichda qidiriladi — har biri oldingisi natija bermasa
ishlaydi:

  1. `AppealCategory.responsible_organizations` — hokimlik admin
     panelida qo'lda sozlagan jadval. Eng ishonchli manba.
  2. Soha (`Sector`) nomi bo'yicha moslik — murojaat sohasi nomi
     tashkilot sohasi nomiga to'g'ri kelsa.
  3. AI taklif qilgan tashkilot NOMLARI — faqat bazada aynan shunday
     tashkilot bo'lsa.

Hech biri natija bermasa topshiriq YARATILMAYDI va murojaat qo'lda
ko'rib chiqish uchun `pending_review` da qoladi. Tasodifiy tashkilotga
biriktirish — javobgarlikni noto'g'ri odamga yuklash degani.
"""

from __future__ import annotations

import logging
import re
import unicodedata
from typing import List, Optional, Sequence

logger = logging.getLogger(__name__)

#: Topshiriq yaratuvchisi shu rollar ichidan tanlanadi (tartib muhim).
#: `Task.created_by` bo'sh bo'la olmaydi, «tizim» foydalanuvchisi esa
#: o'ylab chiqarilmaydi — haqiqiy mas'ul xodim qo'yiladi.
_CREATOR_ROLE_PRIORITY = ('HOKIM', 'ADMIN', 'HOKIMLIK_MASUL')

#: AI qaytaradigan soha kodlari -> `AppealCategory.code` ehtimoliy nomlari.
_AI_CATEGORY_ALIASES = {
    'infratuzilma': ('infratuzilma', 'infrastruktura', 'qurilish'),
    'ijtimoiy': ('ijtimoiy', 'social'),
    "ta'lim": ('talim', "ta'lim", 'education'),
    'talim': ('talim', "ta'lim", 'education'),
    "sog'liqni_saqlash": ('sogliq', "sog'liqni_saqlash", 'salomatlik', 'health'),
    'sogliqni_saqlash': ('sogliq', "sog'liqni_saqlash", 'salomatlik', 'health'),
    'kommunal': ('kommunal', 'obodonlashtirish', 'utility'),
    'bandlik': ('bandlik', 'mehnat', 'ish', 'employment'),
    'boshqa': (),
}


# =============================================================================
# MATN NORMALIZATSIYASI
# =============================================================================

def _normalize(value: str) -> str:
    """Taqqoslash uchun soddalashtirilgan matn.

    O'zbek matnida bir xil so'z turlicha yoziladi: «ta'lim», «ta’lim»,
    «talim». Apostroflar olib tashlanadi, harflar kichiklashtiriladi.
    """
    text = unicodedata.normalize('NFKD', str(value or '')).lower()
    text = text.replace('ʻ', '').replace('ʼ', '').replace('‘', '').replace('’', '')
    text = text.replace("'", '').replace('`', '')
    return re.sub(r'[^a-z0-9]+', '', text)


# =============================================================================
# TASHKILOTNI TOPISH
# =============================================================================

def _orgs_from_category(category) -> List:
    if category is None:
        return []
    try:
        return list(category.responsible_organizations.filter(is_active=True))
    except Exception:  # noqa: BLE001
        logger.exception('Soha mas’ul tashkilotlarini o‘qishda xato')
        return []


def _orgs_from_sector(category) -> List:
    """Murojaat sohasi nomiga mos `Sector` dagi tashkilotlar."""
    if category is None:
        return []

    from organizations.models import Organization, Sector

    wanted = _normalize(getattr(category, 'name_uz', ''))
    if not wanted:
        return []

    for sector in Sector.objects.filter(is_active=True):
        sector_key = _normalize(sector.name)
        if not sector_key:
            continue
        if sector_key == wanted or sector_key in wanted or wanted in sector_key:
            return list(Organization.objects.filter(sector=sector, is_active=True))
    return []


def _orgs_from_ai_names(names: Sequence[str]) -> List:
    """AI aytgan nomlarga AYNAN mos keladigan tashkilotlar.

    Taxminiy moslik ataylab ishlatilmaydi: «Suv ta'minoti» va «Suv
    xo'jaligi» — ikki boshqa tashkilot, adashish esa topshiriqni
    noto'g'ri odamga yuklaydi.
    """
    if not names:
        return []

    from organizations.models import Organization

    wanted = {_normalize(name) for name in names if str(name or '').strip()}
    if not wanted:
        return []

    matched = []
    for organization in Organization.objects.filter(is_active=True):
        keys = {_normalize(organization.name), _normalize(organization.short_name)}
        if keys & wanted:
            matched.append(organization)
    return matched


def resolve_organizations(appeal, ai_result: Optional[dict] = None) -> List:
    """Murojaat uchun mas'ul tashkilotlar. Topilmasa — bo'sh ro'yxat."""
    category = getattr(appeal, 'category', None) or getattr(appeal, 'ai_category_suggestion', None)

    organizations = _orgs_from_category(category)
    if organizations:
        logger.info('Murojaat %s: tashkilot soha jadvalidan topildi', appeal.pk)
        return organizations

    organizations = _orgs_from_sector(category)
    if organizations:
        logger.info('Murojaat %s: tashkilot soha nomi bo‘yicha topildi', appeal.pk)
        return organizations

    suggested = (ai_result or {}).get('suggested_organizations') or []
    organizations = _orgs_from_ai_names(suggested)
    if organizations:
        logger.info('Murojaat %s: tashkilot AI taklifidan topildi', appeal.pk)
        return organizations

    return []


def resolve_ai_category(ai_result: Optional[dict]):
    """AI qaytargan soha kodidan `AppealCategory` ni topish."""
    raw = (ai_result or {}).get('category') or (ai_result or {}).get('category_suggestion')
    if not raw:
        return None

    from .models import AppealCategory

    candidates = {_normalize(raw)}
    for alias in _AI_CATEGORY_ALIASES.get(str(raw).lower(), ()):  # noqa: PLR6201
        candidates.add(_normalize(alias))
    candidates.discard('')
    if not candidates:
        return None

    for category in AppealCategory.objects.filter(is_active=True):
        keys = {_normalize(category.code), _normalize(category.name_uz)}
        if keys & candidates:
            return category
    return None


# =============================================================================
# TOPSHIRIQ YARATUVCHISI
# =============================================================================

def resolve_task_creator():
    """Avtomatik topshiriqni kim nomidan yaratamiz.

    Haqiqiy, faol xodim tanlanadi. Topilmasa `None` — bu holda
    topshiriq yaratilmaydi (soxta «tizim» hisobi ochilmaydi).
    """
    from users.models import User

    for role in _CREATOR_ROLE_PRIORITY:
        user = User.objects.filter(role=role, status='FAOL').order_by('created_at').first()
        if user:
            return user
    return None


# =============================================================================
# ASOSIY FUNKSIYA
# =============================================================================

def auto_assign_appeal(appeal, ai_result: Optional[dict] = None):
    """Murojaatni mas'ul tashkilotga topshiriq sifatida biriktirish.

    HECH QACHON istisno ko'tarmaydi — bot oqimi buzilmasligi kerak.

    Returns:
        Yaratilgan `Task` yoki biriktirib bo'lmasa `None`.
    """
    from .task_routing import auto_deadline_for_appeal, create_task_for_appeal

    try:
        if getattr(appeal, 'forwarded_to_site', False) or getattr(appeal, 'site_task_id', None):
            logger.debug('Murojaat %s allaqachon topshiriqqa aylantirilgan', appeal.pk)
            return None

        if getattr(appeal, 'status', '') == 'rejected' or not getattr(appeal, 'ai_is_valid', True):
            logger.debug('Murojaat %s rad etilgan — topshiriq yaratilmaydi', appeal.pk)
            return None

        if not (getattr(appeal, 'text', '') or '').strip():
            return None

        # AI aniqlagan soha murojaatda bo'sh bo'lsa — to'ldiramiz.
        if getattr(appeal, 'category_id', None) is None:
            suggested = resolve_ai_category(ai_result)
            if suggested is not None:
                appeal.ai_category_suggestion = suggested
                appeal.category = suggested
                appeal.save(update_fields=['ai_category_suggestion', 'category', 'updated_at'])

        organizations = resolve_organizations(appeal, ai_result)
        if not organizations:
            logger.info(
                'Murojaat %s: mas’ul tashkilot topilmadi — qo‘lda ko‘rib chiqishga qoldi',
                appeal.pk,
            )
            return None

        creator = resolve_task_creator()
        if creator is None:
            logger.warning(
                'Murojaat %s: faol HOKIM/ADMIN topilmadi, avtomatik topshiriq yaratilmadi',
                appeal.pk,
            )
            return None

        deadline, days = auto_deadline_for_appeal(appeal)
        title = _build_title(appeal)

        task, assigned = create_task_for_appeal(
            appeal=appeal,
            user=creator,
            title=title,
            deadline=deadline,
            priority=_task_priority(appeal),
            organization_ids=[str(org.id) for org in organizations],
            comment=_build_comment(appeal, ai_result, days),
            source='AI',
            context_lines=[
                "",
                "Bu topshiriq AI tahlili asosida AVTOMATIK yaratildi.",
                f"Ijro muddati: {days} kun.",
                "Soha yoki tashkilot noto'g'ri bo'lsa — hokimlik qayta yo'naltirishi mumkin.",
            ],
        )

        logger.info(
            'Murojaat %s -> topshiriq %s (%s ta tashkilot, %s kun)',
            appeal.pk, task.id, len(assigned), days,
        )
        return task

    except Exception:  # noqa: BLE001 — bot oqimi buzilmasligi kerak
        logger.exception('Murojaat %s: avtomatik biriktirishda xato', getattr(appeal, 'pk', '—'))
        return None


def _build_title(appeal) -> str:
    """Topshiriq sarlavhasi — murojaat matnining birinchi jumlasidan."""
    text = ' '.join((appeal.text or '').split())
    snippet = text[:120].rsplit(' ', 1)[0] if len(text) > 120 else text
    snippet = snippet.strip() or 'Fuqaro murojaati'
    return f"Murojaat #{appeal.appeal_number}: {snippet}"


def _task_priority(appeal) -> str:
    from .task_routing import _PRIORITY_MAP

    raw = str(getattr(appeal, 'ai_priority', '') or getattr(appeal, 'priority', '') or 'medium').lower()
    return _PRIORITY_MAP.get(raw, 'ODDIY')


def _build_comment(appeal, ai_result: Optional[dict], days: int) -> str:
    """Topshiriq tavsifiga qo'shiladigan AI izohi. Bo'sh bo'lsa — bo'sh."""
    summary = ''
    if ai_result:
        summary = str(ai_result.get('analysis') or ai_result.get('summary') or '').strip()
    if not summary:
        summary = (getattr(appeal, 'ai_analysis', '') or '').strip()

    lines = []
    if summary:
        lines.append(f"AI tahlili: {summary}")
    lines.append(f"Avtomatik belgilangan ijro muddati: {days} kun.")
    return "\n".join(lines)


__all__ = [
    'auto_assign_appeal',
    'resolve_ai_category',
    'resolve_organizations',
    'resolve_task_creator',
]
