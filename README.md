# E-Hokimiyat Platformasi

E-Hokimiyat - O'zbekiston Xatirchi tumani hokimligi uchun mo'ljallangan vazifalar ijrosi va nazorati axborot tizimi.

## 📋 Asosiy Imkoniyatlar

- **Foydalanuvchilarni Boshqarish**: Ko'p darajali rollar tizimi (Hokim, Hokimlik Mas'uli, Tashkilot Rahbari, Tashkilot Mas'uli)
- **Tashkilotlar Boshqaruvi**: Ierarxik tashkilotlar tuzilmasi va sektorlar
- **Topshiriqlar Boshqaruvi**: Vazifalarni yaratish, biriktirish, kuzatish va nazorat qilish
- **Real Vaqtda Chat**: Xabar, fayl, rasm, video va audio yuborish
- **AI Yordamchi**: OpenAI/Anthropic API bilan integratsiya
- **Telegram Bot**: Foydalanuvchilar uchun bot orqali bildirishnomalar
- **Analitika**: Grafik va hisobotlar, PDF eksport

## 🛠 Texnologik Stek

| Qism | Texnologiyalar |
|------|----------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Shadcn/UI |
| Backend | Django 5.2, Django REST Framework, PostgreSQL |
| Real-time | Django Channels (ASGI), WebSockets, Daphne |
| Vazifalar | Celery, Redis |
| AI | OpenAI GPT-4, Anthropic Claude |

## 🔐 Foydalanuvchi Rollari va Vakolatlari

| Rol | Vakolatlar |
|-----|------------|
| **HOKIM** | Barcha topshiriqlarni ko'rish, yaratish, tahrirlash, tasdiqlash va nazoratdan yechish |
| **HOKIMLIK_MASUL** | Topshiriqlarni yaratish, tahrirlash, muddat uzaytirish |
| **ADMIN** | Tizimni to'liq boshqarish, foydalanuvchilar va tashkilotlarni sozlash |
| **TASHKILOT_RAHBARI** | O'z tashkilotiga tegishli topshiriqlarni ko'rish, bajarish, chat orqali muloqot |
| **TASHKILOT_MASUL** | Tashkilot topshiriqlarini bajarish va hisobot berish |

### Rol bo'yicha cheklovlar:

#### Hokimlik xodimlari (HOKIM, HOKIMLIK_MASUL, ADMIN):
- ✅ Barcha topshiriqlarni ko'rish
- ✅ Topshiriq yaratish va tahrirlash
- ✅ Muddat uzaytirish
- ✅ Barcha foydalanuvchilar bilan chat
- ✅ Barcha analitika va hisobotlar

#### Tashkilot xodimlari (TASHKILOT_RAHBARI, TASHKILOT_MASUL):
- ✅ Faqat o'z tashkilotiga tegishli topshiriqlarni ko'rish
- ✅ Topshiriqni "Bajarildi" deb belgilash
- ✅ O'z tashkiloti va hokimlik xodimlari bilan chat
- ✅ O'z tashkilotiga tegishli analitika
- ❌ Topshiriq yaratish va tahrirlash mumkin emas
- ❌ Muddat uzaytirish mumkin emas

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

# ASGI server (WebSocket uchun)
python -m daphne -b 0.0.0.0 -p 8000 ehokimiyat.asgi:application
```

#### Frontend

```bash
npm install
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## 📁 Loyiha Tuzilmasi

```
e-hokimiyat-hatirchi/
├── app/                    # Next.js sahifalar
│   ├── dashboard/          # Dashboard sahifalari
│   │   ├── tasks/          # Topshiriqlar
│   │   ├── chat/           # Chat
│   │   ├── notifications/  # Bildirishnomalar
│   │   ├── organizations/  # Tashkilotlar
│   │   ├── users/          # Foydalanuvchilar
│   │   ├── analytics/      # Analitika
│   │   ├── appeals/        # Murojaatlar
│   │   └── settings/       # Sozlamalar
│   ├── login/              # Kirish sahifasi
│   └── api/                # API routes
├── backend/                # Django backend
│   ├── chat/               # Chat moduli
│   ├── tasks/              # Topshiriqlar moduli
│   ├── users/              # Foydalanuvchilar
│   ├── organizations/      # Tashkilotlar
│   ├── notifications/      # Bildirishnomalar
│   ├── analytics/          # Analitika
│   ├── telegram_bot/       # Telegram bot
│   ├── audit/              # Audit log
│   └── core/               # AI va umumiy
├── components/             # React komponentlar
│   ├── dashboard/          # Dashboard komponentlari
│   ├── layout/             # Layout (sidebar, header)
│   └── ui/                 # UI komponentlari (shadcn)
├── lib/                    # Utilities va API
│   ├── api/                # API funksiyalari
│   └── i18n/               # Til sozlamalari
├── deploy/                 # Deploy konfiguratsiyalari
└── public/                 # Statik fayllar
```

## 🌐 Production Deployment

### Nginx + Daphne (ASGI)

```bash
# Deploy skriptini ishga tushirish
cd deploy
./deploy-server.sh
```

### Docker Compose

```bash
docker-compose -f docker-compose.yml up -d
```

### Muhit o'zgaruvchilari

Backend `.env`:
```env
DEBUG=False
SECRET_KEY=your-secret-key
DATABASE_URL=postgres://user:pass@localhost:5432/ehokimiyat
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=your-openai-key
TELEGRAM_BOT_TOKEN=your-bot-token
```

Frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.uz
```

## 📊 API Endpointlar

| Endpoint | Metod | Tavsif |
|----------|-------|--------|
| `/api/auth/login/` | POST | Tizimga kirish |
| `/api/auth/me/` | GET | Joriy foydalanuvchi |
| `/api/tasks/` | GET, POST | Topshiriqlar |
| `/api/tasks/{id}/mark-complete/` | POST | Bajarildi deb belgilash |
| `/api/users/chat_users/` | GET | Chat foydalanuvchilari (rol bo'yicha) |
| `/api/analytics/trends/` | GET | Analitika trendlari |
| `/api/notifications/` | GET | Bildirishnomalar |
| `/api/chat/messages/` | GET, POST | Chat xabarlari |

## 🧪 Test Foydalanuvchilar

| Rol | PNFL | Parol |
|-----|------|-------|
| HOKIM | 30000000000001 | admin123 |
| HOKIMLIK_MASUL | 30000000000002 | admin123 |
| TASHKILOT_RAHBARI | 30000000000019 | admin123 |

## 📞 Aloqa

- **Loyiha**: E-Hokimiyat Xatirchi
- **Ishlab chiquvchi**: Aura Group

## 📄 Litsenziya

Bu loyiha maxsus litsenziya asosida ishlaydi.

---

**Versiya**: 2.0.0  
**Yangilangan**: 2026-02-06
