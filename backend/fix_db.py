import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ehokimiyat.settings")
django.setup()

from django.db import connection

def fix_database():
    with connection.cursor() as cursor:
        print("users_user jadvali o'chirilmoqda...")
        cursor.execute("DROP TABLE IF EXISTS users_user CASCADE;")
        print("Jadval o'chirildi.")
        
        print("Migratsiya tarixi tozalanmoqda...")
        cursor.execute("DELETE FROM django_migrations WHERE app='users';")
        print("Tarix tozalandi.")
        
    print("\nTayyor! Endi 'python manage.py migrate' buyrug'ini ishga tushiring.")

if __name__ == "__main__":
    fix_database()
