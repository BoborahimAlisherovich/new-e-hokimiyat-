/**
 * Application Constants
 * 
 * Tizim bo'ylab ishlatiladigan konstantalar va tiplar.
 * Backend bilan sinxronlashtirilgan.
 * 
 * @module constants
 * @author E-Hokimiyat Development Team
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Foydalanuvchi holati
 * - DRAFT: Qoralama (hali faollashtirilmagan)
 * - KUTILMOQDA: Tasdiqlash kutilmoqda
 * - FAOL: Faol foydalanuvchi
 * - BLOKLANGAN: Vaqtincha bloklangan
 * - ARXIV: Arxivlangan (o'chirilgan)
 */
export type UserStatus = 'DRAFT' | 'KUTILMOQDA' | 'FAOL' | 'BLOKLANGAN' | 'ARXIV'

/**
 * Topshiriq holati
 * - YANGI: Yangi yaratilgan
 * - IJRODA: Bajarilmoqda
 * - BAJARILDI: Bajarildi (tekshiruv kutmoqda)
 * - QAYTA_IJROGA_YUBORILDI: Qayta bajarishga yuborildi
 * - MUDDATI_KECH: Muddati o'tgan
 * - BAJARILMADI: Bajarilmadi
 * - NAZORATDAN_YECHILDI: Muvaffaqiyatli yakunlangan
 */
export type TaskStatus =
  | 'YANGI'
  | 'IJRODA'
  | 'TEKSHIRUVDA'
  | 'BAJARILDI'
  | 'QAYTA_IJROGA_YUBORILDI'
  | 'MUDDATI_KECH'
  | 'BAJARILMADI'
  | 'NAZORATDAN_YECHILDI'

/**
 * Topshiriq ustuvorligi
 * - FAVQULODDA: 1 kun
 * - YUQORI: 3 kun
 * - ODDIY: 5 kun
 * - PAST: 7 kun
 */
export type TaskPriority = 'FAVQULODDA' | 'YUQORI' | 'ODDIY' | 'PAST'

/**
 * Foydalanuvchi roli
 */
export type UserRole = 
  | 'HOKIM' 
  | 'HOKIM_YORDAMCHISI'
  | 'HOKIMLIK_MASUL' 
  | 'TASHKILOT_RAHBAR'
  | 'TASHKILOT_RAHBARI'
  | 'TASHKILOT_MASUL' 
  | 'ADMIN'

/**
 * Kabinet turi
 */
export type CabinetType = 'HOKIMLIK' | 'TASHKILOT' | 'ADMIN'

/**
 * Faoliyat sohasi
 */
export type Sector =
  | 'SOGLIQNI_SAQLASH'
  | 'BANDLIK_MEHNAT'
  | 'TALIM'
  | 'IJTIMOIY_HIMOYA'
  | 'ADLIYA'
  | 'EKOLOGIYA'
  | 'SUBSIDIYA'
  | 'OILA_BOLALAR'
  | 'KOCHMAS_MULK'
  | 'FUQAROLIK'
  | 'DAVLAT_AKTIVLARI'
  | 'IQTISODIYOT_BIZNES'
  | 'YOSHLAR'
  | 'TRANSPORT'
  | 'AXBOROT_ALOQA'
  | 'GEOLOGIYA'
  | 'PENSIYA'
  | 'MADANIYAT_TURIZM_SPORT'
  | 'KOMMUNAL_SOHA'
  | 'SOLIQLAR'

// ============================================================================
// Label Mappings (O'zbekcha nomlari)
// ============================================================================

/** Rol nomlari */
export const roleLabels: Readonly<Record<UserRole, string>> = Object.freeze({
  HOKIM: "Hokim",
  HOKIM_YORDAMCHISI: "Hokim o'rinbosari",
  HOKIMLIK_MASUL: "Hokimlik mutaxassisi",
  TASHKILOT_RAHBAR: "Tashkilot rahbari",
  TASHKILOT_RAHBARI: "Tashkilot rahbari",
  TASHKILOT_MASUL: "Tashkilot mas'uli",
  ADMIN: "Administrator",
})

/** Rol → Kabinet turi */
export const roleCabinet: Readonly<Record<UserRole, CabinetType>> = Object.freeze({
  HOKIM: 'HOKIMLIK',
  HOKIM_YORDAMCHISI: 'HOKIMLIK',
  HOKIMLIK_MASUL: 'HOKIMLIK',
  TASHKILOT_RAHBAR: 'TASHKILOT',
  TASHKILOT_RAHBARI: 'TASHKILOT',
  TASHKILOT_MASUL: 'TASHKILOT',
  ADMIN: 'ADMIN',
})

/** Soha nomlari */
export const sectorLabels: Readonly<Record<Sector, string>> = Object.freeze({
  SOGLIQNI_SAQLASH: "Sog'liqni saqlash",
  BANDLIK_MEHNAT: "Bandlik va mehnat",
  TALIM: "Ta'lim",
  IJTIMOIY_HIMOYA: "Ijtimoiy himoya",
  ADLIYA: "Adliya",
  EKOLOGIYA: "Ekologiya",
  SUBSIDIYA: "Subsidiya",
  OILA_BOLALAR: "Oila va bolalar",
  KOCHMAS_MULK: "Ko'chmas mulk",
  FUQAROLIK: "Fuqarolik",
  DAVLAT_AKTIVLARI: "Davlat aktivlari",
  IQTISODIYOT_BIZNES: "Iqtisodiyot va biznes",
  YOSHLAR: "Yoshlar",
  TRANSPORT: "Transport",
  AXBOROT_ALOQA: "Axborot va aloqa",
  GEOLOGIYA: "Geologiya",
  PENSIYA: "Pensiya",
  MADANIYAT_TURIZM_SPORT: "Madaniyat, turizm va sport",
  KOMMUNAL_SOHA: "Kommunal soha",
  SOLIQLAR: "Soliqlar",
})

