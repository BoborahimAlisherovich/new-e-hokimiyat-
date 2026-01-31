"""
Telegram Bot boshqarish buyruqlari
"""

from django.core.management.base import BaseCommand, CommandError
from telegram_bot.models import BotSettings, BotRegion, AppealCategory, AppealType


class Command(BaseCommand):
    help = 'Telegram bot boshqarish'

    def add_arguments(self, parser):
        parser.add_argument(
            'action',
            choices=['run', 'setup', 'seed', 'test'],
            help='Bajarish kerak bo\'lgan harakat'
        )

    def handle(self, *args, **options):
        action = options['action']
        
        if action == 'run':
            self.run_bot()
        elif action == 'setup':
            self.setup_bot()
        elif action == 'seed':
            self.seed_data()
        elif action == 'test':
            self.test_connection()

    def run_bot(self):
        """Botni polling rejimida ishga tushirish"""
        self.stdout.write(self.style.SUCCESS('Bot polling rejimida ishga tushirilmoqda...'))
        
        import os
        os.system('python run_bot.py')

    def setup_bot(self):
        """Bot sozlamalarini yaratish"""
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
        
        self.stdout.write('Admin panelga kiriting: /admin/telegram_bot/botsettings/')

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
            BotRegion.objects.get_or_create(
                name=name,
                defaults={'order': i, 'is_active': True}
            )
        self.stdout.write(f'  {len(regions)} ta hudud yaratildi')
        
        # Murojaat turlari
        appeal_types = [
            ('Shikoyat', 'Шалоба', 'Complaint', '📢'),
            ('Taklif', 'Предложение', 'Suggestion', '💡'),
            ('Ariza', 'Заявление', 'Application', '📝'),
            ('Savol', 'Вопрос', 'Question', '❓'),
            ('Minnatdorchilik', 'Благодарность', 'Gratitude', '🙏'),
        ]
        
        for i, (uz, ru, en, emoji) in enumerate(appeal_types, 1):
            AppealType.objects.get_or_create(
                name_uz=uz,
                defaults={
                    'name_ru': ru,
                    'name_en': en,
                    'emoji': emoji,
                    'order': i,
                    'is_active': True
                }
            )
        self.stdout.write(f'  {len(appeal_types)} ta murojaat turi yaratildi')
        
        # Sohalar
        categories = [
            ('Kommunal xizmatlar', 'Коммунальные услуги', 'Utilities', '🏠'),
            ('Yo\'llar va ko\'priklar', 'Дороги и мосты', 'Roads & Bridges', '🛣️'),
            ('Ta\'lim', 'Образование', 'Education', '📚'),
            ('Sog\'liqni saqlash', 'Здравоохранение', 'Healthcare', '🏥'),
            ('Madaniyat va sport', 'Культура и спорт', 'Culture & Sports', '⚽'),
            ('Qurilish va arxitektura', 'Строительство', 'Construction', '🏗️'),
            ('Ekologiya', 'Экология', 'Environment', '🌳'),
            ('Xavfsizlik', 'Безопасность', 'Security', '🛡️'),
            ('Transport', 'Транспорт', 'Transport', '🚌'),
            ('Ish bilan ta\'minlash', 'Трудоустройство', 'Employment', '💼'),
            ('Boshqa', 'Другое', 'Other', '📋'),
        ]
        
        for i, (uz, ru, en, emoji) in enumerate(categories, 1):
            AppealCategory.objects.get_or_create(
                name_uz=uz,
                defaults={
                    'name_ru': ru,
                    'name_en': en,
                    'emoji': emoji,
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
