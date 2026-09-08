/**
 * TOPSHIRIQ YARATISH — forma holati, validatsiya va qoralama
 * =========================================================
 *
 * Eski wizard nima uchun qayta yozildi:
 *  - Tashkilotlar va xodimlar HARDCODED mock massiv edi (`step2-organizations.tsx`
 *    15-31, `step5-confirm.tsx` 32-48), id'lari "1".."8" — backend esa UUID
 *    ishlatadi, ya'ni tanlangan tashkilot hech qachon topilmasdi.
 *  - Submit `organization`, `assigned_to`, `due_date` yuborardi; backend
 *    `organizations`, `deadline` kutadi → HAR submit'da HTTP 400.
 *  - `deputy_ids` maydoni yo'q edi, lekin HOKIM/ADMIN uchun majburiy.
 *  - Fayllar yig'ilardi, keyin JSON'da yuborilib yo'qolardi.
 *  - "Taglar" bloki — 2 ta qotib qolgan chip, `onClick` siz `×` va `+`
 *    tugmalari, backend'da `tags` maydoni umuman yo'q. Butunlay dekorativ.
 *  - Kategoriya uchun 4 xil mos kelmaydigan lug'at ishlatilardi.
 *  - "Qoralama saqlash" `alert("Qoralama saqlandi!")` deb yolg'on gapirardi.
 *  - Sanalar `toISOString()` bilan UTC'da olinardi — Asia/Tashkent (UTC+5) da
 *    ertalab 05:00 gacha "kecha" chiqardi.
 *
 * Endi: yagona manba, real API kontrakti, «Soha» (Sector) majburiy.
 */

import type { Organization } from '@/types'
import type { Sector } from '@/lib/api/sectors.api'

/* ------------------------------------------------------------------ TURLAR */

export type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export interface TaskWizardForm {
  title: string
  description: string
  /** Soha — Sector UUID. Backend'da majburiy (`sector`). */
  sectorId: string
  /** Tanlangan tashkilotlar (UUID) — backend `organizations` (vergul bilan) */
  organizationIds: string[]
  /** Hokim o'rinbosarlari (UUID) — backend `deputy_ids` */
  deputyIds: string[]
  priority: 'PAST' | 'ODDIY' | 'YUQORI' | 'FAVQULODDA'
  /** `YYYY-MM-DD` — mahalliy sana, UTC emas */
  deadline: string
  /** Takrorlanuvchi topshiriq rejimi */
  isRecurring: boolean
  frequency: Frequency
  /** Har bir yaratilgan topshiriqqa beriladigan muddat (kun) */
  deadlineDays: number
  startDate: string
  endDate: string
}

export type WizardErrors = Partial<Record<keyof TaskWizardForm | 'submit', string>>

export interface WizardContext {
  sectors: Sector[]
  organizations: Organization[]
  deputies: DeputyOption[]
  /** Hozirgi foydalanuvchi roli */
  role: string
  /** HOKIM/ADMIN uchun o'rinbosar tanlash majburiy */
  requiresDeputy: boolean
}

export interface DeputyOption {
  id: string
  fullName: string
  sectorId: string | null
  sectorName: string | null
}

/* ------------------------------------------------------------- QIYMATLAR */

export const PRIORITY_ORDER: TaskWizardForm['priority'][] = [
  'FAVQULODDA',
  'YUQORI',
  'ODDIY',
  'PAST',
]

/** Muhimlikka qarab tavsiya etiladigan muddat (kun) */
export const PRIORITY_DAYS: Record<TaskWizardForm['priority'], number> = {
  FAVQULODDA: 1,
  YUQORI: 3,
  ODDIY: 5,
  PAST: 7,
}

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  DAILY: 'Har kuni',
  WEEKLY: 'Har hafta',
  BIWEEKLY: 'Ikki haftada bir',
  MONTHLY: 'Har oy',
  QUARTERLY: 'Har chorakda',
  YEARLY: 'Har yili',
}

/** Takrorlanish davriga mos standart muddat */
export const FREQUENCY_DAYS: Record<Frequency, number> = {
  DAILY: 1,
  WEEKLY: 5,
  BIWEEKLY: 10,
  MONTHLY: 20,
  QUARTERLY: 60,
  YEARLY: 180,
}

export const WIZARD_STEPS = [
  { key: 'basics', title: 'Asosiy ma’lumot', hint: 'Nomi, tavsifi va sohasi' },
  { key: 'assignees', title: 'Ijrochilar', hint: 'Tashkilot va mas’ul rahbar' },
  { key: 'schedule', title: 'Muddat', hint: 'Muhimlik va bajarilish sanasi' },
  { key: 'review', title: 'Tekshirish', hint: 'Fayllar va yuborish' },
] as const

