#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, timedelta
import random

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ehokimiyat.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from users.models import User
from organizations.models import Organization, Sector
from tasks.models import Task, TaskOrganization
from notifications.models import Notification
from audit.models import AuditLog

def populate_database():
    print("🚀 Starting database population...")
    
    # Create sectors
    print("📍 Creating sectors...")
    sector_data = [
        {"name": "Oila qo'llab-quvvatlash", "code": "OILA_QOLLAB_QUVVATLASH"},
        {"name": "Sohta rang", "code": "SOHTA_RANG"},
        {"name": "Qayta ishlash", "code": "QAYTA_ISHLASH"},
        {"name": "Agro totsir", "code": "AGRO_TOTSIR"},
    ]
    
    sectors = {}
    for sector_info in sector_data:
        sector, created = Sector.objects.get_or_create(
            name=sector_info["name"],
            defaults={"description": sector_info["name"]}
        )
        sectors[sector_info["code"]] = sector
        if created:
            print(f"  ✓ Created: {sector.name}")
    
    # Create test organizations
    print("🏢 Creating organizations...")
    org_data = [
        {"name": "Samarqand Viloyat Hokimlik", "code": "SAM_HK", "sector": "OILA_QOLLAB_QUVVATLASH"},
        {"name": "Samarqand Shahar Hokimlik", "code": "SAM_SH_HK", "sector": "OILA_QOLLAB_QUVVATLASH"},
        {"name": "Amaliy Ishlar Boshqarmasi", "code": "AIB", "sector": "AGRO_TOTSIR"},
        {"name": "Moliya Boshqarmasi", "code": "MB", "sector": "QAYTA_ISHLASH"},
        {"name": "Ta'lim Boshqarmasi", "code": "TB", "sector": "SOHTA_RANG"},
    ]
    
    orgs = []
    for org_info in org_data:
        org, created = Organization.objects.get_or_create(
            name=org_info["name"],
            defaults={
                "short_name": org_info["code"],
                "sector": sectors.get(org_info["sector"]),
                "region": "Samarqand",
                "district": "Samarqand Shahri",
                "is_active": True,
            }
        )
        orgs.append(org)
        if created:
            print(f"  ✓ Created: {org.name}")
    
    # Create test users (expanded)
    print("👥 Creating users...")
    user_data = [
        # Hokimiyat
        {
            "pnfl": "12345678901234",
            "first_name": "Qodirjon",
            "last_name": "Rakhimov",
            "role": "HOKIM",
            "organization": 0,
            "phone": "+998901234567",
            "email": "hokim@example.com",
        },
        {
            "pnfl": "12345678901235",
            "first_name": "Aziza",
            "last_name": "Ibrohimova",
            "role": "HOKIMLIK_MASUL",
            "organization": 0,
            "phone": "+998902345678",
            "email": "masul@example.com",
        },
        # Tashkilot rahbar va mas'ullar
        {
            "pnfl": "12345678901236",
            "first_name": "Sardor",
            "last_name": "Akramov",
            "role": "TASHKILOT_RAHBARI",
            "organization": 2,
            "phone": "+998903456789",
            "email": "rahbar@example.com",
        },
        {
            "pnfl": "12345678901237",
            "first_name": "Sevara",
            "last_name": "Usmanova",
            "role": "TASHKILOT_MASUL",
            "organization": 3,
            "phone": "+998904567890",
            "email": "tashkilot@example.com",
        },
        # Ijrochilar
        {
            "pnfl": "12345678901238",
            "first_name": "Behzod",
            "last_name": "Kholdorov",
            "role": "IJROCHI",
            "organization": 2,
            "phone": "+998905678901",
            "email": "ijrochi@example.com",
        },
        {
            "pnfl": "12345678901239",
            "first_name": "Dilshod",
            "last_name": "Karimov",
            "role": "IJROCHI",
            "organization": 3,
            "phone": "+998906111111",
            "email": "ijrochi2@example.com",
        },
        {
            "pnfl": "12345678901240",
            "first_name": "Madina",
            "last_name": "Ergasheva",
            "role": "IJROCHI",
            "organization": 4,
            "phone": "+998907222222",
            "email": "ijrochi3@example.com",
        },
    ]
    
    users = []
    for user_info in user_data:
        user, created = User.objects.get_or_create(
            pnfl=user_info["pnfl"],
            defaults={
                "first_name": user_info["first_name"],
                "last_name": user_info["last_name"],
                "role": user_info["role"],
                "organization": orgs[user_info["organization"]],
                "phone": user_info["phone"],
                "email": user_info["email"],
                "status": "FAOL",
                "is_active": True,
            }
        )
        users.append(user)
        if created:
            print(f"  ✓ Created: {user.first_name} {user.last_name} ({user.role})")
    
    # Create test tasks (expanded & aligned with enums)
    print("📋 Creating tasks...")
    
    base_tasks = [
        {
            "title": "COVID-19 profilaktikasi bo'yicha targ'ibot",
            "description": "Aholiga kasallik profilaktikasi bo'yicha ma'lumot tarqatish",
            "priority": "MUHIM",
            "category": "Sog'liqni saqlash",
            "status": "IJRODA",
            "deadline": datetime.now() + timedelta(days=7),
            "organizations": [0],
        },
        {
            "title": "Qishloq xo'jaligi mahsulotlarini ichki bozorda sotish",
            "description": "Mahalliy mahsulotlarni ichki bozorga yetkazish",
            "priority": "ODDIY",
            "category": "Iqtisodiyot",
            "status": "YANGI",
            "deadline": datetime.now() + timedelta(days=14),
            "organizations": [2],
        },
        {
            "title": "Plastik chiqindilarni qayta ishlash zavodi",
            "description": "Plastik chiqindilarni qayta ishlash quvvatini oshirish",
            "priority": "MUHIM_SHOSHILINCH",
            "category": "Ekologiya",
            "status": "IJRODA",
            "deadline": datetime.now() + timedelta(days=30),
            "organizations": [3],
        },
        {
            "title": "Qadimiy to'qimachilik san'atini qo'llab-quvvatlash",
            "description": "Hunarmandlar uchun grant dasturi",
            "priority": "ODDIY",
            "category": "Madaniyat",
            "status": "IJRODA",
            "deadline": datetime.now() + timedelta(days=21),
            "organizations": [4],
        },
        {
            "title": "Inson salomatligini oshirish dasturi",
            "description": "Profilaktika va sog'lom turmush tarzini targ'ib qilish",
            "priority": "MUHIM",
            "category": "Sog'liqni saqlash",
            "status": "BAJARILDI",
            "deadline": datetime.now() - timedelta(days=5),
            "organizations": [0, 1],
        },
        {
            "title": "Yozgi suv ta'minoti loyihasi",
            "description": "Shahar suv infratuzilmasini yaxshilash",
            "priority": "SHOSHILINCH",
            "category": "Infratuzilma",
            "status": "IJRODA",
            "deadline": datetime.now() + timedelta(days=10),
            "organizations": [1, 2],
        },
        {
            "title": "Maktablar uchun kompyuterlar xaridi",
            "description": "Ta'lim sifatini oshirish uchun 500 dona kompyuter",
            "priority": "MUHIM",
            "category": "Ta'lim",
            "status": "YANGI",
            "deadline": datetime.now() + timedelta(days=25),
            "organizations": [4],
        },
        {
            "title": "Hududiy ekologik monitoring",
            "description": "Havo sifatini oylik monitoring qilish",
            "priority": "ODDIY",
            "category": "Ekologiya",
            "status": "QAYTA_IJROGA_YUBORILDI",
            "deadline": datetime.now() - timedelta(days=2),
            "organizations": [3],
        },
        {
            "title": "Yo'llarni ta'mirlash 2026",
            "description": "Asosiy magistrallarni ta'mirlash va yoritish",
            "priority": "MUHIM",
            "category": "Infratuzilma",
            "status": "IJRODA",
            "deadline": datetime.now() + timedelta(days=60),
            "organizations": [1],
        },
        {
            "title": "Kichik biznesni kreditlash",
            "description": "Mahalliy tadbirkorlar uchun imtiyozli kreditlar",
            "priority": "ODDIY",
            "category": "Iqtisodiyot",
            "status": "YANGI",
            "deadline": datetime.now() + timedelta(days=18),
            "organizations": [2],
        },
        {
            "title": "Aholini emlash kampaniyasi",
            "description": "Grippga qarshi ommaviy emlash",
            "priority": "MUHIM_SHOSHILINCH",
            "category": "Sog'liqni saqlash",
            "status": "IJRODA",
            "deadline": datetime.now() + timedelta(days=5),
            "organizations": [0, 1],
        },
        {
            "title": "Digital arxiv tizimi",
            "description": "Hujjatlarni raqamlashtirish loyihasi",
            "priority": "ODDIY",
            "category": "Raqamli rivojlanish",
            "status": "YANGI",
            "deadline": datetime.now() + timedelta(days=40),
            "organizations": [0],
        },
        {
            "title": "Nogironligi bo'lganlar uchun infratuzilma",
            "description": "Panduslar va liftlar o'rnatish",
            "priority": "MUHIM",
            "category": "Ijtimoiy",
            "status": "IJRODA",
            "deadline": datetime.now() + timedelta(days=35),
            "organizations": [1, 4],
        },
        {
            "title": "Yangi bog'lar barpo etish",
            "description": "Yashil hududlarni ko'paytirish",
            "priority": "ODDIY",
            "category": "Ekologiya",
            "status": "IJRODA",
            "deadline": datetime.now() + timedelta(days=27),
            "organizations": [3, 4],
        },
        {
            "title": "Favqulodda vaziyatlar uchun zaxira",
            "description": "Shoshilinch yordam resurslarini tayyorlash",
            "priority": "MUHIM_SHOSHILINCH",
            "category": "Favqulodda vaziyat",
            "status": "MUDDATI_KECH",
            "deadline": datetime.now() - timedelta(days=1),
            "organizations": [0, 2],
        },
    ]

    tasks = []
    for idx, task_info in enumerate(base_tasks):
        task, created = Task.objects.get_or_create(
            title=task_info["title"],
            created_by=users[0 if idx % 2 == 0 else 1],
            defaults={
                "description": task_info["description"],
                "priority": task_info["priority"],
                "category": task_info["category"],
                "status": task_info["status"],
                "deadline": task_info["deadline"],
            }
        )
        for org_index in task_info["organizations"]:
            TaskOrganization.objects.get_or_create(
                task=task,
                organization=orgs[org_index],
                defaults={"status": task_info["status"]}
            )
        tasks.append(task)
        if created:
            print(f"  ✓ Created: {task.title} ({task.status})")
    
    print("\n✅ Database population completed successfully!")
    print(f"   - Sectors: {len(sectors)}")
    print(f"   - Organizations: {len(orgs)}")
    print(f"   - Users: {len(users)}")
    print(f"   - Tasks: {len(tasks)}")

if __name__ == "__main__":
    populate_database()
