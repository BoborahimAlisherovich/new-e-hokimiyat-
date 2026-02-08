from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from telegram_bot.models import BotRegion
from telegram_bot.region_sync import build_region_fields, load_map_region_names


class Command(BaseCommand):
    help = "Sync BotRegion list from the analytics village map"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file",
            dest="file",
            default="",
            help="Path to kharita.html (defaults to app/dashboard/analytics/kharita.html)",
        )
        parser.add_argument(
            "--deactivate-missing",
            action="store_true",
            help="Deactivate regions that are not present in the map",
        )

    def handle(self, *args, **options):
        map_path = Path(options["file"]) if options["file"] else None
        if map_path and not map_path.exists():
            raise CommandError(f"Map file not found: {map_path}")

        names = load_map_region_names(map_path)
        if not names:
            raise CommandError("No regions found in the map file.")

        updated_codes: list[str] = []
        created_count = 0
        updated_count = 0

        for index, raw_name in enumerate(names, 1):
            defaults = build_region_fields(raw_name, order=index)
            obj, created = BotRegion.objects.update_or_create(
                code=defaults["code"],
                defaults=defaults,
            )
            updated_codes.append(obj.code)
            if created:
                created_count += 1
            else:
                updated_count += 1

        deactivated_count = 0
        if options["deactivate_missing"]:
            deactivated_count = BotRegion.objects.exclude(code__in=updated_codes).update(is_active=False)

        self.stdout.write(
            self.style.SUCCESS(
                "Hududlar sinxronlandi: "
                f"{created_count} ta yangi, {updated_count} ta yangilandi"
                + (f", {deactivated_count} ta faol emas" if options["deactivate_missing"] else "")
            )
        )