export type StepKey = (typeof WIZARD_STEPS)[number]['key']

/* --------------------------------------------------------- SANA YORDAMCHI */

/**
 * Mahalliy sana `YYYY-MM-DD` ko'rinishida.
 * `new Date().toISOString().split('T')[0]` ISHLATILMAYDI — u UTC sanasini
 * beradi va UTC+5 da yarim kechadan 05:00 gacha bir kun orqada qoladi.
 */
export function localDateString(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(days: number, from = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return localDateString(d)
}

/**
 * Backend'ga yuboriladigan muddat.
 *
 * Vaqt mintaqasi belgilanmagan (naive) satr yuboriladi — Django uni
 * `TIME_ZONE` (Asia/Tashkent) bo'yicha o'qiydi. Ilgari frontend
 * `new Date(\`${d}T23:59:59\`).toISOString()` yuborardi: bu 18:59:59Z ga
 * aylanardi va backend `value.date()` (UTC sanasi) ni `timezone.localdate()`
 * (Tashkent sanasi) bilan solishtirgani uchun kechqurun 19:00 dan keyin
 * bugungi muddat "o'tgan" deb rad etilardi.
 */
export function deadlinePayload(dateString: string): string {
  return `${dateString}T23:59:00`
}

export function formatDateHuman(dateString: string, locale = 'uz-UZ'): string {
  if (!dateString) return '—'
  // `new Date('YYYY-MM-DD')` UTC yarim kechasi sifatida o'qiladi va mahalliy
  // vaqtda bir kun orqaga siljishi mumkin — shuning uchun qo'lda ajratamiz.
  const [y, m, d] = dateString.split('-').map(Number)
  if (!y || !m || !d) return dateString
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

/* --------------------------------------------------------------- BOSHLANG'ICH */

export function initialForm(): TaskWizardForm {
  return {
    title: '',
    description: '',
    sectorId: '',
    organizationIds: [],
    deputyIds: [],
    priority: 'ODDIY',
    deadline: addDays(PRIORITY_DAYS.ODDIY),
    isRecurring: false,
    frequency: 'WEEKLY',
    deadlineDays: FREQUENCY_DAYS.WEEKLY,
    startDate: localDateString(),
    endDate: '',
  }
}

/* ------------------------------------------------------------- VALIDATSIYA */

const MIN_TITLE = 5
const MIN_DESCRIPTION = 10

/** Bitta qadamni tekshiradi. Bo'sh obyekt = xato yo'q. */
export function validateStep(
  step: StepKey,
  form: TaskWizardForm,
  ctx: WizardContext,
): WizardErrors {
  const e: WizardErrors = {}

  if (step === 'basics') {
    const title = form.title.trim()
    if (!title) e.title = 'Topshiriq nomini kiriting'
    else if (title.length < MIN_TITLE) e.title = `Kamida ${MIN_TITLE} belgi bo‘lishi kerak`
    else if (title.length > 500) e.title = 'Nomi 500 belgidan oshmasligi kerak'

    const desc = form.description.trim()
    if (!desc) e.description = 'Topshiriq tafsilotini yozing'
    else if (desc.length < MIN_DESCRIPTION)
      e.description = `Kamida ${MIN_DESCRIPTION} belgi bo‘lishi kerak`

    if (!form.sectorId) e.sectorId = 'Sohani tanlang'
  }

  if (step === 'assignees') {
    if (form.organizationIds.length === 0) e.organizationIds = 'Kamida bitta tashkilot tanlang'
    if (ctx.requiresDeputy && form.deputyIds.length === 0)
      e.deputyIds = 'Mas’ul hokim o‘rinbosarini tanlang'
  }

  if (step === 'schedule') {
    if (form.isRecurring) {
      if (!form.startDate) e.startDate = 'Boshlanish sanasini tanlang'
      if (form.deadlineDays < 1) e.deadlineDays = 'Kamida 1 kun'
      else if (form.deadlineDays > 365) e.deadlineDays = 'Ko‘pi bilan 365 kun'
      if (form.endDate && form.startDate && form.endDate < form.startDate)
        e.endDate = 'Tugash sanasi boshlanish sanasidan keyin bo‘lishi kerak'
    } else {
      if (!form.deadline) e.deadline = 'Muddatni tanlang'
      else if (form.deadline < localDateString())
        e.deadline = 'Muddat o‘tgan sana bo‘lishi mumkin emas'
    }
  }

  return e
}

/** Barcha qadamlarni tekshiradi (yuborishdan oldin) */
export function validateAll(form: TaskWizardForm, ctx: WizardContext): WizardErrors {
  return {
    ...validateStep('basics', form, ctx),
    ...validateStep('assignees', form, ctx),
    ...validateStep('schedule', form, ctx),
  }
}

/** Qaysi qadamda xato borligini aniqlaydi — foydalanuvchini o'sha yerga olib boradi */
export function firstInvalidStep(errors: WizardErrors): StepKey | null {
  if (errors.title || errors.description || errors.sectorId) return 'basics'
  if (errors.organizationIds || errors.deputyIds) return 'assignees'
  if (errors.deadline || errors.startDate || errors.endDate || errors.deadlineDays)
    return 'schedule'
  return null
}

/* ------------------------------------------------------------------ QORALAMA
   Eski wizard "Ma'lumotlar brauzerda saqlanadi" deb yozardi, lekin hech
   qanday saqlash yo'q edi — sahifa yangilansa hammasi yo'qolardi. */

const DRAFT_KEY = 'ehokimiyat:task-draft:v2'

export interface Draft {
  form: TaskWizardForm
  step: StepKey
  savedAt: number
}

export function saveDraft(form: TaskWizardForm, step: StepKey): void {
  if (typeof window === 'undefined') return
  try {
    const payload: Draft = { form, step, savedAt: Date.now() }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
  } catch {
    // Shaxsiy rejim yoki to'lgan xotira — qoralama shunchaki saqlanmaydi.
  }
}

export function loadDraft(): Draft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Draft
    if (!parsed?.form || typeof parsed.form.title !== 'string') return null
    // 7 kundan oshgan qoralama eskirgan hisoblanadi.
    if (Date.now() - (parsed.savedAt ?? 0) > 7 * 24 * 3600 * 1000) {
      clearDraft()
      return null
    }
    return { ...parsed, form: { ...initialForm(), ...parsed.form } }
  } catch {
    return null
  }
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

/** Qoralamada saqlashga arziydigan biror narsa bormi */
export function isDirty(form: TaskWizardForm): boolean {
  const base = initialForm()
  return (
    form.title.trim() !== '' ||
    form.description.trim() !== '' ||
    form.sectorId !== '' ||
    form.organizationIds.length > 0 ||
    form.deputyIds.length > 0 ||
    form.priority !== base.priority ||
    form.isRecurring
  )
}

/* -------------------------------------------------------------- AI PREFILL
   AI sahifasi (/dashboard/tasks/new/ai) tahlil natijasini shu kalit orqali
   wizard'ga uzatadi. sessionStorage: bitta tab, bir marta ishlatiladi. */

const AI_PREFILL_KEY = 'ehokimiyat:task-ai-prefill'

export interface AiPrefill {
  title?: string
  description?: string
  sectorName?: string
  organizationNames?: string[]
  priority?: string
  deadline?: string
}

export function putAiPrefill(data: AiPrefill): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(AI_PREFILL_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function takeAiPrefill(): AiPrefill | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(AI_PREFILL_KEY)
    if (!raw) return null
    window.sessionStorage.removeItem(AI_PREFILL_KEY)
    return JSON.parse(raw) as AiPrefill
  } catch {
    return null
  }
}

/* ------------------------------------------------------- NOM BO'YICHA IZLASH
   AI soha va tashkilotni NOM bilan qaytaradi, forma esa UUID bilan ishlaydi. */

function norm(v: string): string {
  return v
    .toLowerCase()
    .replace(/[‘’'ʻʼ`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function findSectorByName(sectors: Sector[], name?: string): string {
  if (!name) return ''
  const n = norm(name)
  const exact = sectors.find((s) => norm(s.name) === n)
  if (exact) return exact.id
  const partial = sectors.find((s) => norm(s.name).includes(n) || n.includes(norm(s.name)))
  return partial?.id ?? ''
}

export function findOrganizationsByName(
  organizations: Organization[],
  names?: string[],
): string[] {
  if (!names?.length) return []
  const out: string[] = []
  for (const raw of names) {
    const n = norm(raw)
    if (!n) continue
    const hit =
      organizations.find((o) => norm(o.name ?? '') === n) ??
      organizations.find(
        (o) => norm(o.name ?? '').includes(n) || n.includes(norm(o.name ?? '')),
      )
    if (hit && !out.includes(String(hit.id))) out.push(String(hit.id))
  }
  return out
}
