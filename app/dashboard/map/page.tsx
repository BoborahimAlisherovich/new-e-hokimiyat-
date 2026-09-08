"use client"

import dynamic from "next/dynamic"

import { Header } from "@/components/layout/header"
import { useI18n } from "@/lib/i18n/context"
import { getMapLabels } from "@/lib/i18n/map-labels"

/**
 * /dashboard/map — INTERAKTIV XARITA
 *
 * TZ da xarita alohida bo'lim sifatida talab qilingan, lekin bu route
 * loyihada umuman mavjud emas edi (xarita faqat analitika sahifasining
 * ichida, buzuq holatda turgan).
 *
 * Sarlavha ierarxiyasi: <h1> ni faqat Header beradi, sahifa ichidagi
 * bloklar <h2> dan boshlanadi.
 */

const DistrictMap = dynamic(
  () => import("@/components/dashboard/map/district-map").then((m) => m.DistrictMap),
  {
    ssr: false,
    loading: () => (
      <div className="surface p-4">
        <div className="h-[520px] animate-pulse rounded-lg bg-muted" aria-busy="true" />
      </div>
    ),
  },
)

export default function MapPage() {
  const { language: locale } = useI18n()
  const L = getMapLabels(locale)

  return (
    <>
      <Header title={L.title} description={L.subtitle} />
      <div className="p-4 sm:p-6">
        <DistrictMap />
      </div>
    </>
  )
}
