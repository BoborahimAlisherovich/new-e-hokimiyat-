from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Create demo users for local development (login/password)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=5,
            help='Har bir rol uchun nechta demo user yaratiladi (default: 5)'
        )

    def handle(self, *args, **options):
        User = get_user_model()

        count = int(options.get('count') or 0)
        if count < 0:
            count = 0

        demo_users = [
            {
                'login': 'admin',
                'pnfl': '12345678901234',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'ADMIN',
                'status': 'FAOL',
                'is_staff': True,
                'is_superuser': True,
                'password': 'admin123',
            },
            {
                'login': 'hokim',
                'pnfl': '30000000000001',
                'first_name': 'Hokim',
                'last_name': 'Demo',
                'role': 'HOKIM',
                'status': 'FAOL',
                'is_staff': True,
                'is_superuser': False,
                'password': 'hokim123',
            },
            {
                'login': 'masul',
                'pnfl': '30000000000002',
                'first_name': 'Masul',
                'last_name': 'Demo',
                'role': 'HOKIMLIK_MASUL',
                'status': 'FAOL',
                'is_staff': True,
                'is_superuser': False,
                'password': 'masul123',
            },
            {
                'login': 'rahbar',
                'pnfl': '30000000000003',
                'first_name': 'Rahbar',
                'last_name': 'Demo',
                'role': 'TASHKILOT_RAHBARI',
                'status': 'FAOL',
                'is_staff': True,
                'is_superuser': False,
                'password': 'rahbar123',
            },
            {
                'login': 'tashkilot-masul',
                'pnfl': '30000000000004',
                'first_name': 'Tashkilot',
                'last_name': 'Masul',
                'role': 'TASHKILOT_MASUL',
                'status': 'FAOL',
                'is_staff': True,
                'is_superuser': False,
                'password': 'tash123',
            },
        ]

        # Extra demo users (bulk) - unique PNFL, role distribution
        # PNFL format: 30000000000XYZ where XYZ is sequence
        role_templates = [
            ('HOKIM', 'hokim', 'Hokim', 'Demo', 'hokim123'),
            ('HOKIMLIK_MASUL', 'masul', 'Masul', 'Demo', 'masul123'),
            ('TASHKILOT_RAHBARI', 'rahbar', 'Rahbar', 'Demo', 'rahbar123'),
            ('TASHKILOT_MASUL', 'tash-masul', 'Tashkilot', 'Masul', 'tash123'),
        ]

        seq = 10
        for role, login_prefix, first_name, last_name, password in role_templates:
            for _ in range(count):
                current_seq = seq
                pnfl = f"30000000000{current_seq:03d}"  # 14 digits
                seq += 1
                demo_users.append(
                    {
                        'login': f"{login_prefix}{current_seq}",
                        'pnfl': pnfl,
                        'first_name': first_name,
                        'last_name': last_name,
                        'role': role,
                        'status': 'FAOL',
                        'is_staff': True,
                        'is_superuser': False,
                        'password': password,
                    }
                )

        created = 0
        updated = 0

        for data in demo_users:
            password = data.pop('password')
            pnfl = data['pnfl']

            user, is_created = User.objects.get_or_create(
                pnfl=pnfl,
                defaults=data,
            )

            # Ensure required fields are up to date
            changed = False
            for k, v in data.items():
                if getattr(user, k, None) != v:
                    setattr(user, k, v)
                    changed = True

            # Always set password (idempotent)
            user.set_password(password)
            if is_created or changed:
                user.save()

            if is_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS('Demo users created/updated successfully.'))
        self.stdout.write(f'Created: {created}, Updated: {updated}')
        self.stdout.write('\nLogin credentials:')
        self.stdout.write('  - login: admin | password: admin123 (ADMIN)')
        self.stdout.write('  - login: hokim | password: hokim123 (HOKIM)')
        self.stdout.write('  - login: masul | password: masul123 (HOKIMLIK_MASUL)')
        self.stdout.write('  - login: rahbar | password: rahbar123 (TASHKILOT_RAHBARI)')
        self.stdout.write('  - login: tashkilot-masul | password: tash123 (TASHKILOT_MASUL)')
        if count:
            self.stdout.write(f"\nBulk demo users created: {len(role_templates) * count} ta (har rol uchun {count} tadan)")
            self.stdout.write('Bulk userlar uchun parollar roli bo\'yicha bir xil:')
            self.stdout.write('  - HOKIM -> hokim123')
            self.stdout.write('  - HOKIMLIK_MASUL -> masul123')
            self.stdout.write('  - TASHKILOT_RAHBARI -> rahbar123')
            self.stdout.write('  - TASHKILOT_MASUL -> tash123')
