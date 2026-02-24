"""
OneID ma'lumotlarini sinxronizatsiya qilish uchun management command.

Usage:
    python manage.py sync_oneid_data [--pnfl PNFL] [--force]
"""

import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from oneid.services import oneid_service
from oneid.models import OneIDToken
from users.models import User

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'OneID dan foydalanuvchi ma\'lumotlarini sinxronizatsiya qilish'

    def add_arguments(self, parser):
        parser.add_argument(
            '--pnfl',
            type=str,
            help='Faqat berilgan PNFL li foydalanuvchini sinxronizatsiya qilish'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Majburiy sinxronizatsiya qilish (token muddati o\'tgan bo\'lsa ham)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Sinxronizatsiya qilmasdan, faqat tekshirish'
        )

    def handle(self, *args, **options):
        pnfl = options.get('pnfl')
        force = options.get('force', False)
        dry_run = options.get('dry_run', False)

        self.stdout.write(
            self.style.SUCCESS('OneID ma\'lumotlarini sinxronizatsiya qilish boshlandi...')
        )

        try:
            if pnfl:
                # Faqat bitta foydalanuvchi
                self.sync_user(pnfl, force, dry_run)
            else:
                # Barcha foydalanuvchilar
                self.sync_all_users(force, dry_run)

            self.stdout.write(
                self.style.SUCCESS('Sinxronizatsiya muvaffaqiyatli yakunlandi!')
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Sinxronizatsiya xatolik: {e}')
            )
            logger.error(f'OneID sinxronizatsiya xatolik: {e}', exc_info=True)

    def sync_user(self, pnfl, force, dry_run):
        """Bitta foydalanuvchini sinxronizatsiya qilish."""
        try:
            user = User.objects.get(pnfl=pnfl)
            oneid_token = OneIDToken.objects.filter(user=user).first()

            if not oneid_token:
                self.stdout.write(
                    self.style.WARNING(f'Foydalanuvchi {pnfl} uchun OneID token topilmadi')
                )
                return

            # Token muddatini tekshirish
            if not force and oneid_token.is_expired():
                self.stdout.write(
                    self.style.WARNING(f'Foydalanuvchi {pnfl} uchun token muddati o\'tgan')
                )
                return

            if dry_run:
                self.stdout.write(
                    self.style.SUCCESS(f'DRY RUN: {pnfl} - ma\'lumotlar sinxronizatsiya qilinadi')
                )
                return

            # OneID dan ma'lumotlarni olish
            user_info = oneid_service.get_user_info(oneid_token.access_token)
            
            # Ma'lumotlarni solishtirish
            changed = oneid_service.sync_user_data(user, user_info)
            
            if changed:
                self.stdout.write(
                    self.style.SUCCESS(f'{pnfl} - ma\'lumotlar yangilandi')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(f'{pnfl} - ma\'lumotlar yangilanmadi (o\'zgarish yo\'q)')
                )

        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Foydalanuvchi topilmadi: {pnfl}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'{pnfl} sinxronizatsiya xatolik: {e}')
            )
            logger.error(f'User {pnfl} sync error: {e}', exc_info=True)

    def sync_all_users(self, force, dry_run):
        """Barcha foydalanuvchilarni sinxronizatsiya qilish."""
        queryset = OneIDToken.objects.select_related('user').filter(is_active=True)
        
        if not force:
            queryset = queryset.exclude(
                expires_at__isnull=True
            ).filter(
                expires_at__gte=timezone.now()
            )

        total = queryset.count()
        if total == 0:
            self.stdout.write(
                self.style.WARNING('Sinxronizatsiya uchun foydalanuvchilar topilmadi')
            )
            return

        self.stdout.write(f'Jami {total} ta foydalanuvchi sinxronizatsiya qilinadi...')

        success_count = 0
        error_count = 0

        with transaction.atomic():
            for i, oneid_token in enumerate(queryset, 1):
                try:
                    if dry_run:
                        self.stdout.write(
                            f'DRY RUN [{i}/{total}]: {oneid_token.user.pnfl} - ma\'lumotlar sinxronizatsiya qilinadi'
                        )
                        success_count += 1
                        continue

                    # OneID dan ma'lumotlarni olish
                    user_info = oneid_service.get_user_info(oneid_token.access_token)
                    
                    # Ma'lumotlarni sinxronizatsiya qilish
                    changed = oneid_service.sync_user_data(oneid_token.user, user_info)
                    
                    if changed:
                        self.stdout.write(
                            self.style.SUCCESS(f'[{i}/{total}] {oneid_token.user.pnfl} - yangilandi')
                        )
                    else:
                        self.stdout.write(
                            f'[{i}/{total}] {oneid_token.user.pnfl} - o\'zgarish yo\'q'
                        )
                    
                    success_count += 1

                except Exception as e:
                    error_count += 1
                    self.stdout.write(
                        self.style.ERROR(f'[{i}/{total}] {oneid_token.user.pnfl} - xatolik: {e}')
                    )
                    logger.error(f'User {oneid_token.user.pnfl} sync error: {e}', exc_info=True)

        # Natijani chiqarish
        self.stdout.write('\n' + '='*50)
        self.stdout.write(f'Sinxronizatsiya natijalari:')
        self.stdout.write(f'  Jami: {total}')
        self.stdout.write(f'  Muvaffaqiyat: {success_count}')
        self.stdout.write(f'  Xatolik: {error_count}')
        self.stdout.write('='*50)
