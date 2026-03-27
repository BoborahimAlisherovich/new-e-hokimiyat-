# E-Hokimiyat “Hatirchi” — To‘liq foydalanuvchi yo‘riqnomasi

Sana: 2026-03-26  
Tizimlar: Dashboard (Veb) + Telegram bot

Bu hujjat “Hatirchi” loyihasining **barcha bo‘limlari** bo‘yicha (Topshiriqlar, Loyihalar, Murojaatlar, Chat, Analitika, AI yordamchi, Telegram bot, Sozlamalar, Foydalanuvchilar/Tashkilotlar) **professional, sodda va tushunarli** yo‘riqnoma hisoblanadi.

---

## Mundarija (tezkor)

1. Umumiy tushuncha va atamalar  
2. Rollar va ruxsatlar (kim nima qiladi)  
3. Dashboard bo‘limlari: nima uchun kerak  
4. Fuqaro uchun: Telegram bot orqali murojaat yuborish (to‘liq)  
5. Hokim / Hokim yordamchisi: kundalik ish oqimi (to‘liq)  
6. Hokimlik mas’uli: topshiriq va murojaat oqimi  
7. Tashkilot rahbari / mas’uli: ijro, hisobot, chat  
8. Admin: tizim boshqaruvi (foydalanuvchi, tashkilot, bot)  
9. Qoidalar va standartlar (deadline, prioritet, hujjatlar)  
10. FAQ va troubleshooting

---

## 1) Umumiy tushuncha va atamalar

### 1.1) Tizim nimaga xizmat qiladi?

“Hatirchi” — hokimlik va tashkilotlar o‘rtasida:
- **topshiriq berish → ijro → hisobot → yopish** zanjirini,
- **fuqarolar murojaati (Telegram bot)** oqimini,
- **real-time chat** va bildirishnomalarni,
- **AI yordamchi** orqali tezkor savol-javob / buyruqlarni
bir platformada boshqaradi.

### 1.2) Asosiy atamalar

- **Topshiriq** — aniq ish vazifa; tashkilot(lar)ga biriktiriladi, muddat va ustuvorlikka ega.
- **Murojaat** — fuqaroning Telegram bot orqali yuborgan arizasi/shikoyati/taklifi.
- **Tashkilot** — ijrochi tomon (mas’ul idora/bo‘lim).
- **Holat** — topshiriq/murojaatning jarayondagi bosqichi.
- **Nazoratdan yechish** — topshiriqni yakuniy yopish (faqat Hokim).

---

## 2) Rollar va ruxsatlar (kim nima qila oladi)

Quyidagi jadval amaliy jarayon bo‘yicha eng muhim farqlarni ko‘rsatadi.

| Imkoniyat | Hokim | Hokim yordamchisi | Hokimlik mas’uli | Tashkilot rahbari | Tashkilot mas’uli | Admin |
|---|---:|---:|---:|---:|---:|---:|
| AI yordamchi (Chat) | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Topshiriq yaratish / tahrirlash | ✅ | ✅ | ✅ (o‘z sohasi) | ❌ | ❌ | ✅ |
| Nazoratdan yechish (yakuniy yopish) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (texnik) |
| Topshiriq ijrosi (hisobot, chat, holat) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Murojaatlar bilan ishlash | ✅ | ✅ | ✅ (o‘z sohasi) | ✅ (tegishlisi) | ✅ (tegishlisi) | ✅ |
| Foydalanuvchi boshqaruvi | ✅ | ✅ (chegaralangan) | ✅ (chegaralangan) | ✅ (o‘z tashkiloti) | ❌ | ✅ |
| Tashkilot boshqaruvi | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Telegram bot sozlamalari | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

Eslatma: real tizimda ko‘rinadigan tugmalar va bo‘limlar sizning rolingiz hamda biriktirilgan tashkilot/sohangizga ko‘ra avtomatik cheklanadi.

---

## 3) Dashboard bo‘limlari: nima uchun kerak?

Quyidagi bo‘limlar dashboard menyusida mavjud (rolga qarab):

