#!/usr/bin/env python
"""
Ko'plab test ma'lumotlarini yaratish scripti.
Serverda test qilish uchun bazaga ma'lumotlar qo'shadi.

Ishlatish:
    python seed_test_data.py

Yoki Django bilan:
    python manage.py shell < seed_test_data.py
"""

import os
import sys
import django
from datetime import datetime, timedelta
import random
from decimal import Decimal

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ehokimiyat.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.utils import timezone
from users.models import User
from organizations.models import Organization, Sector
from tasks.models import Task, TaskOrganization, TaskMessage, TaskExecution
from notifications.models import Notification
from chat.models import DirectMessage, ChatConversation
from audit.models import AuditLog
from telegram_bot.models import AppealType, AppealCategory, BotRegion

# O'zbek ismlari va famililari
FIRST_NAMES_MALE = [
    "Jamshid", "Sardor", "Bekzod", "Shoxrux", "Doniyor", "Azizbek", "Jasur", 
    "Temur", "Ulugbek", "Bobur", "Dilshod", "Farhod", "Jahongir", "Kamol",
    "Laziz", "Mansur", "Nodir", "Oybek", "Rustam", "Sanjar", "Tohir", "Umid",
    "Vohid", "Yusuf", "Zokir", "Abdulla", "Baxtiyor", "Eldor", "Gofur", "Hakim",
    "Islom", "Javlon", "Komil", "Lochin", "Mirzo", "Nozim", "Ortiq", "Pulat",
    "Qodir", "Ravshan", "Shavkat", "Timur", "Umar", "Vali", "Xurshid", "Yodgor",
    "Zafar", "Alisher", "Botir", "Davron", "Erkin", "Farrux", "Gayrat", "Hamid"
]

FIRST_NAMES_FEMALE = [
    "Malika", "Nilufar", "Gulnora", "Sevara", "Dilnoza", "Madina", "Aziza",
    "Barno", "Charos", "Dilfuza", "Feruza", "Gavhar", "Hilola", "Iroda",
    "Jamila", "Kamola", "Lola", "Maftuna", "Nafisa", "Oysha", "Parizod",
    "Qunduz", "Rano", "Saida", "Tursunoy", "Umida", "Vasila", "Xurshida",
    "Yulduz", "Zarina", "Adolat", "Bonu", "Dildora", "Elmira", "Fatima",
    "Gulbahor", "Husniya", "Inoyat", "Jumagul", "Komila", "Laylo", "Mavluda"
]

LAST_NAMES = [
    "Karimov", "Rahimov", "Toshmatov", "Ergashev", "Nurmatov", "Olimov",
    "Pardayev", "Qodirov", "Rashidov", "Saidov", "Tojiboyev", "Umarov",
    "Valiyev", "Xolmatov", "Yusupov", "Zokirov", "Abdullayev", "Botirov",
    "Davronov", "Eshonqulov", "Fayzullayev", "G'ulomov", "Hasanov", "Ibrohimov",
    "Jalilov", "Komilov", "Latipov", "Mahmudov", "Nazarov", "Ortiqov",
    "Pirimqulov", "Qurbonov", "Raxmonov", "Salimov", "Tursunov", "Usmonov"
]

MIDDLE_NAMES_MALE = [
    "Akramovich", "Bahodirovich", "Dilmurodovich", "Erkinovich", "Faxriddinovich",
    "G'ayratovich", "Hamidovich", "Islomovich", "Jamolovich", "Kamoliddinovich",
    "Lazizovich", "Mansurovich", "Nodirbekovich", "Olimovich", "Pulodovich"
]

MIDDLE_NAMES_FEMALE = [
    "Akramovna", "Bahodirovna", "Dilmurodovna", "Erkinovna", "Faxriddinovna",
    "G'ayratovna", "Hamidovna", "Islomovna", "Jamolovna", "Kamoliddinovna",
    "Lazizovna", "Mansurovna", "Nodirbekovna", "Olimovna", "Pulodovna"
]

# Tashkilot nomlari
ORG_NAMES = [
    "Xatirchi tuman Hokimligi",
    "Xatirchi tuman Ta'lim boshqarmasi",
    "Xatirchi tuman Moliya bo'limi",
    "Xatirchi tuman Soliq inspeksiyasi",
    "Xatirchi tuman Ichki ishlar bo'limi",
    "Xatirchi tuman Tibbiyot birlashmasi",
    "Xatirchi tuman Qishloq xo'jaligi bo'limi",
    "Xatirchi tuman Yer resurslari bo'limi",
    "Xatirchi tuman Arxitektura bo'limi",
    "Xatirchi tuman Yoshlar ishlari bo'limi",
    "Xatirchi tuman Madaniyat bo'limi",
    "Xatirchi tuman Sport ishlari bo'limi",
    "Xatirchi tuman Elektr tarmoqlari",
    "Xatirchi tuman Gaz xo'jaligi",
    "Xatirchi tuman Suv xo'jaligi",
    "Xatirchi tuman Yo'l xo'jaligi",
    "Xatirchi tuman Ijtimoiy himoya markazi",
    "Xatirchi tuman Bandlik markazi",
    "Xatirchi tuman Statistika bo'limi",
    "Xatirchi tuman Davlat xizmatlari markazi",
]

