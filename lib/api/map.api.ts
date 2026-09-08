/**
 * Xarita statistikasi API
 * =======================
 *
 * Xarita 70 ta qishloqni ko'rsatadi. Har qishloq uchun alohida so'rov
 * yuborilsa — 70 ta HTTP so'rov bo'ladi, shuning uchun backend'da BITTA
 * agregat endpoint bor:
 *
 *   GET /api/analytics/villages/
 *   200 {
 *     "1209027": {
 *       "total": 42,              // jami topshiriq
 *       "in_progress": 11,        // ijroda
 *       "awaiting_approval": 3,   // hisobot topshirilgan, tasdiq kutilmoqda
 *       "closed": 25,             // nazoratdan yechilgan
 *       "overdue": 3,             // muddati kechikkan
 *       "appeals_total": 18,      // jami murojaat
 *       "appeals_open": 4         // ochiq murojaat
 *     },
 *     ...
 *   }
 *
 * Kalit — qishloq KODI (`value`, masalan 1209027), nomdan yasalgan slug emas:
 * nom tilga qarab o'zgaradi, kod esa barqaror. Geometriya faylidagi
 * `code` maydoni ham aynan shu.
 *
 * Endpoint hali tayyor bo'lmasligi mumkin (backend'da parallel ishlanmoqda).
 * Shuning uchun 404 / bo'sh javob XATO EMAS: `getVillageStats()` null
 * qaytaradi va xarita "ma'lumot yo'q" holatida chiziladi.
 *
 * @module api/map
 */

import { API_BASE, getAccessToken } from './client'

// ============================================================================
// Types
// ============================================================================

/** Bitta qishloq uchun agregat raqamlar (backend maydon nomlari bilan) */
export interface VillageStats {
  total?: number
  in_progress?: number
  awaiting_approval?: number
  closed?: number
  overdue?: number
  appeals_total?: number
  appeals_open?: number
  appeals_closed?: number
}

/** Kod → statistika xaritasi */
export type VillageStatsMap = Record<string, VillageStats>

export const EMPTY_VILLAGE_STATS: VillageStats = {
  total: 0,
  in_progress: 0,
  awaiting_approval: 0,
  closed: 0,
  overdue: 0,
  appeals_total: 0,
  appeals_open: 0,
}

/** Xaritada rang beruvchi ko'rsatkichlar */
/**
 * Xaritada rang beruvchi bo'lishi MUMKIN bo'lgan ko'rsatkichlar.
 *
 * DIQQAT: backend bularning HAMMASINI qaytarmaydi. `Task` modelida
 * qishloq o'lchovi yo'q, shuning uchun `/api/analytics/villages/` hozir
 * faqat murojaat raqamlarini beradi. Xarita `availableMetrics()` bilan
 * javobda haqiqatan mavjud bo'lgan ko'rsatkichlarni aniqlaydi va faqat
 * ularni taklif qiladi — nol qiymatni "ma'lumot" sifatida ko'rsatmaydi.
 */
export const VILLAGE_METRICS = [
  'total',
  'in_progress',
  'awaiting_approval',
  'closed',
  'overdue',
  'appeals_total',
  'appeals_open',
  'appeals_closed',
] as const

export type VillageMetric = (typeof VILLAGE_METRICS)[number]

// ============================================================================
// TTL kesh
// ============================================================================

/**
 * Oddiy xotira keshi. Xarita ikki sahifada (analytics va /dashboard/map)
 * ishlatiladi va foydalanuvchi ular orasida tez o'tishi mumkin — har o'tishda
 * qayta so'rov yubormaslik uchun javob 60 sekund saqlanadi.
 */
const TTL_MS = 60_000

let cache: { at: number; data: VillageStatsMap | null } | null = null
/** Bir vaqtda bir nechta komponent so'rasa — bitta so'rov ketadi. */
let inflight: Promise<VillageStatsMap | null> | null = null

export function clearVillageStatsCache(): void {
  cache = null
  inflight = null
}

// ============================================================================
// Yuklash
// ============================================================================

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Backend javobini xavfsiz shaklga keltiradi.
 *
 * Ilgari bu funksiya YETTI maydonni majburan 0 bilan to'ldirardi —
 * ya'ni backend bermagan ko'rsatkich ham xaritada "0" bo'lib ko'rinardi.
 * Endi faqat javobda kelgan raqamli maydonlar saqlanadi.
 */
function normalize(raw: unknown): VillageStatsMap | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: VillageStatsMap = {}
  for (const [code, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const row: Partial<VillageStats> = {}
    for (const [key, num] of Object.entries(value as Record<string, unknown>)) {
      if (isFiniteNumber(num)) (row as Record<string, number>)[key] = num
    }
    if (Object.keys(row).length) out[String(code)] = row as VillageStats
  }
  return Object.keys(out).length ? out : null
}

/**
 * Javobda haqiqatan mavjud bo'lgan ko'rsatkichlar (barcha satrlar
 * birlashmasi). Xaritaning ko'rsatkich tanlagichi shundan quriladi.
 */
export function availableMetrics(stats: VillageStatsMap | null): VillageMetric[] {
  if (!stats) return []
  const found = new Set<string>()
  for (const row of Object.values(stats)) {
    for (const key of Object.keys(row)) found.add(key)
  }
  return VILLAGE_METRICS.filter((m) => found.has(m))
}


/**
 * Qishloqlar bo'yicha statistikani oladi.
 *
 * `fetchApi` ishlatilmadi: u 404'da ApiError tashlaydi va 401'da token
 * yangilash zanjirini boshlaydi. Xarita uchun endpoint yo'qligi kutilgan
 * holat, shuning uchun bu yerda oddiy `fetch` va `null` qaytarish afzal.
 *
 * @param signal Komponent unmount bo'lganda so'rovni bekor qilish uchun
 * @returns kod → statistika, yoki null (endpoint yo'q / bo'sh / xato)
 */
export async function getVillageStats(signal?: AbortSignal): Promise<VillageStatsMap | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data
  if (inflight) return inflight

  const token = typeof window !== 'undefined' ? getAccessToken() : null

  inflight = fetch(`${API_BASE}/analytics/villages/`, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
    .then(async (response) => {
      // 404 — endpoint hali qo'shilmagan; 5xx — backend nosoz.
      if (!response.ok) return null
      const json = await response.json().catch(() => null)
      // Ba'zi endpointlar { data: {...} } konvertida qaytaradi.
      const payload =
        json && typeof json === 'object' && !Array.isArray(json) && 'data' in json
          ? (json as { data: unknown }).data
          : json
      return normalize(payload)
    })
    .catch(() => null)
    .then((data) => {
      cache = { at: Date.now(), data }
      inflight = null
      return data
    })

  return inflight
}