- **Dashboard** — umumiy ko‘rsatkichlar va tezkor kirishlar.
- **Topshiriqlar** — yaratish, ijro, chat, hisobot, nazorat.
- **Loyihalar** — portfel, progress, kategoriya, tahrirlash (ruxsat bo‘lsa).
- **Murojaatlar** — Telegram botdan kelgan murojaatlar ro‘yxati va ko‘rib chiqish.
- **Chat** — tizim ichki muloqoti (agar yoqilgan).
- **Bildirishnomalar** — yangiliklar, status o‘zgarishlari.
- **Foydalanuvchilar** — xodimlar, rollar (ruxsat bo‘lsa).
- **Tashkilotlar** — tashkilotlar ma’lumotlari va holati (ruxsat bo‘lsa).
- **Analitika** — hisobotlar, grafiklar (ruxsat bo‘lsa).
- **AI yordamchi** — tezkor savol-javob va ⚡ buyruqlar (faqat ayrim rollar).
- **Telegram bot** — bot sozlamalari, hududlar, foydalanuvchilar, statistika (asosan Admin).
- **Sozlamalar** — profil, xavfsizlik, bildirishnoma sozlamalari.

### 3.1) Topshiriqlar bo‘limi (qisqacha)

Topshiriqlar bo‘limi ichida odatda:
- filtrlash (holat, tashkilot, muddat, qidiruv),
- topshiriq yaratish (manual yoki audio+AI),
- topshiriq detalida chat va ijro hisobotlari
amalga oshiriladi.

### 3.2) Loyihalar bo‘limi (portfel)

`Loyihalar` bo‘limi strategik portfelni ko‘rsatadi:
- kategoriya/kengaytma (mahalliy, xalqaro, driver),
- progress va resurs (byudjet/paket),
- (ruxsat bo‘lsa) yaratish/tahrirlash/arxivlash.

### 3.3) Analitika bo‘limi

`Analitika` bo‘limida:
- topshiriqlar holati va trendlar,
- kesimlar (tashkilot/soha bo‘yicha),
- eksport (agar yoqilgan bo‘lsa)
ko‘riladi.

### 3.4) Bildirishnomalar va Sozlamalar

- `Bildirishnomalar` — status o‘zgarishi, yangi xabarlar va muhim alertlar.
- `Sozlamalar` — profil ma’lumotlari, xavfsizlik, ko‘rinish (appearance) va bildirishnoma afzalliklari.

---

## 4) Fuqaro uchun: Telegram bot orqali murojaat yuborish (to‘liq)

### 4.1) Botga kirish va buyruqlar

Telegram botda asosiy buyruqlar:
- `/start` — boshlash / ro‘yxatdan o‘tishni boshlash
- `/menu` — menyu
- `/help` — yordam matni
- `/cancel` — amaldagi jarayonni bekor qilish

### 4.2) Ro‘yxatdan o‘tish (birinchi martada)

`/start` bosilgach bot ketma-ket so‘raydi:
1. **Ism-familiya**
2. **Jins**
3. **Telefon raqam** (qo‘lda yoki kontakt yuborib)
4. **Hudud (region)** — ro‘yxatdan tanlanadi

Ro‘yxatdan o‘tish tugagach asosiy menyu chiqadi.

### 4.3) Yangi murojaat yuborish

Asosiy menyudan `Yangi murojaat` tanlanadi va quyidagilar bajariladi:
1. **Murojaat turi** tanlanadi
2. **Kategoriya** tanlanadi
3. **Murojaat matni** yoziladi (kamida ~20 ta belgi; juda qisqa bo‘lsa bot qayta so‘raydi)
4. Zarur bo‘lsa **ilova** yuboriladi (rasm/video/audio/hu jj at), so‘ng `Tugatish`
5. Bot yakuniy **tasdiqlash** oynasini chiqaradi → `Tasdiqlash`

### 4.4) Mening murojaatlarim / holatni tekshirish

Menyudan `Mening murojaatlarim` tanlab, oxirgi murojaatlar ro‘yxati va holati ko‘riladi.

### 4.5) Operator javobi va qo‘shimcha izoh yuborish

Agar murojaat bo‘yicha operator savol berib qayta aloqa so‘rasa:
- bot “javob yozish” holatiga o‘tkazadi,
- fuqarodan qo‘shimcha matn qabul qiladi,
- operatorlarga xabar yuboriladi.

### 4.6) Murojaat yopish va baholash

Muammo hal etilgach bot fuqarodan:
- **qoniqish** (ha/yo‘q),
- **baholash** (yulduzcha)
kabi feedback so‘rashi mumkin.

