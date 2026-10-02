/**
 * TOPSHIRIQ / FOYDALANUVCHI HOLATLARI — YAGONA MANBA
 *
 * Ilgari bir xil 8 status uchun 6 xil rang tizimi bor edi:
 *   components/ui/status-badge.tsx        (bg-*-500/20 text-*-400  — dark tema
 *                                          ranglari yorug' fonda, kontrast 1.55:1)
 *   components/dashboard/tasks/task-table.tsx  (mobil kartalar uchun bittasi)
 *   components/dashboard/tasks/task-table.tsx  (desktop jadval uchun ko'chirmasi)
 *   components/dashboard/tasks/task-constants.ts (PRIORITY_COLORS/STATUS_COLORS)
 *   components/ui/badge-enhanced.tsx      (ishlatilmagan, yana bittasi)
 *   app/globals.css                       (.priority-high/medium/low, o'lik)
 *
 * Endi hammasi shu fayldan keladi. Ranglarning o'zi app/globals.css dagi
 * CSS o'zgaruvchilarida (--st-*-bg/fg/bd), shuning uchun dark tema avtomatik
 * ishlaydi va har bir juftlik WCAG AA (>= 4.7:1) bo'yicha tekshirilgan.
 */

export const TASK_STATUSES = [
  "YANGI",
  "TEKSHIRUVDA",
  "IJRODA",
  "BAJARILDI",
  "NAZORATDAN_YECHILDI",
  "MUDDATI_KECH",
  "QAYTA_IJROGA_YUBORILDI",
  "BAJARILMADI",
] as const

export type TaskStatusKey = (typeof TASK_STATUSES)[number]

/** Topshiriq statusining rang klassi (app/globals.css dagi @layer components) */
export const TASK_STATUS_CLASS: Record<string, string> = {
  YANGI: "st-yangi",
  TEKSHIRUVDA: "st-tekshiruvda",
  IJRODA: "st-ijroda",
  BAJARILDI: "st-bajarildi",
  NAZORATDAN_YECHILDI: "st-yechildi",
  MUDDATI_KECH: "st-kech",
  QAYTA_IJROGA_YUBORILDI: "st-qayta",
  BAJARILMADI: "st-bajarilmadi",
}

/**
 * O'zbekcha yorliqlar — i18n bo'lmagan joylar uchun zaxira.
 * BAJARILDI ataylab "Tasdiqlashda" deb nomlangan: bu holat ijrochi hisobotni
 * topshirgan, lekin hokim hali nazoratdan yechmagan holatni bildiradi.
 * "Bajarildi" degan yorliq foydalanuvchiga ish tugagan degan noto'g'ri
 * tasavvur berardi.
 */
export const TASK_STATUS_LABEL: Record<string, string> = {
  YANGI: "Yangi",
  TEKSHIRUVDA: "Ko'rib chiqilmoqda",
  IJRODA: "Ijroda",
  BAJARILDI: "Tasdiqlashda",
  NAZORATDAN_YECHILDI: "Nazoratdan yechildi",
  MUDDATI_KECH: "Muddati kechikkan",
  QAYTA_IJROGA_YUBORILDI: "Qayta ijroga yuborildi",
  BAJARILMADI: "Bajarilmadi",
}

/**
 * JADVAL VA NISHONLAR UCHUN QISQA YORLIQLAR
 *
 * «Muddati kechikkan» va «Qayta ijroga yuborildi» to'liq holda 92px lik
 * nishonga sig'masdi: matn ikki qatorga bo'linib, qat'iy balandlikdagi
 * qutidan toshib chiqardi va qo'shni qator bilan ustma-ust tushardi.
 *
 * Shuning uchun jadvalda QISQA yorliq ko'rsatiladi, to'liq matn esa
 * `title` atributida qoladi — sichqoncha olib borilsa o'qiladi.
 * Batafsil sahifada (topshiriq kartasi) baribir to'liq yorliq chiqadi.
 */
export const TASK_STATUS_SHORT: Record<string, string> = {
  YANGI: "Yangi",
  TEKSHIRUVDA: "Ko'rilmoqda",
  IJRODA: "Ijroda",
  BAJARILDI: "Tasdiqlashda",
  NAZORATDAN_YECHILDI: "Yechildi",
  MUDDATI_KECH: "Kechikkan",
  QAYTA_IJROGA_YUBORILDI: "Qayta ijroda",
  BAJARILMADI: "Bajarilmadi",
}

export const PRIORITY_SHORT: Record<string, string> = {
  FAVQULODDA: "Favqulodda",
  YUQORI: "Yuqori",
  ODDIY: "Oddiy",
  PAST: "Past",
  MUHIM: "Muhim",
  SHOSHILINCH: "Shoshilinch",
  MUHIM_SHOSHILINCH: "Muhim",
}

/* --------------------------------------------------------------- SANA */

/**
 * O'zbekcha oy qisqartmalari.
 *
 * `Intl.DateTimeFormat("uz-Latn-UZ", { month: "short" })` brauzerlarda
 * «M09» qaytaradi — jadvalda «2026 M09 10» degan o'qib bo'lmaydigan
 * satr hosil bo'lardi. Shuning uchun oy nomlari qo'lda.
 */
export const MONTH_SHORT_UZ = [
  "yan", "fev", "mar", "apr", "may", "iyn",
  "iyl", "avg", "sen", "okt", "noy", "dek",
] as const