# Sektor nomlari
SECTOR_NAMES = [
    ("Ta'lim", "TALIM"),
    ("Sog'liqni saqlash", "SOGLIQ"),
    ("Qishloq xo'jaligi", "QISHLOQ"),
    ("Moliya va iqtisodiyot", "MOLIYA"),
    ("Kommunal xo'jalik", "KOMMUNAL"),
    ("Ijtimoiy himoya", "IJTIMOIY"),
    ("Madaniyat va sport", "MADANIYAT"),
    ("Qurilish va arxitektura", "QURILISH"),
]

# Topshiriq sarlavhalari
TASK_TITLES = [
    "2026-yil 1-chorak hisobotini tayyorlash",
    "Maktab ta'mirlash ishlarini nazorat qilish",
    "Aholini ro'yxatga olish ishlarini tashkil etish",
    "Qishloq yo'llarini ta'mirlash",
    "Suv ta'minoti tizimini yaxshilash",
    "Elektr tarmog'ini modernizatsiya qilish",
    "Bog'cha binolarini tekshirish",
    "Tibbiyot muassasalarini jihozlash",
    "Fermer xo'jaliklarini qo'llab-quvvatlash",
    "Yoshlar bandligini ta'minlash",
    "Madaniyat tadbirlarini tashkil etish",
    "Sport inshootlarini ta'mirlash",
    "Ko'kalamzorlashtirish ishlarini olib borish",
    "Atrof-muhitni muhofaza qilish choralarini ko'rish",
    "Ichimlik suvi sifatini tekshirish",
    "Qishki mavsumga tayyorgarlik",
    "O'quv yili boshlanishiga tayyorgarlik",
    "Dehqonchilik maydonlarini kengaytirish",
    "Yangi ish o'rinlarini yaratish",
    "Aholi muammolarini o'rganish",
    "Nogiron fuqarolarni qo'llab-quvvatlash",
    "Kam ta'minlangan oilalarga yordam",
    "Tadbirkorlikni rivojlantirish",
    "Transport xizmatlarini yaxshilash",
    "Jamoat tartibi va xavfsizligini ta'minlash",
    "Soliq yig'imini tashkil etish",
    "Byudjet ijrosini nazorat qilish",
    "Investitsiyalarni jalb etish",
    "Eksport hajmini oshirish",
    "Mahalliy ishlab chiqarishni qo'llab-quvvatlash",
]

# Chat xabarlari
CHAT_MESSAGES = [
    "Assalomu alaykum!",
    "Vaalaykum assalom!",
    "Bugungi yig'ilish qachun boshlanadi?",
    "Soat 14:00 da boshlaymiz",
    "Hisobot tayyor bo'ldimi?",
    "Ha, jo'natdim email orqali",
    "Rahmat, ko'rib chiqaman",
    "Yangi topshiriq keldi, qarab chiqing",
    "Xo'p, hozir ko'raman",
    "Muddat qachun tugaydi?",
    "Bu hafta oxirigacha",
    "Tushunarli, bajarib qo'yaman",
    "Agar savolingiz bo'lsa, yozing",
    "Albatta, rahmat",
    "Yig'ilishda qatnashasizmi?",
    "Ha, albatta kelaman",
    "Hujjatlarni tayyorlab qo'ying",
    "Hammasi tayyor",
    "Zo'r, kutib turaman",
    "Bir masala bor edi...",
    "Tinglayapman",
    "Ertaga uchrashsak bo'ladimi?",
    "Qaysi vaqtda qulay?",
    "Tushlikdan keyin",
    "Xo'p, kutib olaman",
]

# Bildirishnoma xabarlari
NOTIFICATION_MESSAGES = [
    ("Yangi topshiriq berildi", "Sizga yangi topshiriq tayinlandi. Iltimos, ko'rib chiqing.", "TASK"),
    ("Muddat yaqinlashmoqda", "Topshiriq muddati 2 kun ichida tugaydi.", "DEADLINE"),
    ("Topshiriq bajarildi", "Sizning topshirig'ingiz muvaffaqiyatli bajarildi.", "SUCCESS"),
    ("Tizim yangilandi", "Platforma yangi versiyaga yangilandi.", "SYSTEM"),
    ("Yangi xabar", "Sizga yangi xabar keldi.", "INFO"),
    ("Muhim ogohlantirish", "Iltimos, muddat tugashidan oldin topshiriqni bajaring.", "WARNING"),
    ("Hisobot qabul qilindi", "Sizning hisobotingiz muvaffaqiyatli qabul qilindi.", "SUCCESS"),
    ("Yig'ilish eslatmasi", "Ertaga soat 10:00 da yig'ilish bo'ladi.", "INFO"),
]

