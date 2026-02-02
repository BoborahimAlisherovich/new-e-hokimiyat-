# Rollar Bo'yicha Ruxsatlar va Imkoniyatlar

## Rollaring Tizimi

### 1. **HOKIM** (Hokim)
**To'liq imkoniyatlar:**
- ✅ Barcha sahifalarga kirish
- ✅ AI Yordamchi
- ✅ Topshiriqlarni yaratish va tahrirlash
- ✅ **Topshiriqlarni nazoratdan yechish** (faqat Hokim)
- ✅ Foydalanuvchilarni boshqarish (barcha rollarni qo'shish mumkin)
- ✅ Tashkilotlarni boshqarish
- ✅ To'liq analitika
- ✅ Takrorlanuvchi topshiriqlar
- ✅ Telegram bot sozlamalari

### 2. **HOKIM_YORDAMCHISI** (Hokim Yordamchisi)
**Hokimga yaqin imkoniyatlar:**
- ✅ Barcha sahifalarga kirish
- ✅ AI Yordamchi
- ✅ Topshiriqlarni yaratish va tahrirlash
- ❌ **Topshiriqlarni nazoratdan yecha olmaydi** (faqat Hokim uchun)
- ✅ Foydalanuvchilarni boshqarish (Hokimlik mas'uli, Tashkilot rahbari, Tashkilot mas'uli)
- ✅ Tashkilotlarni boshqarish
- ✅ To'liq analitika
- ✅ Takrorlanuvchi topshiriqlar
- ✅ Telegram bot sozlamalari

### 3. **HOKIMLIK_MASUL** (Hokimlik Mas'uli)
**O'z sohasida to'liq boshqaruv:**
- ✅ Dashboard
- ✅ Topshiriqlarni yaratish va tahrirlash (o'z sohasiga tegishli)
- ❌ **AI Yordamchi yo'q** (faqat Hokim va Hokim yordamchisi uchun)
- ❌ **Topshiriqlarni nazoratdan yecha olmaydi**
- ✅ Foydalanuvchilarni qo'shish (Tashkilot rahbari, Tashkilot mas'uli)
- ✅ Tashkilotlarni boshqarish
- ✅ O'z sohasiga tegishli analitika
- ✅ Murojaatlar (o'z sohasiga tegishli)
- ✅ Bildirishnomalar va Chat
- ✅ Takrorlanuvchi topshiriqlar

### 4. **TASHKILOT_RAHBAR** (Tashkilot Rahbari)
**O'z tashkilotida boshqaruv:**
- ✅ Dashboard
- ✅ O'z tashkilotiga yuborilgan topshiriqlarni ko'rish
- ✅ Topshiriqlar ustida ishlash (qabul qilish, hisobot yuklash)
- ✅ Tashkilot mas'ulini qo'shish
- ✅ Foydalanuvchilarni ko'rish (o'z tashkiloti)
- ✅ O'z tashkilotiga tegishli murojaatlar
- ✅ Bildirishnomalar va Chat
- ❌ AI Yordamchi yo'q
- ❌ To'liq analitika yo'q (faqat o'z tashkiloti)
- ❌ Nazoratdan yecha olmaydi

### 5. **TASHKILOT_MASUL** (Tashkilot Mas'uli)
**Topshiriqlarni bajarish:**
- ✅ Dashboard
- ✅ O'ziga tayinlangan topshiriqlarni ko'rish
- ✅ Topshiriqlarni bajarish (javob berish, hisobot yuklash)
- ✅ O'z tashkilotiga tegishli murojaatlarga javob berish
- ✅ Bildirishnomalar va Chat
- ❌ Foydalanuvchi qo'sha olmaydi
- ❌ AI Yordamchi yo'q
- ❌ Analitika yo'q
- ❌ Nazoratdan yecha olmaydi

### 6. **ADMIN** (Texnik Administrator)
**Texnik boshqaruv:**
- ✅ To'liq tizim kirish
- ✅ Barcha rollarni yaratish
- ✅ Texnik sozlamalar

---

## Asosiy Farqlar

| Imkoniyat | Hokim | Hokim Yordamchisi | Hokimlik Mas'uli | Tashkilot Rahbari | Tashkilot Mas'uli |
|-----------|-------|-------------------|------------------|-------------------|-------------------|
| **AI Yordamchi** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Nazoratdan yechish** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Topshiriq yaratish** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Foydalanuvchi qo'shish** | Barchasi | Hokimlik mas'uli, Tashkilot | Tashkilot | Tashkilot mas'uli | ❌ |
| **To'liq analitika** | ✅ | ✅ | O'z sohasi | O'z tashkiloti | ❌ |
| **Tashkilot boshqarish** | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## Backend Permission Classes

```python
# backend/core/permissions.py

IsHokim                 # Faqat Hokim
IsHokimOrAssistant     # Hokim yoki Hokim yordamchisi (AI uchun)
IsHokimOrHokimlikMasul # Hokim yoki Hokimlik mas'uli
IsTashkilotRahbari     # Tashkilot rahbari
IsTashkilotMasul       # Tashkilot mas'uli
CanCloseTask           # Faqat Hokim (nazoratdan yechish)
CanCreateTasks         # Hokim, Hokim yordamchisi, Hokimlik mas'uli
CanExecuteTasks        # Tashkilot rahbari, Tashkilot mas'uli
```

---

## Frontend Route Restrictions

Frontend sidebar (`components/layout/sidebar.tsx`) avtomatik ravishda foydalanuvchi roliga qarab menuни филтrlaydi.

**AI Yordamchi** elementi faqat quyidagi rollar uchun ko'rinadi:
```typescript
requiresRole: ['HOKIM', 'HOKIM_YORDAMCHISI', 'ADMIN']
```

**Nazoratdan yechish** tugmasi faqat quyidagi shart bajarilganda ko'rinadi:
```typescript
const canCloseTask = userRole === 'HOKIM' && task?.status === "BAJARILDI"
```

---

## Yangilangan Fayllar

### Backend:
1. `/backend/core/permissions.py` - Permission klasslar yangilandi

### Frontend:
1. `/components/layout/sidebar.tsx` - Rol-bazada menu filtrlash
2. `/frontend/app/dashboard/tasks/[id]/page.tsx` - Topshiriq sahifasida rol tekshiruvi
3. `/types/index.ts` - HOKIM_YORDAMCHISI roli qo'shildi
4. `/lib/constants.ts` - Rol nomlari yangilandi

---

## Test Qilish

Har bir rol uchun tekshirish:

1. **HOKIM sifatida**:
   - AI Yordamchi ko'rinishi kerak
   - "Nazoratdan yechish" tugmasi ko'rinishi kerak (BAJARILDI holati)

2. **HOKIM_YORDAMCHISI sifatida**:
   - AI Yordamchi ko'rinishi kerak
   - "Nazoratdan yechish" tugmasi ko'rinmasligi kerak

3. **HOKIMLIK_MASUL sifatida**:
   - AI Yordamchi ko'rinmasligi kerak
   - Faqat o'z sohasiga tegishli analitika

4. **TASHKILOT_RAHBAR sifatida**:
   - Faqat o'z tashkilotiga tegishli topshiriqlar
   - AI Yordamchi yo'q

5. **TASHKILOT_MASUL sifatida**:
   - Faqat o'ziga tayinlangan topshiriqlar
   - Minimal imkoniyatlar
