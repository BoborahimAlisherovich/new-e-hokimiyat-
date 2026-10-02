"""
TELEGRAM MEDIA — bazada emas, havola orqali.

Muammo: bot orqali kelgan har bir rasm/video baytma-bayt yuklab olinib
`media/appeals/attachments/` ga yozilardi. Kuniga 200 murojaat, har birida
2-3 ta video — disk bir necha oyda to'lib qoladi, zaxira nusxa ulkan
bo'ladi, ko'chirish esa amalda imkonsiz. Aslida fayl allaqachon Telegram
serverida turibdi va `file_id` bilan istalgan vaqtda olinadi.

Yechim: `AppealAttachment` faqat HAVOLANI saqlaydi (`telegram_file_id`),
baytlar esa foydalanuvchi ko'rmoqchi bo'lganda shu modul orqali oqim
(stream) tarzida uzatiladi. Sayt ichida rasm/video/audio odatdagidek
ochiladi, disk esa bo'sh qoladi.

Uchta narsa hal qilinadi:

1. `file_id` -> vaqtinchalik `file_path`. Telegram `getFile` qaytargan
   yo'l ~1 soat amal qiladi, shuning uchun u modelda keshlanadi va
   muddati o'tganda qayta so'raladi (har ko'rishda `getFile` chaqirish
   Telegram limitini yeb qo'yadi).

2. Autentifikatsiya. `<img src=...>` sarlavha yubora olmaydi, ya'ni JWT
   ishlamaydi. Shuning uchun serializer imzolangan, muddati cheklangan
   havola beradi (S3 presigned URL bilan bir xil naqsh).

3. Range so'rovlari. Videoni oldinga surish uchun brauzer `Range`
   yuboradi; u Telegram'ga o'zgarishsiz uzatiladi va 206 javob qaytadi.

Eski, diskka yozilgan ilovalar ishlashda davom etadi: `file` maydoni
to'lgan bo'lsa shu fayl beriladi, bo'sh bo'lsa Telegram'dan oqim keladi.
"""

from __future__ import annotations

import logging
import mimetypes
import os
import re
from typing import Iterator, Optional, Tuple

import requests
from django.conf import settings
from django.core import signing
from django.http import FileResponse, Http404, StreamingHttpResponse
from django.utils import timezone

logger = logging.getLogger(__name__)

# =============================================================================
# SOZLAMALAR
# =============================================================================

#: Imzolangan havola shuncha soniya amal qiladi. Sahifa ochilib turgan
#: vaqtga yetadi, lekin havola tarqalib ketsa abadiy ochiq qolmaydi.
SIGNED_URL_MAX_AGE = getattr(settings, 'TELEGRAM_MEDIA_URL_MAX_AGE', 12 * 60 * 60)

#: Imzo uchun alohida "salt" — boshqa maqsadda yaratilgan imzo bu yerda
#: ishlamasligi uchun.
_SIGNING_SALT = 'telegram_bot.media.attachment'

#: Telegram `getFile` bergan yo'lning amal qilish muddati (soniya).
#: Rasmiy hujjatda "kamida 1 soat" deyilgan — ehtiyot uchun 45 daqiqa.
FILE_PATH_TTL = 45 * 60

#: Oqim bo'lakchasi. Katta qilinsa xotira o'sadi, kichik qilinsa
#: tizim chaqiruvlari ko'payadi.
CHUNK_SIZE = 64 * 1024

#: Telegram Bot API `getFile` faqat 20 MB gacha fayl beradi — bu
#: Telegram cheklovi, biz o'zgartira olmaymiz.
TELEGRAM_GETFILE_LIMIT = 20 * 1024 * 1024

_RANGE_RE = re.compile(r'bytes=(\d*)-(\d*)')


# =============================================================================
# IMZOLANGAN HAVOLA
# =============================================================================

def sign_attachment_id(attachment_id: int) -> str:
    """Ilova identifikatori uchun vaqt tamg'ali imzo."""
    return signing.TimestampSigner(salt=_SIGNING_SALT).sign(str(attachment_id))


def verify_attachment_signature(attachment_id: int, signed_value: str) -> bool:
    """Imzo shu ilovaga tegishli va muddati o'tmaganini tekshirish."""
    if not signed_value:
        return False
    try:
        original = signing.TimestampSigner(salt=_SIGNING_SALT).unsign(
            signed_value, max_age=SIGNED_URL_MAX_AGE
        )
    except signing.BadSignature:
        return False
    return original == str(attachment_id)