# Murojaat sarlavhalari
APPEAL_TITLES = [
    "Yo'l ta'mirlash haqida murojaat",
    "Suv ta'minoti muammosi",
    "Elektr uzilishi haqida shikoyat",
    "Maktabdagi ta'mirlash ishlari",
    "Tibbiyot xizmati sifati",
    "Ko'cha yoritilishi muammosi",
    "Axlat tashish xizmati",
    "Ijtimoiy yordam olish",
    "Ish bilan ta'minlash masalasi",
    "Gaz ta'minoti muammosi",
    "Kanalizatsiya tizimi buzilishi",
    "Bolalar bog'chasi joyi",
    "Transport xizmati shikoyati",
    "Qurilish ruxsatnomasi",
    "Yer ajratish masalasi",
    "Pensiya to'lovlari",
    "Nafaqa to'lovlari",
    "Ko'chmas mulk masalasi",
    "Qo'shnilar bilan nizo",
    "Shovqin muammosi",
]

# Topshiriq ichidagi xabarlar
TASK_MESSAGE_TEMPLATES = [
    "Topshiriqni ko'rib chiqdim, ishga kirishdim.",
    "Birinchi bosqich bajarildi.",
    "Zarur hujjatlar yig'ilmoqda.",
    "Joy bilan tanishdim, o'lchov ishlarini boshlaymiz.",
    "Hisobot tayyorlanmoqda.",
    "Qo'shimcha ma'lumot kerak bo'ladi.",
    "Ish 50% ga bajarildi.",
    "Ish 80% ga bajarildi.",
    "Ish to'liq bajarildi, tasdiqlash kutilmoqda.",
    "Zarur materiallar buyurtma qilindi.",
    "Ishchilar jalb qilindi.",
    "Byudjet mablag'lari ajratildi.",
    "Texnika jalb qilindi.",
    "Loyiha hujjatlari tayyorlandi.",
    "Ekspertiza o'tkazildi.",
    "Shartnoma imzolandi.",
    "Ish boshlanish sanasi belgilandi.",
    "Qabul komisyasi tuzildi.",
    "Dalolatnoma rasmiylashtirildi.",
    "Foto hisobot tayyorlandi.",
]


def generate_pnfl():
    """Generate random 14-digit PNFL"""
    return ''.join([str(random.randint(0, 9)) for _ in range(14)])


def generate_phone():
    """Generate random Uzbek phone number"""
    prefixes = ['90', '91', '93', '94', '95', '97', '98', '99', '88', '33']
    prefix = random.choice(prefixes)
    number = ''.join([str(random.randint(0, 9)) for _ in range(7)])
    return f"+998{prefix}{number}"


def create_sectors():
    """Create sectors"""
    print("\n📍 Sektorlar yaratilmoqda...")
    sectors = []
    for name, code in SECTOR_NAMES:
        sector, created = Sector.objects.get_or_create(
            name=name,
            defaults={"description": f"{name} sektori"}
        )
        sectors.append(sector)
        if created:
            print(f"  ✓ {name}")
    return sectors


def create_organizations(sectors):
    """Create organizations"""
    print("\n🏢 Tashkilotlar yaratilmoqda...")
    orgs = []
    for i, name in enumerate(ORG_NAMES):
        sector = random.choice(sectors) if sectors else None
        short_name = name.split()[-1][:10] if len(name.split()) > 1 else name[:10]
        
        org, created = Organization.objects.get_or_create(
            name=name,
            defaults={
                "short_name": short_name,
                "sector": sector,
                "region": "Navoiy viloyati",
                "district": "Xatirchi tumani",
                "address": f"Xatirchi tumani, {i+1}-mavze",
                "phone": generate_phone(),
                "is_active": True,
            }
        )
        orgs.append(org)
        if created:
            print(f"  ✓ {name}")
    return orgs


