"""
Chat: Telegram darajasidagi imkoniyatlar uchun maydonlar.

Qo'lda yozilgan migratsiya (makemigrations ishga tushirilmagan).

Qo'shiladi:
  * DirectMessage.client_id      — optimistik yuborish uchun idempotentlik kaliti
  * DirectMessage.reply_to       — javob (quote) zanjiri
  * DirectMessage.delivered_at   — ✓ (yetkazildi) ni ✓✓ (o'qildi) dan ajratadi
  * DirectMessage.is_edited / edited_at
  * DirectMessage.is_deleted / deleted_at  — yumshoq o'chirish
  * DirectMessageAttachment      — bitta xabarda bir nechta fayl
  * kursor sahifalash uchun indeks (sender, recipient, -id)
  * (sender, client_id) unikal cheklovi
  * ChatConversation uchun participant tartibi cheklovi

MUHIM: ChatConversation cheklovidan oldin `normalize_conversations` ishga
tushadi. Ilgari participant tartibi faqat Python tomonda majburlangan edi,
shuning uchun bazada teskari (mirror) satrlar bo'lishi mumkin — cheklov
ularda xato bergan bo'lardi.
"""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.models import F, Q


def normalize_conversations(apps, schema_editor):
    """participant1 > participant2 bo'lgan satrlarni to'g'rilaydi."""
    ChatConversation = apps.get_model('chat', 'ChatConversation')

    # str() bilan solishtirish: PK UUID ham, int ham bo'lishi mumkin.
    wrong = [
        row
        for row in ChatConversation.objects.all().only(
            'id', 'participant1_id', 'participant2_id'
        )
        if str(row.participant1_id) > str(row.participant2_id)
    ]

    for row in wrong:
        p1, p2 = row.participant1_id, row.participant2_id
        twin = (
            ChatConversation.objects.filter(participant1_id=p2, participant2_id=p1)
            .exclude(pk=row.pk)
            .first()
        )
        if twin is None:
            # Oddiy holat — o'rnini almashtiramiz.
            row.participant1_id, row.participant2_id = p2, p1
            row.save(update_fields=['participant1_id', 'participant2_id'])
        else:
            # Dublikat: to'g'ri tartibdagi satr allaqachon bor, buni o'chiramiz.
            # Xabarlar ChatConversation'ga bog'lanmagan (DirectMessage
            # sender/recipient orqali ishlaydi), shuning uchun ma'lumot
            # yo'qolmaydi.
            row.delete()


def noop(apps, schema_editor):
    """Teskari yo'nalish: hech narsa qilinmaydi (ma'lumot yo'qotilmaydi)."""


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0002_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ------------------------------------------------ DirectMessage maydonlari
        migrations.AddField(
            model_name='directmessage',
            name='client_id',
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name='directmessage',
            name='reply_to',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='replies',
                to='chat.directmessage',
            ),
        ),
        migrations.AddField(
            model_name='directmessage',
            name='delivered_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='directmessage',
            name='is_edited',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='directmessage',
            name='edited_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='directmessage',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='directmessage',
            name='deleted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),

        # ----------------------------------------------------------- Fayllar
        migrations.CreateModel(
            name='DirectMessageAttachment',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('file', models.FileField(upload_to='direct_messages/%Y/%m/')),
                ('original_name', models.CharField(blank=True, max_length=255)),
                ('mime_type', models.CharField(blank=True, max_length=120)),
                (
                    'kind',
                    models.CharField(
                        choices=[
                            ('IMAGE', 'Rasm'),
                            ('VIDEO', 'Video'),
                            ('AUDIO', 'Audio'),
                            ('VOICE', 'Ovozli xabar'),
                            ('FILE', 'Fayl'),
                        ],
                        default='FILE',
                        max_length=10,
                    ),
                ),
                ('size', models.BigIntegerField(default=0)),
                ('width', models.PositiveIntegerField(blank=True, null=True)),
                ('height', models.PositiveIntegerField(blank=True, null=True)),
                ('duration_ms', models.PositiveIntegerField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'message',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='attachments',
                        to='chat.directmessage',
                    ),
                ),
                (
                    'uploaded_by',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='chat_attachments',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'ordering': ['id'],
            },
        ),
        migrations.AddIndex(
            model_name='directmessageattachment',
            index=models.Index(fields=['message'], name='chat_dma_message_idx'),
        ),
        migrations.AddIndex(
            model_name='directmessageattachment',
            index=models.Index(
                fields=['uploaded_by', 'message'], name='chat_dma_owner_msg_idx'
            ),
        ),

        # -------------------------------------- Kursor sahifalash va idempotentlik
        migrations.AddIndex(
            model_name='directmessage',
            index=models.Index(
                fields=['sender', 'recipient', '-id'], name='chat_dm_pair_id_idx'
            ),
        ),
        migrations.AddConstraint(
            model_name='directmessage',
            constraint=models.UniqueConstraint(
                condition=Q(client_id__isnull=False),
                fields=('sender', 'client_id'),
                name='chat_dm_sender_client_id_uniq',
            ),
        ),

        # --------------------------------- Suhbat participant tartibi cheklovi
        migrations.RunPython(normalize_conversations, noop),
        migrations.AddConstraint(
            model_name='chatconversation',
            constraint=models.CheckConstraint(
                condition=Q(participant1__lt=F('participant2')),
                name='chat_conversation_participant_order',
            ),
        ),
    ]
