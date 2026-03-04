from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date
import random
import uuid
from django.db import transaction


class Command(BaseCommand):
    help = 'Create comprehensive mock data for testing (organizations, tasks, appeals, chat, etc.)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--org-count',
            type=int,
            default=50,
            help='Number of organizations to create (default: 50)'
        )
        parser.add_argument(
            '--task-count',
            type=int,
            default=100,
            help='Number of tasks to create (default: 100)'
        )
        parser.add_argument(
            '--appeal-count',
            type=int,
            default=200,
            help='Number of appeals to create (default: 200)'
        )
        parser.add_argument(
            '--chat-count',
            type=int,
            default=500,
            help='Number of chat messages to create (default: 500)'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Creating comprehensive mock data...'))
        
        # Get counts
        org_count = options.get('org_count', 50)
        task_count = options.get('task_count', 100)
        appeal_count = options.get('appeal_count', 200)
        chat_count = options.get('chat_count', 500)

        # Import models
        from organizations.models import Organization, Sector
        from tasks.models import Task, TaskOrganization, TaskExecution
        from users.models import User
        from telegram_bot.models import TelegramAppeal, AppealCategory, AppealType, TelegramUser, BotRegion
        from chat.models import DirectMessage, ChatConversation

        with transaction.atomic():
            # 1. Create Sectors
            self._create_sectors()
            
            # 2. Create Organizations
            orgs = self._create_organizations(org_count)
            
            # 3. Create Tasks with assignments
            self._create_tasks(task_count, orgs)
            
            # 4. Create Appeals
            self._create_appeals(appeal_count, orgs)
            
            # 5. Create Chat messages
            self._create_chat_messages(chat_count)

        self.stdout.write(self.style.SUCCESS(f'\n✅ Mock data created successfully!'))
        self.stdout.write(f'  - Sectors: {Sector.objects.count()}')
        self.stdout.write(f'  - Organizations: {Organization.objects.count()}')
        self.stdout.write(f'  - Tasks: {Task.objects.count()}')
        self.stdout.write(f'  - Task Assignments: {TaskOrganization.objects.count()}')
        self.stdout.write(f'  - Appeals: {TelegramAppeal.objects.count()}')
        self.stdout.write(f'  - Chat Messages: {DirectMessage.objects.count()}')
        self.stdout.write(f'  - Conversations: {ChatConversation.objects.count()}')

    def _create_sectors(self):
        """Create default sectors"""
        from organizations.models import Sector
        
        sectors_data = [
            ('Ta\'lim', '🎓'),
            ('Sog\'liqni saqlash', '🏥'),
            ('Qurilish', '🏗️'),
            ('Transport', '🚗'),
            ('Energetika', '⚡'),
            ('Suv ta\'minoti', '💧'),
            ('Ijtimoiy ximoya', '🤝'),
            ('Madaniyat', '🎭'),
            ('Sport', '⚽'),
            ('Ekologiya', '🌳'),
            ('Agriculture', '🌾'),
            ('Aloqa', '📡'),
            ('Savdo', '🛒'),
            ('Turizm', '✈️'),
            ('Finans', '💰'),
        ]
        
        created = 0
        for name, icon in sectors_data:
            _, is_created = Sector.objects.get_or_create(
                name=name,
                defaults={'description': f'{name} sohasi', 'is_active': True}
            )
            if is_created:
                created += 1
        
        self.stdout.write(f'  📁 Sectors: {created} created')

    def _create_organizations(self, count):
        """Create mock organizations"""
        from organizations.models import Organization, Sector
        
        sectors = list(Sector.objects.all())
        regions = ['Samarqand', 'Toshkent', 'Buxoro', 'Andijon', 'Farg\'ona']
        districts = ['Xatirchi', 'Narpay', 'Jomboy', 'Koshrabot', 'Bulung\'ur']
        
        org_prefixes = [
            '1-sonli', '2-sonli', '3-sonli', 'Markaziy', 'Tuman',
            'Shahar', 'Viloyat', 'Respublika', 'Davlat', 'Xususiy'
        ]
        
        org_types = [
            'Maktab', 'Kollej', 'Litsey', 'Bog\'cha', 'Kasalxona',
            'Poliklinika', 'Texnikum', 'Institut', 'Markaz', 'Boshqarma'
        ]
        
        created_orgs = []
        existing_count = Organization.objects.count()
        
        for i in range(count):
            prefix = random.choice(org_prefixes)
            org_type = random.choice(org_types)
            name = f"{prefix} {org_type} #{existing_count + i + 1}"
            short_name = f"{org_type} #{existing_count + i + 1}"
            
            org, _ = Organization.objects.get_or_create(
                name=name,
                defaults={
                    'short_name': short_name,
                    'sector': random.choice(sectors) if sectors else None,
                    'region': random.choice(regions),
                    'district': random.choice(districts),
                    'address': f"{random.choice(districts)} tumani, {random.choice(regions)} viloyati",
                    'phone': f"+998{random.randint(90, 99)}{random.randint(1000000, 9999999)}",
                    'email': f"org{existing_count + i + 1}@example.uz",
                    'director_name': f"Director {i + 1}",
                    'is_active': True,
                }
            )
            created_orgs.append(org)
        
        self.stdout.write(f'  🏢 Organizations: {len(created_orgs)} created')
        return created_orgs

    def _create_tasks(self, count, organizations):
        """Create mock tasks with assignments"""
        from tasks.models import Task, TaskOrganization
        from users.models import User
        
        priorities = ['PAST', 'ODDIY', 'YUQORI', 'FAVQULODDA']
        statuses = ['YANGI', 'IJRODA', 'BAJARILDI', 'MUDDATI_KECH', 'QAYTA_IJROGA_YUBORILDI']
        
        task_templates = [
            "Hududni obodonlashtirish",
            "Yo‘llarni ta’mirlash",
            "Maktab binolarini ta’mirlash",
            "Koʻchalarni yoritish",
            "Suv ta’minotini yaxshilash",
            "Elektr tarmoqlarini ta’mirlash",
            "Bog‘larni obodonlashtirish",
            "Aholini band qilish",
            "Tadbirkorlikni qoʻllab-quvvatlash",
            "Ijtimoiy yordam koʻrsatish",
            "Tinchlik va osoyishtalikni taʼminlash",
            "Ekologik muammolarni hal qilish",
            "Turizm infratuzilmasini rivojlantirish",
            "Axborot-kommunikatsiya texnologiyalarini joriy etish",
            "Sog‘liqni saqlashni yaxshilash",
        ]
        
        # Get admin/hokim users for creating tasks
        creators = list(User.objects.filter(role__in=['ADMIN', 'HOKIM', 'HOKIMLIK_MASUL'], status='FAOL')[:20])
        if not creators:
            creators = list(User.objects.filter(status='FAOL')[:20])
        
        created_tasks = 0
        
        for i in range(count):
            title = random.choice(task_templates)
            deadline_days = random.choice([1, 3, 5, 7, 14, 30])
            deadline = timezone.now() + timedelta(days=deadline_days)
            
            # Randomly make some tasks overdue
            if random.random() < 0.3:
                deadline = timezone.now() - timedelta(days=random.randint(1, 10))
            
            creator = random.choice(creators) if creators else None
            
            task = Task.objects.create(
                title=f"{title} #{i + 1}",
                description=f"Bu topshiriq {title} bo‘yicha bajarilishi kerak. Muddati: {deadline_days} kun.",
                priority=random.choice(priorities),
                status=random.choice(statuses),
                deadline=deadline,
                created_by=creator,
                source=random.choice(['MANUAL', 'TELEGRAM', 'AI']),
                address=f"{random.choice(['Xatirchi', 'Narpay', 'Jomboy'])} tumani",
            )
            
            # Assign to 1-3 random organizations
            num_orgs = random.randint(1, min(3, len(organizations)))
            assigned_orgs = random.sample(organizations, num_orgs)
            
            for org in assigned_orgs:
                TaskOrganization.objects.create(
                    task=task,
                    organization=org,
                    status=random.choice(statuses),
                )
            
            created_tasks += 1
        
        self.stdout.write(f'  📋 Tasks: {created_tasks} created')

    def _create_appeals(self, count, organizations):
        """Create mock Telegram appeals"""
        from telegram_bot.models import TelegramAppeal, AppealCategory, AppealType, TelegramUser, BotRegion
        
        # Create categories if not exist
        categories_data = [
            ('Ta\'lim', 'education'),
            ('Sog\'liq', 'health'),
            ('Transport', 'transport'),
            ('Kommunal', 'utilities'),
            ('Huquqiy yordam', 'legal'),
            ('Boshqa', 'other'),
        ]
        
        categories = []
        for name, code in categories_data:
            cat, _ = AppealCategory.objects.get_or_create(
                code=code,
                defaults={'name_uz': name, 'is_active': True}
            )
            categories.append(cat)
        
        # Create appeal types if not exist
        types_data = [
            ('Shikoyat', 'complaint'),
            ('Taklif', 'suggestion'),
            ('Savol', 'question'),
            ('Minnatdorchilik', 'gratitude'),
        ]
        
        appeal_types = []
        for name, code in types_data:
            atype, _ = AppealType.objects.get_or_create(
                code=code,
                defaults={'name_uz': name, 'is_active': True}
            )
            appeal_types.append(atype)
        
        # Create regions if not exist
        regions_data = [
            ('samarkand', 'Samarqand'),
            ('tashkent', 'Toshkent'),
            ('bukhara', 'Buxoro'),
        ]
        regions = []
        for code, name in regions_data:
            region, _ = BotRegion.objects.get_or_create(
                code=code,
                defaults={'name_uz': name, 'is_active': True}
            )
            regions.append(region)
        
        # Create mock Telegram users
        first_names = ['Ali', 'Vali', 'Gani', 'Karim', 'Sobir', 'Jamol', 'Rustam', 'Olim', 'Dilshod', 'Bekzod']
        last_names = ['Aliyev', 'Valiyev', 'Ganiyev', 'Karimov', 'Sobirov', 'Jamolov', 'Rustamov', 'Olimov', 'Dilshodov', 'Bekzodov']
        
        telegram_users = []
        for i in range(min(50, count)):
            user, _ = TelegramUser.objects.get_or_create(
                telegram_id=1000000000 + i,
                defaults={
                    'first_name': random.choice(first_names),
                    'last_name': random.choice(last_names),
                    'phone': f"+998{random.randint(90, 99)}{random.randint(1000000, 9999999)}",
                    'region': random.choice(regions) if regions else None,
                    'is_registered': True,
                    'language': 'uz',
                }
            )
            telegram_users.append(user)
        
        # Create appeals
        appeal_texts = [
            "Maktab binosi ta'mirlanishi kerak",
            "Kocha yoritish chiroqlari yoqilmayapti",
            "Suv ta'minoti juda yomon",
            "Transport qatnovi qiyinlashib ketdi",
            "Bog'cha navbat tartibi noto'g'ri",
            "Poliklinikada navbat katta",
            "Ko'cha ta'mirlanishi kerak",
            "Elektr ta'minoti uzilib qolmoqda",
            "Ijtimoiy yordam uchun murojaat",
            "Tadbirkorlik uchun ruxsatnoma",
        ]
        
        statuses = ['draft', 'pending_review', 'approved', 'responded', 'resolved']
        priorities = ['low', 'medium', 'high', 'urgent']
        
        created_appeals = 0
        
        for i in range(count):
            user = random.choice(telegram_users) if telegram_users else None
            
            appeal = TelegramAppeal.objects.create(
                telegram_user=user,
                appeal_type=random.choice(appeal_types) if appeal_types else None,
                category=random.choice(categories) if categories else None,
                text=random.choice(appeal_texts),
                status=random.choice(statuses),
                priority=random.choice(priorities),
                source='telegram',
                ai_analysis="AI tahlili: Murojaat maqbul",
                ai_score=random.randint(60, 95),
            )
            
            # Assign to 1-2 random organizations
            if organizations and random.random() < 0.7:
                num_orgs = random.randint(1, min(2, len(organizations)))
                assigned = random.sample(organizations, num_orgs)
                appeal.assigned_organizations.set(assigned)
            
            created_appeals += 1
        
        self.stdout.write(f'  📨 Appeals: {created_appeals} created')

    def _create_chat_messages(self, count):
        """Create mock chat messages between users"""
        from chat.models import DirectMessage, ChatConversation
        from users.models import User
        
        messages = [
            "Salom, yaxshimisiz?",
            "Topshiriq bajarildi",
            "Hisobot yuborildi",
            "Murojaat ko'rib chiqildi",
            "Rahmat, tushundim",
            "Bugun soat 14:00 da yig'ilamiz",
            "Xujjatni tekshirib bering",
            "Tasdiqlashim kerak",
            "Muddat uzaytirilishi mumkinmi?",
            "Bajarildi, tekshirib ko'ring",
            "Nazoratdan yechildi",
            "Qayta ishlanishi kerak",
            "Bugun ishga keldingizmi?",
            "Majlisga tayyorlaning",
            "Hisobot tayyor",
        ]
        
        # Get active users
        users = list(User.objects.filter(status='FAOL')[:50])
        if len(users) < 2:
            self.stdout.write(self.style.WARNING('  Not enough users for chat messages'))
            return
        
        created_messages = 0
        conversations = {}
        
        for i in range(count):
            sender = random.choice(users)
            recipient = random.choice([u for u in users if u != sender])
            
            # Get or create conversation
            conv_key = tuple(sorted([sender.id, recipient.id]))
            if conv_key not in conversations:
                conversation = ChatConversation.get_or_create_conversation(sender, recipient)
                conversations[conv_key] = conversation
            else:
                conversation = conversations[conv_key]
            
            # Create message with random date within last 30 days
            days_ago = random.randint(0, 30)
            created_at = timezone.now() - timedelta(days=days_ago, hours=random.randint(0, 23))
            
            msg = DirectMessage.objects.create(
                sender=sender,
                recipient=recipient,
                content=random.choice(messages),
                is_read=random.random() < 0.7,  # 70% read
            )
            
            # Update conversation's last_message
            if not conversation.last_message or conversation.last_message.created_at < msg.created_at:
                conversation.last_message = msg
                conversation.save()
            
            created_messages += 1
        
        self.stdout.write(f'  💬 Chat messages: {created_messages} created')
