"""
Chat uchun umumiy servis funksiyalari.

Bu modul HTTP view'lar va WebSocket consumer o'rtasida takrorlanmasligi
uchun barcha broadcast mantiqini bir joyda saqlaydi. Har bir funksiya
SINXRON — consumer ichidan `database_sync_to_async` yoki
`sync_to_async` bilan chaqiriladi.

Guruh nomlari: `direct_chat_<user_id>` (bitta foydalanuvchining barcha
qurilmalari). Channel layer — channels_redis, shuning uchun bir nechta
worker orasida ham fan-out ishlaydi.
"""

from typing import Any, Dict, Iterable, List, Optional

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Q
from django.utils import timezone

from .models import ChatConversation, DirectMessage
from .serializers import DirectMessageSerializer

# ---------------------------------------------------------------- primitivlar


def group_name(user_id) -> str:
    return f'direct_chat_{user_id}'


def emit(user_id, payload: Dict[str, Any]) -> None:
    """Bitta foydalanuvchining barcha ochiq socketlariga yuboradi."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    try:
        async_to_sync(channel_layer.group_send)(group_name(user_id), payload)
    except Exception:
        # Redis yo'q bo'lsa chat HTTP orqali ishlashda davom etadi.
        pass


def serialize_message(message: DirectMessage, request=None) -> Dict[str, Any]:
    return DirectMessageSerializer(message, context={'request': request}).data


def message_queryset():
    """N+1 ni oldini oluvchi asosiy queryset (B22)."""
    return (
        DirectMessage.objects
        .select_related('sender', 'recipient', 'reply_to', 'reply_to__sender')
        .prefetch_related('attachments', 'reply_to__attachments')
    )


def pair_filter(user_a, user_b) -> Q:
    return (
        Q(sender=user_a, recipient=user_b) |
        Q(sender=user_b, recipient=user_a)
    )


# ------------------------------------------------------------------ broadcast


def broadcast_new_message(message: DirectMessage, request=None) -> None:
    """
    Yangi xabar. `client_id` ikkala tomonga ham qaytariladi — jo'natuvchi
    optimistik "pending" pufakchani shu kalit bo'yicha ulaydi (dublikat yo'q).
    `peer_id` — qabul qiluvchi socket nuqtai nazaridan suhbatdosh.
    """
    payload = serialize_message(message, request)
    client_id = str(message.client_id) if message.client_id else None

    emit(message.sender_id, {
        'type': 'direct_message',
        'message': payload,
        'client_id': client_id,
        'peer_id': str(message.recipient_id),
        'own': True,
    })
    emit(message.recipient_id, {
        'type': 'direct_message',
        'message': payload,
        'client_id': client_id,
        'peer_id': str(message.sender_id),
        'own': False,
    })
    broadcast_conversation_updated(message, request)


def broadcast_conversation_updated(message: DirectMessage, request=None) -> None:
    """Sidebar'ni refetch qilmasdan yangilash uchun (B9/B7)."""
    payload = serialize_message(message, request)

    sender_unread = unread_count_between(recipient=message.sender, sender=message.recipient)
    recipient_unread = unread_count_between(recipient=message.recipient, sender=message.sender)

    emit(message.sender_id, {
        'type': 'conversation_updated',
        'peer_id': str(message.recipient_id),
        'last_message': payload,
        'unread_count': sender_unread,
    })
    emit(message.recipient_id, {
        'type': 'conversation_updated',
        'peer_id': str(message.sender_id),
        'last_message': payload,
        'unread_count': recipient_unread,
    })


def broadcast_message_edited(message: DirectMessage, request=None) -> None:
    payload = serialize_message(message, request)
    emit(message.sender_id, {
        'type': 'message_edited',
        'message': payload,
        'peer_id': str(message.recipient_id),
    })
    emit(message.recipient_id, {
        'type': 'message_edited',
        'message': payload,
        'peer_id': str(message.sender_id),
    })


def broadcast_message_deleted(message: DirectMessage, request=None) -> None:
    """Yumshoq o'chirish — placeholder ko'rsatish uchun xabar ham yuboriladi."""
    payload = serialize_message(message, request)
    emit(message.sender_id, {
        'type': 'message_deleted',
        'message_id': message.id,
        'other_user_id': str(message.recipient_id),
        'peer_id': str(message.recipient_id),
        'message': payload,
    })
    emit(message.recipient_id, {
        'type': 'message_deleted',
        'message_id': message.id,
        'other_user_id': str(message.sender_id),
        'peer_id': str(message.sender_id),
        'message': payload,
    })


def broadcast_messages_read(reader_id, sender_id, message_ids: List[int], last_message_id=None) -> None:
    """
    B27: o'qilganlik faqat jo'natuvchiga emas, O'QIGANNING o'z boshqa
    qurilmalariga ham yuboriladi — aks holda ikkinchi qurilmada unread
    badge qotib qoladi.
    """
    if not message_ids:
        return
    last_id = last_message_id or max(message_ids)

    # Jo'natuvchi: ✓✓ ko'rsatadi.
    emit(sender_id, {
        'type': 'messages_read',
        'user_id': str(reader_id),
        'peer_id': str(reader_id),
        'message_ids': message_ids,
        'last_message_id': last_id,
    })
    # O'qigan foydalanuvchining boshqa qurilmalari: unread ni tozalaydi.
    emit(reader_id, {
        'type': 'messages_read',
        'user_id': str(reader_id),
        'peer_id': str(sender_id),
        'message_ids': message_ids,
        'last_message_id': last_id,
    })


