# E-Hokimiyat “Hatirchi” — Foydalanish yo‘riqnomasi

Sana: 2026-03-26  
Tizim: Dashboard (Veb)

## 1) Kirish va umumiy tushuncha

“Hatirchi” tizimi hokimlik va tashkilotlar kesimida:
- topshiriqlarni yaratish va nazorat qilish,
- ijro holatini kuzatish,
- hisobot/ilovalar (fayllar) bilan ishlash,
- AI yordamchi orqali tezkor tahlil va yordamchi avtomatlashtirish
uchun mo‘ljallangan.

## 2) Rollar va ruxsatlar (kim nima qila oladi)

Quyidagi jadval amaliy ish jarayonlari bo‘yicha eng muhim farqlarni ko‘rsatadi.

| Imkoniyat | Hokim | Hokim yordamchisi | Hokimlik mas’uli | Tashkilot rahbari | Tashkilot mas’uli |
|---|---:|---:|---:|---:|---:|
| AI yordamchi | ✅ | ✅ | ❌ | ❌ | ❌ |
| Topshiriq yaratish / tahrirlash | ✅ | ✅ | ✅ (o‘z sohasi) | ❌ | ❌ |
| Topshiriqni “nazoratdan yechish” (yakuniy yopish) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Topshiriq ijrosi (qabul qilish, bajarish, hisobot) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Foydalanuvchi boshqaruvi | ✅ | ✅ (chegaralangan) | ✅ (chegaralangan) | ✅ (o‘z tashkiloti) | ❌ |
| Tashkilot boshqaruvi | ✅ | ✅ | ✅ | ❌ | ❌ |

Eslatma: aniq cheklovlar tizimdagi permission’lar va sizga biriktirilgan soha/tashkilotga bog‘liq.

## 3) Topshiriq yaratish (manual)

Topshiriq yaratish odatda `Topshiriqlar` bo‘limidan amalga oshiriladi.

1. `Topshiriqlar` → `Yangi topshiriq` (yoki telefonda pastki paneldagi tugma).
2. Maydonlarni to‘ldiring:
   - **Topshiriq nomi** (majburiy)
   - **Tafsilotlar** (majburiy)
   - **Muhimlik darajasi** (deadline hisoblashga ta’sir qiladi)
   - **Soha**
   - **Tashkilotlar** (kamida 1 ta)
   - **Muddat** (takrorlanuvchi bo‘lmasa)
3. `Saqlash` / `Yaratish` tugmasi orqali yakunlang.

### 3.1) Tashkilot tanlash qoidasi

Topshiriq “kim bajaradi” degan asosiy bog‘lanish — bu **tashkilot**. Shu sabab:
- kamida 1 ta tashkilot tanlanmasa topshiriq yaratilmaydi;
- tashkilotni qidiruv orqali topib tanlash mumkin.

## 4) Topshiriq yaratish (audio + AI)

Hokim (yoki yaratish huquqi bor rol) uchun eng tezkor yo‘l:

1. `Topshiriqlar` → `Audio orqali` (yoki yaratish dialogida “Audio yozish”).
2. Mikrofon tugmasini bosing va topshiriqni gapirib ayting.
3. AI audio’ni matnga o‘giradi va maydonlarni avtomatik to‘ldiradi:
   - nom, tafsilot, muhimlik, soha,
   - tashkilot(lar),
   - muddat (muhimlikdan kelib chiqib).
4. Tashkilotlar qismi to‘g‘ri tushganini tekshiring va kerak bo‘lsa qo‘lda tuzating.
5. `Yaratish` tugmasini bosing.

### 4.1) Tashkilot nomini to‘liq aytish shart emas

AI tomonidan aniqlangan tashkilot nomi to‘liq bo‘lmasa ham, tizim uni mavjud tashkilotlar ro‘yxatidan **eng mosini topib** ID’ga bog‘lashga harakat qiladi.

Agar AI tashkilotni topa olmasa:
- `Tashkilotlar` qismida qidiruv orqali qo‘lda tanlang;
- bir xil/yaqin nomli tashkilotlar bo‘lsa, to‘g‘ri variantni tanlang.

## 5) Topshiriq holatlari va umumiy oqim

Tizimda topshiriq odatda quyidagi bosqichlar orqali yuradi:
1. Yaratildi → tashkilot(lar)ga biriktirildi
2. Ijro jarayoni (qabul qilish / bajarish)
3. Hisobot/ilova yuklash va “bajarildi”ga yuborish
4. Yakuniy yopish (nazoratdan yechish) — faqat **Hokim**

Eslatma: tashkilot xodimlari yakuniy “nazoratdan yechish”ni bajarmaydi, ular ijro va hisobot bosqichida ishlaydi.

## 6) AI yordamchi (Chat)

`AI yordamchi` bo‘limi (Hokim, Hokim yordamchisi, Admin):
- analitika bo‘yicha savol-javob,
- hisobot yaratish (agar backend’da yoqilgan bo‘lsa),
- topshiriq buyruqlarini aniqlash va tezkor yaratish (⚡ buyruqlar),
- tezkor izoh/yozma yordam olish
uchun ishlatiladi.

Tavsiya:
- so‘rovni aniq yozing: “Qaysi sohada nechta topshiriq muddatidan o‘tgan?” kabi.
- tashkilot nomlari bo‘yicha so‘rovda 1–2 ta kalit so‘z yetarli.

### 6.1) ⚡ Buyruqlarni “bosib” bajarish

AI ba’zi hollarda xabarning oxirida ⚡ buyruq bilan tasdiqlashni so‘raydi (masalan: topshiriq yaratish).

Shunda chat ichida quyidagi tugmalar chiqadi:
- **Tasdiqlash** — buyruqni bajaradi (topshiriq yaratiladi).
- **Bekor qilish** — buyruqni bekor qiladi.

Eslatma: agar AI tashkilotni avtomatik topa olmasa yoki juda umumiy nom aytilsa, tasdiqlashdan oldin tashkilot nomini aniqroq yozing.

## 7) Tez-tez uchraydigan muammolar (FAQ)

**1) “Tashkilot tanlanmagan” xatosi chiqadi**  
`Tashkilotlar` bo‘limidan kamida 1 ta tashkilot tanlang. AI topa olmagan bo‘lsa, qidiruv orqali qo‘lda belgilang.

**2) Audio ishlamayapti**  
Brauzer mikrofon ruxsatini tekshiring. Mikrofon ruxsat berilmasa AI audio tahlil qilmaydi.

**3) Muddat noto‘g‘ri chiqdi**  
Muhimlik darajasini tekshiring yoki muddatni qo‘lda o‘zgartiring.
