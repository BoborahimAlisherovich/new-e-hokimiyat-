"""
Yuklanadigan fayllar uchun umumiy validatsiya.

Bu modul topshiriq hisobotlari (`/api/tasks/{id}/report/`), timeline
(`/api/tasks/{id}/timeline/`) va topshiriq yaratishdagi ilovalar uchun
BIR XIL qoidalarni qo'llaydi.

Qoidalar:
    - Har bir fayl uchun maksimal hajm: 20 MB
    - Bitta so'rovda maksimal fayl soni: 10
    - Faqat ruxsat etilgan kengaytmalar
    - Xavfli kengaytmalar (.exe, .js, .sh, .svg, .html ...) butunlay taqiqlangan
    - Kengaytma va faylning haqiqiy mazmuni (magic bytes) mos kelishi tekshiriladi
    - Xato xabarlari o'zbek tilida va aybdor fayl nomi bilan qaytariladi
"""

from __future__ import annotations

import os
from typing import Iterable, List, Optional

from rest_framework import serializers

# =============================================================================
# LIMITLAR
# =============================================================================

MAX_FILE_SIZE = 20 * 1024 * 1024      # 20 MB
MAX_FILES_PER_REQUEST = 10

# =============================================================================
# KENGAYTMALAR
# =============================================================================

IMAGE_EXTENSIONS = frozenset({'.jpg', '.jpeg', '.png', '.webp', '.heic', '.gif'})
VIDEO_EXTENSIONS = frozenset({'.mp4', '.webm', '.mov'})
AUDIO_EXTENSIONS = frozenset({'.mp3', '.m4a', '.ogg', '.wav'})
DOCUMENT_EXTENSIONS = frozenset({
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.ppt', '.pptx', '.txt', '.csv',
})

ALLOWED_EXTENSIONS = frozenset(
    IMAGE_EXTENSIONS | VIDEO_EXTENSIONS | AUDIO_EXTENSIONS | DOCUMENT_EXTENSIONS
)

# Butunlay taqiqlangan kengaytmalar (allowlist dan qat'iy nazar)
BLOCKED_EXTENSIONS = frozenset({
    '.exe', '.js', '.sh', '.bat', '.cmd', '.msi', '.scr',
    '.php', '.html', '.htm', '.svg',
    # qo'shimcha xavfli turlar
    '.jar', '.vbs', '.ps1', '.com', '.dll', '.apk', '.deb', '.app',
})

# =============================================================================
# MAGIC BYTES (arzon "sniffing")
# =============================================================================

