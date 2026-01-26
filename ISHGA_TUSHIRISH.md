# E-Hokimiyat Platform - Ishga Tushirish Qo'llanmasi

## ✅ HAMMA NARSA TAYYOR!

### Tizim Holati

**Backend (Django + WebSocket)**
- ✅ Daphne ASGI server - port 8000
- ✅ Redis kanal qatlami
- ✅ JWT autentifikatsiya
- ✅ WebSocket chat

**Frontend (Next.js)**
- ✅ Port 3000/3001 da ishlamoqda
- ✅ WebSocket client sozlangan
- ✅ Real-time chat tayyor

**Chat Tizimi (WebSocket)**
- ✅ Ulanish muvaffaqiyatli
- ✅ JWT autentifikatsiya
- ✅ Xabar yuborish/qabul qilish
- ✅ Real-time broadcast

---

## 🚀 Ishga Tushirish

### Usul 1: Avtomatik (start.sh)

```bash
cd "/home/muslim/Downloads/e-hokimiyat-platform final/e-hokimiyat-platform-development"
./start.sh
```

Bu buyruq avtomatik ravishda:
1. Redis serverni ishga tushiradi
2. Django backend ni Daphne ASGI server bilan ishga tushiradi (WebSocket support)
3. Next.js frontend ni ishga tushiradi
4. Barcha portlarni tekshiradi va bandligini tozalaydi

### Usul 2: Qo'lda

**1. Redis ni ishga tushiring:**
```bash
redis-server --daemonize yes
```

**2. Backend (Daphne ASGI):**
```bash
cd backend
python3 -m daphne -b 0.0.0.0 -p 8000 ehokimiyat.asgi:application
```

**3. Frontend (alohida terminal):**
```bash
cd "/home/muslim/Downloads/e-hokimiyat-platform final/e-hokimiyat-platform-development"
npm run dev
```

---

## 🌐 Tizimga Kirish

1. **Frontend**: http://localhost:3000 yoki http://localhost:3001
2. **Login ma'lumotlari**:
   - PNFL: `12345678901234`
   - Parol: `admin123`

---

## 💬 Chat Funksiyasini Test Qilish

1. Tizimga kiring
2. Dashboard → Vazifalar (Tasks) ga o'ting
3. Biror vazifani oching
4. Chat qismiga xabar yozing
5. Boshqa brauzer oynasida ham o'sha vazifani oching
6. Real-time ravishda xabarlar ko'rinadi! ✨

### Browser DevTools da Tekshirish

1. F12 bosing (DevTools)
2. Network → WS (WebSocket) tab
3. Ulanish ko'rinadi: `ws://localhost:8000/ws/tasks/{id}/chat/?token=...`
4. Messages tabda xabarlar oqimini ko'rasiz

---

## 🛑 To'xtatish

**start.sh dan ishlatgan bo'lsangiz:**
- `Ctrl+C` bosing

**Qo'lda ishlatgan bo'lsangiz:**
```bash
# Backend
lsof -ti:8000 | xargs kill -9

# Frontend  
lsof -ti:3000,3001 | xargs kill -9

# Redis (agar kerak bo'lsa)
redis-cli shutdown
```

---

## 📋 Log Fayllar

- **Backend (Daphne)**: `/tmp/daphne.log`
- **Frontend (Next.js)**: Terminal outputda ko'rinadi
- **Redis**: `redis-cli info` buyrug'i bilan

### Log ko'rish:
```bash
# Backend logs
tail -f /tmp/daphne.log

# Redis tekshirish
redis-cli ping  # PONG qaytishi kerak
```

---

## 🔧 Texnik Tafsilotlar

### WebSocket Arxitektura

**Backend:**
- `backend/chat/middleware.py` - JWT autentifikatsiya
- `backend/chat/consumers.py` - WebSocket xabar handlerlari
- `backend/ehokimiyat/asgi.py` - ASGI konfiguratsiya
- Daphne ASGI server (Channels uchun kerak)

**Frontend:**
- `app/dashboard/tasks/[id]/page.tsx` - WebSocket client
- JWT token localStorage dan olinadi
- Avtomatik reconnect qo'llab-quvvatlanadi

### Portlar
- **8000** - Django backend (HTTP + WebSocket)
- **3000/3001** - Next.js frontend
- **6379** - Redis (ichki, channel layer uchun)

### Kerakli Paketlar
- `daphne` - ASGI server ✅ o'rnatilgan
- `channels` - WebSocket qo'llab-quvvatlash ✅ mavjud
- `redis` - Channel layer backend ✅ ishlamoqda
- `rest_framework_simplejwt` - JWT auth ✅ sozlangan

---

## ⚠️ Muhim Eslatmalar

1. **Daphne vs Runserver**: 
   - ❌ `python manage.py runserver` - WebSocket ishlamaydi
   - ✅ `daphne ehokimiyat.asgi:application` - WebSocket ishlaydi

2. **Redis**: 
   - WebSocket broadcast uchun majburiy
   - Ishlamayotgan bo'lsa: `redis-server --daemonize yes`

3. **JWT Token**: 
   - WebSocket query string orqali token oladi
   - Frontend avtomatik localStorage dan beradi

4. **CORS**: 
   - `localhost:3000`, `localhost:3001` qo'shilgan
   - Production uchun yangilash kerak bo'ladi

---

## 🎯 Test Natijalari

Python WebSocket test client:
```bash
cd backend
python3 test_websocket_chat.py
```

**Natija**: ✅ PASSED
- Login: ✅
- WebSocket ulanish: ✅  
- Xabar yuborish: ✅
- Broadcast qabul qilish: ✅

Batafsil test hisoboti: [WEBSOCKET_TEST_RESULTS.md](WEBSOCKET_TEST_RESULTS.md)

---

## 📞 Yordam

Agar muammo bo'lsa:

1. **Backend ishlamasa**:
   ```bash
   cat /tmp/daphne.log
   ```

2. **Redis ishlamasa**:
   ```bash
   redis-cli ping
   redis-server --daemonize yes
   ```

3. **WebSocket ulanmasa**:
   - Browser console ni tekshiring (F12)
   - Network → WS tab ni ochib ko'ring
   - JWT token mavjudligini tekshiring: `localStorage.getItem('accessToken')`

4. **Port band bo'lsa**:
   ```bash
   lsof -ti:8000 | xargs kill -9
   lsof -ti:3000,3001 | xargs kill -9
   ```

---

**Yangilangan**: 2026-01-24
**Holat**: ✅ TO'LIQ ISHLAYDI