/** Soha ranglari (HSL formatida) */
export const sectorColors: Readonly<Record<Sector, string>> = Object.freeze({
  SOGLIQNI_SAQLASH: 'hsl(0, 70%, 50%)',
  BANDLIK_MEHNAT: 'hsl(25, 80%, 55%)',
  TALIM: 'hsl(45, 85%, 50%)',
  IJTIMOIY_HIMOYA: 'hsl(85, 60%, 50%)',
  ADLIYA: 'hsl(160, 60%, 45%)',
  EKOLOGIYA: 'hsl(120, 50%, 45%)',
  SUBSIDIYA: 'hsl(180, 60%, 45%)',
  OILA_BOLALAR: 'hsl(200, 70%, 50%)',
  KOCHMAS_MULK: 'hsl(220, 60%, 55%)',
  FUQAROLIK: 'hsl(240, 60%, 50%)',
  DAVLAT_AKTIVLARI: 'hsl(260, 55%, 55%)',
  IQTISODIYOT_BIZNES: 'hsl(280, 50%, 55%)',
  YOSHLAR: 'hsl(300, 50%, 50%)',
  TRANSPORT: 'hsl(320, 55%, 50%)',
  AXBOROT_ALOQA: 'hsl(340, 60%, 50%)',
  GEOLOGIYA: 'hsl(30, 50%, 45%)',
  PENSIYA: 'hsl(60, 50%, 45%)',
  MADANIYAT_TURIZM_SPORT: 'hsl(150, 55%, 45%)',
  KOMMUNAL_SOHA: 'hsl(190, 60%, 50%)',
  SOLIQLAR: 'hsl(210, 65%, 50%)',
})

/** Foydalanuvchi holat nomlari */
export const statusLabels: Readonly<Record<UserStatus, string>> = Object.freeze({
  DRAFT: 'Qoralama',
  KUTILMOQDA: 'Kutilmoqda',
  FAOL: 'Faol',
  BLOKLANGAN: 'Bloklangan',
  ARXIV: 'Arxiv',
})

/** Topshiriq holat nomlari */
export const taskStatusLabels: Readonly<Record<TaskStatus, string>> = Object.freeze({
  YANGI: 'Yangi',
  IJRODA: 'Ijroda',
  TEKSHIRUVDA: "Ko'rib chiqilmoqda",
  BAJARILDI: 'Bajarildi',
  QAYTA_IJROGA_YUBORILDI: 'Qayta ijroga',
  MUDDATI_KECH: 'Muddati kech',
  BAJARILMADI: 'Bajarilmadi',
  NAZORATDAN_YECHILDI: 'Nazoratdan yechildi',
})

/** Ustuvorlik nomlari */
export const priorityLabels: Readonly<Record<TaskPriority, string>> = Object.freeze({
  FAVQULODDA: 'Favqulodda',
  YUQORI: 'Yuqori',
  ODDIY: 'Oddiy',
  PAST: 'Past',
})

/** Ustuvorlik bo'yicha muddat (kunlarda) */
export const priorityDeadlines: Readonly<Record<TaskPriority, number>> = Object.freeze({
  FAVQULODDA: 1,
  YUQORI: 3,
  ODDIY: 5,
  PAST: 7,
})

/** Ustuvorlik tavsifi */
export const priorityDescriptions: Readonly<Record<TaskPriority, string>> = Object.freeze({
  FAVQULODDA: "Darhol bajarilishi lozim bo'lgan masalalar, favqulodda holatlar",
  YUQORI: "Strategik va tizimli masalalar, reja asosida bajariladi",
  ODDIY: "Texnik va operatsion xarakterdagi ishlar",
  PAST: "Ikkilamchi va fon rejimidagi ishlar",
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * PNFL ni maskalaydi (xavfsizlik uchun)
 * 
 * @param pnfl - To'liq PNFL
 * @returns Maskalangan PNFL (masalan: "***1234")
 * 
 * @example
 * maskPnfl('12345678901234') // '***1234'
 * maskPnfl('')               // '****'
 */
export function maskPnfl(pnfl: string): string {
  if (!pnfl || pnfl.length < 4) {
    return '****'
  }
  return `***${pnfl.slice(-4)}`
}

/**
 * Topshiriq holatini rangga aylantiradi
 * 
 * @param status - Topshiriq holati
 * @returns Tailwind rang klassi
 */
export function getTaskStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    YANGI: 'bg-blue-100 text-blue-800',
    IJRODA: 'bg-yellow-100 text-yellow-800',
    TEKSHIRUVDA: 'bg-purple-100 text-purple-800',
    BAJARILDI: 'bg-green-100 text-green-800',
    QAYTA_IJROGA_YUBORILDI: 'bg-orange-100 text-orange-800',
    MUDDATI_KECH: 'bg-red-100 text-red-800',
    BAJARILMADI: 'bg-red-100 text-red-800',
    NAZORATDAN_YECHILDI: 'bg-emerald-100 text-emerald-800',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}

/**
 * Ustuvorlikni rangga aylantiradi
 * 
 * @param priority - Ustuvorlik
 * @returns Tailwind rang klassi
 */
export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    FAVQULODDA: 'bg-red-100 text-red-800',
    YUQORI: 'bg-orange-100 text-orange-800',
    ODDIY: 'bg-blue-100 text-blue-800',
    PAST: 'bg-gray-100 text-gray-800',
  }
  return colors[priority] ?? 'bg-gray-100 text-gray-800'
}