# (prefix baytlari, offset) -> shu signatura mos keladigan kengaytmalar to'plami
_MAGIC_SIGNATURES = (
    (b'\xff\xd8\xff', 0, frozenset({'.jpg', '.jpeg'})),
    (b'\x89PNG\r\n\x1a\n', 0, frozenset({'.png'})),
    (b'GIF87a', 0, frozenset({'.gif'})),
    (b'GIF89a', 0, frozenset({'.gif'})),
    (b'RIFF', 0, frozenset({'.webp', '.wav', '.avi'})),
    (b'%PDF-', 0, frozenset({'.pdf'})),
    (b'PK\x03\x04', 0, frozenset({'.docx', '.xlsx', '.pptx'})),
    (b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1', 0, frozenset({'.doc', '.xls', '.ppt', '.msi'})),
    (b'ID3', 0, frozenset({'.mp3'})),
    (b'OggS', 0, frozenset({'.ogg'})),
    (b'\x1a\x45\xdf\xa3', 0, frozenset({'.webm', '.mkv'})),
    (b'ftyp', 4, frozenset({'.mp4', '.mov', '.m4a', '.heic'})),
)

# Faylning haqiqiy mazmuni bo'yicha aniqlangan tur bilan MOS KELMASA
# rad etiladigan kengaytmalar. Matnli/aniqlanmaydigan formatlar (txt, csv)
# uchun sniffing qilinmaydi.
_SNIFFABLE_EXTENSIONS = frozenset({
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf',
    '.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt',
    '.mp4', '.mov', '.webm', '.ogg', '.wav',
})

# Skript/HTML mazmuni hech qanday ruxsat etilgan formatda bo'lmasligi kerak
_SCRIPTISH_PREFIXES = (
    b'<?php', b'<!doctype html', b'<html', b'<script', b'<svg',
    b'#!/', b'MZ', b'\x7fELF',
)


# =============================================================================
# YORDAMCHI FUNKSIYALAR
# =============================================================================

def get_extension(file_name: str) -> str:
    """Fayl nomidan kichik harfli kengaytmani qaytaradi ('.pdf')."""
    return os.path.splitext(file_name or '')[1].lower()


def resolve_file_type(file_obj) -> str:
    """`TaskAttachment.file_type` uchun to'g'ri qiymatni aniqlash.

    Returns:
        'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'OTHER'
    """
    name = getattr(file_obj, 'name', '') or ''
    content_type = (getattr(file_obj, 'content_type', '') or '').lower()
    ext = get_extension(name)

    if ext in IMAGE_EXTENSIONS or content_type.startswith('image/'):
        return 'IMAGE'
    if ext in VIDEO_EXTENSIONS or content_type.startswith('video/'):
        return 'VIDEO'
    if ext in AUDIO_EXTENSIONS or content_type.startswith('audio/'):
        return 'AUDIO'
    if ext in DOCUMENT_EXTENSIONS:
        return 'DOCUMENT'
    if content_type.startswith('application/') or content_type.startswith('text/'):
        return 'DOCUMENT'
    return 'OTHER'


def _read_head(file_obj, size: int = 16) -> bytes:
    """Fayl boshidan `size` bayt o'qib, ko'rsatkichni qaytarib qo'yadi."""
    try:
        pos = file_obj.tell()
    except Exception:
        pos = None
    try:
        file_obj.seek(0)
        head = file_obj.read(size) or b''
    except Exception:
        return b''
    finally:
        try:
            file_obj.seek(pos if pos is not None else 0)
        except Exception:
            pass
    return bytes(head)


def _sniff_matches_extension(head: bytes, ext: str) -> Optional[bool]:
    """Magic bytes kengaytmaga mos kelishini tekshirish.

    Returns:
        True  - mos keladi
        False - aniq mos kelmaydi
        None  - aniqlash imkoni bo'lmadi (tekshirishni o'tkazib yuborish)
    """
    if not head:
        return None

    matched_any = False
    for prefix, offset, extensions in _MAGIC_SIGNATURES:
        if head[offset:offset + len(prefix)] == prefix:
            matched_any = True
            if ext in extensions:
                return True
    if matched_any:
        return False
    return None


# =============================================================================
# ASOSIY VALIDATOR
# =============================================================================

def validate_upload(file_obj) -> str:
    """Bitta faylni tekshirish.

    Raises:
        rest_framework.serializers.ValidationError: qoidalarga mos kelmasa.

    Returns:
        Aniqlangan `file_type` qiymati.
    """
    name = (getattr(file_obj, 'name', '') or '').strip()
    if not name:
        raise serializers.ValidationError("Fayl nomi aniqlanmadi. Faylni qaytadan yuklang.")

    ext = get_extension(name)

    if not ext:
        raise serializers.ValidationError(
            f"«{name}» faylining kengaytmasi yo'q. Bunday fayllarni yuklash mumkin emas."
        )

    if ext in BLOCKED_EXTENSIONS:
        raise serializers.ValidationError(
            f"«{name}» fayli xavfsizlik sababli qabul qilinmaydi "
            f"({ext} kengaytmasi taqiqlangan)."
        )

    if ext not in ALLOWED_EXTENSIONS:
        raise serializers.ValidationError(
            f"«{name}» fayli qo'llab-quvvatlanmaydi. "
            f"Ruxsat etilgan formatlar: {', '.join(sorted(e.lstrip('.') for e in ALLOWED_EXTENSIONS))}."
        )

    size = getattr(file_obj, 'size', None)
    if size is not None:
        if size <= 0:
            raise serializers.ValidationError(f"«{name}» fayli bo'sh.")
        if size > MAX_FILE_SIZE:
            limit_mb = MAX_FILE_SIZE // (1024 * 1024)
            actual_mb = round(size / (1024 * 1024), 1)
            raise serializers.ValidationError(
                f"«{name}» fayli juda katta ({actual_mb} MB). "
                f"Har bir fayl {limit_mb} MB dan oshmasligi kerak."
            )

    head = _read_head(file_obj)

    lowered = head.lower()
    for prefix in _SCRIPTISH_PREFIXES:
        if lowered.startswith(prefix.lower()):
            raise serializers.ValidationError(
                f"«{name}» faylining mazmuni bajariladigan kod yoki HTML/SVG ga o'xshaydi. "
                "Bunday fayl qabul qilinmaydi."
            )

    if ext in _SNIFFABLE_EXTENSIONS:
        verdict = _sniff_matches_extension(head, ext)
        if verdict is False:
            raise serializers.ValidationError(
                f"«{name}» faylining haqiqiy mazmuni {ext} kengaytmasiga mos kelmaydi. "
                "Faylni to'g'ri formatda saqlab, qaytadan yuklang."
            )

    return resolve_file_type(file_obj)


def validate_uploads(files: Iterable) -> List[str]:
    """Bir so'rovdagi barcha fayllarni tekshirish.

    Raises:
        rest_framework.serializers.ValidationError

    Returns:
        Har bir fayl uchun aniqlangan `file_type` qiymatlari ro'yxati
        (kirish tartibida).
    """
    file_list = [f for f in (files or []) if f is not None]

    if len(file_list) > MAX_FILES_PER_REQUEST:
        raise serializers.ValidationError(
            f"Bir so'rovda ko'pi bilan {MAX_FILES_PER_REQUEST} ta fayl yuklash mumkin "
            f"(siz {len(file_list)} ta fayl yubordingiz)."
        )

    return [validate_upload(f) for f in file_list]
