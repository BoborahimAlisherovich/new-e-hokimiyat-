"""
JONLI TARQATISH (WebSocket) — yagona xavfsiz nuqta.

Muammo: `async_to_sync(channel_layer.group_send)(...)` to'g'ridan-to'g'ri
chaqirilganda, Redis ishlamayotgan bo'lsa `redis.exceptions.ConnectionError`
ko'tariladi va butun HTTP so'rov 500 bilan tugaydi. Ya'ni Redis o'chgan
bo'lsa foydalanuvchi topshiriq chatiga xabar YOZA OLMAYDI — holbuki xabar
allaqachon bazaga saqlangan.

Shu sababli barcha broadcast shu modul orqali o'tadi:
  · ulanish xatosi so'rovni buzmaydi — faqat log'ga yozilади;
  · birinchi xatodan keyin qisqa vaqt (COOLDOWN) qayta urinilmaydi, aks
    holda har so'rov Redis'ni kutib sekinlashadi;
  · Redis qaytsa, cooldown tugagach o'zi tiklanadi.

`emit_sync` HTTP view'lardan (sinxron kontekst) chaqiriladi.
`emit_async` consumer ichidan (allaqachon async) chaqiriladi.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

# Ulanish xatosidan keyin necha soniya qayta urinmaslik
COOLDOWN_SECONDS = 30.0

_muted_until: float = 0.0
_warned: bool = False


def _is_transport_error(exc: BaseException) -> bool:
    """Redis/tarmoq xatosi — kutilgan holat. Boshqasi kod xatosi."""
    name = type(exc).__name__
    if isinstance(exc, (ConnectionError, OSError, TimeoutError)):
        return True
    return name in {
        'ConnectionError',
        'ConnectionRefusedError',
        'TimeoutError',
        'RedisError',
        'BusyLoadingError',
        'ChannelFull',
    }


def _note_failure(exc: BaseException) -> None:
    global _muted_until, _warned
    _muted_until = time.monotonic() + COOLDOWN_SECONDS
    if not _warned:
        logger.warning(
            'Jonli tarqatish o‘chirildi: channel layer javob bermadi (%s: %s). '
            'Ma‘lumot bazaga saqlanadi, WebSocket yangilanishlari %ss davomida '
            'yuborilmaydi. Redis ishga tushsa o‘zi tiklanadi.',
            type(exc).__name__, exc, int(COOLDOWN_SECONDS),
        )
        _warned = True
    else:
        logger.debug('Jonli tarqatish o‘tkazib yuborildi: %s', exc)


def available() -> bool:
    """Hozir broadcast qilishga urinib ko'rish ma'noli-mi."""
    if get_channel_layer() is None:
        return False
    return time.monotonic() >= _muted_until


def emit_sync(group: str, payload: Dict[str, Any]) -> bool:
    """
    Guruhga xabar yuboradi. HECH QACHON istisno ko'tarmaydi.

    Qaytaradi: yuborildimi (False — layer yo'q, cooldown yoki xato).
    """
    layer = get_channel_layer()
    if layer is None:
        return False
    if time.monotonic() < _muted_until:
        return False

    try:
        async_to_sync(layer.group_send)(group, payload)
    except Exception as exc:  # noqa: BLE001 — so'rovni buzmaslik shart
        if _is_transport_error(exc):
            _note_failure(exc)
        else:
            # Kod xatosi (masalan serializatsiya) — ko'rinib turishi kerak,
            # lekin baribir so'rovni buzmaydi.
            logger.exception('Broadcast payload xatosi (guruh: %s)', group)
        return False

    global _warned
    if _warned:
        logger.info('Jonli tarqatish tiklandi.')
        _warned = False
    return True


async def emit_async(group: str, payload: Dict[str, Any]) -> bool:
    """`emit_sync` ning async varianti — consumer ichidan."""
    layer = get_channel_layer()
    if layer is None:
        return False
    if time.monotonic() < _muted_until:
        return False

    try:
        await layer.group_send(group, payload)
    except Exception as exc:  # noqa: BLE001
        if _is_transport_error(exc):
            _note_failure(exc)
        else:
            logger.exception('Broadcast payload xatosi (guruh: %s)', group)
        return False

    global _warned
    if _warned:
        logger.info('Jonli tarqatish tiklandi.')
        _warned = False
    return True


async def group_add(group: str, channel_name: str) -> bool:
    """Consumer ulanganda guruhga qo'shish — xato so'rovni buzmaydi."""
    layer = get_channel_layer()
    if layer is None:
        return False
    try:
        await layer.group_add(group, channel_name)
    except Exception as exc:  # noqa: BLE001
        if _is_transport_error(exc):
            _note_failure(exc)
        else:
            logger.exception('group_add xatosi (guruh: %s)', group)
        return False
    return True


async def group_discard(group: str, channel_name: str) -> bool:
    layer = get_channel_layer()
    if layer is None:
        return False
    try:
        await layer.group_discard(group, channel_name)
    except Exception as exc:  # noqa: BLE001
        if not _is_transport_error(exc):
            logger.exception('group_discard xatosi (guruh: %s)', group)
        return False
    return True


__all__ = [
    'available',
    'emit_sync',
    'emit_async',
    'group_add',
    'group_discard',
]
