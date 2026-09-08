# E-Hokimiyat Platform

E-Hokimiyat — Xatirchi tumani hokimligi uchun tashkilotlar, topshiriqlar, chat va bildirishnomalar bo‘yicha ishlarni boshqaradi. Bu repo Next.js 18 (React, Tailwind CSS) asosidagi frontend, Django + Channels + Celery + Redis asosida backend va ishga tushirish skriptlari to‘plamidan iborat.

## Asosiy xususiyatlar
- **Autentifikatsiya**: faqat login + parol orqali; OneID yoki boshqa federatsiya qatlami yo‘q.
- **Rollar**: Hokim, hokimlik mas‘uli, tashkilot rahbar/mas‘ul va administrator uchun maxsus ruxsatlar.
- **Real-time chat & notifications**: WebSocket orqali chat, bildirishnomalar / audio ogohlantirishlar (new `hooks/use-audio-alert.ts`) va foydalanuvchiga ko‘rsatiladi.
- **Media qo‘llab-quvvatlash**: chat xabarlarda fayl, audio, video, joylashuv manzili preview.
- **Admin panel orqali foydalanuvchi boshqaruvi**: Django admin yoki dashboard orqali yangi foydalanuvchilar yaratiladi.
- **Start skriptlari**: `./start.sh` va `./start-localhost.sh` bir vaqtning o‘zida backend, frontend va Redis’ni ishga tushiradi hamda zarur sozlamalarni avtomatlashtiradi.

## Autentifikatsiya
- Tizimga kirish faqat `login + password` orqali amalga oshadi.
- Administrator roli `backend/create_admin.py` orqali yaratiladi, `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `ADMIN_PNFL`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME` muhit o‘zgaruvchilari bilan o‘zgartirilishi mumkin.
- `./start.sh` / `./start-localhost.sh` ishga tushganda:
  1. `.env` fayli yo‘qligida `env.example` nusxasini yaratadi.
  2. Django uchun virtual muhiti va kutubxonalarni o‘rnatadi.
  3. Migrate ni ishga tushiradi.
  4. `create_admin.py` ni chaqirib `ADMIN_*` qiymatlari asosida admin hisobi yaratadi yoki mavjud adminni yangilaydi.
- Login sahifada foydalanuvchidan login/parol so‘raladi; bunday login admin tomonidan oldindan berilishi kerak.

## Ishga tushirish

### Kerakli dasturlar
- `Node.js` (talabga mos versiya, Next.js 18 bilan), `npm`.
- `Python 3.11+` (~Django 5).
- `Redis` (WebSocket kanallari va Celery queues uchun).

### Lokal ishga tushirish (eng tezkor yo‘l)
```bash
./start.sh
```
Yoki faqat localhost-da:
```bash
./start-localhost.sh
```
Har ikkala skript quyidagilarni bajaradi:
1. Port 8000 (backend) va 3000 (frontend) bo‘shligini tekshiradi.
2. Redis’ni ishga tushiradi.
3. Django virtual muhiti, `.env` nusxasi, migrations va admin yaratishni bajaradi (`create_admin.py`).
4. `daphne` (backend) va `next dev` (frontend) jarayonlarini fon rejimida ishga tushiradi.
5. Tugatma uchun `Ctrl+C` yoki `kill $BACKEND_PID $FRONTEND_PID`.

### Alohida bosqichma-bosqich ishga tushirish
- **Backend**:
  ```bash
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  cp env.example .env
  python manage.py migrate
  python create_admin.py
  python -m daphne -b 0.0.0.0 -p 8000 ehokimiyat.asgi:application
  ```
- **Frontend**:
  ```bash
  npm install
  NEXT_DISABLE_TURBOPACK=1 npx next dev -H 0.0.0.0 -p 3000
  ```

## Laravel haqida emas (Django + Next.js)
- Backend: Django REST Framework, SimpleJWT, Channels + Daphne, Celery + Redis, Telegram bot, AI (OpenAI/Anthropic) integratsiyalari.
- Frontend: Next.js 18, TypeScript, Tailwind CSS, GSAP animatsiyalari, toastlar, WebSocket chat.

## Admin panel va foydalanuvchi boshqaruvi
- Django admin: `http://localhost:8000/admin`.
- Frontend dashboard: `http://localhost:3000/dashboard`.
- Yangi foydalanuvchilar admin paneldan yoki `/dashboard/users` bo‘limidan yaratiladi; login/parol admin tomonidan beriladi.
- `create_admin.py` skripti mavjud adminni yangilaydi va login, pnfl, parolni `ADMIN_*` orqali sozlash imkonini beradi.

## Qo‘llab-quvvatlash
- WebSocket Chat: `ws://localhost:8000/ws/tasks/{task_id}/chat/`.
- Bildirishnomalar: `/dashboard/notifications` sahifasi; yangi xabarlar audio alert bilan eslatib turadi (CPU’ga yuklanmaslik uchun ton yuqori faollikda).
- Deploy uchun `deploy/` papkada Nginx, systemd unitlari va qo‘llanmalar mavjud.

## Ekologik izoh
- Doker kerak emas — start skriptlari server va frontendni yagona buyruqda ishga tushirish uchun yetarli.
- Keraksiz komponentlar (`components/chat/task-chat.tsx`, `components/chat/user-chat-dialog.tsx`) olib tashlandi, asosiy chat amallari endi `app/dashboard/chat/page.tsx` orqali amalga oshadi.

## Keyingi qadamlar
1. Muvofiqlikni tekshirish uchun `./start.sh` skriptini yangi `.env` bilan ishga tushiring.
2. Admin login/parolni `ADMIN_*` muhit o‘zgaruvchilari orqali sozlang.
3. Demo ma’lumotlar kerak bo‘lsa `python manage.py seed_data` yoki boshqa skriptlar orqali to‘ldiring.