def build_attachment_url(attachment, request=None) -> str:
    """Saytda ochiladigan havola.

    Har doim shu proxy orqali o'tadi — diskdagi fayl ham, Telegram'dagi
    fayl ham bir xil manzilda ko'rinadi, ya'ni frontend ikki holatni
    ajratib o'tirmaydi.

    Manzil `reverse()` bilan olinadi: prefiks (`/api/telegram-bot/`)
    `ehokimiyat/urls.py` da belgilanadi va uni bu yerda qo'lda yozish
    — birinchi ko'chirishda sinadigan havola demak.
    """
    from django.urls import reverse

    path = reverse('appeal-attachment-file', kwargs={'pk': attachment.pk})
    path = f"{path}?sig={sign_attachment_id(attachment.pk)}"
    if request is not None:
        return request.build_absolute_uri(path)
    return path


# =============================================================================
# TELEGRAM FAYL YO'LINI ANIQLASH
# =============================================================================

def _bot_token() -> Optional[str]:
    from .models import BotSettings

    row = BotSettings.objects.only('bot_token').first()
    token = (getattr(row, 'bot_token', '') or '').strip()
    return token or None


def _file_path_is_fresh(attachment) -> bool:
    synced_at = getattr(attachment, 'telegram_path_synced_at', None)
    if not synced_at or not getattr(attachment, 'telegram_file_path', ''):
        return False
    return (timezone.now() - synced_at).total_seconds() < FILE_PATH_TTL


def resolve_file_path(attachment, *, force: bool = False) -> Optional[str]:
    """`file_id` -> Telegram serveridagi `file_path`.

    Kesh yangi bo'lsa `getFile` chaqirilmaydi. Topilmasa `None`.
    """
    if not force and _file_path_is_fresh(attachment):
        return attachment.telegram_file_path

    file_id = (getattr(attachment, 'telegram_file_id', '') or '').strip()
    if not file_id:
        return None

    token = _bot_token()
    if not token:
        logger.warning('Bot tokeni sozlanmagan — ilova %s uzatilmadi', attachment.pk)
        return None

    try:
        response = requests.get(
            f'https://api.telegram.org/bot{token}/getFile',
            params={'file_id': file_id},
            timeout=15,
        )
        payload = response.json()
    except Exception:  # noqa: BLE001 — tarmoq xatosi sahifani buzmasligi kerak
        logger.exception('Telegram getFile xatosi (ilova %s)', attachment.pk)
        return None

    if not payload.get('ok'):
        logger.warning(
            'Telegram getFile rad etdi (ilova %s): %s',
            attachment.pk, payload.get('description', '—'),
        )
        return None

    result = payload.get('result') or {}
    file_path = result.get('file_path') or ''
    if not file_path:
        return None

    # Telegram bergan haqiqiy hajmni ham yozib qo'yamiz: bot qatlamida
    # u har doim ham kelmaydi.
    update_fields = ['telegram_file_path', 'telegram_path_synced_at']
    attachment.telegram_file_path = file_path
    attachment.telegram_path_synced_at = timezone.now()

    remote_size = result.get('file_size')
    if remote_size and not attachment.file_size:
        attachment.file_size = int(remote_size)
        update_fields.append('file_size')

    # Yozuv hali bazaga tushmagan bo'lsa (`pk` yo'q) keshni saqlab
    # bo'lmaydi — qiymat obyektda qoladi va birinchi `save()` da yoziladi.
    if attachment.pk:
        try:
            attachment.save(update_fields=update_fields)
        except Exception:  # noqa: BLE001
            logger.exception('Ilova %s: file_path keshini saqlashda xato', attachment.pk)

    return file_path


def resolve_remote_url(attachment) -> Optional[str]:
    """Telegram serveridagi to'g'ridan-to'g'ri yuklab olish manzili."""
    file_path = resolve_file_path(attachment)
    if not file_path:
        return None
    token = _bot_token()
    if not token:
        return None
    return f'https://api.telegram.org/file/bot{token}/{file_path}'


# =============================================================================
# MIME VA FAYL NOMI
# =============================================================================

#: Telegram fayl turi -> brauzer uchun standart MIME.
_DEFAULT_MIME = {
    'photo': 'image/jpeg',
    'video': 'video/mp4',
    'video_note': 'video/mp4',
    'voice': 'audio/ogg',
    'audio': 'audio/mpeg',
    'document': 'application/octet-stream',
}