def create_users(orgs):
    """Create users with different roles"""
    print("\n👥 Foydalanuvchilar yaratilmoqda...")
    users = []
    
    # Admin user
    admin, created = User.objects.get_or_create(
        pnfl="00000000000001",
        defaults={
            "first_name": "Admin",
            "last_name": "Adminov",
            "middle_name": "Adminovich",
            "role": "ADMIN",
            "phone": "+998901234567",
            "email": "admin@xatirchi.uz",
            "status": "FAOL",
            "is_active": True,
            "is_staff": True,
            "is_superuser": True,
        }
    )
    admin.set_password("admin123")
    admin.save()
    if created:
        print(f"  ✓ Admin: admin@xatirchi.uz (PNFL: 00000000000001, Parol: admin123)")
    else:
        print(f"  ↺ Admin: mavjud, parol yangilandi")
    users.append(admin)
    
    # Hokim
    hokim_org = orgs[0] if orgs else None
    hokim, created = User.objects.get_or_create(
        pnfl="10000000000001",
        defaults={
            "first_name": "Abdulla",
            "last_name": "Rahimov",
            "middle_name": "Karimovich",
            "role": "HOKIM",
            "organization": hokim_org,
            "position": "Tuman hokimi",
            "phone": "+998901111111",
            "email": "hokim@xatirchi.uz",
            "status": "FAOL",
            "is_active": True,
        }
    )
    hokim.set_password("hokim123")
    hokim.save()
    if hokim_org:
        hokim_org.director_name = hokim.full_name
        hokim_org.save()
    if created:
        print(f"  ✓ Hokim: {hokim.full_name} (PNFL: 10000000000001, Parol: hokim123)")
    else:
        print(f"  ↺ Hokim: mavjud, parol yangilandi")
    users.append(hokim)
    
    # Hokimlik mas'ullari (3 ta)
    for i in range(3):
        is_male = random.choice([True, False])
        first_name = random.choice(FIRST_NAMES_MALE if is_male else FIRST_NAMES_FEMALE)
        last_name = random.choice(LAST_NAMES)
        middle_name = random.choice(MIDDLE_NAMES_MALE if is_male else MIDDLE_NAMES_FEMALE)
        pnfl = f"2000000000000{i+1}"
        
        masul, created = User.objects.get_or_create(
            pnfl=pnfl,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "middle_name": middle_name,
                "role": "HOKIMLIK_MASUL",
                "organization": hokim_org,
                "position": f"Hokimlik mas'uli #{i+1}",
                "phone": generate_phone(),
                "email": f"masul{i+1}@xatirchi.uz",
                "status": "FAOL",
                "is_active": True,
            }
        )
        masul.set_password("masul123")
        masul.save()
        if created:
            print(f"  ✓ Hokimlik mas'uli: {masul.full_name} (PNFL: {pnfl}, Parol: masul123)")
        users.append(masul)
    
    # Tashkilot rahbarlari (har bir tashkilot uchun)
    for i, org in enumerate(orgs[1:], start=1):  # Hokimlikdan tashqari
        is_male = random.choice([True, False])
        first_name = random.choice(FIRST_NAMES_MALE if is_male else FIRST_NAMES_FEMALE)
        last_name = random.choice(LAST_NAMES)
        middle_name = random.choice(MIDDLE_NAMES_MALE if is_male else MIDDLE_NAMES_FEMALE)
        pnfl = f"30{str(i).zfill(12)}"
        
        rahbar, created = User.objects.get_or_create(
            pnfl=pnfl,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "middle_name": middle_name,
                "role": "TASHKILOT_RAHBARI",
                "organization": org,
                "position": "Rahbar",
                "phone": generate_phone(),
                "email": f"rahbar{i}@xatirchi.uz",
                "status": "FAOL",
                "is_active": True,
            }
        )
        rahbar.set_password("rahbar123")
        rahbar.save()
        if created:
            org.director_name = rahbar.full_name
            org.save()
            print(f"  ✓ Tashkilot rahbari: {rahbar.full_name} ({org.name[:30]}...)")
        users.append(rahbar)
    
    # Tashkilot mas'ullari (har bir tashkilotda 2-3 ta)
    masul_count = 0
    for org in orgs[1:]:
        for j in range(random.randint(2, 3)):
            is_male = random.choice([True, False])
            first_name = random.choice(FIRST_NAMES_MALE if is_male else FIRST_NAMES_FEMALE)
            last_name = random.choice(LAST_NAMES)
            middle_name = random.choice(MIDDLE_NAMES_MALE if is_male else MIDDLE_NAMES_FEMALE)
            pnfl = f"4{str(masul_count).zfill(13)}"
            
            masul, created = User.objects.get_or_create(
                pnfl=pnfl,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "middle_name": middle_name,
                    "role": "TASHKILOT_MASUL",
                    "organization": org,
                    "position": f"Mas'ul #{j+1}",
                    "phone": generate_phone(),
                    "email": f"tmasul{masul_count}@xatirchi.uz",
                    "status": "FAOL",
                    "is_active": True,
                }
            )
            masul.set_password("masul123")
            masul.save()
            if created:
                masul_count += 1
            users.append(masul)
    
    print(f"\n  📊 Jami {len(users)} ta foydalanuvchi yaratildi/mavjud")
    print(f"  🔑 Barcha foydalanuvchilar uchun standart parollar:")
    print(f"      Admin: admin123")
    print(f"      Hokim: hokim123")
    print(f"      Hokimlik mas'uli: masul123")
    print(f"      Tashkilot rahbari: rahbar123")
    print(f"      Tashkilot mas'ul: masul123")
    return users


