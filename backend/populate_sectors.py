"""
Script to populate sectors (sohalar) in the database
"""
import os
import sys
import django

# Django muhitini sozlash
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ehokimiyat.settings')
django.setup()

from organizations.models import Sector

SECTORS = [
    {
        'name': "Sog'liqni saqlash",
        'description': "Sog'liqni saqlash tizimi tashkilotlari",
        'is_active': True
    },
    {
        'name': "Bandlik va mehnat",
        'description': "Bandlik va mehnat bozori tashkilotlari",
        'is_active': True
    },
    {
        'name': "Ta'lim",
        'description': "Ta'lim tizimi tashkilotlari",
        'is_active': True
    },
    {
        'name': "Ijtimoiy himoya",
        'description': "Ijtimoiy himoya tashkilotlari",
        'is_active': True
    },
    {
        'name': "Adliya",
        'description': "Adliya tizimi tashkilotlari",
        'is_active': True
    },
    {
        'name': "Ekologiya",
        'description': "Ekologiya va atrof-muhit tashkilotlari",
        'is_active': True
    },
    {
        'name': "Subsidiya",
        'description': "Subsidiya va davlat qo'llab-quvvatlash tashkilotlari",
        'is_active': True
    },
    {
        'name': "Oila va bolalar",
        'description': "Oila va bolalar huquqlarini himoya qilish tashkilotlari",
        'is_active': True
    },
    {
        'name': "Ko'chmas mulk",
        'description': "Ko'chmas mulk va yer boshqaruvi tashkilotlari",
        'is_active': True
    },
    {
        'name': "Fuqarolik",
        'description': "Fuqarolik va pasport ishlari tashkilotlari",
        'is_active': True
    },
    {
        'name': "Davlat aktivlari",
        'description': "Davlat mulki va aktivlarini boshqarish tashkilotlari",
        'is_active': True
    },
    {
        'name': "Iqtisodiyot va biznes",
        'description': "Iqtisodiyot, biznes va tadbirkorlik tashkilotlari",
        'is_active': True
    },
    {
        'name': "Yoshlar",
        'description': "Yoshlar siyosati va sport tashkilotlari",
        'is_active': True
    },
    {
        'name': "Transport",
        'description': "Transport va yo'l xo'jaligi tashkilotlari",
        'is_active': True
    },
    {
        'name': "Axborot va aloqa",
        'description': "Axborot texnologiyalari va aloqa tashkilotlari",
        'is_active': True
    },
    {
        'name': "Geologiya",
        'description': "Geologiya va mineral resurslar tashkilotlari",
        'is_active': True
    },
    {
        'name': "Pensiya",
        'description': "Pensiya ta'minoti tashkilotlari",
        'is_active': True
    },
    {
        'name': "Madaniyat, turizm va sport",
        'description': "Madaniyat, turizm va sport tashkilotlari",
        'is_active': True
    },
    {
        'name': "Kommunal soha",
        'description': "Kommunal xizmat va shahar xo'jaligi tashkilotlari",
        'is_active': True
    },
    {
        'name': "Soliqlar",
        'description': "Soliq va bojxona tashkilotlari",
        'is_active': True
    },
]

def populate_sectors():
    """Bazaga sohalarni qo'shish"""
    print("Sohalarni bazaga qo'shish boshlandi...")
    
    created_count = 0
    updated_count = 0
    
    for sector_data in SECTORS:
        sector, created = Sector.objects.update_or_create(
            name=sector_data['name'],
            defaults={
                'description': sector_data.get('description', ''),
                'is_active': sector_data.get('is_active', True)
            }
        )
        
        if created:
            created_count += 1
            print(f"✓ Yangi soha yaratildi: {sector.name}")
        else:
            updated_count += 1
            print(f"↻ Soha yangilandi: {sector.name}")
    
    print(f"\n✅ Jarayon tugadi!")
    print(f"   Yangi yaratildi: {created_count}")
    print(f"   Yangilandi: {updated_count}")
    print(f"   Jami: {Sector.objects.count()} ta soha")

if __name__ == '__main__':
    try:
        populate_sectors()
    except Exception as e:
        print(f"\n❌ Xato yuz berdi: {e}")
        import traceback
        traceback.print_exc()