/** `10 sen 2026` — jadval ustuni uchun ixcham va bir xil enlikda */
export function formatDateShort(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_SHORT_UZ[d.getMonth()]} ${d.getFullYear()}`
}

/** Tooltip / yordam matni — foydalanuvchi statusni tushunishi uchun */
export const TASK_STATUS_HINT: Record<string, string> = {
  YANGI: "Topshiriq yuborilgan, tashkilot hali ijroga olmagan",
  TEKSHIRUVDA: "Tashkilot topshiriqni ko'rib chiqmoqda",
  IJRODA: "Tashkilot ijroga olgan, ish bajarilmoqda",
  BAJARILDI: "Hisobot va isbotlar yuklangan — hokim tasdig'ini kutmoqda",
  NAZORATDAN_YECHILDI: "Hokim tomonidan tasdiqlangan va yopilgan",
  MUDDATI_KECH: "Belgilangan muddat o'tib ketgan",
  QAYTA_IJROGA_YUBORILDI: "Hokim hisobotni qabul qilmadi, qayta bajarilishi kerak",
  BAJARILMADI: "Muddat o'tgan va ish bajarilmagan holda yopilgan",
}

/** Ish oqimidagi tartib — saralash va progress ko'rsatish uchun */
export const TASK_STATUS_ORDER: Record<string, number> = {
  YANGI: 1,
  TEKSHIRUVDA: 2,
  IJRODA: 3,
  QAYTA_IJROGA_YUBORILDI: 3,
  MUDDATI_KECH: 3,
  BAJARILDI: 4,
  NAZORATDAN_YECHILDI: 5,
  BAJARILMADI: 5,
}

/** Yakunlangan (boshqa harakat talab qilmaydigan) statuslar */
export const TASK_STATUS_TERMINAL = new Set([
  "NAZORATDAN_YECHILDI",
  "BAJARILMADI",
])

/** Hokim tasdig'ini kutayotgan statuslar */
export const TASK_STATUS_AWAITING_APPROVAL = new Set(["BAJARILDI"])

/** Diqqat talab qiladigan statuslar (ijrochi uchun) */
export const TASK_STATUS_NEEDS_ACTION = new Set([
  "YANGI",
  "TEKSHIRUVDA",
  "IJRODA",
  "QAYTA_IJROGA_YUBORILDI",
  "MUDDATI_KECH",
])

/* -------------------------------------------------------------- MUHIMLIK */

export const PRIORITIES = ["FAVQULODDA", "YUQORI", "ODDIY", "PAST"] as const
export type PriorityKey = (typeof PRIORITIES)[number]

export const PRIORITY_CLASS: Record<string, string> = {
  FAVQULODDA: "st-kech st-favqulodda",
  YUQORI: "st-qayta",
  ODDIY: "st-yangi",
  PAST: "st-bajarilmadi",
  // Eski/qo'shimcha nomlar — backend'da uchrashi mumkin
  MUHIM: "st-qayta",
  SHOSHILINCH: "st-kech",
  MUHIM_SHOSHILINCH: "st-kech st-favqulodda",
}

export const PRIORITY_LABEL: Record<string, string> = {
  FAVQULODDA: "Favqulodda",
  YUQORI: "Yuqori",
  ODDIY: "Oddiy",
  PAST: "Past",
  MUHIM: "Muhim",
  SHOSHILINCH: "Shoshilinch",
  MUHIM_SHOSHILINCH: "Muhim / shoshilinch",
}

/** Muhimlikka qarab standart muddat (kun) — wizard'da taklif qilinadi */
export const PRIORITY_DEFAULT_DAYS: Record<string, number> = {
  FAVQULODDA: 1,
  YUQORI: 3,
  ODDIY: 5,
  PAST: 7,
}

export const PRIORITY_ORDER: Record<string, number> = {
  FAVQULODDA: 4,
  YUQORI: 3,
  ODDIY: 2,
  PAST: 1,
}

/* -------------------------------------------------- FOYDALANUVCHI HOLATI */

export const USER_STATUS_CLASS: Record<string, string> = {
  FAOL: "st-yechildi",
  KUTILMOQDA: "st-ijroda",
  DRAFT: "st-bajarilmadi",
  BLOKLANGAN: "st-kech",
  ARXIV: "st-bajarilmadi",
}

export const USER_STATUS_LABEL: Record<string, string> = {
  FAOL: "Faol",
  KUTILMOQDA: "Kutilmoqda",
  DRAFT: "Qoralama",
  BLOKLANGAN: "Bloklangan",
  ARXIV: "Arxivda",
}

/* --------------------------------------------------------------- YORDAMCHI */

const UNKNOWN_CLASS = "st-bajarilmadi"

/**
 * Nishon uchun to'liq class satri.
 * @param map   TASK_STATUS_CLASS | PRIORITY_CLASS | USER_STATUS_CLASS
 * @param key   status/muhimlik kodi
 * @param opts  dot: nuqtacha ko'rsatilsinmi (default: ha)
 */
export function badgeClass(
  map: Record<string, string>,
  key: string | null | undefined,
  opts?: { dot?: boolean },
): string {
  const tone = (key && map[key]) || UNKNOWN_CLASS
  const dot = opts?.dot === false ? " badge-status-plain" : ""
  return `badge-status${dot} ${tone}`
}

export function taskStatusClass(status?: string | null, dot = true) {
  return badgeClass(TASK_STATUS_CLASS, status, { dot })
}

export function priorityClass(priority?: string | null, dot = true) {
  return badgeClass(PRIORITY_CLASS, priority, { dot })
}

export function userStatusClass(status?: string | null, dot = true) {
  return badgeClass(USER_STATUS_CLASS, status, { dot })
}