def create_tasks(users, orgs):
    """Create tasks"""
    print("\n📋 Topshiriqlar yaratilmoqda...")
    tasks = []
    
    # Hokimlar va mas'ullar
    hokims = [u for u in users if u.role in ['HOKIM', 'HOKIMLIK_MASUL']]
    if not hokims:
        print("  ⚠ Hokim yoki mas'ul topilmadi!")
        return tasks
    
    priorities = ['PAST', 'ODDIY', 'YUQORI', 'FAVQULODDA']
    statuses = ['YANGI', 'IJRODA', 'BAJARILDI', 'MUDDATI_KECH', 'NAZORATDAN_YECHILDI']
    
    # 50 ta topshiriq yaratamiz
    for i in range(50):
        title = random.choice(TASK_TITLES)
        # Make title unique by adding number
        title = f"{title} #{i+1}"
        
        creator = random.choice(hokims)
        priority = random.choice(priorities)
        status = random.choice(statuses)
        
        # Random deadline (from 7 days ago to 30 days in future)
        days_offset = random.randint(-7, 30)
        deadline = timezone.now() + timedelta(days=days_offset)
        
        # Location (Xatirchi coordinates with some variance)
        lat = Decimal('40.2') + Decimal(str(random.uniform(-0.1, 0.1)))
        lon = Decimal('65.2') + Decimal(str(random.uniform(-0.1, 0.1)))
        
        task, created = Task.objects.get_or_create(
            title=title,
            defaults={
                "description": f"{title} bo'yicha batafsil ma'lumot. Bu topshiriq {creator.full_name} tomonidan berilgan.",
                "priority": priority,
                "status": status,
                "deadline": deadline,
                "created_by": creator,
                "latitude": lat,
                "longitude": lon,
                "address": f"Xatirchi tumani, {random.randint(1, 20)}-mahalla",
                "completed_at": timezone.now() if status == 'BAJARILDI' else None,
                "closed_at": timezone.now() if status == 'NAZORATDAN_YECHILDI' else None,
            }
        )
        
        if created:
            # Assign to random organizations (1-3)
            assigned_orgs = random.sample(orgs[1:], min(random.randint(1, 3), len(orgs)-1))
            for org in assigned_orgs:
                TaskOrganization.objects.get_or_create(
                    task=task,
                    organization=org,
                    defaults={
                        "status": random.choice(['YANGI', 'IJRODA', 'BAJARILDI']),
                    }
                )
            tasks.append(task)
    
    print(f"  📊 Jami {len(tasks)} ta yangi topshiriq yaratildi")
    return tasks


def create_messages(users):
    """Create chat messages - more conversations"""
    print("\n💬 Chat xabarlari yaratilmoqda...")
    messages_created = 0
    
    # Create realistic conversations between user pairs
    for _ in range(200):  # More messages
        if len(users) < 2:
            break
            
        sender, recipient = random.sample(users, 2)
        content = random.choice(CHAT_MESSAGES)
        
        # Create message
        msg = DirectMessage.objects.create(
            sender=sender,
            recipient=recipient,
            content=content,
            is_read=random.choice([True, True, True, False]),  # 75% read
        )
        
        # Update conversation
        conversation = ChatConversation.get_or_create_conversation(sender, recipient)
        conversation.last_message = msg
        conversation.save()
        
        messages_created += 1
    
    # Create conversation threads (back-and-forth)
    print("  📝 Suhbat tarmoqlari yaratilmoqda...")
    for _ in range(30):  # 30 conversation threads
        if len(users) < 2:
            break
        user1, user2 = random.sample(users, 2)
        
        # 5-10 messages in each thread
        msg = None
        for i in range(random.randint(5, 10)):
            sender = user1 if i % 2 == 0 else user2
            recipient = user2 if i % 2 == 0 else user1
            content = random.choice(CHAT_MESSAGES)
            
            msg = DirectMessage.objects.create(
                sender=sender,
                recipient=recipient,
                content=content,
                is_read=True if i < random.randint(3, 8) else False,
            )
            messages_created += 1
        
        # Update conversation with last message
        if msg:
            conversation = ChatConversation.get_or_create_conversation(user1, user2)
            conversation.last_message = msg
            conversation.save()
    
    print(f"  📊 Jami {messages_created} ta xabar yaratildi")


def create_task_messages(tasks, users):
    """Create task internal messages/chat"""
    print("\n📝 Topshiriq ichidagi xabarlar yaratilmoqda...")
    messages_created = 0
    
    for task in tasks:
        # Get related users (creator + assigned organizations' users)
        task_orgs = TaskOrganization.objects.filter(task=task)
        related_users = [task.created_by]
        
        for to in task_orgs:
            org_users = [u for u in users if u.organization_id == to.organization.id]
            related_users.extend(org_users[:3])  # Max 3 users per org
        
        if len(related_users) < 2:
            continue
        
        # Create 3-8 messages per task
        for i in range(random.randint(3, 8)):
            sender = random.choice(related_users)
            content = random.choice(TASK_MESSAGE_TEMPLATES)
            
            TaskMessage.objects.create(
                task=task,
                sender=sender,
                message_type='TEXT',
                content=content,
                is_read=random.choice([True, True, False]),
            )
            messages_created += 1
    
    print(f"  📊 Jami {messages_created} ta topshiriq xabari yaratildi")


