"""
TOPSHIRIQLARGA KIRISH QOIDALARI — YAGONA MANBA
==============================================

Ilgari «kim qaysi tashkilotga topshiriq bera oladi» va «kim topshiriqni
tahrirlay oladi» qoidalari serializer, view va frontend'da alohida-alohida
takrorlanardi va bir-biriga mos kelmasdi (masalan, tashkilot rahbari
yaratishi mumkin, lekin tahrirlay olmasdi). Endi ikkala savolga shu
moduldagi ikki funksiya javob beradi; view, serializer va
`/api/organizations/assignable/` endpointi shuni chaqiradi.

QOIDALAR
--------
Tashkilot tanlash (topshiriq yaratish / tahrirlashda):
  HOKIM, ADMIN            -> barcha faol tashkilotlar
  HOKIM_YORDAMCHISI       -> `curated_organizations` biriktirilgan bo'lsa —
                             faqat ular; bo'lmasa o'z sohasidagi tashkilotlar
  HOKIMLIK_MASUL          -> o'zining curated'i; bo'lmasa rahbarining
                             (supervisor) doirasi; bo'lmasa o'z sohasi
  TASHKILOT_RAHBARI       -> faqat o'z tashkiloti
  boshqalar               -> hech narsa

Tahrirlash:
  yaratish huquqi bo'lgan rol  VA
  (HOKIM/ADMIN  YOKI  topshiriqni o'zi yaratgan  YOKI
   topshiriqqa nazoratchi o'rinbosar sifatida biriktirilgan)
  VA topshiriq yopilmagan.

`curated_organizations` — ixtiyoriy M2M: hokimlik mas'uli yoki o'rinbosar
alohida tashkilotlarga biriktirilganda soha doirasini yana toraytiradi.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.db.models import Q, QuerySet

from core.constants import UserRole
from organizations.models import Organization

if TYPE_CHECKING:  # pragma: no cover
    from tasks.models import Task
    from users.models import User


# Yopilgan topshiriqlar — ular ustida hech qanday o'zgartirish qilinmaydi
LOCKED_TASK_STATUSES = ('NAZORATDAN_YECHILDI', 'BAJARILMADI')


def _curated_ids(user: 'User') -> list:
    """Foydalanuvchiga alohida biriktirilgan tashkilot ID'lari (bo'sh bo'lishi mumkin)."""
    rel = getattr(user, 'curated_organizations', None)
    if rel is None:
        return []
    return list(rel.values_list('id', flat=True))


def assignable_organizations(user: 'User') -> QuerySet[Organization]:
    """Foydalanuvchi topshiriq berishi mumkin bo'lgan tashkilotlar."""
    base = Organization.objects.filter(is_active=True)
    role = getattr(user, 'role', None)

    if role in UserRole.ADMIN_ROLES:
        return base

    if role == UserRole.HOKIM_YORDAMCHISI:
        curated = _curated_ids(user)
        if curated:
            return base.filter(id__in=curated)
        if user.sector_id:
            return base.filter(sector_id=user.sector_id)
        return base.none()

    if role == UserRole.HOKIMLIK_MASUL:
        curated = _curated_ids(user)
        if curated:
            return base.filter(id__in=curated)
        supervisor = getattr(user, 'supervisor', None)
        if supervisor is not None:
            return assignable_organizations(supervisor)
        if user.sector_id:
            return base.filter(sector_id=user.sector_id)
        return base.none()

    if role == UserRole.TASHKILOT_RAHBARI:
        if user.organization_id:
            return base.filter(id=user.organization_id)
        return base.none()

    return base.none()


def can_create_tasks(user: 'User') -> bool:
    return getattr(user, 'role', None) in UserRole.TASK_CREATOR_ROLES


def can_edit_task(user: 'User', task: 'Task') -> bool:
    """Tahrirlash huquqi: yaratuvchi, biriktirilgan o'rinbosar yoki hokim/admin."""
    if not can_create_tasks(user):
        return False
    if task.status in LOCKED_TASK_STATUSES:
        return False
    if user.role in UserRole.ADMIN_ROLES:
        return True
    if task.created_by_id == user.id:
        return True
    return task.assigned_deputies.filter(pk=user.pk).exists()


def can_approve_task(user: 'User', task: 'Task') -> bool:
    """Ijro hisobotini tasdiqlash / qayta ijroga yuborish huquqi."""
    if user.role in UserRole.ADMIN_ROLES:
        return True
    if user.role == UserRole.HOKIM_YORDAMCHISI:
        return task.created_by_id == user.id or task.assigned_deputies.filter(pk=user.pk).exists()
    return False


def scope_tasks_for(user: 'User', queryset: QuerySet['Task']) -> QuerySet['Task']:
    """Ro'yxat/ko'rish doirasi — get_queryset shu bilan bir xil bo'lishi kerak."""
    role = getattr(user, 'role', None)
    if role in UserRole.ADMIN_ROLES:
        return queryset
    if role == UserRole.HOKIM_YORDAMCHISI:
        return queryset.filter(Q(created_by=user) | Q(assigned_deputies=user)).distinct()
    if role == UserRole.HOKIMLIK_MASUL:
        if user.supervisor_id:
            return queryset.filter(
                Q(created_by=user.supervisor) | Q(assigned_deputies=user.supervisor)
            ).distinct()
        if user.sector_id:
            return queryset.filter(
                Q(created_by__role=UserRole.HOKIM_YORDAMCHISI, created_by__sector_id=user.sector_id)
                | Q(assigned_deputies__role=UserRole.HOKIM_YORDAMCHISI,
                    assigned_deputies__sector_id=user.sector_id)
            ).distinct()
        return queryset.none()
    if role in UserRole.ORGANIZATION_ROLES:
        if user.organization_id:
            return queryset.filter(assigned_organizations__organization=user.organization).distinct()
        return queryset.none()
    return queryset.none()
