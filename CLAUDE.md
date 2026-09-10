# e-Hokimiyat — Xatirchi tumani

Xatirchi tumani (Navoiy viloyati) hokimligi uchun **haqiqiy davlat platformasi**:
aholi murojaatlari (Telegram bot orqali), ijro topshiriqlari va nazorat,
tashkilotlar va foydalanuvchilar boshqaruvi, tahlil va xarita.

> **Bu ishlab turgan davlat tizimi.** Statistika, rasmiy iqtibos, hokimlik
> aloqa ma'lumotlari yoki rasmiy logotiplarni **o'ylab chiqarish qat'iyan
> mumkin emas**. Ma'lumot yo'q bo'lsa — `null` qoldiriladi va interfeysda
> «ma'lumot kiritilmagan» deb ko'rsatiladi. Nol qo'yish ham noto'g'ri:
> nol — bu raqam, ya'ni da'vo.

## Texnologiyalar

| Qatlam | Nima |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4.1.9, shadcn/ui, framer-motion, lucide-react |
| Backend | Django 5 + DRF + Channels (WebSocket) + JWT, Celery |
| Baza | **PostgreSQL** (`USE_POSTGRES=1`). SQLite faqat zaxira variant |
| Realtime | Redis (channel layer). Yo'q bo'lsa jarayon ichidagi layer'ga tushadi |
| Bot | python-telegram-bot, `backend/telegram_bot/` |

## Ishga tushirish

```bash
# Backend
cd backend
python manage.py migrate          # HAR TORTIB OLISHDAN KEYIN — pastga qara
python manage.py runserver

# Frontend
npm install
npm run dev

# Telegram bot (alohida terminal)
cd backend && python run_bot.py
```

### ⚠️ Migratsiya — eng ko'p uchragan nosozlik

Bu loyihada 500 xatolarining aksariyati **qo'llanmagan migratsiya** sababli
bo'lgan: model'ga maydon qo'shiladi, serializer uni so'raydi, bazada ustun
yo'q → `ProgrammingError: column ... does not exist` va **butun ro'yxat
ham, yaratish ham** ishlamaydi.

Ilova «hech narsa ko'rsatmasa» yoki 500 bersa — **birinchi navbatda**:

```bash
cd backend && python manage.py migrate
```

Log: `backend/logs/django.log` — oxiridan qara, `does not exist` izla.

## Loyiha tuzilishi

```
app/                    Next.js App Router sahifalari
  dashboard/
    tasks/              topshiriqlar ro'yxati + [id] sahifasi + yaratish
    appeals/            murojaatlar + [id]/telegram-detail.tsx
    map/ analytics/ users/ organizations/ telegram-bot/ chat/
components/
  layout/               sidebar, header, dashboard-shell, mobile-bottom-nav
  dashboard/            bo'limlar bo'yicha komponentlar
  landing/              e-hokimiyat-landing.tsx (bitta fayl, butun landing)
  ui/                   shadcn/ui — TEGMASLIK ma'qul
lib/
  api/                  har modul uchun bitta *.api.ts, index.ts re-export qiladi
  i18n/                 uz / uz-cyrl / ru / en
  status-styles.ts      holat va muhimlik yorliqlari, ranglari, izohlari
backend/
  tasks/  organizations/  users/  telegram_bot/  chat/  notifications/
  analytics/  audit/  core/
  core/realtime.py      BARCHA WebSocket broadcast shu yerdan
  tasks/access.py       vakolat doirasi — YAGONA MANBA
```

## Rollar va vakolat doirasi

Qoidalar **faqat** `backend/tasks/access.py` da. Rol nomini boshqa joyda
taxmin qilish (`if user.role == 'HOKIM'`) — xato: doira allaqachon shu
yerda hisoblangan.

