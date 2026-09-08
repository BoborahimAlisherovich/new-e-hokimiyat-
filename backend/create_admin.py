import os
import sys
from pathlib import Path

import django
from dotenv import load_dotenv

# Add the backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ehokimiyat.settings")

# Load .env to honor overrides from env.example (when running via start scripts)
load_dotenv(BASE_DIR / ".env")

django.setup()

from users.models import User


def create_admin_user():
    login = os.environ.get("ADMIN_LOGIN", "admin").strip()
    pnfl = os.environ.get("ADMIN_PNFL", "11111111111111").strip()
    password = os.environ.get("ADMIN_PASSWORD", "admin123").strip()
    first_name = os.environ.get("ADMIN_FIRST_NAME", "Admin").strip() or "Admin"
    last_name = os.environ.get("ADMIN_LAST_NAME", "User").strip() or "User"

    if not login or not pnfl or not password:
        print("X ADMIN_LOGIN, ADMIN_PNFL va ADMIN_PASSWORD qiymatlari kerak")
        return

    user = User.objects.filter(login__iexact=login).first()
    if not user and pnfl:
        user = User.objects.filter(pnfl=pnfl).first()

    if user:
        print(f"Mavjud admin (login: {user.login}, pnfl: {user.pnfl}) yangilanmoqda...")
        user.login = login
        user.pnfl = pnfl
        user.first_name = first_name
        user.last_name = last_name
        user.role = "ADMIN"
        user.status = "FAOL"
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        print(f"Admin foydalanuvchi muvaffaqiyatli yangilandi ({login})")
    else:
        print("Superuser yaratilmoqda...")
        try:
            User.objects.create_superuser(
                login=login,
                pnfl=pnfl,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role="ADMIN",
            )
            print(f"Superuser muvaffaqiyatli yaratildi ({login})")
        except Exception as exc:
            print(f"Xatolik yuz berdi: {exc}")


if __name__ == "__main__":
    create_admin_user()
