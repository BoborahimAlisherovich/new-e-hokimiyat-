"""
MUROJAATDAN TOPSHIRIQ YARATISH — yagona manba.

Ilgari bu mantiq `TelegramAppealViewSet` ichida metod bo'lgan. AI ham
avtomatik topshiriq yaratishi kerak bo'lganda ikkita tanlov bor edi:
kodni nusxalash yoki ViewSet ni bot oqimidan chaqirish. Ikkalasi ham
noto'g'ri — shuning uchun mantiq shu modulga chiqarildi va ViewSet
endi shunchaki shu yerga murojaat qiladi.

Modulda ikki qatlam bor:

  · `create_task_for_appeal(...)` — topshiriqni yaratadi (tashkilotlar,
    ijrochilar, bildirishnomalar, kontekst xabari, murojaat holati).
    Kim chaqirishidan qat'i nazar natija bir xil.

  · `auto_assign_appeal(appeal)` — AI tahlili asosida MAS'UL TASHKILOTNI
    o'zi topib, yuqoridagi funksiyani chaqiradi.

Muddat: avtomatik yaratilgan topshiriq uchun eng kami 7 kun
(`MIN_AUTO_TASK_DAYS`). Muhimlik darajasi muddatni QISQARTIRMAYDI —
mashina qo'ygan muddat odam qo'ygan muddatdan qattiqroq bo'lmasligi
kerak, aks holda tashkilot ayblanadi-yu, sabab AI da bo'ladi.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any, List, Optional, Sequence, Tuple

from django.utils import timezone

from notifications.services import create_notification

logger = logging.getLogger(__name__)

#: Avtomatik yaratilgan topshiriq uchun eng kam muddat (kun).
MIN_AUTO_TASK_DAYS = 7

#: Murojaat muhimligi -> topshiriq muddati (kun). Qiymatlar
#: `MIN_AUTO_TASK_DAYS` dan past bo'lsa ham u bilan cheklanadi.
_AUTO_DEADLINE_DAYS = {
    'urgent': 7,
    'high': 7,
    'medium': 10,
    'low': 14,
}

#: Murojaat muhimligi -> topshiriq ustuvorligi.
_PRIORITY_MAP = {
    'urgent': 'FAVQULODDA',
    'high': 'YUQORI',
    'medium': 'ODDIY',
    'low': 'PAST',
}

_TASK_PRIORITIES = frozenset({'PAST', 'ODDIY', 'YUQORI', 'FAVQULODDA'})


# =============================================================================
# NORMALIZATSIYA
# =============================================================================

def normalize_task_priority(priority: Any) -> str:
    value = str(priority or 'ODDIY').upper()
    if value == 'SHOSHILINCH':
        value = 'FAVQULODDA'
    return value if value in _TASK_PRIORITIES else 'ODDIY'


def default_deadline_for_priority(priority: Any):
    """Qo'lda yaratishdagi muddat — eski xatti-harakat saqlanadi."""
    normalized = str(priority or 'medium').lower()
    days_map = {'low': 7, 'medium': 5, 'high': 3, 'urgent': 1}
    return timezone.now() + timedelta(days=days_map.get(normalized, 5))


def auto_deadline_for_appeal(appeal) -> Tuple[Any, int]:
    """Avtomatik topshiriq muddati: hech qachon 7 kundan kam emas.

    Returns:
        (deadline, days) — muddat va kunlar soni (izohda ko'rsatish uchun).
    """
    priority = str(getattr(appeal, 'ai_priority', '') or getattr(appeal, 'priority', '') or 'medium').lower()
    days = max(MIN_AUTO_TASK_DAYS, _AUTO_DEADLINE_DAYS.get(priority, MIN_AUTO_TASK_DAYS))
    return timezone.now() + timedelta(days=days), days