- `HOKIM`, `ADMIN` — hammasini ko'radi va tasdiqlaydi.
- `HOKIM_YORDAMCHISI`, `HOKIMLIK_MASUL` — faqat **biriktirilgan
  tashkilotlar** (`users.curated_organizations`), bo'sh bo'lsa soha doirasi.
  Bir yordamchi boshqa yordamchining tashkilotiga topshiriq **bera olmaydi**.
- `TASHKILOT_RAHBARI`, `TASHKILOT_MASUL` — faqat o'z tashkiloti; ijrochi.

Frontend huquqni **backend bayroqlaridan** oladi: `task.can_edit`,
`task.can_approve`. Rolga qarab tugma ko'rsatish — takror mantiq.

`GET /api/organizations/assignable/` → `{scope, sector, organizations}` —
kabinetda faqat o'ziga tegishli tashkilotlar chiqishi uchun.

## Topshiriq holat oqimi

```
YANGI → TEKSHIRUVDA («Ko'rib chiqilmoqda») → IJRODA
      → BAJARILDI («Tasdiqlashda») → NAZORATDAN_YECHILDI
```

Chetlanishlar: `QAYTA_IJROGA_YUBORILDI`, `MUDDATI_KECH`, `BAJARILMADI`.

- Ijrochi sahifani ochganda `POST /api/tasks/{id}/mark-viewed/` chaqiriladi
  va holat `YANGI` → `TEKSHIRUVDA` ga o'tadi. **GET ichida mutatsiya
  qilinmaydi** — ilgari shunday bo'lgan va har prefetch holatni
  o'zgartirib qo'yardi.
- Yorliqlar `lib/status-styles.ts` da. Backend `TaskStatus` (`core/constants.py`)
  bilan mos bo'lishi shart.

## Murojaatlar

- Botdan `TelegramAppeal` sifatida keladi; `telegram_user` orqali kim
  yozgani aniqlanadi (ism, @username, telegram_id, tili).
- Holat o'zgarganda fuqaroga **avtomatik** xabar boradi:
  `telegram_bot/citizen_notify.py` + `signals.py` (pre_save/post_save).
  Endpoint'larda qo'lda chaqirmang — status oltita joyda o'zgaradi,
  shuning uchun signal ishlatilgan.
- Yuborilgan xabar `AppealMessage(is_system=True)` — operator oynasida
  «Fuqaroga yuborildi» deb ajratib ko'rsatiladi.

## Dizayn standarti (foydalanuvchi tasdiqlagan — o'zgartirilmaydi)

Apple / Stripe / Linear darajasi. Har bir yangi ekran shu qoidalarga
bo'ysunadi:

1. **Qattiq chegara yo'q.** Ajratish fon kontrasti bilan: `bg-card`
   plita `bg-background` ustida + yumshoq tarqoq soya. `border` faqat
   HOLAT belgisi bo'lganda (tanlangan chip, xato maydoni, drag-over) —
   u affordans, bezak emas.
2. **Gradiyent yo'q.** Qorong'i mavzuda hisoblanmaydi, kontrasti
   o'lchanmaydi. Tokenlangan yassi ranglar: `bg-primary`, `bg-success`,
   `bg-warning`, `bg-destructive`, `bg-info` va ularning `-soft` juftlari.
3. **Faqat tokenlar.** `slate-700`, `emerald-500`, `#fff` kabi xom
   ranglar `components/landing` va `components/ui` dan tashqarida
   ishlatilmaydi. Tokenlar `app/globals.css` dagi `@theme inline` da.
   Yumshoq fon ustida matn `-soft-foreground` bo'ladi (kontrast
   o'lchangan: 5.7–7.9:1).
4. **Tipografika ierarxiyasi.** Mikro-yorliq
   `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`,
   raqamlar `tabular-nums`, tana matni `text-sm text-muted-foreground`.
5. **Bo'sh joy.** `p-4` (telefon) / `p-6`–`p-8` (desktop), `gap-2`/`gap-3`
   ichkarida, `space-y-4`/`space-y-6` bo'limlar orasida.
