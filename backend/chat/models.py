"""
Chat modellari — to'g'ridan-to'g'ri (direct) xabar almashish.

Telegram darajasidagi UX uchun kerak bo'lgan maydonlar:
  * client_id     — idempotentlik kaliti. Frontend xabarni "pending" holatida
                    darhol ko'rsatadi va server javobini shu kalit bo'yicha
                    ulaydi. Qayta ulanishda (resync) dublikat oldini oladi.
  * reply_to      — javob (quote) zanjiri.
  * is_edited/edited_at   — tahrirlangan xabar belgisi.
  * is_deleted/deleted_at — yumshoq o'chirish. "Xabar o'chirildi" placeholder
                    va o'qilganlik holati saqlanib qoladi.
  * delivered_at  — bitta ✓ (yetkazildi) ni ikkita ✓✓ (o'qildi) dan ajratadi.
  * read_at       — o'qilgan vaqti.

DirectMessageAttachment — bitta xabarda bir nechta fayl. Har fayl uchun
mime, hajm, o'lcham (rasm nisbati uchun) va davomiylik (ovozli xabar)
saqlanadi, shuning uchun frontend endi fayl turini URL kengaytmasidan
taxmin qilmaydi.
"""

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class DirectMessage(models.Model):
    """Direct message between two users."""

    ATTACHMENT_IMAGE = 'IMAGE'
    ATTACHMENT_VIDEO = 'VIDEO'
    ATTACHMENT_AUDIO = 'AUDIO'
    ATTACHMENT_VOICE = 'VOICE'
    ATTACHMENT_FILE = 'FILE'

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_direct_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_direct_messages')
    content = models.TextField(blank=True)

    # Eski bitta fayl maydoni — orqaga moslik uchun saqlanadi.
    attachment = models.FileField(upload_to='direct_messages/', null=True, blank=True)

    # Optimistik yuborish uchun idempotentlik kaliti (frontend generatsiya qiladi).
    client_id = models.UUIDField(null=True, blank=True, db_index=True)

    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)

    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sender', 'recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
            # Kursor bo'yicha sahifalash (before_id / since_id) uchun.
            models.Index(fields=['sender', 'recipient', '-id'], name='chat_dm_pair_id_idx'),
        ]
        constraints = [
            # Bitta jo'natuvchi bitta client_id ni faqat bir marta ishlatadi.
            models.UniqueConstraint(
                fields=['sender', 'client_id'],
                condition=Q(client_id__isnull=False),
                name='chat_dm_sender_client_id_uniq',
            ),
        ]

    def __str__(self):
        return f"{self.sender} -> {self.recipient}: {self.content[:50]}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    def soft_delete(self):
        """Xabarni yumshoq o'chirish — satr saqlanadi, matn tozalanadi."""
        if self.is_deleted:
            return
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.content = ''
        self.save(update_fields=['is_deleted', 'deleted_at', 'content'])
        # Fayllarni ham berkitamiz.
        self.attachments.all().delete()


class DirectMessageAttachment(models.Model):
    """Bitta xabarga tegishli fayl (bir xabarda bir nechta bo'lishi mumkin)."""

    KIND_CHOICES = [
        (DirectMessage.ATTACHMENT_IMAGE, 'Rasm'),
        (DirectMessage.ATTACHMENT_VIDEO, 'Video'),
        (DirectMessage.ATTACHMENT_AUDIO, 'Audio'),
        (DirectMessage.ATTACHMENT_VOICE, 'Ovozli xabar'),
        (DirectMessage.ATTACHMENT_FILE, 'Fayl'),
    ]

    message = models.ForeignKey(
        DirectMessage,
        on_delete=models.CASCADE,
        related_name='attachments',
        null=True,
        blank=True,
    )
    # Xabarga bog'lanmagan (hali yuborilmagan) fayl kimga tegishli.
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='chat_attachments',
        null=True,
        blank=True,
    )

    file = models.FileField(upload_to='direct_messages/%Y/%m/')
    original_name = models.CharField(max_length=255, blank=True)
    mime_type = models.CharField(max_length=120, blank=True)
    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default=DirectMessage.ATTACHMENT_FILE)
    size = models.BigIntegerField(default=0)

    # Rasm/video uchun haqiqiy o'lcham — layout sakramasligi uchun.
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    # Ovozli xabar/video davomiyligi (millisekund).
    duration_ms = models.PositiveIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        indexes = [
            models.Index(fields=['message'], name='chat_dma_message_idx'),
            models.Index(fields=['uploaded_by', 'message'], name='chat_dma_owner_msg_idx'),
        ]

    def __str__(self):
        return self.original_name or str(self.file)

    @staticmethod
    def kind_from_mime(mime_type: str, is_voice: bool = False) -> str:
        mime = (mime_type or '').lower()
        if is_voice:
            return DirectMessage.ATTACHMENT_VOICE
        if mime.startswith('image/'):
            return DirectMessage.ATTACHMENT_IMAGE
        if mime.startswith('video/'):
            return DirectMessage.ATTACHMENT_VIDEO
        if mime.startswith('audio/'):
            return DirectMessage.ATTACHMENT_AUDIO
        return DirectMessage.ATTACHMENT_FILE


class ChatConversation(models.Model):
    """Ikki foydalanuvchi orasidagi suhbat."""

    participant1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_p1')
    participant2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_p2')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message = models.ForeignKey(
        DirectMessage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversation'
    )

    class Meta:
        unique_together = [
            ['participant1', 'participant2']
        ]
        ordering = ['-updated_at']
        constraints = [
            # Ilgari tartib faqat Python tomonda majburlanardi — teskari
            # (mirror) dublikat satrlar hosil bo'lishi mumkin edi.
            models.CheckConstraint(
                condition=Q(participant1__lt=F('participant2')),
                name='chat_conversation_participant_order',
            ),
        ]

    def __str__(self):
        return f"Conversation: {self.participant1} <-> {self.participant2}"

    @classmethod
    def get_or_create_conversation(cls, user1, user2):
        """Get or create a conversation between two users (id tartibi bilan)."""
        if user1.id > user2.id:
            user1, user2 = user2, user1
        conversation, _ = cls.objects.get_or_create(
            participant1=user1,
            participant2=user2
        )
        return conversation

    @classmethod
    def find_conversation(cls, user1, user2):
        """Mavjud suhbatni topadi, YARATMAYDI (GET so'rovlar uchun)."""
        a, b = (user1, user2) if user1.id <= user2.id else (user2, user1)
        return cls.objects.filter(participant1=a, participant2=b).first()

    def get_other_participant(self, user):
        """Get the other participant in the conversation."""
        if self.participant1 == user:
            return self.participant2
        return self.participant1
