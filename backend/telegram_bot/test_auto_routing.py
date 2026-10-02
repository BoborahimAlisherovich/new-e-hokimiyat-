"""
Yangi xatti-harakatlar uchun testlar:

  · murojaatni AI tahlili asosida avtomatik tashkilotga biriktirish
    (kamida 7 kun muddat bilan);
  · media faylni bazaga ko'chirmasdan, imzolangan havola orqali
    saytda ochish;
  · fuqaroga ketadigan javobda muallif imzosi;
  · yuklanadigan fayl chegaralari (40 MB, APK taqiqlangan).
"""

from __future__ import annotations

import io
import zipfile
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers as drf_serializers

from core.file_validators import MAX_FILE_SIZE, validate_upload
from organizations.models import Organization, Sector
from tasks.models import Task
from telegram_bot.auto_assign import auto_assign_appeal, resolve_task_creator
from telegram_bot.authorship import author_display, build_signature, sign_for_citizen
from telegram_bot.media import (
    build_attachment_url,
    save_appeal_attachment,
    sign_attachment_id,
    verify_attachment_signature,
)
from telegram_bot.models import (
    AppealAttachment,
    AppealCategory,
    TelegramAppeal,
    TelegramUser,
)
from telegram_bot.task_routing import MIN_AUTO_TASK_DAYS


class _UploadedStub(io.BytesIO):
    """Yuklangan faylning eng kichik taqlidi."""

    def __init__(self, name: str, data: bytes, content_type: str = ''):
        super().__init__(data)
        self.name = name
        self.size = len(data)
        self.content_type = content_type


def _make_docx(entries: dict) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w') as archive:
        for path, payload in entries.items():
            archive.writestr(path, payload)
    return buffer.getvalue()


# =============================================================================
# AVTOMATIK BIRIKTIRISH
# =============================================================================

class AutoAssignAppealTests(TestCase):
    def setUp(self):
        self.user_model = get_user_model()

        self.sector = Sector.objects.create(name="Ta'lim", is_active=True)
        self.organization = Organization.objects.create(
            name="Xatirchi tuman xalq ta'limi bo'limi",
            sector=self.sector,
            is_active=True,
        )
        self.hokim = self.user_model.objects.create_user(
            login='hokim',
            pnfl='11111111111111',
            password='pass',
            first_name='Bahodir',
            last_name='Rahimov',
            role='HOKIM',
            status='FAOL',
        )
        self.category = AppealCategory.objects.create(
            name_uz="Ta'lim", code='EDU', is_active=True, order=1,
        )
        self.telegram_user = TelegramUser.objects.create(
            telegram_id=2001,
            first_name='Dilnoza',
            last_name='Qodirova',
            gender='female',
            phone='+998901112233',
            is_registered=True,
        )

    def _appeal(self, **overrides):
        defaults = dict(
            telegram_user=self.telegram_user,
            category=self.category,
            text="Maktabimizda isitish tizimi ishlamayapti, bolalar sovuqda o'qiyapti.",
            status='pending_review',
            priority='medium',
        )
        defaults.update(overrides)
        return TelegramAppeal.objects.create(**defaults)

    def test_creates_task_for_responsible_organization(self):
        # Arrange
        self.category.responsible_organizations.add(self.organization)
        appeal = self._appeal()

        # Act
        task = auto_assign_appeal(appeal, {'analysis': 'Isitish tizimi nosoz'})

        # Assert
        self.assertIsNotNone(task)
        self.assertEqual(task.source, 'AI')
        self.assertEqual(
            list(task.assigned_organizations.values_list('organization_id', flat=True)),
            [self.organization.id],
        )
        appeal.refresh_from_db()
        self.assertEqual(appeal.status, 'forwarded')
        self.assertEqual(appeal.site_task_id, str(task.id))

    def test_deadline_is_never_shorter_than_seven_days(self):
        self.category.responsible_organizations.add(self.organization)

        for priority in ('urgent', 'high', 'medium', 'low'):
            with self.subTest(priority=priority):
                appeal = self._appeal(ai_priority=priority, priority=priority)
                task = auto_assign_appeal(appeal, None)

                self.assertIsNotNone(task, f'{priority} uchun topshiriq yaratilmadi')
                earliest_allowed = timezone.now() + timedelta(days=MIN_AUTO_TASK_DAYS)
                # Bir daqiqalik zaxira — test bajarilish vaqti uchun.
                self.assertGreaterEqual(
                    task.deadline, earliest_allowed - timedelta(minutes=1),
                    f"{priority}: muddat {MIN_AUTO_TASK_DAYS} kundan qisqa",
                )

    def test_falls_back_to_sector_when_category_has_no_organizations(self):
        # Soha jadvali bo'sh, lekin soha nomi tashkilot sohasiga mos.
        appeal = self._appeal()

        task = auto_assign_appeal(appeal, None)

        self.assertIsNotNone(task)
        self.assertEqual(
            list(task.assigned_organizations.values_list('organization_id', flat=True)),
            [self.organization.id],
        )

    def test_returns_none_when_no_organization_matches(self):
        orphan_category = AppealCategory.objects.create(
            name_uz='Arxeologiya', code='ARCH', is_active=True, order=9,
        )
        appeal = self._appeal(category=orphan_category)

        task = auto_assign_appeal(appeal, None)

        self.assertIsNone(task)
        appeal.refresh_from_db()
        self.assertEqual(appeal.status, 'pending_review')
        self.assertFalse(appeal.forwarded_to_site)
        self.assertEqual(Task.objects.count(), 0)

    def test_does_not_assign_rejected_appeal(self):
        self.category.responsible_organizations.add(self.organization)
        appeal = self._appeal(status='rejected', ai_is_valid=False)

        self.assertIsNone(auto_assign_appeal(appeal, None))
        self.assertEqual(Task.objects.count(), 0)

    def test_does_not_assign_twice(self):
        self.category.responsible_organizations.add(self.organization)
        appeal = self._appeal()

        first = auto_assign_appeal(appeal, None)
        second = auto_assign_appeal(appeal, None)

        self.assertIsNotNone(first)
        self.assertIsNone(second)
        self.assertEqual(Task.objects.count(), 1)

    def test_no_task_when_no_active_creator_exists(self):
        # Soxta "tizim" hisobi ochilmasligi kerak.
        self.user_model.objects.all().update(status='ARXIV')
        self.category.responsible_organizations.add(self.organization)
        appeal = self._appeal()

        self.assertIsNone(resolve_task_creator())
        self.assertIsNone(auto_assign_appeal(appeal, None))
        self.assertEqual(Task.objects.count(), 0)