6. **Shisha (glass) faqat** surat yoki quyuq fon ustidagi qatlamda
   (landing hero, modal orqa fon). Yorug' panelda — hech qachon.
7. **Asosiy harakat ko'rinib turishi shart.** Ikonkalar orasiga
   siqilgan bir xil o'lchamdagi tugma — ko'rinmaydi. Asosiy tugma
   kontent boshida, rangli soya bilan (`shadow-[...rgb(51_102_255_/_0.55)]`),
   ikkilamchisi `bg-primary-soft` — deyarli oq emas.

### Mobil — 100% majburiy

Har o'zgarishdan keyin 320 / 360 / 390 / 414 / 768px da tekshiriladi.
Talab: **gorizontal siljish 0**.

- Jadval faqat `scroll-x` (yoki `overflow-x-auto`) qobig'i ichida +
  `min-w-[...]`; kam ahamiyatli ustunlar `hidden sm:table-cell`.
- Uzun tab qatori `grid-cols-N` emas — `scroll-x flex` (5 yorliq 360px ga
  sig'maydi).
- `100vh` emas, **`100dvh`** (iOS Safari brauzer paneli bilan hisoblaydi).
- Sensorli nishon ≥ 44px (ikkilamchi chip uchun ≥ 36px).
- `truncate` bo'lgan `<p>` ichiga inline nishon qo'yilmaydi — u kesilmay
  viewport'dan chiqib ketadi. Flex qatorga ajratiladi.

## Muhandislik qoidalari

- **Ma'lumot bazasi va serializer birga o'zgaradi**: maydon qo'shildi →
  migratsiya yozildi → serializer'ga qo'shildi. Uchtasidan biri yetishmasa
  ro'yxat ham, yaratish ham 500 beradi.
- **`@property` ni ORM'ga uzatib bo'lmaydi.** `values()`, `values_list()`,
  `order_by()` ichida `full_name` kabi xossa `FieldError` beradi. Python
  tomonida yig'iladi. (Bu xato ikki marta 500 sabab bo'lgan.)
- **WebSocket broadcast faqat `core/realtime.py` orqali.**
  `async_to_sync(channel_layer.group_send)` to'g'ridan-to'g'ri chaqirilsa,
  Redis o'chgan bo'lsa butun HTTP so'rov 500 bilan yiqiladi.
- **React StrictMode** ikki marta mount qiladi. Modul darajasida
  keshlangan promise + `AbortController` = birinchi mount cleanup'i
  umumiy promise'ni bekor qiladi va ma'lumot hech qachon kelmaydi.
  (Xarita shu sabab bo'sh chiqqan.)
- **Palitra/gradiyent skriptlari**: `scripts/palette-*.py`,
  `scripts/gradient-repair.py`. Har passdan keyin sintaksis tekshiriladi —
  `hover:bg-X"` shaklidagi almashtirish qo'shtirnoqni yeb qo'yishi mumkin.
- `next.config.mjs` da hali `ignoreBuildErrors: true` / `ignoreDuringBuilds:
  true` — o'chirishdan oldin `npx tsc --noEmit` to'liq o'tishi kerak.

## Til

Interfeys matni, kod izohlari va commit xabarlari — **o'zbekcha**.
i18n to'rt tilda: `uz`, `uz-cyrl`, `ru`, `en` (`lib/i18n/`). Yangi matn
qo'shilsa to'rttasiga ham qo'shiladi.

## Tekshirish (verification)

- Sintaksis: `npx tsc --noEmit` yoki tez variant — `esbuild --jsx=automatic`.
- Backend: `python -m py_compile <fayl>` (loyiha venv'i Python 3.14).
- Mobil siljish: 320–768px da o'lchash (Playwright yoki brauzer devtools).
- Kontrast: yumshoq fon + `-soft-foreground` juftligi AA (≥4.5:1) bo'lishi
  shart; yangi juftlik kiritilsa o'lchanadi.
