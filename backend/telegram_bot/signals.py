"""
TELEGRAM MUROJAATLARI — signallar.

Nima uchun signal, har bir endpoint'da qo'lda chaqirish emas:
`TelegramAppeal.status` kamida oltita joyda o'zgaradi (review, respond,
forward, manual-create, AI oqimi, bot handlerlari). Har biriga xabar
yuborish kodini qo'shish — bittasini esdan chiqarish demak, va fuqaro
o'sha yo'l bilan o'zgargan holat haqida bilmay qoladi.

`pre_save` eski holatni oladi, `post_save` esa haqiqiy o'tish bo'lsa
xabar yuboradi. Xabar yuborish `citizen_notify` ichida to'liq himoyalangan
(istisno ko'tarmaydi), shuning uchun signal saqlashni buzmaydi.
"""

from __future__ import annotations

import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .citizen_notify import notify_appeal_status
from .models import TelegramAppeal

logger = logging.getLogger(__name__)

# Eski holatni pre_save'dan post_save'ga o'tkazish uchun vaqtinchalik atribut
_OLD_STATUS_ATTR = '_ehokimiyat_old_status'


@receiver(pre_save, sender=TelegramAppeal, dispatch_uid='appeal_capture_old_status')
def capture_old_status(sender, instance: TelegramAppeal, **kwargs) -> None:
    """Saqlashdan oldingi holatni eslab qolamiz."""
    if not instance.pk:
        setattr(instance, _OLD_STATUS_ATTR, None)
        return
    try:
        old = sender.objects.only('status').get(pk=instance.pk).status
    except sender.DoesNotExist:
        old = None
    setattr(instance, _OLD_STATUS_ATTR, old)


@receiver(post_save, sender=TelegramAppeal, dispatch_uid='appeal_notify_citizen')
def notify_citizen_on_status_change(sender, instance: TelegramAppeal, created: bool, **kwargs) -> None:
    """Holat haqiqatan o'zgargan bo'lsa fuqaroga xabar beramiz."""
    old = getattr(instance, _OLD_STATUS_ATTR, None)
    # Atributni tozalaymiz, aks holda keyingi saqlashda eskirgan qiymat qoladi
    if hasattr(instance, _OLD_STATUS_ATTR):
        delattr(instance, _OLD_STATUS_ATTR)

    if created:
        # Yangi murojaat — botning o'zi tasdiq xabarini beradi.
        return
    if old is None or old == instance.status:
        return

    notify_appeal_status(instance, instance.status)
