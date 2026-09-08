import os
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Custom apps
APPS = [
    'core',
    'users',
    'organizations',
    'projects',
    'tasks',
    'audit',
    'analytics',
    'notifications',
    'chat',
    'telegram_bot',
]

def clean_migrations():
    print("Migratsiya fayllari tozalanmoqda...")
    for app in APPS:
        migrations_dir = BASE_DIR / app / "migrations"
        if migrations_dir.exists():
            for item in migrations_dir.iterdir():
                if item.name != "__init__.py" and item.is_file():
                    item.unlink()
                    print(f"O'chirildi: {item}")
                elif item.is_dir() and item.name == "__pycache__":
                    shutil.rmtree(item)
    print("Barcha migratsiya fayllari o'chirildi.")

if __name__ == "__main__":
    clean_migrations()
