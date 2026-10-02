from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from organizations.models import Organization
from tasks.models import Task
from telegram_bot.models import AppealCategory, AppealType, TelegramAppeal, TelegramUser
from telegram_bot.views import TelegramAppealViewSet


class TelegramAppealVisibilityTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user_model = get_user_model()

        self.organization = Organization.objects.create(name="Test Organization", is_active=True)
        self.org_leader = self.user_model.objects.create_user(
            login="rahbar1",
            pnfl="12345678901234",
            password="pass",
            first_name="Rahbar",
            last_name="Test",
            role="TASHKILOT_RAHBARI",
            organization=self.organization,
        )

        self.telegram_user = TelegramUser.objects.create(
            telegram_id=1001,
            first_name="Fuqaro",
            last_name="Test",
            gender="male",
            phone="+998901112233",
            region=None,
            is_registered=True,
        )

    def _get_queryset_for(self, user):
        """ViewSet queryset'ini test uchun tayyorlash.

        `force_authenticate` faqat DRF `Request` ob'ektida ishlaydi:
        xom `WSGIRequest` da `.user` atributi umuman bo'lmaydi va
        `get_queryset()` `AttributeError` bilan yiqiladi. Shuning uchun
        so'rov `initialize_request` orqali o'tkaziladi — bu DRF ning
        haqiqiy oqimi bilan bir xil.
        """
        request = self.factory.get("/api/telegram-bot/appeals/")
        force_authenticate(request, user=user)
        view = TelegramAppealViewSet()
        view.action_map = {}
        view.format_kwarg = None
        view.request = view.initialize_request(request)
        return view.get_queryset()

    def test_org_leader_sees_appeal_by_category_mapping(self):
        category = AppealCategory.objects.create(
            name_uz="Ta'lim",
            name_ru="",
            name_en="",
            code="EDU",
            icon="📚",
            is_active=True,
            order=1,
        )
        category.responsible_organizations.add(self.organization)

        appeal = TelegramAppeal.objects.create(
            telegram_user=self.telegram_user,
            category=category,
            text="Test murojaat",
            status="pending_review",
        )

        qs = self._get_queryset_for(self.org_leader)
        self.assertTrue(qs.filter(id=appeal.id).exists())

    def test_org_leader_does_not_see_unmapped_unassigned_appeal(self):
        category = AppealCategory.objects.create(
            name_uz="Sog'liq",
            name_ru="",
            name_en="",
            code="HEALTH",
            icon="🏥",
            is_active=True,
            order=2,
        )
        appeal = TelegramAppeal.objects.create(
            telegram_user=self.telegram_user,
            category=category,
            text="Unmapped murojaat",
            status="pending_review",
        )

        qs = self._get_queryset_for(self.org_leader)
        self.assertFalse(qs.filter(id=appeal.id).exists())


class ManualAppealCreateTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user_model = get_user_model()
        self.admin = self.user_model.objects.create_user(
            login="admin1",
            pnfl="12345678901235",
            password="pass",
            first_name="Admin",
            last_name="Test",
            role="ADMIN",
        )
        self.category = AppealCategory.objects.create(
            name_uz="Kommunal",
            name_ru="",
            name_en="",
            code="KOMMUNAL",
            icon="🏠",
            is_active=True,
            order=1,
        )
        self.appeal_type = AppealType.objects.create(
            name_uz="Shikoyat",
            name_ru="",
            name_en="",
            code="COMPLAINT",
            icon="📝",
            is_active=True,
            order=1,
        )

    def test_manual_create_saves_appeal_even_without_responsible_organizations(self):
        view = TelegramAppealViewSet.as_view({'post': 'manual_create'})
        payload = {
            'citizen_name': 'Ali Valiyev',
            'citizen_phone': '+998901234567',
            'items': [{
                'text': 'Mahalladagi yo\'l ta\'mirtalab.',
                'appeal_type_id': self.appeal_type.id,
                'category_id': self.category.id,
                'priority': 'medium',
            }]
        }

        request = self.factory.post('/api/telegram-bot/appeals/manual-create/', payload, format='json')
        force_authenticate(request, user=self.admin)
        response = view(request)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(TelegramAppeal.objects.count(), 1)
        self.assertEqual(Task.objects.count(), 0)
        self.assertEqual(len(response.data.get('warnings', [])), 1)
        self.assertIn("topshiriq yaratilmadi", response.data['warnings'][0])
