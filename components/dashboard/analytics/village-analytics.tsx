"use client"

import dynamic from "next/dynamic"

import { useI18n } from "@/lib/i18n/context"
import { getMapLabels } from "@/lib/i18n/map-labels"

/**
 * ANALITIKA SAHIFASIDAGI QISHLOQLAR KESIMI
 *
 * Bu fayl ilgari 35 725 bayt edi va o'z ichiga oldi:
 *   - 4 tilli matn jadvali (13-98 qatorlar) → lib/i18n/map-labels.ts
 *   - to'liq kirill→lotin transliteratsiya jadvali → lib/translit.ts
 *   - `/api/hatirchi-map` dan 1.21 MiB JSON yuklab, 69 ta SVG yo'lni
 *     (o'rtacha 18.3 KB) DOM'ga yozadigan xarita → components/dashboard/map
 *   - har qishloq uchun `stats: EMPTY_STATS` — shuning uchun xarita butunlay
 *     qizil bo'lib, hamma tooltipda nol turardi
 *
 * Endi bu shunchaki o'ram: haqiqiy xarita `DistrictMap` da.
 */

// Xarita faqat kerak bo'lganda yuklanadi — analitika sahifasining asosiy
// bundle'iga tushmaydi. Loyihada ilgari birorta `next/dynamic` yo'q edi.
const DistrictMap = dynamic(
  () => import("@/components/dashboard/map/district-map").then((m) => m.DistrictMap),
  {
    ssr: false,
    loading: () => (
      <div className="surface p-4">
        <div className="h-[420px] animate-pulse rounded-lg bg-muted" aria-busy="true" />
      </div>
    ),
  },
)

export function VillageAnalytics() {
  const { language: locale } = useI18n()
  const L = getMapLabels(locale)

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{L.title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{L.subtitle}</p>
      </div>
      <DistrictMap showHeading={false} />
    </div>
  )
}

export default VillageAnalytics
