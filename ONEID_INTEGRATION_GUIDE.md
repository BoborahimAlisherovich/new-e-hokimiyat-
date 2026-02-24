# OneID Integratsiya Qo'llanmasi

Ushbu qo'llanma E-Hokimiyat tizimiga OneID integratsiyasini qanday o'rnatish va ishlatishni tavsiflaydi.

## 📋 Mundarija

1. [Umumiy ma'lumot](#umumiy-malumot)
2. [Arxitektura](#arxitektura)
3. [O'rnatish](#ornatish)
4. [Sozlash](#sozlash)
5. [API Endpointlar](#api-endpointlar)
6. [Frontend integratsiyasi](#frontend-integratsiyasi)
7. [Test qilish](#test-qilish)
8. [Xatoliklarni tuzatish](#xatoliklarni-tuzatish)

## 🔍 Umumiy ma'lumot

OneID - O'zbekiston Respublikasi Raqamli texnologiyalar vazirligi tomonidan ishlab chiqarilgan yagona autentifikatsiya tizimi. U foydalanuvchilarning JShShIR (PNFL) orqali avtorizatsiyasini ta'minlaydi.

### Asosiy imkoniyatlar:

- ✅ **OAuth 2.0** protokoli orqali xavfsiz avtorizatsiya
- ✅ **PNFL asosida** foydalanuvchi identifikatsiyasi
- ✅ **Token boshqaruvi** (access/refresh tokenlar)
- ✅ **Ma'lumotlarni sinxronizatsiya** qilish
- ✅ **To'liq audit log**lari
- ✅ **Django Admin** integratsiyasi

## 🏗️ Arxitektura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend     │    │   Backend      │    │   OneID        │
│   (Next.js)    │    │   (Django)     │    │   (SSO)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. PNFL kiritish       │                       │
         │───────────────────────>│                       │
         │                       │ 2. User tekshirish    │
         │                       │───────────────────────>│
         │                       │                       │
         │                       │ 3. Auth URL yaratish │
         │                       │<───────────────────────│
         │ 4. OneID ga yo'naltirish│                       │
         │<───────────────────────│                       │
         │                       │                       │
         │ 5. Callback qabul qilish│                       │
         │───────────────────────>│ 6. Token exchange     │
         │                       │───────────────────────>│
         │                       │                       │
         │                       │ 7. User ma'lumotlari │
         │                       │<───────────────────────│
         │                       │                       │
         │ 8. JWT tokenlar        │                       │
         │<───────────────────────│                       │
```

## 🚀 O'rnatish

### 1. Backend o'rnatish

```bash
# OneID modulini qo'shish (allaqachon qo'shilgan)
# oneid/ papkasi mavjud

# Migratsiyalarni yaratish
python manage.py makemigrations oneid

# Migratsiyalarni qo'llash
python manage.py migrate

# Superuser yaratish
python manage.py createsuperuser
```

### 2. Environment sozlamalari

`backend/.env` faylini yarating va quyidagilarni qo'shing:

```env
# OneID OAuth 2.0 sozlamalari
ONEID_CLIENT_ID=your-oneid-client-id
ONEID_CLIENT_SECRET=your-oneid-client-secret
ONEID_REDIRECT_URI=https://api.ehokimiyat.uz/api/oneid/auth/callback/
ONEID_SCOPE=ehokimiyat

# OneID redirect URI lar (ko'p URI lar uchun)
# OneID portaliga quyidagi barcha URI larni kiritish kerak:
# 1. https://api.ehokimiyat.uz/api/oneid/auth/callback/
# 2. https://ehokimiyat.uz/login/callback  
# 3. http://localhost:8000/api/oneid/auth/callback/
# 4. http://localhost:3000/login/callback

# Frontend URL
FRONTEND_URL=https://ehokimiyat.uz
```

### 3. OneID ro'yxatdan o'tish

1. [OneID portaliga](https://sso.egov.uz) kiring
2. Yangi application yaratish
3. Quyidagi **barcha** redirect URI larni kiriting:
   - **Application Name**: E-Hokimiyat Xatirchi
   - **Redirect URI 1**: `https://api.ehokimiyat.uz/api/oneid/auth/callback/`
   - **Redirect URI 2**: `https://ehokimiyat.uz/login/callback`
   - **Redirect URI 3**: `http://localhost:8000/api/oneid/auth/callback/`
   - **Redirect URI 4**: `http://localhost:3000/login/callback`
   - **Scope**: `ehokimiyat`
4. Client ID va Client Secret ni oling
5. Ushbu kalitlarni `.env` fayliga qo'shing

## ⚙️ Sozlash

### Django Settings

`backend/ehokimiyat/settings.py` da OneID sozlamalari:

```python
# OneID OAuth 2.0 sozlamalari
ONEID_CLIENT_ID = os.environ.get('ONEID_CLIENT_ID', '')
ONEID_CLIENT_SECRET = os.environ.get('ONEID_CLIENT_SECRET', '')
ONEID_REDIRECT_URI = os.environ.get('ONEID_REDIRECT_URI', 'https://api.ehokimiyat.uz/api/oneid/auth/callback/')
ONEID_SCOPE = os.environ.get('ONEID_SCOPE', 'ehokimiyat')

# Frontend URL
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://ehokimiyat.uz')

# OneID endpointlari
ONEID_AUTH_URL = "https://sso.egov.uz/sso/oauth/Authorization.do"
ONEID_TOKEN_URL = "https://sso.egov.uz/sso/oauth/AccessToken.do"
ONEID_USER_INFO_URL = "https://sso.egov.uz/sso/oauth/Authorization.do"
ONEID_LOGOUT_URL = "https://sso.egov.uz/sso/oauth/Authorization.do"
```

### Production sozlamalari

```env
DEBUG=False
ALLOWED_HOSTS=api.ehokimiyat.uz,ehokimiyat.uz,www.ehokimiyat.uz
CORS_ALLOWED_ORIGINS=https://ehokimiyat.uz,https://api.ehokimiyat.uz
```

## 📡 API Endpointlar

### Autentifikatsiya

#### Login boshlash
```http
POST /api/oneid/auth/login/
Content-Type: application/json

{
  "pnfl": "12345678901234",
  "redirect_uri": "https://ehokimiyat.uz/login/callback"  // ixtiyoriy
}
```

**Response:**
```json
{
  "success": true,
  "authorization_url": "https://sso.egov.uz/sso/oauth/Authorization.do?response_type=one_code&client_id=...",
  "state": "unique-state-string",
  "session_id": "uuid-string"
}
```

#### Callback
```http
GET /api/oneid/auth/callback/?code=auth-code&state=session-state
```

#### Token yangilash
```http
POST /api/oneid/auth/refresh/
Content-Type: application/json

{
  "refresh_token": "oneid-refresh-token"
}
```

#### Logout
```http
POST /api/oneid/auth/logout/
Authorization: Bearer jwt-token
```

### Status va ma'lumotlar

#### OneID status
```http
GET /api/oneid/status/status/
Authorization: Bearer jwt-token
```

**Response:**
```json
{
  "connected": true,
  "oneid_user_id": "oneid-user-id",
  "expires_at": "2026-02-24T18:00:00Z",
  "is_expired": false,
  "session_id": "uuid-string"
}
```

#### Ma'lumotlarni sinxronizatsiya
```http
POST /api/oneid/status/sync_data/
Authorization: Bearer jwt-token
```

## 🌐 Frontend integratsiyasi

### 1. Login komponenti

`app/login/page.tsx` da OneID tugmasi:

```tsx
const handleOneIdLogin = async () => {
  try {
    const { oneidLogin, buildOneIDCallbackUrl, storeOneIDSession } = await import("@/lib/api/oneid")
    
    const callbackUrl = buildOneIDCallbackUrl()
    const response = await oneidLogin({
      pnfl: pnfl,
      redirect_uri: callbackUrl
    })

    if (response.success && response.authorization_url) {
      // Sessiya ma'lumotlarini saqlash
      storeOneIDSession({
        session_id: response.session_id,
        state: response.state,
        pnfl: pnfl
      })
      
      // OneID ga yo'naltirish
      window.location.href = response.authorization_url
    }
  } catch (err: any) {
    setError(err.message || "OneID orqali kirishda xatolik yuz berdi")
  }
}
```

### 2. Callback sahifasi

`app/login/callback/page.tsx` callback ni qayta ishlash:

```tsx
useEffect(() => {
  const handleCallback = async () => {
    const success = searchParams.get('success')
    const access = searchParams.get('access')
    const refresh = searchParams.get('refresh')

    if (success === 'true' && access && refresh) {
      setAccessToken(access)
      setRefreshToken(refresh)
      
      // Foydalanuvchi ma'lumotlarini olish
      const userResponse = await fetch('/api/auth/me/', {
        headers: { 'Authorization': `Bearer ${access}` }
      })
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        localStorage.setItem('user', JSON.stringify(userData))
      }
      
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  handleCallback()
}, [searchParams, router])
```

### 3. API funksiyalari

`lib/api/oneid.ts` da asosiy funksiyalar:

```typescript
export async function oneidLogin(data: OneIDLoginRequest): Promise<OneIDLoginResponse>
export async function getOneIDStatus(): Promise<OneIDStatusResponse>
export async function syncOneIDData(): Promise<OneIDSyncResponse>
export async function oneidLogout(): Promise<{ success: boolean }>
```

## 🧪 Test qilish

### 1. Backend testlari

```bash
# Barcha testlarni ishga tushirish
python manage.py test oneid

# Specific testni ishga tushirish
python manage.py test oneid.tests.OneIDServiceTestCase.test_get_authorization_url

# Test report bilan
python manage.py test oneid --verbosity=2
```

### 2. Integration test

```bash
# To'liq flow testi
python manage.py test oneid.tests.OneIDIntegrationTestCase
```

### 3. Manual test

1. Django admin orqali foydalanuvchi yarating
2. PNFL ni kiriting
3. OneID tugmasini bosing
4. OneID orqali login qiling
5. Tokenlar yaratilganligini tekshiring

## 📊 Ma'lumotlar bazasi

### OneIDToken

Foydalanuvchi OneID tokenlarini saqlaydi.

| Maydon | Turi | Tavsif |
|--------|------|--------|
| user | ForeignKey | Foydalanuvchi |
| access_token | TextField | OneID access token |
| refresh_token | TextField | OneID refresh token |
| expires_at | DateTime | Token muddati |
| oneid_user_id | CharField | OneID user ID |
| session_id | UUIDField | Sessiya ID |
| is_active | Boolean | Aktivligi |

### OneIDSession

Login sessiyalarini kuzatish.

| Maydon | Turi | Tavsif |
|--------|------|--------|
| user | ForeignKey | Foydalanuvchi |
| pnfl | CharField | PNFL |
| state | CharField | Sessiya state |
| authorization_code | CharField | Authorization code |
| status | CharField | Status (PENDING/SUCCESS/FAILED) |
| redirect_uri | URLField | Callback URL |
| ip_address | GenericIPAddressField | IP manzil |

### OneIDUserLog

Barcha OneID operatsiyalari logi.

| Maydon | Turi | Tavsif |
|--------|------|--------|
| user | ForeignKey | Foydalanuvchi |
| action | CharField | Operatsiya turi |
| oneid_user_id | CharField | OneID user ID |
| old_data | JSONField | Eski ma'lumotlar |
| new_data | JSONField | Yangi ma'lumotlar |
| success | Boolean | Muvaffaqiyatli ligi |
| error_message | TextField | Xatolik xabari |

## 🔧 Management Commands

### Ma'lumotlarni sinxronizatsiya

```bash
# Barcha foydalanuvchilarni sinxronizatsiya qilish
python manage.py sync_oneid_data

# Faqat bitta foydalanuvchini
python manage.py sync_oneid_data --pnfl 12345678901234

# Majburan sinxronizatsiya qilish
python manage.py sync_oneid_data --force

# Dry run (faqat tekshirish)
python manage.py sync_oneid_data --dry-run
```

## 🐛 Xatoliklarni tuzatish

### Umumiy xatoliklar

#### 1. "Client ID not found"
```bash
# .env faylini tekshiring
echo $ONEID_CLIENT_ID
```

#### 2. "Invalid redirect URI"
- OneID panelida redirect URI ni tekshiring
- `.env` dagi `ONEID_REDIRECT_URI` bilan solishtiring

#### 3. "Token expired"
```bash
# Tokenlarni yangilash
python manage.py sync_oneid_data --force
```

#### 4. "CORS error"
```bash
# CORS sozlamalarini tekshiring
# settings.py da CORS_ALLOWED_ORIGINS ni ko'ring
```

### Debug qilish

```python
# Django settings
DEBUG=True
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'oneid': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
```

### Monitoring

Django Admin orqali:

1. `/admin/oneid/oneidtoken/` - Tokenlarni ko'rish
2. `/admin/oneid/oneidsession/` - Sessiyalarni ko'rish
3. `/admin/oneid/oneiduserlog/` - Loglarni ko'rish

## 🔒 Xavfsizlik

### Token xavfsizligi

- ✅ Access tokenlar 1 soat muddatga ega
- ✅ Refresh tokenlar xavfsiz saqlanadi
- ✅ Barcha operatsiyalar loglanadi
- ✅ HTTPS majburiy (production)

### Sessiya xavfsizligi

- ✅ State parametri CSRF himoyasi uchun
- ✅ IP manzil va User Agent loglanadi
- ✅ Sessiya muddati bor
- ✅ Xatolikli sessiyalar avtomatik tozalanadi

## 📈 Performance

### Optimizatsiya

- ✅ Database indekslar
- ✅ Token caching
- ✅ Async operatsiyalar
- ✅ Minimal API call lar

### Monitoring

```bash
# Tokenlar soni
OneIDToken.objects.count()

# Faol sessiyalar
OneIDSession.objects.filter(status='SUCCESS').count()

# Oxirgi 24 soatdagi loglar
from django.utils import timezone
OneIDUserLog.objects.filter(
    created_at__gte=timezone.now() - timezone.timedelta(hours=24)
).count()
```

## 📞 Yordam

Agar muammo yuz bersa:

1. Loglarni tekshiring: `/admin/oneid/oneiduserlog/`
2. Settings ni tekshiring: `.env` va `settings.py`
3. OneID sozlamalarini tekshiring: client_id, redirect_uri
4. Testlarni ishga tushiring: `python manage.py test oneid`

---

**Versiya**: 1.0.0  
**Yangilangan**: 2026-02-24  
**Muallif**: E-Hokimiyat Development Team
