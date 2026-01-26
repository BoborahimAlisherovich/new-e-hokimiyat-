import os
import sys
import django

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ehokimiyat.settings")
django.setup()

from users.models import User

def create_admin_user():
    PNFL = "11111111111111"
    PASSWORD = "1"  # Simple password for dev, user can change later
    
    if User.objects.filter(pnfl=PNFL).exists():
        print(f"❌ Foydalanuvchi (PNFL: {PNFL}) allaqachon mavjud.")
        # Optional: Reset password if needed
        # user = User.objects.get(pnfl=PNFL)
        # user.set_password(PASSWORD)
        # user.save()
        # print("Parol yangilandi.")
    else:
        print(f"🛠 Superuser yaratilmoqda...")
        try:
            User.objects.create_superuser(
                pnfl=PNFL,
                password=PASSWORD,
                first_name="Muslim",
                last_name="Baratov",
                role="ADMIN"  # We use the correct key here
            )
            print(f"✅ Superuser muvaffaqiyatli yaratildi!")
            print(f"👤 Login (PNFL): {PNFL}")
            print(f"🔑 Parol: {PASSWORD}")
            print(f"ℹ️  Admin panelga kirish uchun: http://localhost:8000/admin")
        except Exception as e:
            print(f"❌ Xatolik yuz berdi: {e}")

if __name__ == "__main__":
    create_admin_user()