def normalize_task_category(appeal) -> str:
    raw = (
        getattr(getattr(appeal, 'category', None), 'name_uz', '')
        or getattr(getattr(appeal, 'ai_category_suggestion', None), 'name_uz', '')
        or 'BOSHQA'
    )
    normalized = str(raw).upper().replace(" ", "_").replace("O‘", "O'").replace("`", "'")
    category_map = {
        'IJTIMOIY': 'IJTIMOIY',
        'IQTISODIY': 'IQTISODIY',
        'HUQUQIY': 'HUQUQIY',
        'INFRASTRUKTURA': 'INFRASTRUKTURA',
        "TA'LIM": 'TA_LIM',
        'TA_LIM': 'TA_LIM',
        "SOG'LIQNI_SAQLASH": 'SOG_LIQNI_SAQLASH',
        'SOG_LIQNI_SAQLASH': 'SOG_LIQNI_SAQLASH',
        'BANDLIK': 'IQTISODIY',
    }
    return category_map.get(normalized, 'BOSHQA')


def normalize_organization_ids(organization_ids) -> List[str]:
    if organization_ids is None:
        return []
    if isinstance(organization_ids, str):
        return [item.strip() for item in organization_ids.split(',') if item.strip()]
    return [str(item).strip() for item in organization_ids if str(item).strip()]


# =============================================================================
# IJROCHI VA O'RINBOSARLAR
# =============================================================================

def default_task_assignee(organization):
    preferred_roles = ['TASHKILOT_MASUL', 'TASHKILOT_RAHBARI']
    employees = list(
        organization.employees.filter(
            status='FAOL',
            role__in=preferred_roles,
        )
    )
    if not employees:
        return None

    employees.sort(
        key=lambda employee: (
            preferred_roles.index(employee.role) if employee.role in preferred_roles else len(preferred_roles),
            employee.created_at,
        )
    )
    return employees[0]


def task_deputies_for_organizations(*, organizations, creator):
    from users.models import User

    if getattr(creator, 'role', None) == 'HOKIM_YORDAMCHISI':
        return [creator]

    sector_ids = {
        organization.sector_id
        for organization in organizations
        if getattr(organization, 'sector_id', None)
    }
    if not sector_ids:
        return []

    return list(
        User.objects.filter(
            role='HOKIM_YORDAMCHISI',
            status='FAOL',
            sector_id__in=sector_ids,
        )
    )


# =============================================================================
# KONTEKST XABARI
# =============================================================================

def create_task_context_message(*, task, appeal, organizations, attachment_files=None, extra_lines=None):
    """Topshiriq lentasida murojaat kontekstini ko'rsatuvchi tizim xabari."""
    from tasks.models import TaskMessage

    citizen_name = (getattr(appeal, 'citizen_name', '') or '').strip()
    telegram_user = getattr(appeal, 'telegram_user', None)
    if telegram_user is not None and getattr(telegram_user, 'full_name', ''):
        citizen_name = telegram_user.full_name

    citizen_phone = (getattr(appeal, 'citizen_phone', '') or '').strip()
    if not citizen_phone and telegram_user is not None:
        citizen_phone = getattr(telegram_user, 'phone', '') or ''
    citizen_phone = citizen_phone or "-"

    region_name = "-"
    try:
        region = getattr(telegram_user, 'region', None) if telegram_user else None
        region = region or appeal.citizen_region
        if region:
            region_name = region.name_uz
    except Exception:  # noqa: BLE001
        region_name = "-"

    organization_names = ", ".join(org.name for org in organizations) or "-"
    appeal_type_name = getattr(getattr(appeal, 'appeal_type', None), 'name_uz', '') or "-"
    category_name = getattr(getattr(appeal, 'category', None), 'name_uz', '') or "-"
    attachment_count = len(list(attachment_files or []))

    lines = [
        "Tizim xabari",
        f"Murojaat raqami: {appeal.appeal_number}",
        f"Murojaatchi: {citizen_name or 'Noma`lum'}",
        f"Telefon: {citizen_phone}",
        f"Hudud: {region_name}",
        f"Murojaat turi: {appeal_type_name}",
        f"Soha: {category_name}",
        f"Yo'naltirilgan tashkilotlar: {organization_names}",
    ]

    if attachment_count:
        lines.append(f"Biriktirilgan fayllar soni: {attachment_count}")

    if extra_lines:
        lines.extend(extra_lines)

    lines.extend([
        "",
        "Murojaat matni:",
        appeal.text,
    ])

    TaskMessage.objects.create(
        task=task,
        sender=None,
        message_type='SYSTEM',
        content="\n".join(lines),
    )


# =============================================================================
# TOPSHIRIQ YARATISH
# =============================================================================

