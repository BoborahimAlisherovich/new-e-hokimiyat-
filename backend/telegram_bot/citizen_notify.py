"""
FUQARONI XABARDOR QILISH — murojaat holati o'zgarganda.

Muammo: murojaat botdan kelgandan keyin fuqaro hech qanday xabar olmaydi.
Uning murojaati tasdiqlandimi, tashkilotga yuborildimi, javob berildimi —
bilmaydi. Bu ishonchni yo'qotadi: odam «murojaatim yo'qoldi» deb o'ylaydi.

Bu modul TelegramAppeal.status o'zgarishini kuzatadi (signal orqali,
telegram_bot/signals.py) va fuqaroga o'z tilida qisqa xabar yuboradi.

Qoidalar:
  · faqat FUQARO uchun ma'noli o'zgarishlar haqida xabar beriladi
    (`draft` -> `pending_ai` kabi ichki holatlar jim o'tadi);
  · matn hech narsa o'ylab chiqarmaydi — faqat holat va murojaat raqami;
  · yuborilgan xabar `AppealMessage` sifatida saqlanadi, shuning uchun
    operator kabinetda «fuqaro xabardor qilingan» deb ko'radi;
  · Telegram javob bermasa yoki bot sozlanmagan bo'lsa — istisno
    ko'tarilmaydi, faqat log'ga yoziladi (murojaat ustidagi amal
    buzilmasligi kerak).
"""

from __future__ import annotations

import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Fuqaroga aytiladigan holatlar. Ro'yxatda yo'q holat — ichki, jim o'tadi.
NOTIFIABLE = ('approved', 'rejected', 'responded', 'forwarded', 'resolved')

# Har holat uchun uch tilda matn. `{n}` — murojaat raqami.
STATUS_TEXT: Dict[str, Dict[str, str]] = {
    'approved': {
        'uz': "✅ №{n} murojaatingiz qabul qilindi va ko‘rib chiqilmoqda.\n"
              "Natija haqida shu bot orqali xabar beramiz.",
        'ru': "✅ Ваше обращение №{n} принято и рассматривается.\n"
              "О результате сообщим через этого бота.",
        'en': "✅ Your appeal No. {n} has been accepted and is under review.\n"
              "We will inform you of the result through this bot.",
    },
    'forwarded': {
        'uz': "📌 №{n} murojaatingiz mas’ul tashkilotga topshiriq sifatida "
              "yuborildi. Ijro nazoratga olindi.",
        'ru': "📌 Ваше обращение №{n} направлено ответственной организации "
              "как поручение. Исполнение взято на контроль.",
        'en': "📌 Your appeal No. {n} has been forwarded to the responsible "
              "organization as a task. Execution is under control.",
    },
    'responded': {
        'uz': "💬 №{n} murojaatingizga javob berildi.",
        'ru': "💬 На ваше обращение №{n} дан ответ.",
        'en': "💬 Your appeal No. {n} has been answered.",
    },
    'resolved': {
        'uz': "🎯 №{n} murojaatingiz hal qilindi.",
        'ru': "🎯 Ваше обращение №{n} решено.",
        'en': "🎯 Your appeal No. {n} has been resolved.",
    },
    'rejected': {
        'uz': "🚫 №{n} murojaatingiz ko‘rib chiqildi, lekin qabul qilinmadi.",
        'ru': "🚫 Ваше обращение №{n} рассмотрено, но не принято.",
        'en': "🚫 Your appeal No. {n} was reviewed but not accepted.",
    },
}

# Izoh (admin javobi / rad etish sababi) sarlavhasi
NOTE_LABEL = {
    'uz': 'Izoh',
    'ru': 'Комментарий',
    'en': 'Note',
}


def _language(appeal) -> str:
    lang = ''
    user = getattr(appeal, 'telegram_user', None)
    if user is not None:
        lang = getattr(user, 'language', '') or ''
    if not lang:
        lang = getattr(appeal, 'citizen_language', '') or ''
    return lang if lang in ('uz', 'ru', 'en') else 'uz'


def build_text(appeal, status: str) -> Optional[str]:
    """Fuqaroga yuboriladigan matn. Holat xabardor qilinmasa — None."""
    template = STATUS_TEXT.get(status)
    if not template:
        return None

    lang = _language(appeal)
    number = appeal.appeal_number or str(appeal.id)
    text = template.get(lang, template['uz']).format(n=number)

    # Rad etish yoki javob bo'lsa — admin matnini ham qo'shamiz. O'zimiz
    # hech narsa yozmaymiz, faqat borini uzatamiz.
    note = (getattr(appeal, 'admin_response', '') or '').strip()
    if note and status in ('rejected', 'responded', 'resolved'):
        text += '\n\n{}: {}'.format(NOTE_LABEL.get(lang, NOTE_LABEL['uz']), note)

    return text


def notify_appeal_status(appeal, status: str, *, record: bool = True) -> bool:
    """
    Fuqaroga holat haqida xabar yuboradi.

    Qaytaradi: yuborildimi. HECH QACHON istisno ko'tarmaydi.
    """
    if status not in NOTIFIABLE:
        return False

    user = getattr(appeal, 'telegram_user', None)
    chat_id = getattr(user, 'telegram_id', None) if user else None
    if not chat_id:
        # Qo'lda kiritilgan murojaat — Telegram kanali yo'q.
        logger.debug('Murojaat %s: telegram_user yo‘q, xabar yuborilmadi', appeal.pk)
        return False

    if getattr(user, 'is_blocked', False):
        # Bloklangan foydalanuvchiga xabar yuborilmaydi.
        return False

    text = build_text(appeal, status)
    if not text:
        return False

    try:
        from .telegram_api import TelegramAPI

        api = TelegramAPI.get_instance()
        if not api:
            logger.warning('Bot sozlanmagan — murojaat %s holati yuborilmadi', appeal.pk)
            return False

        result = api.send_message(chat_id=chat_id, text=text)
    except Exception:  # noqa: BLE001 — murojaat ustidagi amal buzilmasligi kerak
        logger.exception('Murojaat %s: fuqaroga xabar yuborishda xato', appeal.pk)
        return False

    ok = bool(getattr(result, 'success', False))
    if not ok:
        logger.warning(
            'Murojaat %s: Telegram xabarni qabul qilmadi (%s)',
            appeal.pk, getattr(result, 'error', '—'),
        )
        return False

    # Operator kabinetda ko'rishi uchun yozib qo'yamiz.
    if record:
        try:
            from .models import AppealMessage

            AppealMessage.objects.create(
                appeal=appeal,
                is_from_admin=True,
                is_system=True,
                text=text,
                telegram_message_id=getattr(result, 'message_id', None),
            )
        except Exception:  # noqa: BLE001
            logger.exception('Murojaat %s: xabar yozuvini saqlashda xato', appeal.pk)

    return True


__all__ = ['NOTIFIABLE', 'STATUS_TEXT', 'build_text', 'notify_appeal_status']
