/**
 * Xarita ma'lumotlari va choropleth yordamchilari
 * ==============================================
 *
 * Geometriya `public/geo/xatirchi-villages.paths.json` da TAYYOR SVG `d`
 * satrlari sifatida turadi — build vaqtida `scripts/build-map.mjs` tomonidan
 * proyeksiya qilingan. Klientda proyeksiya kodi ham, geometriya hisobi ham
 * yo'q: shuning uchun d3 yoki topojson kutubxonalari bundle'ga tushmaydi.
 *
 * Fayl `next.config.mjs` dagi `/geo/:path*` sarlavhalari bilan
 * `immutable, max-age=1y` sifatida keshlanadi, ya'ni brauzer uni ikkinchi
 * marta so'ramaydi ham.
 */

import type { VillageMetric, VillageStats, VillageStatsMap } from '@/lib/api/map.api'

// ============================================================================
// Geometriya
// ============================================================================

export interface VillageShape {
  /** Barqaror qishloq kodi — statistika bilan JOIN kaliti */
  code: string
  name_latn: string
  name_cyrl: string
  /** Tayyor SVG yo'li (viewBox koordinatalarida) */
  d: string
  /** Yorliq/marker nuqtasi (polylabel) */
  cx: number | null
  cy: number | null
}

export interface VillageGeometry {
  viewBox: string
  villages: VillageShape[]
}

export const GEOMETRY_URL = '/geo/xatirchi-villages.paths.json'

/**
 * Modul darajasidagi kesh: xarita ikki sahifada ishlatiladi, fayl esa
 * o'zgarmaydi — bir marta yuklanadi va SPA ichida qayta so'ralmaydi.
 */
let geometryPromise: Promise<VillageGeometry | null> | null = null

export function loadGeometry(signal?: AbortSignal): Promise<VillageGeometry | null> {
  if (!geometryPromise) {
    geometryPromise = fetch(GEOMETRY_URL, { signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: unknown) => {
        if (!json || typeof json !== 'object') return null
        const data = json as Partial<VillageGeometry>
        if (!data.viewBox || !Array.isArray(data.villages)) return null
        return { viewBox: data.viewBox, villages: data.villages }
      })
      .catch(() => {
        // Xato keshda qolmasin — keyingi urinish qaytadan so'raydi.
        geometryPromise = null
        return null
      })
  }
  return geometryPromise
}

// ============================================================================
// Choropleth
// ============================================================================

/**
 * Ketma-ket (sequential) rang shkalasi. Ranglar dizayn tokenlaridan
 * `color-mix()` bilan olinadi, shuning uchun yorug' va qorong'i temada
 * ikkisida ham to'g'ri ishlaydi (--card fon rangi tema bilan o'zgaradi).
 *
 * Eng yuqori qadamga --chart-2 ozgina qo'shilgan: bir xil ko'k tonning
 * beshta pog'onasi bir-biridan yaxshi ajralmaydi.
 */
export const CHOROPLETH_RAMP = [
  'color-mix(in srgb, var(--chart-1) 14%, var(--card))',
  'color-mix(in srgb, var(--chart-1) 30%, var(--card))',
  'color-mix(in srgb, var(--chart-1) 50%, var(--card))',
  'color-mix(in srgb, var(--chart-1) 72%, var(--card))',
  'color-mix(in srgb, var(--chart-1) 86%, var(--chart-2))',
] as const

/** Statistikasi yo'q qishloqlar — rang bilan emas, alohida fon bilan */
export const NO_DATA_FILL = 'var(--surface-sunken)'

export interface ColorScale {
  /** Har bir qadamning yuqori chegarasi (oxirgisi — maksimum) */
  breaks: number[]
  min: number
  max: number
  /** Ma'lumot bor qishloqlar soni */
  count: number
}

/**
 * Kvantil bo'yicha chegaralar. Teng oraliqlar (equal interval) bu yerda
 * yaramaydi: bitta yirik qishloqda 200 topshiriq, qolganlarida 3-10 bo'lsa,
 * teng oraliqda 69 qishloq bir xil rangda qolib ketadi.
 */
export function buildColorScale(
  values: number[],
  steps = CHOROPLETH_RAMP.length,
): ColorScale | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (!sorted.length) return null

  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const breaks: number[] = []

  for (let i = 1; i <= steps; i++) {
    const idx = Math.ceil((sorted.length * i) / steps) - 1
    const value = sorted[Math.min(Math.max(idx, 0), sorted.length - 1)]
    // Takrorlanuvchi chegaralar (ko'p bir xil qiymat) o'tkazib yuboriladi.
    if (!breaks.length || value > breaks[breaks.length - 1]) breaks.push(value)
  }
  if (breaks[breaks.length - 1] < max) breaks.push(max)

  return { breaks, min, max, count: sorted.length }
}

/** Qiymat uchun ramp indeksi */
export function rampIndex(value: number, scale: ColorScale): number {
  for (let i = 0; i < scale.breaks.length; i++) {
    if (value <= scale.breaks[i]) {
      // Chegaralar soni ramp qadamlaridan kam bo'lishi mumkin —
      // shunda mavjud ranglarga proporsional taqsimlanadi.
      return Math.min(
        CHOROPLETH_RAMP.length - 1,
        Math.round((i * (CHOROPLETH_RAMP.length - 1)) / Math.max(1, scale.breaks.length - 1)),
      )
    }
  }
  return CHOROPLETH_RAMP.length - 1
}

export function fillFor(
  stats: VillageStats | undefined,
  metric: VillageMetric,
  scale: ColorScale | null,
): string {
  if (!stats || !scale) return NO_DATA_FILL
  const value = stats[metric]
  // Ko'rsatkich bu qishloq uchun umuman berilmagan bo'lsa — rang emas,
  // "ma'lumot yo'q" foni.
  if (typeof value !== 'number') return NO_DATA_FILL
  return CHOROPLETH_RAMP[rampIndex(value, scale)]
}

/** Barcha qishloqlar uchun kod → fill xaritasi (bir marta hisoblanadi) */
export function buildFills(
  villages: VillageShape[],
  stats: VillageStatsMap | null,
  metric: VillageMetric,
  scale: ColorScale | null,
): Record<string, string> {
  const fills: Record<string, string> = {}
  for (const village of villages) {
    fills[village.code] = fillFor(stats?.[village.code], metric, scale)
  }
  return fills
}