---

## 5) Hokim / Hokim yordamchisi: kundalik ish oqimi (to‘liq)

### 5.1) Kundalik “3 qadam” tavsiyasi

1) **Dashboard**: bugungi holat, muddatdan o‘tganlar, yangi murojaatlar  
2) **Topshiriqlar**: yangi topshiriq yaratish/taqsimlash, ijro nazorati  
3) **Murojaatlar**: muhim murojaatlarni ko‘rib chiqish, topshiriqqa aylantirish (zarur bo‘lsa)

**Tezkor checklist (Hokim uchun):**
- Ertalab: muddati o‘tganlar → ustuvor topshiriqlar → muhim murojaatlar
- Kun davomida: chat/izohlar → ijro holatini yangilash → kerak bo‘lsa yangi topshiriq
- Yakunida: bajarilganlarni ko‘rib chiqish → (faqat Hokim) nazoratdan yechish

### 5.2) Topshiriq yaratish (manual)

`Topshiriqlar` → `Yangi topshiriq`:
- nom (majburiy)
- tafsilot (majburiy)
- muhimlik (deadline hisobiga ta’sir qiladi)
- soha (kategoriya)
- tashkilot(lar) (kamida 1 ta)
- muddat (takrorlanuvchi bo‘lmasa)

### 5.3) Topshiriq yaratish (audio + AI)

Eng tezkor usul:
1. `Topshiriqlar` → `Audio orqali`
2. Mikrofon orqali topshiriqni gapirib ayting
3. AI maydonlarni to‘ldiradi (nom/tavsif/ustuvorlik/soha/tashkilot/muddat)
4. Tekshiring va `Yaratish` ni bosing

**Tashkilot nomini to‘liq aytish shart emas**: 1–2 ta kalit so‘z odatda yetarli. Agar juda umumiy so‘z aytilsa (masalan “tuman”, “hokimlik”), aniqroq nom ayting.

### 5.4) Topshiriq ijrosi va nazorat

Topshiriq yaratilgach:
- tashkilot tomoni ijro qiladi, hisobot va fayl biriktiradi;
- hokimlik tomoni progress/holatni kuzatadi;
- yakunida **Nazoratdan yechish** (yopish) — faqat Hokim.

### 5.5) AI yordamchi (Chat) va ⚡ buyruqlar

`AI yordamchi` bo‘limida:
- analitika bo‘yicha savol-javob,
- hisobot yaratish,
- topshiriq yaratish kabi ⚡ buyruqlar
ishlatiladi.

AI xabari oxirida ⚡ tasdiq so‘rasa:
- **Tasdiqlash** tugmasi → buyruq bajariladi,
- **Bekor qilish** tugmasi → bekor qilinadi.

---

## 6) Hokimlik mas’uli: topshiriq va murojaat oqimi

Hokimlik mas’uli odatda:
- o‘z sohasi bo‘yicha topshiriqlar yaratadi,
- murojaatlarni saralaydi va ijrochilarga yo‘naltiradi,
- ijro jarayonini monitoring qiladi,
- zarur bo‘lsa fuqaroga javob tayyorlash oqimini yuritadi.

Eslatma: AI yordamchi bo‘limi ayrim rollarda ko‘rinmaydi — topshiriq yaratish manual/audio dialog orqali bajariladi.

**Tezkor checklist (Hokimlik mas’uli):**
- Murojaatlar: filtr → AI tahlil → javob/yo‘naltirish
- Topshiriqlar: tashkilot tanlash → muddat belgilash → ijro monitoring
- Kun yakuni: kechikayotgan topshiriqlar ro‘yxati → eslatmalar

---

## 7) Tashkilot rahbari / mas’uli: ijro, hisobot, chat

### 7.1) Topshiriqlar ro‘yxati va detal

Tashkilot xodimi `Topshiriqlar` bo‘limida:
- o‘ziga/ tashkilotiga biriktirilgan topshiriqlarni ko‘radi,
- topshiriq detallari (muddat, tavsif, fayllar) bilan ishlaydi.

### 7.2) Hisobot va fayllar

Topshiriq bajarilgach:
- izoh/hisobot yoziladi,
- zarur hujjatlar/rasm/fayllar biriktiriladi,
- topshiriq “bajarildi” bosqichiga yuboriladi.

