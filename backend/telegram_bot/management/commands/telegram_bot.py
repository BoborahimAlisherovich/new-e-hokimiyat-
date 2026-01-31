"""
Telegram Bot boshqarish buyrug'i

Usage:
    python manage.py telegram_bot run      - Botni polling rejimida ishga tushirish
    python manage.py telegram_bot setup    - Bot sozlamalarini yaratish
    python manage.py telegram_bot seed     - Boshlang'ich ma'lumotlarni yaratish
    python manage.py telegram_bot test     - Bot ulanishini tekshirish
"""

from django.core.management.base import BaseCommand
from telegram_bot.models import BotSettings, BotRegion, AppealCategory, AppealType


class Command(BaseCommand):
    help = 'Telegram bot boshqarish'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['run', 'setup', 'seed', 'test'],
            help='Bajarish kerak bo\'lgan harakat'
        )
        parser.add_argument(
            '--token',
            type=str,
            help='Bot token (setup uchun)',
            default=''
        )
        parser.add_argument(
            '--username',
            type=str,
            help='Bot username (setup uchun)',
            default=''
        )

    def handle(self, *args, **options):
        action = options['action']
        
        if action == 'run':
            self.run_bot()
        elif action == 'setup':
            self.setup_bot(options.get('token', ''), options.get('username', ''))
        elif action == 'seed':
            self.seed_data()
        elif action == 'test':
            self.test_connection()

    def run_bot(self):
        """Botni polling rejimida ishga tushirish"""
        from telegram_bot.bot.handlers import TelegramBot, process_update
        import requests
        import time
        
        self.stdout.write(self.style.SUCCESS('Bot polling rejimida ishga tushirilmoqda...'))
        
        settings = BotSettings.objects.first()
        if not settings or not settings.bot_token:
            self.stdout.write(self.style.ERROR('Bot token topilmadi! Admin paneldan token kiriting.'))
            return
        
        if settings.use_webhook:
            self.stdout.write(self.style.WARNING('Webhook rejimi faol. Polling to\'xtatildi.'))
            return
        
        token = settings.bot_token
        
        # Webhook o'chirish
        try:
            requests.post(f'https://api.telegram.org/bot{token}/deleteWebhook', timeout=10)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Webhook o\'chirishda xato: {e}'))
        
        self.stdout.write(self.style.SUCCESS(f'Bot ishga tushdi: @{settings.bot_username or "unknown"}'))
        self.stdout.write('To\'xtatish uchun Ctrl+C bosing...')
        
        offset = 0
        
        while True:
            try:
                # Yangilanishlarni olish
                response = requests.get(
                    f'https://api.telegram.org/bot{token}/getUpdates',
                    params={
                        'offset': offset,
                        'timeout': 30,
                        'allowed_updates': ['message', 'callback_query']
                    },
                    timeout=40
                )
                data = response.json()
                
                if data.get('ok'):
                    for update in data.get('result', []):
                        offset = update['update_id'] + 1
                        try:
                            process_update(update)
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'Update xatosi: {e}'))
                
            except KeyboardInterrupt:
                self.stdout.write(self.style.WARNING('\nBot to\'xtatildi'))
                break
            except requests.exceptions.Timeout:
                continue
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Xato: {e}'))
                time.sleep(5)

    def setup_bot(self, token='', username=''):
        """Bot sozlamalarini yaratish"""
        import requests
        
        # Agar token berilgan bo'lsa, Telegram dan tekshiramiz
        if token:
            try:
                response = requests.get(
                    f'https://api.telegram.org/bot{token}/getMe',
                    timeout=10
                )
                data = response.json()
                
                if data.get('ok'):
                    bot_info = data.get('result', {})
                    username = bot_info.get('username', username)
                    
                    settings, created = BotSettings.objects.update_or_create(
                        pk=1,
                        defaults={
                            'bot_token': token,
                            'bot_username': username,
                            'is_active': True,
                        }
                    )
                    
                    self.stdout.write(self.style.SUCCESS(f'Bot sozlamalari saqlandi!'))
                    self.stdout.write(self.style.SUCCESS(f'Bot: @{username}'))
                    self.stdout.write(self.style.SUCCESS(f'ID: {bot_info.get("id")}'))
                    return
                else:
                    self.stdout.write(self.style.ERROR(f'Noto\'g\'ri token: {data.get("description")}'))
                    return
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Xato: {e}'))
                return
        
        # Token berilmasa, bo'sh sozlamalar yaratamiz
        settings, created = BotSettings.objects.get_or_create(
            pk=1,
            defaults={
                'bot_token': '',
                'bot_username': '',
                'is_active': False,
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS('Bot sozlamalari yaratildi!'))
        else:
            self.stdout.write(self.style.WARNING('Bot sozlamalari allaqachon mavjud'))
        
        self.stdout.write('Token qo\'shish: python manage.py telegram_bot setup --token=YOUR_BOT_TOKEN')

    def seed_data(self):
        """Boshlang'ich ma'lumotlarni yaratish"""
        self.stdout.write('Boshlang\'ich ma\'lumotlar yaratilmoqda...')
        
        # Hududlar
        regions = [
            'Hatirchi shaharchasi',
            'Achchiq QFY',
            'Bandigon QFY',
            'Bo\'ston QFY',
            'Chorbog\' QFY',
            'Do\'stlik QFY',
            'Guliston QFY',
            'Hatirchi QFY',
            'Jiyda QFY',
            'Karvon QFY',
            'Ko\'kcha QFY',
            'Mustaqillik QFY',
            'Navruz QFY',
            'Oltin vodiy QFY',
            'Qorasuv QFY',
            'Sarbozor QFY',
            'Tinchlik QFY',
            'Yangiobod QFY',
        ]
        
        for i, name in enumerate(regions, 1):
            code = name.lower().replace(' ', '_').replace("'", "")
            BotRegion.objects.get_or_create(
                name_uz=name,
                defaults={'code': code, 'order': i, 'is_active': True}
            )
        self.stdout.write(f'  {len(regions)} ta hudud yaratildi')
        
        # Murojaat turlari
        appeal_types = [
            ('Shikoyat', 'Жалоба', 'Complaint', '📢', 'complaint'),
            ('Taklif', 'Предложение', 'Suggestion', '💡', 'suggestion'),
            ('Ariza', 'Заявление', 'Application', '📝', 'application'),
            ('Savol', 'Вопрос', 'Question', '❓', 'question'),
            ('Minnatdorchilik', 'Благодарность', 'Gratitude', '🙏', 'gratitude'),
        ]
        
        for i, (uz, ru, en, icon, code) in enumerate(appeal_types, 1):
            AppealType.objects.get_or_create(
                code=code,
                defaults={
                    'name_uz': uz,
                    'name_ru': ru,
                    'name_en': en,
                    'icon': icon,
                    'order': i,
                    'is_active': True
                }
            )
        self.stdout.write(f'  {len(appeal_types)} ta murojaat turi yaratildi')
        
        # Sohalar
        categories = [
            ('Kommunal xizmatlar', 'Коммунальные услуги', 'Utilities', '🏠', 'kommunal'),
            ('Yo\'llar va ko\'priklar', 'Дороги и мосты', 'Roads & Bridges', '🛣️', 'yollar'),
            ('Ta\'lim', 'Образование', 'Education', '📚', 'talim'),
            ('Sog\'liqni saqlash', 'Здравоохранение', 'Healthcare', '🏥', 'sogliq'),
            ('Madaniyat va sport', 'Культура и спорт', 'Culture & Sports', '⚽', 'madaniyat'),
            ('Qurilish va arxitektura', 'Строительство', 'Construction', '🏗️', 'qurilish'),
            ('Ekologiya', 'Экология', 'Environment', '🌳', 'ekologiya'),
            ('Xavfsizlik', 'Безопасность', 'Security', '🛡️', 'xavfsizlik'),
            ('Transport', 'Транспорт', 'Transport', '🚌', 'transport'),
            ('Ish bilan ta\'minlash', 'Трудоустройство', 'Employment', '💼', 'ish'),
            ('Boshqa', 'Другое', 'Other', '📋', 'boshqa'),
        ]
        
        for i, (uz, ru, en, icon, code) in enumerate(categories, 1):
            AppealCategory.objects.get_or_create(
                code=code,
                defaults={
                    'name_uz': uz,
                    'name_ru': ru,
                    'name_en': en,
                    'icon': icon,
                    'order': i,
                    'is_active': True
                }
            )
        self.stdout.write(f'  {len(categories)} ta soha yaratildi')
        
        self.stdout.write(self.style.SUCCESS('Boshlang\'ich ma\'lumotlar yaratildi!'))

    def test_connection(self):
        """Bot ulanishini tekshirish"""
        import requests
        
        settings = BotSettings.objects.first()
        if not settings or not settings.bot_token:
            self.stdout.write(self.style.ERROR('Bot token topilmadi!'))
            return
        
        try:
            response = requests.get(
                f'https://api.telegram.org/bot{settings.bot_token}/getMe',
                timeout=10
            )
            data = response.json()
            
            if data.get('ok'):
                bot_info = data.get('result', {})
                self.stdout.write(self.style.SUCCESS(f'''
Bot muvaffaqiyatli ulandi!

Bot ID: {bot_info.get('id')}
Username: @{bot_info.get('username')}
Ism: {bot_info.get('first_name')}
'''))
                
                # Username'ni saqlash
                settings.bot_username = bot_info.get('username', '')
                settings.save()
            else:
                self.stdout.write(self.style.ERROR(f'Xato: {data.get("description")}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Ulanish xatosi: {e}'))