def create_appeals(users, orgs):
    """Create appeals (murojatlar) as special tasks"""
    print("\n📨 Murojatlar yaratilmoqda...")
    appeals_created = 0
    
    hokims = [u for u in users if u.role in ['HOKIM', 'HOKIMLIK_MASUL']]
    if not hokims:
        print("  ⚠ Hokim yoki mas'ul topilmadi!")
        return []
    
    priorities = ['PAST', 'ODDIY', 'YUQORI', 'FAVQULODDA']
    statuses = ['YANGI', 'IJRODA', 'BAJARILDI', 'MUDDATI_KECH']
    
    appeals = []
    for i, title in enumerate(APPEAL_TITLES):
        title_with_num = f"Murojaat #{i+1}: {title}"
        creator = random.choice(hokims)
        priority = random.choice(priorities)
        status = random.choice(statuses)
        
        days_offset = random.randint(-14, 21)
        deadline = timezone.now() + timedelta(days=days_offset)
        
        lat = Decimal('40.2') + Decimal(str(random.uniform(-0.1, 0.1)))
        lon = Decimal('65.2') + Decimal(str(random.uniform(-0.1, 0.1)))
        
        # Fuqaro ismi
        citizen_first = random.choice(FIRST_NAMES_MALE + FIRST_NAMES_FEMALE)
        citizen_last = random.choice(LAST_NAMES)
        
        appeal, created = Task.objects.get_or_create(
            title=title_with_num,
            defaults={
                "description": f"Fuqaro {citizen_first} {citizen_last} tomonidan yuborilgan murojaat.\n\n{title} bo'yicha batafsil ma'lumot. Fuqaro o'z murojaatida ushbu masalani hal qilishni so'ramoqda.",
                "priority": priority,
                "status": status,
                "category": "IJRO",  # Appeals category
                "deadline": deadline,
                "created_by": creator,
                "latitude": lat,
                "longitude": lon,
                "address": f"Xatirchi tumani, {random.randint(1, 20)}-mahalla, {random.randint(1, 100)}-uy",
                "completed_at": timezone.now() if status == 'BAJARILDI' else None,
            }
        )
        
        if created:
            # Assign to random organization
            assigned_org = random.choice(orgs[1:]) if len(orgs) > 1 else orgs[0]
            TaskOrganization.objects.get_or_create(
                task=appeal,
                organization=assigned_org,
                defaults={
                    "status": random.choice(['YANGI', 'IJRODA', 'BAJARILDI']),
                }
            )
            appeals.append(appeal)
            appeals_created += 1
    
    print(f"  📊 Jami {appeals_created} ta murojaat yaratildi")
    return appeals


def create_task_executions(tasks, users):
    """Create task execution history"""
    print("\n📋 Topshiriq ijro tarixi yaratilmoqda...")
    executions_created = 0
    
    action_types = ['IJROGA_OLINDI', 'HISOBOT_TOPSHIRILDI', 'IZOH_QOSHILDI', 'FAYL_YUKLANDI']
    
    for task in tasks:
        task_orgs = TaskOrganization.objects.filter(task=task)
        
        for to in task_orgs:
            org_users = [u for u in users if u.organization_id == to.organization.id]
            if not org_users:
                continue
            
            # 1-3 execution records per task-org
            for _ in range(random.randint(1, 3)):
                executor = random.choice(org_users)
                action_type = random.choice(action_types)
                
                TaskExecution.objects.create(
                    task=task,
                    task_organization=to,
                    executed_by=executor,
                    action_type=action_type,
                    comment=f"{random.choice(TASK_MESSAGE_TEMPLATES)}",
                )
                executions_created += 1
    
    print(f"  📊 Jami {executions_created} ta ijro yozuvi yaratildi")


def create_notifications(users, tasks):
    """Create notifications"""
    print("\n🔔 Bildirishnomalar yaratilmoqda...")
    notifications_created = 0
    
    for user in users:
        # 3-7 notifications per user
        for _ in range(random.randint(3, 7)):
            title, message, notif_type = random.choice(NOTIFICATION_MESSAGES)
            related_task = random.choice(tasks) if tasks and random.random() > 0.5 else None
            
            Notification.objects.create(
                user=user,
                title=title,
                message=message,
                notification_type=notif_type,
                related_task=related_task,
                is_read=random.choice([True, True, False]),  # 66% read
                link=f"/dashboard/tasks/{related_task.id}" if related_task else "",
            )
            notifications_created += 1
    
    print(f"  📊 Jami {notifications_created} ta bildirishnoma yaratildi")