# =============================================================================
# MEDIA HAVOLASI
# =============================================================================

class AttachmentSignedUrlTests(TestCase):
    def setUp(self):
        self.telegram_user = TelegramUser.objects.create(
            telegram_id=3001,
            first_name='Sardor',
            last_name='Aliyev',
            gender='male',
            phone='+998901112244',
            is_registered=True,
        )
        self.appeal = TelegramAppeal.objects.create(
            telegram_user=self.telegram_user,
            text='Yo\'l buzilgan',
            status='pending_review',
        )
        self.attachment = AppealAttachment.objects.create(
            appeal=self.appeal,
            file_type='photo',
            telegram_file_id='AgACAgIAAxkBAAitest',
            file_name='yol.jpg',
            file_size=145_000,
        )

    def test_attachment_is_stored_by_reference_not_bytes(self):
        """Fayl maydoni bo'sh — baytlar Telegram serverida qoladi."""
        self.assertFalse(self.attachment.file)
        self.assertTrue(self.attachment.telegram_file_id)

    def test_save_appeal_attachment_downloads_nothing(self):
        """Bot ilovani havola bilan saqlaydi, baytlarni ko'chirmaydi.

        Bu talabning o'zagi: media diskda emas, Telegram serverida
        qoladi. Agar kimdir yuklab olishni qaytarib qo'ysa, shu test
        yiqiladi.
        """
        created = save_appeal_attachment(
            self.appeal,
            file_id='BAACAgIAAxkBAAitest2',
            file_type='video',
            file_size=18_000_000,
        )

        self.assertIsNotNone(created)
        self.assertFalse(created.file, 'Fayl diskka yozilgan — havola saqlanishi kerak edi')
        self.assertEqual(created.telegram_file_id, 'BAACAgIAAxkBAAitest2')
        self.assertEqual(created.file_size, 18_000_000)
        # Nom Telegram'dan so'ralmaydi — tur bo'yicha quriladi
        self.assertTrue(created.file_name.endswith('.mp4'), created.file_name)

    def test_save_appeal_attachment_rejects_empty_file_id(self):
        self.assertIsNone(
            save_appeal_attachment(self.appeal, file_id='', file_type='photo')
        )

    def test_signature_round_trip(self):
        signature = sign_attachment_id(self.attachment.pk)
        self.assertTrue(verify_attachment_signature(self.attachment.pk, signature))

    def test_signature_is_bound_to_one_attachment(self):
        other = AppealAttachment.objects.create(
            appeal=self.appeal, file_type='photo', telegram_file_id='boshqa',
        )
        signature = sign_attachment_id(self.attachment.pk)
        self.assertFalse(verify_attachment_signature(other.pk, signature))

    def test_invalid_signature_is_rejected(self):
        self.assertFalse(verify_attachment_signature(self.attachment.pk, 'soxta-imzo'))
        self.assertFalse(verify_attachment_signature(self.attachment.pk, ''))

    def test_url_points_at_site_proxy(self):
        url = build_attachment_url(self.attachment)
        # Manzil ROUYXATDAN OLINADI: qo'lda yozilgan prefiks bir marta
        # allaqachon xato bo'lgan (`/api/telegram/` vs `/api/telegram-bot/`).
        expected = reverse('appeal-attachment-file', kwargs={'pk': self.attachment.pk})
        self.assertTrue(url.startswith(expected), f'{url} != {expected}')
        self.assertIn('sig=', url)
        self.assertNotIn('api.telegram.org', url)

    def test_signed_url_reaches_the_view(self):
        """Imzolangan havola marshrutga yetib borishi kerak.

        Bot tokeni testda sozlanmagan, shuning uchun fayl topilmaydi va
        404 qaytadi — lekin bu marshrut YO'Q degani emas. Marshrut
        mavjudligini `resolve()` bilan alohida tasdiqlaymiz.
        """
        from django.urls import resolve

        path = reverse('appeal-attachment-file', kwargs={'pk': self.attachment.pk})
        match = resolve(path)
        self.assertEqual(match.url_name, 'appeal-attachment-file')

    def test_endpoint_refuses_unsigned_anonymous_request(self):
        path = reverse('appeal-attachment-file', kwargs={'pk': self.attachment.pk})
        self.assertEqual(self.client.get(path).status_code, 404)

    def test_endpoint_refuses_wrong_signature(self):
        path = reverse('appeal-attachment-file', kwargs={'pk': self.attachment.pk})
        self.assertEqual(self.client.get(f'{path}?sig=soxta').status_code, 404)