def guess_content_type(attachment, file_path: str = '') -> str:
    """Brauzer to'g'ri ko'rsatishi uchun MIME turi."""
    declared = (getattr(attachment, 'mime_type', '') or '').strip()
    if declared and declared != 'application/octet-stream':
        return declared

    for candidate in (getattr(attachment, 'file_name', '') or '', file_path):
        if candidate:
            guessed, _ = mimetypes.guess_type(candidate)
            if guessed:
                return guessed

    return _DEFAULT_MIME.get(getattr(attachment, 'file_type', ''), 'application/octet-stream')


def display_file_name(attachment, file_path: str = '') -> str:
    """Yuklab olishda ko'rinadigan nom."""
    name = (getattr(attachment, 'file_name', '') or '').strip()
    if name:
        return name
    if file_path:
        return os.path.basename(file_path)
    return f'ilova-{attachment.pk}'


# =============================================================================
# OQIM (STREAMING)
# =============================================================================

def _parse_range(range_header: str, total: Optional[int]) -> Optional[Tuple[int, Optional[int]]]:
    """`Range: bytes=start-end` -> (start, end). Tushunarsiz bo'lsa None."""
    if not range_header:
        return None
    match = _RANGE_RE.fullmatch(range_header.strip())
    if not match:
        return None

    raw_start, raw_end = match.group(1), match.group(2)
    if raw_start:
        start = int(raw_start)
        end = int(raw_end) if raw_end else None
    elif raw_end and total:
        # `bytes=-500` — oxirgi 500 bayt
        start = max(total - int(raw_end), 0)
        end = total - 1
    else:
        return None
    return start, end


def _iter_response(response: requests.Response) -> Iterator[bytes]:
    try:
        for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
            if chunk:
                yield chunk
    finally:
        response.close()


def stream_attachment(attachment, *, range_header: str = '', as_download: bool = False):
    """Ilovani brauzerga uzatish.

    Diskda nusxasi bo'lsa — shundan, aks holda Telegram'dan oqim bilan.

    Raises:
        Http404: fayl na diskda, na Telegram'da topilmadi.
    """
    disposition = 'attachment' if as_download else 'inline'

    # 1. Diskdagi eski nusxa (arxivlangan ilovalar)
    local = getattr(attachment, 'file', None)
    if local:
        try:
            handle = local.open('rb')
        except (FileNotFoundError, OSError):
            logger.warning('Ilova %s: diskdagi fayl yo‘q, Telegram sinab ko‘riladi', attachment.pk)
        else:
            content_type = guess_content_type(attachment, local.name)
            response = FileResponse(handle, content_type=content_type)
            response['Content-Disposition'] = (
                f'{disposition}; filename*=UTF-8\'\'{_quote(display_file_name(attachment, local.name))}'
            )
            response['Accept-Ranges'] = 'bytes'
            return response

    # 2. Telegram serveridan oqim
    remote_url = resolve_remote_url(attachment)
    if not remote_url:
        raise Http404('Fayl topilmadi')

    headers = {}
    parsed_range = _parse_range(range_header, getattr(attachment, 'file_size', 0) or None)
    if parsed_range:
        start, end = parsed_range
        headers['Range'] = f'bytes={start}-' if end is None else f'bytes={start}-{end}'

    try:
        upstream = requests.get(remote_url, headers=headers, stream=True, timeout=30)
    except Exception:  # noqa: BLE001
        logger.exception('Ilova %s: Telegram fayl serveriga ulanib bo‘lmadi', attachment.pk)
        raise Http404('Fayl hozircha mavjud emas')

    if upstream.status_code == 404:
        # `file_path` eskirgan bo'lishi mumkin — bir marta yangilab ko'ramiz.
        upstream.close()
        refreshed = resolve_file_path(attachment, force=True)
        if not refreshed:
            raise Http404('Fayl topilmadi')
        token = _bot_token()
        try:
            upstream = requests.get(
                f'https://api.telegram.org/file/bot{token}/{refreshed}',
                headers=headers, stream=True, timeout=30,
            )
        except Exception:  # noqa: BLE001
            logger.exception('Ilova %s: qayta urinish ham muvaffaqiyatsiz', attachment.pk)
            raise Http404('Fayl hozircha mavjud emas')

    if upstream.status_code >= 400:
        upstream.close()
        logger.warning('Ilova %s: Telegram %s qaytardi', attachment.pk, upstream.status_code)
        raise Http404('Fayl topilmadi')

    file_path = getattr(attachment, 'telegram_file_path', '') or ''
    response = StreamingHttpResponse(
        _iter_response(upstream),
        status=upstream.status_code,
        content_type=guess_content_type(attachment, file_path),
    )
    response['Content-Disposition'] = (
        f'{disposition}; filename*=UTF-8\'\'{_quote(display_file_name(attachment, file_path))}'
    )
    response['Accept-Ranges'] = 'bytes'

    # Telegram bergan uzunlik/oraliq sarlavhalarini o'zgarishsiz uzatamiz —
    # ularsiz brauzer videoni oldinga sura olmaydi.
    for header in ('Content-Length', 'Content-Range'):
        if header in upstream.headers:
            response[header] = upstream.headers[header]

    return response


