"""Chat uchun obyekt darajasidagi ruxsatlar."""

from rest_framework import permissions


class IsMessageSender(permissions.BasePermission):
    """
    Faqat xabarni yuborgan foydalanuvchi uni tahrirlashi/o'chirishi mumkin.

    Ilgari `DirectMessageViewSet` to'liq ModelViewSet edi va `get_queryset`
    "sender YOKI recipient" qaytarardi — natijada QABUL QILUVCHI ham
    `PATCH /api/chat/messages/<id>/` orqali jo'natuvchining xabarini
    qayta yozishi yoki `DELETE` bilan o'chirishi mumkin edi (B20).
    """

    message = "Siz faqat o'zingiz yuborgan xabar ustida amal bajara olasiz"

    def has_object_permission(self, request, view, obj):
        return obj.sender_id == request.user.id