# =============================================================================
# JAVOB MUALLIFI
# =============================================================================

class AuthorSignatureTests(TestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.telegram_user = TelegramUser.objects.create(
            telegram_id=4001,
            first_name='Nodira',
            last_name='Yusupova',
            gender='female',
            phone='+998901112255',
            language='uz',
            is_registered=True,
        )
        self.appeal = TelegramAppeal.objects.create(
            telegram_user=self.telegram_user, text='Savol bor', status='pending_review',
        )

    def test_signature_contains_name_and_position(self):
        user = self.user_model.objects.create_user(
            login='masul', pnfl='22222222222222', password='pass',
            first_name='Jasur', last_name='Ergashev',
            role='HOKIMLIK_MASUL', status='FAOL', position='Bosh mutaxassis',
        )

        signature = build_signature(user, 'uz')

        self.assertIn('Ergashev', signature)
        self.assertIn('Jasur', signature)
        self.assertIn('Bosh mutaxassis', signature)
        self.assertIn('Javob berdi', signature)

    def test_position_falls_back_to_role_name(self):
        user = self.user_model.objects.create_user(
            login='rahbar', pnfl='33333333333333', password='pass',
            first_name='Olim', last_name='Karimov',
            role='HOKIM', status='FAOL',
        )
        self.assertIn('Hokim', author_display(user))

    def test_no_signature_when_author_unknown(self):
        self.assertEqual(build_signature(None, 'uz'), '')
        self.assertEqual(sign_for_citizen('Matn', None, self.appeal), 'Matn')

    def test_signature_language_follows_citizen(self):
        user = self.user_model.objects.create_user(
            login='ruuser', pnfl='44444444444444', password='pass',
            first_name='Anvar', last_name='Salimov',
            role='HOKIMLIK_MASUL', status='FAOL', position='Mutaxassis',
        )
        self.telegram_user.language = 'ru'
        self.telegram_user.save(update_fields=['language'])
        self.appeal.refresh_from_db()

        signed = sign_for_citizen('Ответ', user, self.appeal)

        self.assertIn('Ответил(а)', signed)
        self.assertTrue(signed.startswith('Ответ'))


# =============================================================================
# FAYL CHEGARALARI
# =============================================================================

class UploadLimitTests(TestCase):
    def test_limit_is_forty_megabytes(self):
        self.assertEqual(MAX_FILE_SIZE, 40 * 1024 * 1024)

    def test_file_just_under_limit_is_accepted(self):
        payload = b'%PDF-1.4' + b'\0' * (39 * 1024 * 1024)
        self.assertEqual(validate_upload(_UploadedStub('hisobot.pdf', payload)), 'DOCUMENT')

    def test_file_over_limit_is_rejected(self):
        payload = b'%PDF-1.4' + b'\0' * (41 * 1024 * 1024)
        with self.assertRaises(drf_serializers.ValidationError) as ctx:
            validate_upload(_UploadedStub('katta.pdf', payload))
        self.assertIn('40 MB', str(ctx.exception.detail[0]))

    def test_apk_extension_is_blocked(self):
        with self.assertRaises(drf_serializers.ValidationError):
            validate_upload(_UploadedStub('ilova.apk', b'PK\x03\x04' + b'x' * 40))

    def test_apk_renamed_to_docx_is_blocked(self):
        payload = _make_docx({
            'AndroidManifest.xml': 'x' * 200,
            'classes.dex': 'y' * 200,
        })
        with self.assertRaises(drf_serializers.ValidationError) as ctx:
            validate_upload(_UploadedStub('hisobot.docx', payload))
        self.assertIn('APK', str(ctx.exception.detail[0]))

    def test_real_docx_is_accepted(self):
        payload = _make_docx({
            '[Content_Types].xml': '<Types/>',
            'word/document.xml': '<w:document/>',
        })
        self.assertEqual(validate_upload(_UploadedStub('hisobot.docx', payload)), 'DOCUMENT')