# =============================================================================
# ILOVA YARATISH (bot tomonidan)
# =============================================================================

#: Shu hajmgacha bo'lgan fayl diskda ham saqlanadi. 0 = hech qachon
#: saqlanmaydi (standart). Hokimlik arxiv talab qilsa, sozlamada
#: ko'tarish kifoya — kodni o'zgartirish shart emas.
LOCAL_COPY_MAX_BYTES = getattr(settings, 'TELEGRAM_MEDIA_LOCAL_COPY_MAX_BYTES', 0)


def save_appeal_attachment(
    appeal,
    *,
    file_id: str,
    file_type: str,
    file_name: str = '',
    mime_type: str = '',
    file_size: int = 0,
):
    """Murojaatga ilova biriktirish — baytlarni ko'chirmasdan.

    Faqat `file_id` saqlanadi. Baytlar Telegram serverida qoladi va
    saytda ko'rilganda `stream_attachment` orqali uzatiladi.

    `LOCAL_COPY_MAX_BYTES` noldan katta bo'lsa va fayl shundan kichik
    bo'lsa, qo'shimcha ravishda diskka nusxa ham olinadi.

    Returns:
        Yaratilgan `AppealAttachment` yoki xato bo'lsa `None`.
    """
    from .models import AppealAttachment

    if not file_id:
        logger.warning('Ilova saqlanmadi: file_id bo‘sh (murojaat %s)', getattr(appeal, 'pk', '—'))
        return None

    attachment = AppealAttachment(
        appeal=appeal,
        file_type=file_type,
        telegram_file_id=file_id,
        file_name=(file_name or '').strip(),
        mime_type=(mime_type or '').strip(),
        file_size=int(file_size or 0),
    )

    # Nom berilmagan bo'lsa (Telegram rasm/ovoz uchun nom yubormaydi)
    # tur bo'yicha nom quramiz. Bu yerda `getFile` CHAQIRILMAYDI: har
    # bir ilova uchun tarmoqqa chiqish Telegram limitini bekorga yeydi,
    # haqiqiy nom esa ko'rish paytida aniqlanadi.
    if not attachment.file_name:
        attachment.file_name = _fallback_file_name(file_type, file_id)

    if LOCAL_COPY_MAX_BYTES and 0 < attachment.file_size <= LOCAL_COPY_MAX_BYTES:
        _store_local_copy(attachment)

    attachment.save()
    return attachment


#: Telegram fayl turi -> nom kengaytmasi.
_FALLBACK_EXTENSION = {
    'photo': 'jpg',
    'video': 'mp4',
    'video_note': 'mp4',
    'voice': 'ogg',
    'audio': 'mp3',
    'document': 'bin',
}


def _fallback_file_name(file_type: str, file_id: str) -> str:
    """Telegram nom bermaganda ishlatiladigan nom."""
    extension = _FALLBACK_EXTENSION.get(file_type, 'bin')
    return f'{file_type or "fayl"}-{file_id[:12]}.{extension}'


def _store_local_copy(attachment) -> None:
    """Ixtiyoriy arxiv nusxasi. Xato bo'lsa ilova baribir saqlanadi."""
    from django.core.files.base import ContentFile

    remote_url = resolve_remote_url(attachment)
    if not remote_url:
        return
    try:
        response = requests.get(remote_url, timeout=30)
        if response.status_code != 200:
            return
        name = attachment.file_name or f'{attachment.telegram_file_id[:20]}.bin'
        attachment.file.save(name, ContentFile(response.content), save=False)
        attachment.file_size = len(response.content)
    except Exception:  # noqa: BLE001 — arxiv nusxasi ixtiyoriy
        logger.exception('Ilova arxiv nusxasini olishda xato')


def _quote(value: str) -> str:
    from urllib.parse import quote

    return quote(value, safe='')


__all__ = [
    'SIGNED_URL_MAX_AGE',
    'TELEGRAM_GETFILE_LIMIT',
    'LOCAL_COPY_MAX_BYTES',
    'build_attachment_url',
    'display_file_name',
    'guess_content_type',
    'resolve_file_path',
    'resolve_remote_url',
    'save_appeal_attachment',
    'sign_attachment_id',
    'stream_attachment',
    'verify_attachment_signature',
]
