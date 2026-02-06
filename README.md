# E-Hokimiyat Platformasi

E-Hokimiyat - O'zbekiston Xatirchi tumani hokimligi uchun mo'ljallangan vazifalar ijrosi va nazorati axborot tizimi.

## 📋 Asosiy Imkoniyatlar

- **Foydalanuvchilarni Boshqarish**: Ko'p darajali rollar tizimi (Hokim, Hokimlik Mas'uli, Sektor Rahbari, Tashkilot Rahbari)
- **Tashkilotlar Boshqaruvi**: Ierarxik tashkilotlar tuzilmasi va sektorlar
- **Topshiriqlar Boshqaruvi**: Vazifalarni yaratish, biriktirish, kuzatish va nazorat qilish
- **Real Vaqtda Chat**: Xabar, fayl, rasm, video va audio yuborish (Telegram uslubida)
- **AI Yordamchi**: OpenAI/Anthropic API bilan integratsiya
- **Telegram Bot**: Foydalanuvchilar uchun bot orqali bildirishnomalar
- **Analitika**: Grafik va hisobotlar, PDF eksport

## 🛠 Texnologik Stek

| Qism | Texnologiyalar |
|------|----------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Shadcn/UI |
| Backend | Django 5.2, Django REST Framework, PostgreSQL |
| Real-time | Django Channels, WebSockets, Redis |
| Vazifalar | Celery, Redis |
| AI | OpenAI GPT-4, Anthropic Claude |

## 🚀 Tezkor Boshlash

### Docker bilan (Tavsiya etiladi)

```bash
# 1. Muhit o'zgaruvchilarini sozlash
cp .env.example .env
cp backend/.env.example backend/.env

# 2. Docker konteynerlarini ishga tushirish
docker-compose up -d

# 3. Migratsiyalar va admin yaratish
docker-compose exec backend python manage.py migrate
docker-compose exec backend python create_admin.py
```

Ilovalar:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Admin Panel: http://localhost:8000/admin

### Qo'lda O'rnatish

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Muhit sozlamalari
cp .env.example .env
# .env faylini tahrirlang

# Migratsiyalar
python manage.py migrate
python create_admin.py

# Ishga tushirish
python manage.py runserver 0.0.0.0:8000
```

#### Frontend

```bash
npm install
npm run dev
```

## 📁 Loyiha Tuzilmasi

```
e-hokimiyat-hatirchi/
├── app/                    # Next.js sahifalar
│   ├── dashboard/          # Dashboard sahifalari
│   └── api/                # API routes
├── backend/                # Django backend
│   ├── chat/               # Chat moduli
│   ├── tasks/              # Topshiriqlar moduli
│   ├── users/              # Foydalanuvchilar
│   ├── organizations/      # Tashkilotlar
│   ├── telegram_bot/       # Telegram bot
│   └── core/               # AI va umumiy
├── components/             # React komponentlar
├── lib/                    # Utilities va API
└── deploy/                 # Deploy konfiguratsiyalari
```

## 🔐 Foydalanuvchi Rollari

| Rol | Vakolatlar |
|-----|------------|
| SUPERADMIN | Tizimni to'liq boshqarish |
| HOKIM | Barcha topshiriqlarni ko'rish va berish |
| HOKIMLIK_MASUL | Hokimlik darajasida boshqaruv |
| SECTOR_LEADER | Sektor bo'yicha boshqaruv |
| ORGANIZATION_HEAD | Tashkilot ichida boshqaruv |
| USER | Oddiy foydalanuvchi |

## 🌐 Production Deployment

### Nginx + Gunicorn

```bash
# Deploy skriptini ishga tushirish
cd deploy
./deploy-server.sh
```

### Docker Compose

```bash
docker-compose -f docker-compose.yml up -d
```

## 📞 Aloqa

- **Loyiha**: E-Hokimiyat Xatirchi
- **Ishlab chiquvchi**: Boborahim & Aura Group

## 📄 Litsenziya

Bu loyiha maxsus litsenziya asosida ishlaydi.