def create_recurring_tasks(users, orgs):
    """Create recurring tasks"""
    print("\n🔄 Takrorlanuvchi topshiriqlar yaratilmoqda...")
    from tasks.models import RecurringTask
    
    # Hokimlar va mas'ullar
    hokims = [u for u in users if u.role in ['HOKIM', 'HOKIMLIK_MASUL']]
    if not hokims:
        print("  ⚠ Hokim yoki mas'ul topilmadi!")
        return []
    
    recurring_templates = [
        {
            "title": "Oylik hisobot tayyorlash",
            "description": "Har oy oxirida barcha bo'limlar oylik faoliyat hisobotini taqdim etishi kerak.",
            "frequency": "MONTHLY",
            "deadline_days": 5,
            "priority": "YUQORI",
        },
        {
            "title": "Haftalik yig'ilish o'tkazish",
            "description": "Har hafta dushanba kuni rahbarlar yig'ilishi o'tkaziladi.",
            "frequency": "WEEKLY",
            "deadline_days": 1,
            "priority": "ODDIY",
        },
        {
            "title": "Choraklik moliyaviy hisobot",
            "description": "Har chorakda moliyaviy hisobot tayyorlash va taqdim etish.",
            "frequency": "QUARTERLY",
            "deadline_days": 15,
            "priority": "FAVQULODDA",
        },
        {
            "title": "Kunlik monitoring",
            "description": "Har kunlik vaziyat monitoringi va hisoboti.",
            "frequency": "DAILY",
            "deadline_days": 1,
            "priority": "PAST",
        },
        {
            "title": "O'quv yili boshlanishiga tayyorgarlik",
            "description": "Har yili avgustda o'quv yili boshlanishiga tayyorgarlik ko'rish.",
            "frequency": "YEARLY",
            "deadline_days": 30,
            "priority": "YUQORI",
        },
        {
            "title": "Ikki haftalik tekshiruv",
            "description": "Ikki haftada bir marta tashkilotlarni tekshirish.",
            "frequency": "BIWEEKLY",
            "deadline_days": 3,
            "priority": "ODDIY",
        },
    ]
    
    recurring_tasks = []
    for template in recurring_templates:
        creator = random.choice(hokims)
        assigned_orgs = random.sample(orgs[1:], min(random.randint(2, 5), len(orgs)-1))
        
        rt, created = RecurringTask.objects.get_or_create(
            title=template["title"],
            defaults={
                "description": template["description"],
                "frequency": template["frequency"],
                "priority": template["priority"],
                "deadline_days": template["deadline_days"],
                "start_date": timezone.now().date(),
                "created_by": creator,
                "status": "ACTIVE",
            }
        )
        
        if created:
            # Tashkilotlar qo'shish
            rt.organizations.set(assigned_orgs)
            recurring_tasks.append(rt)
            print(f"  ✓ {template['title']}")
    
    print(f"  📊 Jami {len(recurring_tasks)} ta takrorlanuvchi topshiriq yaratildi")
    return recurring_tasks


def create_telegram_bot_data():
    """Telegram bot uchun murojaat turlari va kategoriyalarini yaratish"""
    print("\n📱 TELEGRAM BOT MA'LUMOTLARI YARATILMOQDA...")
    
    # Murojaat turlari
    appeal_types_data = [
        {"name_uz": "Ariza", "name_ru": "Заявление", "name_en": "Application", "icon": "📋", "order": 1},
        {"name_uz": "Shikoyat", "name_ru": "Жалоба", "name_en": "Complaint", "icon": "⚠️", "order": 2},
        {"name_uz": "Taklif", "name_ru": "Предложение", "name_en": "Suggestion", "icon": "💡", "order": 3},
        {"name_uz": "So'rov", "name_ru": "Запрос", "name_en": "Request", "icon": "❓", "order": 4},
    ]
    
    appeal_types = []
    for data in appeal_types_data:
        at, created = AppealType.objects.get_or_create(
            name_uz=data['name_uz'],
            defaults=data
        )
        appeal_types.append(at)
        status = "yaratildi" if created else "mavjud"
        print(f"  ✓ Murojaat turi: {data['name_uz']} ({status})")
    
    # Kategoriyalar (sohalar)
    categories_data = [
        {"name_uz": "Ta'lim va fan", "name_ru": "Образование и наука", "name_en": "Education", "icon": "📚", "order": 1},
        {"name_uz": "Sog'liqni saqlash", "name_ru": "Здравоохранение", "name_en": "Healthcare", "icon": "🏥", "order": 2},
        {"name_uz": "Kommunal xizmatlar", "name_ru": "Коммунальные услуги", "name_en": "Utilities", "icon": "🔧", "order": 3},
        {"name_uz": "Yo'l va transport", "name_ru": "Дороги и транспорт", "name_en": "Roads & Transport", "icon": "🚗", "order": 4},
        {"name_uz": "Ijtimoiy himoya", "name_ru": "Социальная защита", "name_en": "Social Protection", "icon": "🤝", "order": 5},
        {"name_uz": "Qurilish va arxitektura", "name_ru": "Строительство и архитектура", "name_en": "Construction", "icon": "🏗️", "order": 6},
        {"name_uz": "Yer masalalari", "name_ru": "Земельные вопросы", "name_en": "Land Issues", "icon": "🏞️", "order": 7},
        {"name_uz": "Ekologiya", "name_ru": "Экология", "name_en": "Ecology", "icon": "🌿", "order": 8},
        {"name_uz": "Xavfsizlik", "name_ru": "Безопасность", "name_en": "Security", "icon": "🛡️", "order": 9},
        {"name_uz": "Boshqa", "name_ru": "Другое", "name_en": "Other", "icon": "📁", "order": 10},
    ]
    
    categories = []
    for data in categories_data:
        cat, created = AppealCategory.objects.get_or_create(
            name_uz=data['name_uz'],
            defaults=data
        )
        categories.append(cat)
        status = "yaratildi" if created else "mavjud"
        print(f"  ✓ Kategoriya: {data['name_uz']} ({status})")
    
    # Hududlar (mahallalar)
    regions_data = [
        {"name_uz": "Hatirchi shaharchasi", "name_ru": "г. Хатирчи", "name_en": "Hatirchi town", "order": 1},
        {"name_uz": "Gulzor MFY", "name_ru": "МСГ Гулзор", "name_en": "Gulzor MFY", "order": 2},
        {"name_uz": "Bogʻishamol MFY", "name_ru": "МСГ Богишамол", "name_en": "Bogishamol MFY", "order": 3},
        {"name_uz": "Yangi hayot MFY", "name_ru": "МСГ Янги хаёт", "name_en": "Yangi hayot MFY", "order": 4},
        {"name_uz": "Mustaqillik MFY", "name_ru": "МСГ Мустакиллик", "name_en": "Mustaqillik MFY", "order": 5},
        {"name_uz": "Navbahor MFY", "name_ru": "МСГ Навбахор", "name_en": "Navbahor MFY", "order": 6},
        {"name_uz": "Tinchlik MFY", "name_ru": "МСГ Тинчлик", "name_en": "Tinchlik MFY", "order": 7},
        {"name_uz": "Oqtepa MFY", "name_ru": "МСГ Октепа", "name_en": "Oqtepa MFY", "order": 8},
    ]
    
    regions = []
    for data in regions_data:
        region, created = BotRegion.objects.get_or_create(
            name_uz=data['name_uz'],
            defaults=data
        )
        regions.append(region)
        status = "yaratildi" if created else "mavjud"
        print(f"  ✓ Hudud: {data['name_uz']} ({status})")
    
    print(f"\n  📊 Telegram bot ma'lumotlari:")
    print(f"     • Murojaat turlari: {len(appeal_types)}")
    print(f"     • Kategoriyalar: {len(categories)}")
    print(f"     • Hududlar: {len(regions)}")
    
    return appeal_types, categories, regions


