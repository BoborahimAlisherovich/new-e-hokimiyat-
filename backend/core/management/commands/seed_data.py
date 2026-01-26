"""
Management command to seed the database with mock data for testing.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random

from users.models import User
from organizations.models import Organization, Sector
from tasks.models import Task, TaskOrganization, TaskMessage
from notifications.models import Notification


class Command(BaseCommand):
    help = 'Seed database with mock data for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            TaskMessage.objects.all().delete()
            TaskOrganization.objects.all().delete()
            Task.objects.all().delete()
            Notification.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            Organization.objects.all().delete()
            Sector.objects.all().delete()

        self.stdout.write('Creating sectors...')
        sectors = self.create_sectors()

        self.stdout.write('Creating organizations...')
        organizations = self.create_organizations(sectors)

        self.stdout.write('Creating users...')
        users = self.create_users(organizations)

        self.stdout.write('Creating tasks...')
        tasks = self.create_tasks(users, organizations)

        self.stdout.write('Creating notifications...')
        self.create_notifications(users, tasks)

        self.stdout.write(self.style.SUCCESS('Mock data created successfully!'))
        self.stdout.write(f'  - Sectors: {len(sectors)}')
        self.stdout.write(f'  - Organizations: {len(organizations)}')
        self.stdout.write(f'  - Users: {len(users)}')
        self.stdout.write(f'  - Tasks: {len(tasks)}')

    def create_sectors(self):
        sector_data = [
            ('Ta\'lim', 'Maktablar, oliy ta\'lim muassasalari, bolalar bog\'chalari'),
            ('Sog\'liqni saqlash', 'Kasalxonalar, poliklinikalar, tibbiyot markazlari'),
            ('Qurilish', 'Qurilish ishlari, ta\'mirlash, infratuzilma'),
            ('Transport', 'Yo\'llar, jamoat transporti, avtomobil xo\'jaligi'),
            ('Qishloq xo\'jaligi', 'Fermalar, dehqonchilik, chorvachilik'),
            ('Kommunal xizmatlar', 'Suv ta\'minoti, elektr, gaz, issiqlik'),
            ('Madaniyat', 'Madaniyat markazlari, kutubxonalar, muzeylar'),
            ('Sport', 'Sport inshootlari, sport maktablari'),
            ('Ekologiya', 'Atrof-muhitni muhofaza qilish, ko\'kalamzorlashtirish'),
            ('Ijtimoiy himoya', 'Ijtimoiy yordam, pensiya, nafaqa'),
        ]
        
        sectors = []
        for name, description in sector_data:
            sector, _ = Sector.objects.get_or_create(
                name=name,
                defaults={'description': description, 'is_active': True}
            )
            sectors.append(sector)
        return sectors

    def create_organizations(self, sectors):
        org_data = [
            # Ta'lim
            ('1-sonli umumta\'lim maktabi', '1-maktab', 0, 'Mustaqillik ko\'chasi, 15'),
            ('2-sonli umumta\'lim maktabi', '2-maktab', 0, 'Navoiy ko\'chasi, 23'),
            ('3-sonli umumta\'lim maktabi', '3-maktab', 0, 'Amir Temur ko\'chasi, 45'),
            ('5-sonli bolalar bog\'chasi', '5-bog\'cha', 0, 'Bobur ko\'chasi, 12'),
            ('Kasb-hunar kolleji', 'Kollej', 0, 'Universitet ko\'chasi, 1'),
            
            # Sog'liqni saqlash
            ('Tuman markaziy shifoxonasi', 'TMSh', 1, 'Shifokor ko\'chasi, 5'),
            ('1-sonli oilaviy poliklinika', '1-poliklinika', 1, 'Sog\'lom ko\'chasi, 8'),
            ('Tez yordam markazi', 'Tez yordam', 1, 'Markaziy ko\'chasi, 3'),
            
            # Qurilish
            ('Tuman qurilish boshqarmasi', 'Qurilish', 2, 'Bunyodkor ko\'chasi, 20'),
            ('Yo\'l-qurilish korxonasi', 'Yo\'l-qurilish', 2, 'Sanoat ko\'chasi, 15'),
            
            # Transport
            ('Tuman yo\'l xo\'jaligi', 'Yo\'l xo\'jaligi', 3, 'Transport ko\'chasi, 7'),
            ('Avtobus parki', 'Avtopark', 3, 'Haydovchi ko\'chasi, 30'),
            
            # Qishloq xo'jaligi
            ('Tuman qishloq xo\'jaligi bo\'limi', 'Qishloq xo\'jaligi', 4, 'Dehqon ko\'chasi, 11'),
            ('Suv xo\'jaligi boshqarmasi', 'Suv xo\'jaligi', 4, 'Irrigatsiya ko\'chasi, 6'),
            
            # Kommunal xizmatlar
            ('Tuman kommunal xizmati', 'Kommunal', 5, 'Xizmat ko\'chasi, 9'),
            ('Elektr tarmoqlari', 'Elektr', 5, 'Energetik ko\'chasi, 4'),
            ('Gaz ta\'minoti', 'Gaz', 5, 'Gaz ko\'chasi, 2'),
            
            # Madaniyat
            ('Madaniyat va ma\'rifat markazi', 'Madaniyat markazi', 6, 'San\'at ko\'chasi, 18'),
            ('Markaziy kutubxona', 'Kutubxona', 6, 'Kitob ko\'chasi, 25'),
            
            # Sport
            ('Sport majmuasi', 'Sport majmua', 7, 'Sportchi ko\'chasi, 33'),
            ('Bolalar sport maktabi', 'Sport maktabi', 7, 'Yoshlar ko\'chasi, 14'),
            
            # Ekologiya
            ('Ekologiya bo\'limi', 'Ekologiya', 8, 'Tabiat ko\'chasi, 21'),
            ('Ko\'kalamzorlashtirish xizmati', 'Ko\'kalamzor', 8, 'Bog\' ko\'chasi, 16'),
            
            # Ijtimoiy himoya
            ('Ijtimoiy himoya markazi', 'Ijtimoiy himoya', 9, 'Mehr ko\'chasi, 10'),
            ('Pensiya fondi bo\'limi', 'Pensiya fondi', 9, 'Faxriy ko\'chasi, 22'),
        ]
        
        organizations = []
        for name, short_name, sector_idx, address in org_data:
            org, _ = Organization.objects.get_or_create(
                name=name,
                defaults={
                    'short_name': short_name,
                    'sector': sectors[sector_idx],
                    'region': 'Toshkent viloyati',
                    'district': 'Zangiota tumani',
                    'address': address,
                    'phone': f'+998 71 {random.randint(100, 999)} {random.randint(10, 99)} {random.randint(10, 99)}',
                    'is_active': True,
                }
            )
            organizations.append(org)
        return organizations

    def create_users(self, organizations):
        users = []
        
        # Create Hokim
        hokim, created = User.objects.get_or_create(
            pnfl='12345678901234',
            defaults={
                'first_name': 'Abdulloh',
                'last_name': 'Karimov',
                'middle_name': 'Shavkatovich',
                'role': 'HOKIM',
                'status': 'FAOL',
                'position': 'Tuman hokimi',
                'phone': '+998 90 123 45 67',
                'email': 'hokim@zangiota.uz',
            }
        )
        if created:
            hokim.set_password('hokim123')
            hokim.save()
        users.append(hokim)
        
        # Create Hokimlik mas'ullari
        masul_data = [
            ('12345678901235', 'Botir', 'Toshmatov', 'Rustamovich', '+998 90 234 56 78'),
            ('31234567890003', 'Dilshod', 'Nazarov', 'Anvarovich', '+998 90 345 67 89'),
            ('31234567890004', 'Gulnora', 'Rashidova', 'Karimovna', '+998 90 456 78 90'),
        ]
        
        for pnfl, first_name, last_name, middle_name, phone in masul_data:
            user, created = User.objects.get_or_create(
                pnfl=pnfl,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'middle_name': middle_name,
                    'role': 'HOKIMLIK_MASUL',
                    'status': 'FAOL',
                    'position': 'Hokimlik mas\'uli',
                    'phone': phone,
                    'email': f'{first_name.lower()}@zangiota.uz',
                }
            )
            if created:
                user.set_password('masul123')
                user.save()
            users.append(user)
        
        # Create Tashkilot rahbarlari (one for each organization)
        rahbar_names = [
            ('Aziz', 'Umarov'), ('Bekzod', 'Alimov'), ('Vohid', 'Kamolov'),
            ('Gulshan', 'Sodiqova'), ('Davron', 'Mahmudov'), ('Eldor', 'Qodirov'),
            ('Jamshid', 'Tursunov'), ('Zarina', 'Xolmatova'), ('Ilhom', 'Normatov'),
            ('Kamol', 'Ergashev'), ('Laziz', 'Botirov'), ('Munira', 'Yusupova'),
            ('Nodir', 'Sharipov'), ('Odil', 'Rahimov'), ('Parviz', 'Qosimov'),
            ('Ravshan', 'Saidov'), ('Sardor', 'Ibragimov'), ('Temur', 'Xasanov'),
            ('Ulugbek', 'Mirzayev'), ('Farxod', 'Ahmedov'), ('Xurshid', 'Turgunov'),
            ('Shoxrux', 'Zokirov'), ('Erkin', 'Xamidov'), ('Yusuf', 'Salimov'),
            ('Anvar', 'Raxmatov'),
        ]
        
        # Create special test users for Tashkilot Rahbari and Ijrochi
        test_rahbari, created = User.objects.get_or_create(
            pnfl='12345678901236',
            defaults={
                'first_name': 'Tashkilot',
                'last_name': 'Rahbari',
                'middle_name': 'Test',
                'role': 'TASHKILOT_RAHBARI',
                'status': 'FAOL',
                'position': 'Tashkilot Rahbari',
                'phone': '+998 90 111 11 11',
                'email': 'tashkilot.rahbari@zangiota.uz',
                'organization': organizations[0] if organizations else None,
            }
        )
        if created:
            test_rahbari.set_password('rahbar123')
            test_rahbari.save()
        users.append(test_rahbari)
        
        # Create Tashkilot Mas'uli
        test_masul, created = User.objects.get_or_create(
            pnfl='12345678901237',
            defaults={
                'first_name': 'Tashkilot',
                'last_name': 'Masul',
                'middle_name': 'Test',
                'role': 'TASHKILOT_MASUL',
                'status': 'FAOL',
                'position': 'Tashkilot Mas\'uli',
                'phone': '+998 90 222 22 22',
                'email': 'tashkilot.masul@zangiota.uz',
                'organization': organizations[0] if organizations else None,
            }
        )
        if created:
            test_masul.set_password('masul123')
            test_masul.save()
        users.append(test_masul)
        
        # Create Ijrochi
        test_ijrochi, created = User.objects.get_or_create(
            pnfl='12345678901238',
            defaults={
                'first_name': 'Ijrochi',
                'last_name': 'Test',
                'middle_name': 'User',
                'role': 'IJROCHI',
                'status': 'FAOL',
                'position': 'Ijrochi',
                'phone': '+998 90 333 33 33',
                'email': 'ijrochi@zangiota.uz',
                'organization': organizations[0] if organizations else None,
            }
        )
        if created:
            test_ijrochi.set_password('ijrochi123')
            test_ijrochi.save()
        users.append(test_ijrochi)
        
        # Create remaining Tashkilot rahbarlari
        for i, org in enumerate(organizations):
            pnfl = f'312345678901{i+10:02d}'
            first_name, last_name = rahbar_names[i % len(rahbar_names)]
            
            user, created = User.objects.get_or_create(
                pnfl=pnfl,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'middle_name': 'Tashkilotovich',
                    'role': 'TASHKILOT_RAHBARI',
                    'status': 'FAOL',
                    'position': f'{org.short_name} rahbari',
                    'phone': f'+998 9{random.randint(0, 9)} {random.randint(100, 999)} {random.randint(10, 99)} {random.randint(10, 99)}',
                    'email': f'{first_name.lower()}.{last_name.lower()}@{org.short_name.lower().replace(" ", "")}.uz',
                    'organization': org,
                }
            )
            if created:
                user.set_password('rahbar123')
                user.save()
            org.director_name = f'{last_name} {first_name}'
            org.save()
            users.append(user)
        
        # Create some Tashkilot mas'ullari
        masul_org_names = [
            ('Saodat', 'Mirzayeva'), ('Bahrom', 'Tojiyev'), ('Charos', 'Qodirova'),
            ('Diyora', 'Nurmatova'), ('Erkinjon', 'Olimov'), ('Feruza', 'Ismoilova'),
        ]
        
        for i, (first_name, last_name) in enumerate(masul_org_names):
            org = organizations[i % len(organizations)]
            pnfl = f'312345678902{i+10:02d}'
            
            user, created = User.objects.get_or_create(
                pnfl=pnfl,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'middle_name': 'Xodimovich',
                    'role': 'TASHKILOT_MASUL',
                    'status': 'FAOL',
                    'position': f'{org.short_name} xodimi',
                    'phone': f'+998 9{random.randint(0, 9)} {random.randint(100, 999)} {random.randint(10, 99)} {random.randint(10, 99)}',
                    'organization': org,
                }
            )
            if created:
                user.set_password('xodim123')
                user.save()
            users.append(user)
        
        return users

    def create_tasks(self, users, organizations):
        hokim = users[0]
        masullar = [u for u in users if u.role == 'HOKIMLIK_MASUL']
        
        task_templates = [
            # Ta'lim sohasida
            ('Maktab ta\'mirlash ishlarini yakunlash', 'MUHIM', 
             '1-sonli maktabning sport zali va oshxona binolarini ta\'mirlash ishlarini yakunlash. Barcha qurilish materiallari yetkazib berilgan.', 
             [0, 1, 2]),
            ('O\'quv yili oldidan maktablarni tayyorlash', 'SHOSHILINCH',
             'Barcha maktablarni yangi o\'quv yiliga tayyorlash: ta\'mirlash, jihozlash, o\'quv qurollarini tekshirish.', 
             [0, 1, 2, 3]),
            ('Bolalar bog\'chalariga yangi o\'yinchoqlar yetkazish', 'ODDIY',
             '5-sonli bolalar bog\'chasiga 50 dona yangi o\'yinchoq va o\'yin jihozlari yetkazib berish.', 
             [3]),
            
            # Sog'liqni saqlash
            ('Poliklinikaga yangi tibbiy uskunalar o\'rnatish', 'MUHIM',
             '1-sonli oilaviy poliklinikaga rentgen apparati va EKG uskunasini o\'rnatish va ishga tushirish.', 
             [5, 6]),
            ('Tez yordam mashinalarini ta\'mirlash', 'SHOSHILINCH',
             'Tez yordam markazining 3 ta mashinasini ta\'mirlash va xizmat ko\'rsatishga qaytarish.', 
             [7]),
            ('Shifokorlar uchun malaka oshirish kurslari', 'ODDIY',
             'Barcha oilaviy shifokorlar uchun 2 haftalik malaka oshirish kurslarini tashkil etish.', 
             [5, 6, 7]),
            
            # Qurilish
            ('Yangi ko\'cha qurilishini boshlash', 'MUHIM_SHOSHILINCH',
             'Mustaqillik mahallasida yangi 500 metrlik ko\'cha qurilishini boshlash. Loyiha tayyor, moliyalashtirish tasdiqlangan.', 
             [8, 9]),
            ('Ko\'prik ta\'mirlash ishlari', 'MUHIM',
             'Tuman markazidagi asosiy ko\'prikni ta\'mirlash. Transport harakatini vaqtinchalik boshqa yo\'nalishga o\'tkazish.', 
             [8, 9, 10]),
            
            # Transport
            ('Yo\'l belgilarini yangilash', 'ODDIY',
             'Tuman bo\'ylab barcha eskirgan yo\'l belgilarini yangi belgilar bilan almashtirish.', 
             [10]),
            ('Avtobus yo\'nalishlarini optimallashtirish', 'ODDIY',
             'Aholiga qulaylik yaratish uchun avtobus yo\'nalishlarini qayta ko\'rib chiqish va optimallashtirish.', 
             [10, 11]),
            
            # Kommunal xizmatlar
            ('Suv tarmog\'ini ta\'mirlash', 'SHOSHILINCH',
             'Bobur mahallasida suv tarmog\'idagi avariyani bartaraf etish va tizimni ta\'mirlash.', 
             [14]),
            ('Elektr tarmoqlarini modernizatsiya qilish', 'MUHIM',
             'Eski elektr tarmoqlarini yangi sim bilan almashtirish. 3 ta mahallani qamrab oladi.', 
             [15]),
            ('Gaz tarmog\'ini kengaytirish', 'MUHIM',
             'Yangi qurilgan Istiqbol mahallasiga gaz tarmog\'ini o\'tkazish.', 
             [16]),
            
            # Ekologiya
            ('Ko\'kalamzorlashtirish loyihasi', 'ODDIY',
             'Tuman markazida 1000 tup daraxt va gul o\'tqazish loyihasini amalga oshirish.', 
             [21, 22]),
            ('Chiqindilarni qayta ishlash tizimini joriy etish', 'MUHIM',
             'Tumanda chiqindilarni saralash va qayta ishlash tizimini joriy etish.', 
             [21]),
            
            # Sport va madaniyat
            ('Sport musobaqalarini tashkil etish', 'ODDIY',
             'Tuman miqyosida futbol, voleybol va kurash bo\'yicha musobaqalar o\'tkazish.', 
             [19, 20]),
            ('Madaniy tadbir o\'tkazish', 'ODDIY',
             'Mustaqillik bayrami munosabati bilan katta konsert va tantanali tadbir tashkil etish.', 
             [17, 18]),
            
            # Ijtimoiy
            ('Nogironlarga yordam ko\'rsatish', 'MUHIM',
             'Nogironlik bo\'yicha ro\'yxatdagi fuqarolarga bir martalik moddiy yordam yetkazish.', 
             [23, 24]),
            ('Keksalarga tibbiy ko\'rik', 'ODDIY',
             'Tuman bo\'ylab 65 yoshdan oshgan barcha fuqarolar uchun bepul tibbiy ko\'rik tashkil etish.', 
             [5, 6, 23]),
        ]
        
        tasks = []
        now = timezone.now()
        
        for i, (title, priority, description, org_indices) in enumerate(task_templates):
            # Random deadline between 3 days ago and 30 days from now
            days_offset = random.randint(-3, 30)
            deadline = now + timedelta(days=days_offset)
            
            # Determine status based on deadline
            if days_offset < 0:
                status = random.choice(['MUDDATI_KECH', 'BAJARILDI', 'NAZORATDAN_YECHILDI'])
            elif days_offset < 5:
                status = random.choice(['IJRODA', 'BAJARILDI'])
            else:
                status = random.choice(['YANGI', 'IJRODA'])
            
            creator = random.choice([hokim] + masullar)
            
            task, created = Task.objects.get_or_create(
                title=title,
                defaults={
                    'description': description,
                    'priority': priority,
                    'status': status,
                    'deadline': deadline,
                    'created_by': creator,
                    'completed_at': now if status in ['BAJARILDI', 'NAZORATDAN_YECHILDI'] else None,
                    'closed_at': now if status == 'NAZORATDAN_YECHILDI' else None,
                    'closed_by': hokim if status == 'NAZORATDAN_YECHILDI' else None,
                }
            )
            
            if created:
                # Assign organizations
                for org_idx in org_indices:
                    if org_idx < len(organizations):
                        org = organizations[org_idx]
                        org_status = 'BAJARILDI' if status in ['BAJARILDI', 'NAZORATDAN_YECHILDI'] else status
                        TaskOrganization.objects.create(
                            task=task,
                            organization=org,
                            status=org_status,
                        )
                
                # Add some messages
                self.create_task_messages(task, users, organizations, org_indices)
            
            tasks.append(task)
        
        return tasks

    def create_task_messages(self, task, users, organizations, org_indices):
        hokim = users[0]
        masullar = [u for u in users if u.role == 'HOKIMLIK_MASUL']
        rahbarlar = [u for u in users if u.role == 'TASHKILOT_RAHBARI']
        
        message_templates = [
            ('Topshiriq qabul qilindi. Ish boshlandi.', 'TEXT'),
            ('Materiallar buyurtma qilindi, yetib kelishi kutilmoqda.', 'TEXT'),
            ('Ishning 50% bajarildi. Keyingi hafta yakunlanadi.', 'TEXT'),
            ('Ishchi kuchi yetarli. Muddatda bajariladi.', 'TEXT'),
            ('Qo\'shimcha mablag\' kerak bo\'lishi mumkin.', 'TEXT'),
        ]
        
        # Add 2-4 messages per task
        num_messages = random.randint(2, 4)
        for i in range(num_messages):
            msg_template = random.choice(message_templates)
            sender = random.choice([hokim] + masullar + rahbarlar[:5])
            
            TaskMessage.objects.create(
                task=task,
                sender=sender,
                content=msg_template[0],
                message_type=msg_template[1],
                created_at=task.created_at + timedelta(hours=random.randint(1, 72))
            )

    def create_notifications(self, users, tasks):
        notification_types = ['TASK', 'DEADLINE', 'INFO', 'WARNING']
        
        for user in users[:10]:  # First 10 users get notifications
            for _ in range(random.randint(2, 5)):
                task = random.choice(tasks) if tasks else None
                notif_type = random.choice(notification_types)
                
                if notif_type == 'TASK':
                    title = 'Yangi topshiriq'
                    message = f'Sizga yangi topshiriq tayinlandi: {task.title[:50] if task else "Topshiriq"}'
                elif notif_type == 'DEADLINE':
                    title = 'Muddat yaqinlashmoqda'
                    message = f'Topshiriq muddati yaqinlashmoqda: {task.title[:50] if task else "Topshiriq"}'
                elif notif_type == 'WARNING':
                    title = 'Ogohlantirish'
                    message = 'Ba\'zi topshiriqlar muddati o\'tgan. Iltimos, tekshiring.'
                else:
                    title = 'Tizim xabari'
                    message = 'Tizimda yangilanishlar amalga oshirildi.'
                
                Notification.objects.create(
                    user=user,
                    title=title,
                    message=message,
                    notification_type=notif_type,
                    related_task=task if notif_type in ['TASK', 'DEADLINE'] else None,
                    is_read=random.choice([True, False]),
                )
