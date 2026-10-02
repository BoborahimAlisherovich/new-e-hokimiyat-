"""
MUROJAAT ILOVASINI SAYT ICHIDA OCHISH.

Bitta endpoint: `GET /api/telegram/attachments/<pk>/file/`.

Nima uchun alohida fayl: `telegram_bot/views.py` allaqachon 2000 qatordan
oshgan, media uzatish esa boshqa hech narsaga bog'liq bo'lmagan mustaqil
vazifa.

Kirish ikki yo'l bilan tekshiriladi:

  · `?sig=...` — imzolangan, muddati cheklangan havola. `<img>`, `<video>`
    va `<iframe>` teglari `Authorization` sarlavhasini yubora olmaydi,
    shuning uchun JWT bu yerda ishlamaydi. Imzo `media.py` da beriladi.

  · Odatdagi JWT — API mijozlari (masalan mobil ilova) uchun.

`?download=1` bo'lsa fayl yuklab olinadi, aks holda brauzerda ochiladi.
"""

from __future__ import annotations

from django.http import Http404
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from .media import stream_attachment, verify_attachment_signature
from .models import AppealAttachment


class AppealAttachmentFileView(APIView):
    """Murojaat ilovasini oqim tarzida uzatish."""

    # Ruxsat qo'lda tekshiriladi: imzolangan havola ham, JWT ham qabul
    # qilinadi. DRF ning `IsAuthenticated` i imzolangan havolani rad etar
    # edi va rasm hech qachon ko'rinmasdi.
    permission_classes = [AllowAny]

    def get(self, request, pk: int):
        try:
            attachment = AppealAttachment.objects.select_related('appeal').get(pk=pk)
        except AppealAttachment.DoesNotExist:
            raise Http404('Ilova topilmadi')

        if not self._is_allowed(request, attachment):
            # 404 — 403 emas: ilova bor-yo'qligini oshkor qilmaymiz.
            raise Http404('Ilova topilmadi')

        return stream_attachment(
            attachment,
            range_header=request.headers.get('Range', ''),
            as_download=request.query_params.get('download') in ('1', 'true', 'yes'),
        )

    @staticmethod
    def _is_allowed(request, attachment) -> bool:
        signature = request.query_params.get('sig', '')
        if signature and verify_attachment_signature(attachment.pk, signature):
            return True
        return bool(getattr(request.user, 'is_authenticated', False))


__all__ = ['AppealAttachmentFileView']
