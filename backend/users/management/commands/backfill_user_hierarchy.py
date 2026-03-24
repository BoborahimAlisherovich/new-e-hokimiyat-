from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from organizations.models import Sector
from users.models import User, UserAssignment


class Command(BaseCommand):
    help = "Backfill eski foydalanuvchilar uchun sector va supervisor maydonlarini to'ldiradi"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="O'zgarishlarni saqlamaydi, faqat natijani ko'rsatadi",
        )
        parser.add_argument(
            "--login",
            type=str,
            help="Faqat bitta login bo'yicha backfill qilish",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        login = options.get("login")

        queryset = User.objects.select_related(
            "organization",
            "organization__sector",
            "sector",
            "supervisor",
            "supervisor__sector",
        ).order_by("created_at")

        if login:
            queryset = queryset.filter(login=login)

        stats = defaultdict(int)
        unresolved = []

        context_manager = transaction.atomic()
        with context_manager:
            for user in queryset:
                changed_fields = self._backfill_user(user, unresolved)
                if changed_fields:
                    stats["updated_users"] += 1
                    stats["updated_fields"] += len(changed_fields)
                    if not dry_run:
                        user.save(update_fields=changed_fields)
                else:
                    stats["skipped_users"] += 1

            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS("Backfill yakunlandi."))
        self.stdout.write(f"Updated users: {stats['updated_users']}")
        self.stdout.write(f"Updated fields: {stats['updated_fields']}")
        self.stdout.write(f"Skipped users: {stats['skipped_users']}")

        if unresolved:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Qo'lda tekshiruv talab qiladigan foydalanuvchilar:"))
            for item in unresolved:
                self.stdout.write(f"  - {item}")

        if dry_run:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Dry-run rejimida ishladi, o'zgarishlar saqlanmadi."))

    def _backfill_user(self, user, unresolved):
        changed_fields = []

        inferred_sector = self._infer_sector(user)
        if inferred_sector and user.sector_id != inferred_sector.id:
            user.sector = inferred_sector
            changed_fields.append("sector")

        if user.role == "HOKIMLIK_MASUL":
            supervisor, issue = self._infer_supervisor(user)
            if supervisor and user.supervisor_id != supervisor.id:
                user.supervisor = supervisor
                changed_fields.append("supervisor")
                if user.sector_id != supervisor.sector_id and supervisor.sector_id:
                    user.sector = supervisor.sector
                    if "sector" not in changed_fields:
                        changed_fields.append("sector")
            elif issue:
                unresolved.append(f"{user.login} ({user.full_name}) -> {issue}")

        return changed_fields

    def _infer_sector(self, user):
        if user.role in ["TASHKILOT_RAHBARI", "TASHKILOT_MASUL"]:
            if user.organization and user.organization.sector_id:
                return user.organization.sector

        if user.sector_id:
            return user.sector

        if user.supervisor and user.supervisor.sector_id:
            return user.supervisor.sector

        latest_assignment = (
            UserAssignment.objects.select_related("assigned_by", "assigned_by__sector")
            .filter(assigned_user=user)
            .order_by("-created_at")
            .first()
        )
        if latest_assignment and latest_assignment.assigned_by and latest_assignment.assigned_by.sector_id:
            return latest_assignment.assigned_by.sector

        if user.organization and user.organization.sector_id:
            return user.organization.sector

        if user.role == "HOKIM_YORDAMCHISI":
            sectors = list(
                Sector.objects.filter(
                    organizations__employees=user,
                    organizations__is_active=True,
                ).distinct()[:2]
            )
            if len(sectors) == 1:
                return sectors[0]

        return None

    def _infer_supervisor(self, user):
        if user.supervisor_id:
            return user.supervisor, None

        latest_assignment = (
            UserAssignment.objects.select_related("assigned_by", "assigned_by__sector")
            .filter(assigned_user=user, assigned_by__role="HOKIM_YORDAMCHISI")
            .order_by("-created_at")
            .first()
        )
        if latest_assignment and latest_assignment.assigned_by:
            return latest_assignment.assigned_by, None

        sector_id = user.sector_id
        if not sector_id and user.organization and user.organization.sector_id:
            sector_id = user.organization.sector_id

        if not sector_id:
            return None, "sector aniqlanmadi, supervisor topib bo'lmadi"

        deputies = list(
            User.objects.filter(
                role="HOKIM_YORDAMCHISI",
                status="FAOL",
                sector_id=sector_id,
            ).order_by("created_at")[:2]
        )
        if len(deputies) == 1:
            return deputies[0], None
        if len(deputies) > 1:
            return None, "bir nechta mos hokim o'rinbosari topildi"
        return None, "mos hokim o'rinbosari topilmadi"
