# E-Hokimiyat Platformasi

E-Hokimiyat - O'zbekiston davlat tashkilotlari uchun mo'ljallangan vazifalar ijrosi va nazorati axborot tizimi.

## Asosiy Imkoniyatlar

- **Foydalanuvchilarni Boshqarish**: Ko'p darajali rollar tizimi (Hokim, Hokimlik Mas'uli, Tashkilot Rahbari, Tashkilot Mas'uli). OneID integratsiyasi.
- **Tashkilotlar Boshqaruvi**: Ierarxik tashkilotlar tuzilmasi va bo'limlar.
- **Topshiriqlar Boshqaruvi**: Vazifalarni yaratish, biriktirish, kuzatish va nazorat qilish (Ijro intizomi).
- **Hujjat Aylanishi**: Topshiriqlarga fayllar biriktirish va hujjatlar almashinuvi.
- **Real Vaqtda Chat**: Topshiriqlar yuzasidan muhokama va tezkor xabarlar almashish (Fayl, Audio, Rasm, Video qo'llab-quvvatlaydi).
- **Bildirishnomalar**: Yangi vazifalar va muhlatlar haqida real vaqtda ogohlantirishlar.
- **Analitika va Hisobotlar**: Bajarilgan ishlar, samaradorlik va ijro intizomi bo'yicha grafik va jadvallar.
- **Admin Panel**: Tizimni to'liq boshqarish, foydalanuvchilar va sozlamalarni o'zgartirish (Jazzmin UI).

## Texnologik Stek

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, Radix UI (Shadcn)
- **Backend**: Django 5.2, Django REST Framework, PostgreSQL
- **Real-time**: Django Channels (WebSockets), Redis
- **Vazifalar Navbati**: Celery, Redis
- **Autentifikatsiya**: JWT (JSON Web Tokens), PNFL + OneID
- **Infratuzilma**: Docker, Nginx, Gunicorn

## Tezkor Boshlash

### Talablar

- Python 3.10+
- Node.js 18+
- PostgreSQL (yoki development uchun SQLite)
- Redis (Real vaqt funksiyalari va vazifalar uchun shart)

### O'rnatish

1. **Repozitoriyani klonlash:**
   ```bash
   git clone https://github.com/yourusername/e-hokimiyat-platform.git
   cd e-hokimiyat-platform
   ```

2. **Backendni sozlash:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Migratsiyalarni amalga oshirish
   python manage.py migrate
   
   # Admin superuser yaratish (avtomatik skript)
   python create_admin.py
   # Yoki qo'lda: python manage.py createsuperuser
   ```

3. **Frontendni sozlash:**
   ```bash
   cd ../
   npm install
   # Yoki: pnpm install
   ```

### Ilovani Ishga Tushirish

#### 1-variant: Avtomatik Skript (Tavsiya etiladi)

```bash
./start-dev.sh
```
Bu skript backend, frontend va kerakli xizmatlarni bir vaqtda ishga tushiradi.

#### 2-variant: Qo'lda Ishga Tushirish

**Terminal 1 - Backend (Redis ishlayotganiga ishonch hosil qiling):**
```bash
cd backend
source venv/bin/activate
# Celery ishga tushirish
celery -A ehokimiyat worker -l info 
# Yana bitta terminalda Django server
python manage.py runserver 8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Tizimga Kirish

- **Foydalanuvchi qismi**: http://localhost:3000
- **Admin Panel**: http://localhost:8000/admin (Login: `11111111111111`, Parol: `1`)
- **API Hujjatlari**: http://localhost:8000/api/docs (Agar sozlangan bo'lsa)


## Development

### Building for Production

```bash
# Frontend
npm run build

# Backend (using gunicorn)
cd backend
gunicorn ehokimiyat.wsgi:application --bind 0.0.0.0:8000
```

### Running Tests

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests (if implemented)
npm test
```

## API Documentation

The API endpoints are documented and available at:
- REST API: http://localhost:8000/api/
- Admin Interface: http://localhost:8000/admin/

## Environment Variables

Create a `.env` file in the backend directory:

```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/ehokimiyat
REDIS_URL=redis://localhost:6379
ALLOWED_HOSTS=localhost,127.0.0.1
```

## Project Structure

```
├── app/                    # Next.js app directory
├── backend/               # Django backend
│   ├── ehokimiyat/        # Main Django project
│   ├── users/            # User management app
│   ├── organizations/    # Organization management app
│   ├── tasks/            # Task management app
│   ├── notifications/    # Notification system
│   ├── audit/            # Audit logging
│   └── analytics/        # Analytics and reporting
├── components/           # Reusable UI components
├── lib/                  # Utility functions and API client
├── types/                # TypeScript type definitions
└── public/               # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.