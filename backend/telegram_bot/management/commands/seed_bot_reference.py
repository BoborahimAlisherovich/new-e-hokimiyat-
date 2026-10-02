"""
MUROJAAT MA'LUMOTNOMALARINI TO'LDIRISH
======================================

Muammo: `/api/telegram-bot/types/` va `/api/telegram-bot/categories/`
bo'sh ro'yxat qaytarardi, shuning uchun murojaatni qo'lda kiritish
sahifasida «Murojaat turi» va «Soha» ro'yxatlari ochilardi-yu, ichida
hech narsa bo'lmasdi.

Ishlatish:
    python manage.py seed_bot_reference

MUHIM — NIMA QO'SHILMAYDI
-------------------------
HUDUDLAR (qishloq va mahalla nomlari) bu buyruq bilan QO'SHILMAYDI.
Ular Xatirchi tumanining haqiqiy joy nomlari; ularni o'ylab chiqarish
mumkin emas — bu davlat tizimi va noto'g'ri nom bilan kelgan murojaat
noto'g'ri hududga biriktiriladi. Hududlarni «Telegram bot → Hududlar»
sahifasidan qo'lda kiriting.

SOHALAR QAYERDAN OLINADI
------------------------
O'ylab topilmaydi: bazada allaqachon mavjud `organizations.Sector`
yozuvlaridan ko'chiriladi. Ya'ni murojaat sohalari tashkilot sohalari
bilan bir xil bo'ladi va ikkalasi bir-biridan ajralib ketmaydi.
Sohalar ham bo'lmasa, buyruq buni aytadi va hech narsa yaratmaydi.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify


# Murojaat turlari — TZ ning 5.13-bandida aynan shu to'rttasi ko'rsatilgan.
APPEAL_TYPES = [
    {'code': 'SHIKOYAT', 'name_uz': 'Shikoyat', 'name_ru': 'Жалоба', 'name_en': 'Complaint', 'icon': '⚠️', 'order': 1},
    {'code': 'TAKLIF', 'name_uz': 'Taklif', 'name_ru': 'Предложение', 'name_en': 'Suggestion', 'icon': '💡', 'order': 2},
    {'code': 'SAVOL', 'name_uz': 'Savol', 'name_ru': 'Вопрос', 'name_en': 'Question', 'icon': '❓', 'order': 3},
    {'code': 'MINNATDORCHILIK', 'name_uz': 'Minnatdorchilik', 'name_ru': 'Благодарность', 'name_en': 'Gratitude', 'icon': '🙏', 'order': 4},
]


class Command(BaseCommand):
    help = "Murojaat turlari va sohalarini to'ldiradi (hududlar qo'lda kiritiladi)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help="Mavjud yozuvlarning nomlarini ham yangilaydi",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from organizations.models import Sector
        from telegram_bot.models import AppealCategory, AppealType

        force = options['force']

        # ------------------------------------------------------ TURLAR
        created_types = 0
        for row in APPEAL_TYPES:
            obj, created = AppealType.objects.get_or_create(
                code=row['code'],
                defaults={k: v for k, v in row.items() if k != 'code'},
            )
            if created:
                created_types += 1
            elif force:
                for key, value in row.items():
                    setattr(obj, key, value)
                obj.save()

        self.stdout.write(self.style.SUCCESS(
            f"Murojaat turlari: {created_types} ta yangi, jami {AppealType.objects.count()} ta"
        ))

        # ------------------------------------------------------ SOHALAR
        sectors = list(Sector.objects.filter(is_active=True).order_by('name'))
        if not sectors:
            self.stdout.write(self.style.WARNING(
                "Sohalar yaratilmadi: bazada birorta faol `organizations.Sector` yo'q.\n"
                "Avval sohalarni kiriting (Sozlamalar -> Sohalar), keyin shu buyruqni qayta ishga tushiring."
            ))
        else:
            created_categories = 0
            for index, sector in enumerate(sectors, start=1):
                code = (getattr(sector, 'code', '') or slugify(sector.name) or f'soha-{index}')
                code = str(code)[:50].upper().replace('-', '_')
                obj, created = AppealCategory.objects.get_or_create(
                    code=code,
                    defaults={
                        'name_uz': sector.name,
                        'name_ru': getattr(sector, 'name_ru', '') or '',
                        'name_en': getattr(sector, 'name_en', '') or '',
                        'order': index,
                    },
                )
                if created:
                    created_categories += 1
                elif force:
                    obj.name_uz = sector.name
                    obj.order = index
                    obj.save(update_fields=['name_uz', 'order'])

            self.stdout.write(self.style.SUCCESS(
                f"Murojaat sohalari: {created_categories} ta yangi, "
                f"jami {AppealCategory.objects.count()} ta ({len(sectors)} ta sohadan)"
            ))

        # ------------------------------------------------------ HUDUDLAR
        from telegram_bot.models import BotRegion

        if BotRegion.objects.exists():
            self.stdout.write(self.style.SUCCESS(
                f"Hududlar: {BotRegion.objects.count()} ta mavjud"
            ))
        else:
            self.stdout.write(self.style.WARNING(
                "HUDUDLAR BO'SH.\n"
                "Ular ataylab avtomatik to'ldirilmadi: qishloq va mahalla nomlari "
                "haqiqiy joy nomlari bo'lib, ularni taxmin qilish mumkin emas.\n"
                "«Telegram bot -> Hududlar» sahifasidan kiriting."
            ))
