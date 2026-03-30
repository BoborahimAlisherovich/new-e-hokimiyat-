from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from organizations.models import Organization
from telegram_bot.models import AppealCategory, TelegramAppeal, TelegramUser
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
        request = self.factory.get("/api/telegram-bot/appeals/")
        force_authenticate(request, user=user)
        view = TelegramAppealViewSet()
        view.request = request
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