def create_task_for_appeal(
    *,
    appeal,
    user,
    title,
    deadline,
    priority,
    organization_ids,
    comment: str = '',
    attachment_files=None,
    source: str = 'TELEGRAM',
    context_lines: Optional[Sequence[str]] = None,
):
    """Murojaat asosida topshiriq yaratish.

    Raises:
        ValueError: tashkilot topilmasa.

    Returns:
        (task, organizations)
    """
    from organizations.models import Organization
    from tasks.models import Task, TaskAttachment, TaskOrganization

    normalized_org_ids = normalize_organization_ids(organization_ids)
    organizations = list(Organization.objects.filter(id__in=normalized_org_ids, is_active=True))
    if not organizations:
        raise ValueError("Tashkilot tanlanmagan yoki topilmadi")

    if appeal.telegram_user:
        citizen_name = appeal.telegram_user.full_name
        citizen_phone = appeal.telegram_user.phone
        region_name = appeal.telegram_user.region.name_uz if appeal.telegram_user.region else "Noma'lum"
    else:
        citizen_name = (getattr(appeal, 'citizen_name', '') or '').strip() or "Noma'lum"
        citizen_phone = (getattr(appeal, 'citizen_phone', '') or '').strip()
        try:
            region_name = appeal.citizen_region.name_uz if appeal.citizen_region else "Noma'lum"
        except Exception:  # noqa: BLE001
            region_name = "Noma'lum"

    normalized_comment = (comment or '').strip()
    description_parts = [
        f"Telegram murojaat #{appeal.appeal_number}",
        "",
        f"Fuqaro: {citizen_name}",
        f"Telefon: {citizen_phone}",
        f"Hudud: {region_name}",
    ]
    if normalized_comment:
        description_parts.extend([
            "",
            "Hokim/AI izohi:",
            normalized_comment,
        ])
    description_parts.extend([
        "",
        "Murojaat matni:",
        appeal.text,
    ])

    task = Task.objects.create(
        title=title,
        description="\n".join(description_parts),
        priority=normalize_task_priority(priority),
        deadline=deadline,
        created_by=user,
        category=normalize_task_category(appeal),
        source=source,
    )

    deputies = task_deputies_for_organizations(organizations=organizations, creator=user)
    if deputies:
        task.assigned_deputies.set([deputy.id for deputy in deputies])

    for uploaded_file in attachment_files or []:
        try:
            uploaded_file.seek(0)
        except Exception:  # noqa: BLE001
            pass
        from .views import _guess_task_attachment_type  # kech import: aylanma bog'liqlik

        TaskAttachment.objects.create(
            task=task,
            uploaded_by=user,
            file=uploaded_file,
            file_name=uploaded_file.name,
            file_size=getattr(uploaded_file, 'size', 0) or 0,
            file_type=_guess_task_attachment_type(uploaded_file),
        )

    for organization in organizations:
        TaskOrganization.objects.create(
            task=task,
            organization=organization,
            status='YANGI',
            assigned_to=default_task_assignee(organization),
        )
        for org_user in organization.employees.filter(
            status='FAOL',
            role__in=['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
        ):
            create_notification(
                user=org_user,
                title='Yangi topshiriq',
                message=f"Murojaat asosida yangi topshiriq berildi: {task.title}",
                notification_type='TASK',
                related_task=task,
                link=f'/dashboard/tasks/{task.id}',
            )

    create_task_context_message(
        task=task,
        appeal=appeal,
        organizations=organizations,
        attachment_files=attachment_files,
        extra_lines=context_lines,
    )

    appeal.forwarded_to_site = True
    appeal.status = 'forwarded'
    appeal.site_task_id = str(task.id)
    appeal.assigned_organizations.set([org.id for org in organizations])
    appeal.save(update_fields=['forwarded_to_site', 'status', 'site_task_id', 'updated_at'])
    return task, organizations


__all__ = [
    'MIN_AUTO_TASK_DAYS',
    'auto_deadline_for_appeal',
    'create_task_context_message',
    'create_task_for_appeal',
    'default_deadline_for_priority',
    'default_task_assignee',
    'normalize_organization_ids',
    'normalize_task_category',
    'normalize_task_priority',
    'task_deputies_for_organizations',
]
