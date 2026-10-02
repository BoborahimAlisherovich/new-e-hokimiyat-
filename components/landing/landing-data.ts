/* =============================================================================
   LANDING MA'LUMOTLARI — bitta joyda, ROSTGO'YLIK QOIDASI BILAN
   -----------------------------------------------------------------------------
   Bu faylda O'YLAB CHIQARILGAN hech narsa yo'q:

   • RAHBARIYAT — Hukumat portalining rasmiy sahifasidan
     (https://gov.uz/oz/xatirchi/guides, 13.09.2026 holatiga) olingan.
     Rahbariyat o'zgarsa shu ro'yxat yangilanadi; sahifada manba havolasi
     ko'rsatiladi. Rasm URL'lari portalning o'z serveridan
     (api-portal.gov.uz) — `next.config.mjs` remotePatterns'da ruxsat berilgan.
     `scripts/rahbariyat-rasmlar.py` rasmlarni yuklab, kattalashtirib va
     tiniqlashtirib `public/rahbariyat/` ga qo'yadi; keyin `photo` maydonini
     mahalliy yo'lga almashtirish kifoya.

   • HOKIMLIK — manzil, telefon, e-mail ham o'sha portal sahifasidan.

   • DAVLAT_SAYTLARI — O'zbekiston Respublikasining umumdavlat portallari.
     Rasmiy logotip ishlatilmaydi (ruxsat yo'q) — faqat nom va domen.
============================================================================= */

export interface Rahbar {
  /** F.I.Sh. — portalda yozilganidek */
  name: string
  /** Lavozim — portalda yozilganidek */
  position: string
  /** Qabul kuni va vaqti — portalda yozilganidek */
  reception: string
  /** Ish telefoni — portalda yozilganidek */
  phone: string
  photo: string
}

export const RAHBARIYAT_MANBA = "https://gov.uz/oz/xatirchi/guides"

export const RAHBARIYAT: Rahbar[] = [
  {
    name: "Adizov Umidjon Hasanovich",
    position: "Tuman hokimi",
    reception: "Shanba, 8:00 – 17:00",
    phone: "+998 79 544 40 10",
    photo:
      "https://api-portal.gov.uz/uploads/327/2025/07/14/c6b2b34c-8519-4eef-1ae2-2efbf5ada0ec_guide_5949.jpg",
  },
  {
    name: "Baxriddinov Ulug‘bek Baxriddin o‘g‘li",
    position: "Tuman hokimining birinchi o‘rinbosari",
    reception: "Juma, 16:00 – 18:00",
    phone: "+998 79 544 40 25",
    photo:
      "https://api-portal.gov.uz/uploads/327/2026/02/10/412dba0a-5747-d83e-ee9d-7c1d5b9293d7_guide_5969.jpg",
  },
  {
    name: "Chiniqulov Javlon Xudayqul o‘g‘li",
    position: "Tuman hokimi o‘rinbosari",
    reception: "Seshanba, 10:00 – 12:00",
    phone: "+998 79 544 40 25",
    photo:
      "https://api-portal.gov.uz/uploads/327/2025/07/14/3d49a092-0e37-2a9b-3811-3a1a914e6161_guide_.jpg",
  },
  {
    name: "Yusupov Abdumalik Abdurasulovich",
    position: "Tuman hokimi o‘rinbosari",
    reception: "Payshanba, 10:00 – 12:00",
    phone: "+998 79 544 40 17",
    photo:
      "https://api-portal.gov.uz/uploads/327/2025/07/15/5a1a3f42-dc14-f4be-4c76-fcf58451142b_guide_.jpg",
  },
  {
    name: "Abdullayev Madamin Najimovich",
    position: "Tuman hokimi o‘rinbosari",
    reception: "Juma, 14:00 – 16:00",
    phone: "+998 79 544 40 14",
    photo:
      "https://api-portal.gov.uz/uploads/327/2025/11/03/48de9d8f-b429-df86-326d-3005ae9bcaab_guide_.png",
  },
]

/** Hokimlik aloqa ma'lumotlari — gov.uz/oz/xatirchi dan */
export const HOKIMLIK = {
  name: "Xatirchi tumani hokimligi",
  address: "Xatirchi tumani, Mustaqillik ko‘chasi, 34-uy",
  phone: "+998 79 544 40 10",
  phoneHref: "tel:+998795444010",
  email: "xatirchi@nv.uz",
  portal: "https://gov.uz/oz/xatirchi",
} as const

export interface GovSite {
  name: string
  /** Qisqa izoh — 2–4 so'z */
  hint: string
  url: string
  /** Ko'rsatiladigan domen */
  host: string
}

/* Ikki qator: yuqorisi o'ngga, pasti chapga suriladi. */
export const DAVLAT_SAYTLARI_1: GovSite[] = [
  { name: "my.gov.uz", hint: "Yagona interaktiv davlat xizmatlari portali", url: "https://my.gov.uz", host: "my.gov.uz" },
  { name: "OneID", hint: "Yagona identifikatsiya tizimi", url: "https://id.gov.uz", host: "id.gov.uz" },
  { name: "Prezident virtual qabulxonasi", hint: "Murojaatlar va qabul", url: "https://pm.gov.uz", host: "pm.gov.uz" },
  { name: "Hukumat portali", hint: "Vazirlik va hokimliklar", url: "https://gov.uz", host: "gov.uz" },
  { name: "Lex.uz", hint: "Qonunchilik ma'lumotlari milliy bazasi", url: "https://lex.uz", host: "lex.uz" },
  { name: "Soliq", hint: "Soliq qo‘mitasi xizmatlari", url: "https://soliq.uz", host: "soliq.uz" },
  { name: "Davlat xizmatlari agentligi", hint: "Davlat xizmatlari markazlari", url: "https://davxizmat.uz", host: "davxizmat.uz" },
]

export const DAVLAT_SAYTLARI_2: GovSite[] = [
  { name: "Prezident sayti", hint: "Rasmiy veb-sayt", url: "https://president.uz", host: "president.uz" },
  { name: "Statistika agentligi", hint: "Rasmiy statistika", url: "https://stat.uz", host: "stat.uz" },
  { name: "Kadastr", hint: "Yer va ko‘chmas mulk", url: "https://kadastr.uz", host: "kadastr.uz" },
  { name: "Mehnat.uz", hint: "Bandlik va mehnat munosabatlari", url: "https://mehnat.uz", host: "mehnat.uz" },
  { name: "Sog‘liqni saqlash vazirligi", hint: "Tibbiy xizmatlar", url: "https://ssv.uz", host: "ssv.uz" },
  { name: "Navoiy viloyati hokimligi", hint: "Viloyat portali", url: "https://gov.uz/oz/navoiy", host: "gov.uz/oz/navoiy" },
  { name: "Xatirchi tumani", hint: "Tuman hokimligi rasmiy sahifasi", url: "https://gov.uz/oz/xatirchi", host: "gov.uz/oz/xatirchi" },
]