### 7.3) Chat (real-time)

Topshiriq ichidagi chat orqali:
- hokimlik/tashkilot o‘rtasida aniqlashtirish,
- dalillar/faktlar bo‘yicha tezkor aloqa
qilinadi.

### 7.4) Murojaatlar (Telegram botdan kelgan)

Tashkilot rahbari/mas’uli `Murojaatlar` bo‘limida **faqat o‘z tashkilotiga biriktirilgan** murojaatlarni ko‘radi.  
Agar murojaat Admin/Hokimda ko‘rinib, sizda ko‘rinmasa:
- foydalanuvchi profilingizda **tashkilot biriktirilganini** tekshiring (Admin qiladi),
- murojaat tegishli tashkilot(lar)ga biriktirilganini tekshiring (kategoriya asosida avtomatik/qo‘lda).

**Tezkor checklist (Tashkilot tomoni):**
- Yangi topshiriq: qabul qilish → reja → ijro izohi
- Jarayon: progress/hisobot → hujjat biriktirish → “bajarildi”ga yuborish
- Savol bo‘lsa: topshiriq ichidagi chat orqali aniqlashtirish

---

## 8) Admin: tizim boshqaruvi (foydalanuvchi, tashkilot, bot)

Admin (texnik administrator) odatda:
- foydalanuvchilar va rollarni yaratadi,
- tashkilotlar strukturasini yuritadi,
- Telegram bot sozlamalarini boshqaradi,
- analitika va texnik monitoringni nazorat qiladi.

**Tezkor checklist (Admin):**
- Foydalanuvchi/rol: yangi xodim → rol → tashkilot biriktirish
- Telegram bot: token/webhook → start/stop → stats monitoring
- Xavfsizlik: token va AI API key’larni faqat zarur odamlarga berish

### 8.1) Telegram bot boshqaruvi

`Telegram bot` bo‘limida:
- bot token/username, webhook URL,
- botni ishga tushirish/to‘xtatish,
- AI provider/model kalitlari,
- welcome/help/about matnlari,
- bot statistika (foydalanuvchi va murojaatlar soni)
sozlanadi.

### 8.2) Hududlar (regions)

`Telegram bot → Hududlar` bo‘limida:
- hudud qo‘shish / tahrirlash / o‘chirish,
- tartib va aktivlikni boshqarish
amalga oshiriladi.

### 8.3) Telegram foydalanuvchilar

`Telegram bot → Foydalanuvchilar` bo‘limida:
- qidirish va filtr,
- bloklash/blokdan chiqarish,
- alohida xabar yuborish yoki broadcast
imkoniyatlari mavjud (ruxsat bo‘lsa).

---

## 9) Qoidalar va standartlar (deadline, prioritet, hujjatlar)

### 9.1) Prioritet → tavsiya etiladigan muddat

Amaliy qoida (default):
- Favqulodda: 1 kun
- Yuqori: 3 kun
- Oddiy: 5 kun
- Past: 7 kun

### 9.2) Tashkilot tanlash qoidasi

Topshiriqni yaratishda **kamida 1 ta tashkilot** tanlanishi shart.  
AI orqali yaratilganda ham tashkilot topilmasa, qo‘lda tanlash kerak bo‘ladi.

### 9.3) Fayllar va xavfsizlik

- Topshiriq/murojaatga biriktirilgan fayllarni faqat ish jarayoni uchun yuklang.
- Shaxsiy ma’lumotlarni (pasport/karteka) faqat zarurat bo‘lsa va reglamentga muvofiq yuboring.

---

## 10) FAQ va troubleshooting

**1) “Tashkilot tanlanmagan” xatosi**  
`Tashkilotlar` bo‘limidan kamida 1 ta tashkilot tanlang. AI topa olmasa, qidiruv orqali belgilang.

**2) Audio ishlamayapti**  
Brauzerda mikrofon ruxsatini tekshiring; ruxsat berilmasa AI audio tahlil qilmaydi.

**3) AI buyruqni noto‘g‘ri tushundi**  
So‘rovni qisqa va aniq qiling: “Tashkilot: X, Muddat: 3 kun, Vazifa: …”.

**4) Telegram botda jarayon “qotib qoldi”**  
`/cancel` yuboring va qaytadan menyudan boshlang.