def main():
    print("=" * 60)
    print("🚀 E-HOKIMIYAT TEST MA'LUMOTLARI GENERATORI")
    print("=" * 60)
    print(f"Sana: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 60)
    
    # Create data
    sectors = create_sectors()
    orgs = create_organizations(sectors)
    users = create_users(orgs)
    tasks = create_tasks(users, orgs)
    appeals = create_appeals(users, orgs)
    all_tasks = tasks + appeals
    create_messages(users)
    create_task_messages(all_tasks, users)
    create_task_executions(all_tasks, users)
    create_notifications(users, all_tasks)
    create_recurring_tasks(users, orgs)
    create_telegram_bot_data()
    
    print("\n" + "=" * 60)
    print("✅ BARCHA MA'LUMOTLAR MUVAFFAQIYATLI YARATILDI!")
    print("=" * 60)
    
    # Import RecurringTask for statistics
    from tasks.models import RecurringTask
    
    # Statistics
    print("\n📊 STATISTIKA:")
    print(f"  • Sektorlar: {Sector.objects.count()}")
    print(f"  • Tashkilotlar: {Organization.objects.count()}")
    print(f"  • Foydalanuvchilar: {User.objects.count()}")
    print(f"  • Topshiriqlar: {Task.objects.count()}")
    print(f"  • Murojatlar (IJRO): {Task.objects.filter(category='IJRO').count()}")
    print(f"  • Takrorlanuvchi topshiriqlar: {RecurringTask.objects.count()}")
    print(f"  • Chat xabarlari: {DirectMessage.objects.count()}")
    print(f"  • Topshiriq xabarlari: {TaskMessage.objects.count()}")
    print(f"  • Ijro yozuvlari: {TaskExecution.objects.count()}")
    print(f"  • Bildirishnomalar: {Notification.objects.count()}")
    print(f"  • Bot murojaat turlari: {AppealType.objects.count()}")
    print(f"  • Bot kategoriyalar: {AppealCategory.objects.count()}")
    print(f"  • Bot hududlar: {BotRegion.objects.count()}")
    
    print("\n🔑 TEST LOGIN MA'LUMOTLARI:")
    print("  ┌─────────────────────┬────────────────┬────────────┐")
    print("  │ Rol                 │ PNFL           │ Parol      │")
    print("  ├─────────────────────┼────────────────┼────────────┤")
    print("  │ Admin               │ 00000000000001 │ admin123   │")
    print("  │ Hokim               │ 10000000000001 │ hokim123   │")
    print("  │ Hokimlik mas'uli #1 │ 20000000000001 │ masul123   │")
    print("  │ Hokimlik mas'uli #2 │ 20000000000002 │ masul123   │")
    print("  │ Hokimlik mas'uli #3 │ 20000000000003 │ masul123   │")
    print("  │ Tashkilot rahbari   │ 30000000000001 │ rahbar123  │")
    print("  │ Tashkilot mas'ul    │ 40000000000000 │ masul123   │")
    print("  └─────────────────────┴────────────────┴────────────┘")
    print("-" * 60)


if __name__ == "__main__":
    main()
