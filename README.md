# E-Hokimiyat Platformasi

Xatirchi tumani hokimligi uchun topshiriqlar, tashkilotlar, foydalanuvchilar, chat va analitika modullarini boshqaruvchi axborot tizimi.

## Asosiy texnologiyalar

- Frontend: Next.js 16, TypeScript, Tailwind CSS
- Backend: Django, Django REST Framework, SimpleJWT
- Real-time: Django Channels, WebSocket
- Queue: Celery, Redis

## Auth

- OneID ishlatilmaydi.
- Tizimga kirish `login + password` orqali amalga oshiriladi.
- Foydalanuvchilar Django admin panel yoki dashboarddagi foydalanuvchi boshqaruvi orqali yaratiladi.
- Start skriptlari (`./start.sh`, `./start-localhost.sh`) `backend/create_admin.py` ni chaqiradi va `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `ADMIN_PNFL`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME` muhit o'zgaruvchilar orqali administratorni qayta sozlash imkonini beradi.

## Lokal ishga tushirish

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
python manage.py migrate
python create_admin.py
python manage.py runserver 0.0.0.0:8000
```

### Frontend

```bash
npm install
npm run dev
```

### Tayyor skriptlar

```bash
./start-backend.sh
./start-localhost.sh
```

## Kirish nuqtalari

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api`
- Django Admin: `http://localhost:8000/admin`

## Demo foydalanuvchilar

`python manage.py create_demo_users` buyrug'i quyidagi loginlarni yaratadi:

- `admin / admin123`
- `hokim / hokim123`
- `masul / masul123`
- `rahbar / rahbar123`
- `tashkilot-masul / tash123`

## Loyiha tuzilmasi

```text
app/                 Next.js sahifalari
components/          UI va dashboard komponentlari
lib/                 API client, i18n va utilitalar
backend/             Django backend
deploy/              server deploy fayllari
public/              statik fayllar
```
