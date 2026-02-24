# OneID Sozlash Bo'yicha Ko'rsatmalar

## 📋 Majburiy qadam: OneID Redirect URI lari

Texnologik yorqnomasiga ko'ra, OneID tizimiga **bir nechta redirect URI** larni ro'yxatdan o'tkazish shart!

### 🔗 Ro'yxatdan o'tkazish kerak bo'lgan URI lar:

| # | URI | Turi | Muhit |
|---|-----|------|-------|
| 1 | `https://api.ehokimiyat.uz/api/oneid/auth/callback/` | Backend callback | Production |
| 2 | `https://ehokimiyat.uz/login/callback` | Frontend callback | Production |
| 3 | `http://localhost:8000/api/oneid/auth/callback/` | Backend callback | Development |
| 4 | `http://localhost:3000/login/callback` | Frontend callback | Development |

## 🎯 OneID Portaliga ro'yxatdan o'tish

### 1. Kirish:
- [OneID portaliga](https://sso.egov.uz) kiring
- "Ilovalar" bo'limiga o'ting
- "Yangi ilova qo'shish" tugmasini bosing

### 2. Asosiy ma'lumotlar:
```
Ilova nomi: E-Hokimiyat Xatirchi
Tavsif: Xatirchi tumani hokimligi vazifalar boshqaruv tizimi
Turi: Veb-ilova
```

### 3. Redirect URI larni kiritish (MUHIM!):
Quyidagi **barcha** URI larni alohida qatorlarda kiritishingiz kerak:

```
https://api.ehokimiyat.uz/api/oneid/auth/callback/
https://ehokimiyat.uz/login/callback
http://localhost:8000/api/oneid/auth/callback/
http://localhost:3000/login/callback
```

### 4. Ruxsatlar (Scope):
```
Scope: ehokimiyat
```

### 5. Tasdiqlash:
- Formani to'ldiring
- Shartlarni qabul qiling
- Ilova yaratishni tasdiqlang

### 6. Kalitlarni olish:
- Client ID va Client Secret nusxa oling
- Ushbu kalitlarni xavfsiz saqlang

## ⚙️ Loyihani sozlash

### 1. Environment faylini to'ldirish:

`backend/.env` faylini yarating va quyidagilarni qo'shing:

```env
# OneID OAuth 2.0 sozlamalari
ONEID_CLIENT_ID=siz-olgan-client-id
ONEID_CLIENT_SECRET=siz-olgan-client-secret
ONEID_REDIRECT_URI=https://api.ehokimiyat.uz/api/oneid/auth/callback/
ONEID_SCOPE=ehokimiyat

# Frontend URL
FRONTEND_URL=https://ehokimiyat.uz

# Production sozlamalari
DEBUG=False
DJANGO_ALLOWED_HOSTS=api.ehokimiyat.uz,ehokimiyat.uz,www.ehokimiyat.uz
CORS_ALLOWED_ORIGINS=https://ehokimiyat.uz,https://api.ehokimiyat.uz
```

### 2. Migratsiyalarni qo'llash:

```bash
cd backend
python manage.py migrate oneid
```

### 3. Superuser yaratish:

```bash
python manage.py createsuperuser
```

## 🧪 Test qilish

### 1. Backend test:
```bash
python manage.py runserver
```
- `http://localhost:8000/admin/` ga kiring
- OneID modellari ko'rinishini tekshiring

### 2. Frontend test:
```bash
npm run dev
```
- `http://localhost:3000/login` ga kiring
- PNFL kirib, OneID tugmasini bosing

### 3. To'liq flow test:
1. PNFL kiriting (masalan: `30000000000001`)
2. "OneID orqali kirish" tugmasini bosing
3. OneID portaliga yo'naltirilganingizni tekshiring
4. Login qiling
5. Callback qaytganini va tokenlar olinganini tekshiring

## 🔍 Tekshirish ro'yxati

### ✅ To'g'ri ishlashi uchun:

- [ ] OneID portaliga barcha 4 ta URI kiritilgan
- [ ] Client ID va Client Secret `.env` ga yozilgan
- [ ] Backend migratsiyalari qo'llangan
- [ ] Frontend va backend ishga tushirilgan
- [ ] Login flow to'liq ishlashi
- [ ] Tokenlar ma'lumotlar bazasiga saqlanishi
- [ ] Foydalanuvchi ma'lumotlari sinxronizatsiya qilinishi

### 🚨 Xatoliklarni tuzatish:

#### "Invalid redirect URI" xatoligi:
- OneID portaliga kiring
- URI larni to'g'ri yozilganligini tekshiring
- HTTPS/HTTP mosligini tekshiring

#### "Client authentication failed" xatoligi:
- Client ID va Client Secret ni tekshiring
- `.env` faylida to'g'ri yozilganligini tekshiring

#### "CORS error" xatoligi:
- `CORS_ALLOWED_ORIGINS` ni tekshiring
- Frontend URL ni tekshiring

## 📞 Yordam

Agar muammo yuz bersa:

1. **Loglarni tekshiring:**
   ```bash
   tail -f logs/oneid.log
   ```

2. **Django admin orqali:**
   - `/admin/oneid/` - OneID modellari
   - `/admin/users/user/` - Foydalanuvchilar

3. **Database tekshiruvi:**
   ```sql
   SELECT * FROM oneid_oneidtoken;
   SELECT * FROM oneid_oneidsession;
   SELECT * FROM oneid_oneiduserlog;
   ```

4. **Test qilish:**
   ```bash
   python manage.py test oneid
   ```

---

**Eslatma:** OneID integratsiyasi uchun muhim jihat - to'g'ri redirect URI larni ro'yxatdan o'tkazish. Agar URI noto'g'ri bo'lsa, avtorizatsiya ishlamaydi!
