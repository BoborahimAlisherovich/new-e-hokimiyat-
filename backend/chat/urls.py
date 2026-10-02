"""
Chat URL patterns.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChatAttachmentUploadView, ChatSearchView, DirectMessageViewSet

router = DefaultRouter()
router.register('messages', DirectMessageViewSet, basename='message')

urlpatterns = [
    # DIQQAT: bu ikki manzil ilgari ro'yxatdan O'TMAGAN edi.
    # `ChatAttachmentUploadView` va `ChatSearchView` klasslari
    # `chat/views.py` da yozilgan, lekin hech qayerga ulanmagan — ya'ni:
    #
    #     POST /api/chat/attachments/  -> 404  (rasm, fayl va OVOZLI
    #                                           xabar yuborib bo'lmasdi:
    #                                           «Yuklash xatosi (404)»)
    #     GET  /api/chat/search/       -> 404  (xabarlar bo'yicha qidiruv
    #                                           hech qachon natija bermasdi)
    #
    # Router'dan OLDIN turishi shart: `messages` prefiksi bilan
    # to'qnashmasa ham, aniq yo'llar har doim oldin kelgani ma'qul.
    path('attachments/', ChatAttachmentUploadView.as_view(), name='chat-attachment-upload'),
    path('search/', ChatSearchView.as_view(), name='chat-search'),
    path('', include(router.urls)),
]
