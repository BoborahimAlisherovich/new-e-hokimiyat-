from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from organizations.models import Organization, Sector
from tasks.celery_tasks import check_overdue_tasks
from tasks.models import Task, TaskOrganization
from users.models import User


class TaskStatusSyncTests(TestCase):
    def _create_org(self, *, name: str) -> Organization:
        sector, _ = Sector.objects.get_or_create(name="Sector")
        return Organization.objects.create(name=name, sector=sector, is_active=True)

    def _create_user(self, *, idx: int, role: str, organization: Organization | None = None) -> User:
        return User.objects.create_user(
            login=f"user{idx}",
            password="pass12345",
            pnfl=f"{idx:014d}",
            first_name="Ism",
            last_name="Familiya",
            role=role,
            status="FAOL",
            organization=organization,
        )

    def test_sync_status_from_assignments_progress_and_complete(self) -> None:
        org = self._create_org(name="Org 1")
        hokim = self._create_user(idx=1, role="HOKIM", organization=org)

        task = Task.objects.create(
            title="T",
            description="D",
            priority="ODDIY",
            category="",
            status="YANGI",
            deadline=timezone.now() + timedelta(days=2),
            created_by=hokim,
        )
        task_org = TaskOrganization.objects.create(task=task, organization=org, status="YANGI")

        task.sync_status_from_assignments()
        task.refresh_from_db()
        self.assertEqual(task.status, "YANGI")

        task_org.status = "IJRODA"
        task_org.save(update_fields=["status", "updated_at"])
        task.sync_status_from_assignments()
        task.refresh_from_db()
        self.assertEqual(task.status, "IJRODA")

        task_org.status = "BAJARILDI"
        task_org.save(update_fields=["status", "updated_at"])
        task.sync_status_from_assignments()
        task.refresh_from_db()
        self.assertEqual(task.status, "BAJARILDI")
        self.assertFalse(task.is_overdue)

    def test_sync_status_from_assignments_partial_completion_is_ijroda(self) -> None:
        org1 = self._create_org(name="Org 1")
        org2 = Organization.objects.create(name="Org 2", sector=org1.sector, is_active=True)
        hokim = self._create_user(idx=2, role="HOKIM", organization=org1)

        task = Task.objects.create(
            title="T",
            description="D",
            priority="ODDIY",
            category="",
            status="YANGI",
            deadline=timezone.now() + timedelta(days=2),
            created_by=hokim,
        )

        TaskOrganization.objects.create(task=task, organization=org1, status="BAJARILDI")
        TaskOrganization.objects.create(task=task, organization=org2, status="YANGI")

        task.sync_status_from_assignments()
        task.refresh_from_db()
        self.assertEqual(task.status, "IJRODA")

    def test_check_overdue_tasks_marks_yangi_as_muddati_kech(self) -> None:
        org = self._create_org(name="Org 1")
        hokim = self._create_user(idx=3, role="HOKIM", organization=org)

        task = Task.objects.create(
            title="T",
            description="D",
            priority="ODDIY",
            category="",
            status="YANGI",
            deadline=timezone.now() - timedelta(hours=1),
            created_by=hokim,
        )
        task_org = TaskOrganization.objects.create(task=task, organization=org, status="YANGI")

        check_overdue_tasks()

        task_org.refresh_from_db()
        task.refresh_from_db()
        self.assertEqual(task_org.status, "MUDDATI_KECH")
        self.assertEqual(task.status, "MUDDATI_KECH")
