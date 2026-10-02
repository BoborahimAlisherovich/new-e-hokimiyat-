"use client"

import Link from "next/link"
import { Map as MapIcon, ArrowRight } from "lucide-react"

import { useI18n } from "@/lib/i18n/context"
import { getMapLabels } from "@/lib/i18n/map-labels"

/**
 * ESKIRGAN — xaritaning o'zi endi bu yerda chizilmaydi.
 *
 * Ilgari analitika sahifasi ham, «Interaktiv xarita» bo'limi ham AYNAN
 * BIR XIL `DistrictMap` ni chizardi. Xarita 1.21 MiB GeoJSON yuklab,
 * 69 ta SVG yo'lni DOM'ga yozadi — analitika ochilganda bu ish bekorga
 * ikkinchi marta bajarilardi.
 *
 * Komponent butunlay o'chirilmadi, chunki uni boshqa joyda import
 * qilingan bo'lishi mumkin: endi u xaritaning o'rniga xarita bo'limiga
 * havola beradi. Loyihada boshqa hech kim import qilmasa, faylni
 * bemalol o'chirib tashlash mumkin.
 */
export function VillageAnalytics() {
  const { language: locale } = useI18n()
  const L = getMapLabels(locale)

  return (
    <Link
      href="/dashboard/map"
      className="group flex items-center gap-4 rounded-[14px] bg-card p-4 shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
        <MapIcon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-md font-semibold text-foreground">{L.title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{L.subtitle}</span>
      </span>
      <ArrowRight
        className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}

export default VillageAnalytics
