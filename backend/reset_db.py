import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ehokimiyat.settings")
django.setup()

from django.db import connection

def reset_db():
    print("PostgreSQL bazasidagi barcha jadvallar noldan tozalanmoqda...")
    with connection.cursor() as cursor:
        cursor.execute("DROP SCHEMA public CASCADE;")
        cursor.execute("CREATE SCHEMA public;")
        cursor.execute("GRANT ALL ON SCHEMA public TO postgres;")
        cursor.execute("GRANT ALL ON SCHEMA public TO public;")
    print("Baza top-toza bo'ldi! Endi hech qanday xatolik chiqmasligi kerak.")

if __name__ == "__main__":
    reset_db()