def broadcast_delivered(recipient_id, sender_id, message_ids: List[int]) -> None:
    """Bitta ✓ — qabul qiluvchining sokketi xabarni oldi."""
    if not message_ids:
        return
    emit(sender_id, {
        'type': 'delivered',
        'user_id': str(recipient_id),
        'peer_id': str(recipient_id),
        'message_ids': message_ids,
    })


def broadcast_typing(sender_id, recipient_id, is_typing: bool) -> None:
    emit(recipient_id, {
        'type': 'chat_typing',
        'user_id': str(sender_id),
        'peer_id': str(sender_id),
        'is_typing': bool(is_typing),
    })


def broadcast_presence(user, is_online: bool) -> None:
    """
    B28: presence nuqtalari ilgari `last_seen` ga tayanib sahifa yuklangan
    holatda qotib qolardi. Endi socket ulanishi/uzilishi bilan suhbatdoshlarga
    real vaqtda yuboriladi.
    """
    last_seen = user.last_seen.isoformat() if getattr(user, 'last_seen', None) else None
    payload = {
        'type': 'chat_presence',
        'user_id': str(user.id),
        'is_online': bool(is_online),
        'last_seen': last_seen,
    }
    for peer_id in presence_audience_ids(user):
        emit(peer_id, payload)


def presence_audience_ids(user) -> Iterable:
    """Kim bu foydalanuvchining onlayn holatini bilishi kerak — suhbatdoshlar."""
    ids = set()
    rows = ChatConversation.objects.filter(
        Q(participant1=user) | Q(participant2=user)
    ).values_list('participant1_id', 'participant2_id')
    for p1, p2 in rows:
        ids.add(p1)
        ids.add(p2)
    ids.discard(user.id)
    return ids


# ------------------------------------------------------------------- yordamchi


def unread_count_between(*, recipient, sender) -> int:
    return DirectMessage.objects.filter(
        recipient=recipient,
        sender=sender,
        is_read=False,
        is_deleted=False,
    ).count()


def touch_conversation(sender, recipient, message: DirectMessage) -> None:
    conversation = ChatConversation.get_or_create_conversation(sender, recipient)
    conversation.last_message = message
    conversation.save(update_fields=['last_message', 'updated_at'])


def mark_conversation_read(*, reader, other_user_id, up_to_id: Optional[int] = None) -> List[int]:
    """
    O'qilgan deb belgilaydi va id ro'yxatini qaytaradi.
    `up_to_id` berilsa faqat shu id gacha (Telegram'dagi `read_up_to`).
    """
    qs = DirectMessage.objects.filter(
        recipient=reader,
        sender_id=other_user_id,
        is_read=False,
    )
    if up_to_id:
        qs = qs.filter(id__lte=up_to_id)

    ids = list(qs.values_list('id', flat=True))
    if not ids:
        return []

    now = timezone.now()
    DirectMessage.objects.filter(id__in=ids).update(is_read=True, read_at=now)
    return ids


def mark_delivered(*, recipient, other_user_id=None) -> List[int]:
    """Socket ulanganda hali `delivered_at` qo'yilmagan xabarlarni belgilaydi."""
    qs = DirectMessage.objects.filter(recipient=recipient, delivered_at__isnull=True)
    if other_user_id:
        qs = qs.filter(sender_id=other_user_id)
    rows = list(qs.values_list('id', 'sender_id'))
    if not rows:
        return []
    ids = [r[0] for r in rows]
    DirectMessage.objects.filter(id__in=ids).update(delivered_at=timezone.now())

    by_sender: Dict[Any, List[int]] = {}
    for mid, sid in rows:
        by_sender.setdefault(sid, []).append(mid)
    for sid, mids in by_sender.items():
        broadcast_delivered(recipient_id=recipient.id, sender_id=sid, message_ids=mids)
    return ids


def notify_direct_message(message: DirectMessage) -> None:
    """
    B26: DM uchun bildirishnoma. TaskChatConsumer allaqachon shunday
    qiladi, direct chat esa hech qanday bildirishnoma yubormasdi.
    """
    try:
        from notifications.services import create_notification
    except Exception:
        return

    preview = (message.content or '').strip()
    if not preview:
        first = list(message.attachments.all()[:1])
        if first:
            kind = first[0].kind
            preview = {
                DirectMessage.ATTACHMENT_IMAGE: 'Rasm',
                DirectMessage.ATTACHMENT_VIDEO: 'Video',
                DirectMessage.ATTACHMENT_AUDIO: 'Audio',
                DirectMessage.ATTACHMENT_VOICE: 'Ovozli xabar',
            }.get(kind, 'Fayl')
        elif message.attachment:
            preview = 'Fayl'
    if len(preview) > 160:
        preview = preview[:160] + '...'

    try:
        create_notification(
            user=message.recipient,
            title='Yangi xabar',
            message=f'{message.sender.full_name}: {preview}' if preview else f'{message.sender.full_name} sizga xabar yubordi.',
            notification_type='INFO',
            link=f'/dashboard/chat?user={message.sender_id}',
        )
    except Exception:
        pass
