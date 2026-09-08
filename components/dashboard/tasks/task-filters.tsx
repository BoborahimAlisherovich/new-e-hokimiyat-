"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Filter, Plus, RotateCcw, Search, Sparkles, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { PremiumCountBadge, PremiumFilterShell } from "@/components/dashboard/premium-dashboard-ui"
import { TASK_STATUSES, TASK_STATUS_LABEL, PRIORITIES, PRIORITY_LABEL } from "@/lib/status-styles"
import type { Sector } from "@/lib/api/sectors.api"

/**
 * TOPSHIRIQ FILTRLARI
 *
 * Tuzatilgan nuqsonlar:
 *  - Yonma-yon IKKI yaratish tugmasi bor edi ("Tezkor yaratish" va "Yangi
 *    topshiriq"), va ASOSIY (gradientli) tugma buzuq wizard'ni ochardi.
 *    Endi bitta asosiy tugma + AI uchun ikkilamchi tugma.
 *  - `<Button>` `<Link>` ichida joylashgan edi — bu HTML'da ruxsat
 *    etilmaydi va klaviatura bilan ishlashni buzadi. Endi Link o'zi tugma
 *    ko'rinishida.
 *  - «Soha» filtri qotib qolgan 7 kategoriyadan iborat edi; backend'da esa
 *    `category` erkin matn maydoni. Endi haqiqiy `Sector` API'sidan keladi.
 *  - Faol filtr chiplari faqat ko'rsatuv uchun edi — har birini alohida
 *    olib tashlash imkoni yo'q edi. Endi bor.
 *  - Har bosishda qidiruv so'rov yuborardi (debounce yo'q) — endi debounce
 *    ota-komponentda (app/dashboard/tasks/page.tsx).
 *  - `<Label>` va Select bir-biriga bog'lanmagan edi (htmlFor yo'q).
 */

export type TaskFiltersProps = {
  searchQuery: string
  statusFilter: string
  priorityFilter: string
  sectorFilter: string
  organizationFilter: string
  sectors: Sector[]
  organizations: { id: string | number; name?: string }[]
  showSectorFilter?: boolean
  showCreateButton?: boolean
  onSearchChange: (v: string) => void
  onStatusChange: (v: string) => void
  onPriorityChange: (v: string) => void
  onSectorChange: (v: string) => void
  onOrganizationChange: (v: string) => void
  onClear: () => void
  /** Filtrlangan natijalar soni */
  resultCount?: number
}

export function TaskFilters(props: TaskFiltersProps) {
  const {
    searchQuery,
    statusFilter,
    priorityFilter,
    sectorFilter,
    organizationFilter,
    sectors,
    organizations,
    showSectorFilter = true,
    showCreateButton = false,
    onSearchChange,
    onStatusChange,
    onPriorityChange,
    onSectorChange,
    onOrganizationChange,
    onClear,
    resultCount,
  } = props

  // Yozish paytida input o'z holatini yuritadi, so'rov debounce bilan ketadi
  const [localSearch, setLocalSearch] = useState(searchQuery)

  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    if (localSearch === searchQuery) return
    const t = setTimeout(() => onSearchChange(localSearch), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch])

  const sectorName = useMemo(
    () => sectors.find((s) => s.id === sectorFilter)?.name,
    [sectors, sectorFilter],
  )
  const orgName = useMemo(
    () => organizations.find((o) => String(o.id) === organizationFilter)?.name,
    [organizations, organizationFilter],
  )

  const chips: { key: string; label: string; onRemove: () => void }[] = []
  if (searchQuery.trim())
    chips.push({
      key: "q",
      label: `Qidiruv: «${searchQuery.trim()}»`,
      onRemove: () => {
        setLocalSearch("")
        onSearchChange("")
      },
    })
  if (statusFilter !== "all")
    chips.push({
      key: "status",
      label: `Holat: ${TASK_STATUS_LABEL[statusFilter] ?? statusFilter}`,
      onRemove: () => onStatusChange("all"),
    })
  if (priorityFilter !== "all")
    chips.push({
      key: "priority",
      label: `Muhimlik: ${PRIORITY_LABEL[priorityFilter] ?? priorityFilter}`,
      onRemove: () => onPriorityChange("all"),
    })
  if (sectorFilter !== "all" && sectorName)
    chips.push({
      key: "sector",
      label: `Soha: ${sectorName}`,
      onRemove: () => onSectorChange("all"),
    })
  if (organizationFilter !== "all" && orgName)
    chips.push({
      key: "org",
      label: `Tashkilot: ${orgName}`,
      onRemove: () => onOrganizationChange("all"),
    })

  const hasFilters = chips.length > 0

  return (
    <div className="space-y-3">
      {/* Yaratish tugmalari — sarlavha qatoridan alohida, bitta asosiy */}
      {showCreateButton && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/tasks/new"
            className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Yangi topshiriq
          </Link>
          <Link
            href="/dashboard/tasks/new/ai"
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            AI orqali
          </Link>
        </div>
      )}

      <PremiumFilterShell
        icon={Filter}
        title="Filtrlar"
        description="Holat, muhimlik, soha va tashkilot bo‘yicha saralash"
        collapsible
        defaultOpen={false}
        badge={
          typeof resultCount === "number" ? (
            <PremiumCountBadge tone={hasFilters ? "primary" : "neutral"}>
              {resultCount} natija
            </PremiumCountBadge>
          ) : undefined
        }
        clearAction={
          hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("")
                onClear()
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Tozalash
            </button>
          ) : undefined
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Qidiruv */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label
              htmlFor="tf-search"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Qidiruv
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id="tf-search"
                type="search"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Topshiriq nomi yoki tafsiloti bo‘yicha…"
                className="h-11 w-full rounded-md border border-input bg-card pl-8.5 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </div>
          </div>

          <Select
            id="tf-status"
            label="Holat"
            value={statusFilter}
            onChange={onStatusChange}
            options={[
              { value: "all", label: "Barchasi" },
              ...TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] })),
            ]}
          />

          <Select
            id="tf-priority"
            label="Muhimlik"
            value={priorityFilter}
            onChange={onPriorityChange}
            options={[
              { value: "all", label: "Barchasi" },
              ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] })),
            ]}
          />

          {showSectorFilter && (
            <Select
              id="tf-sector"
              label="Soha"
              value={sectorFilter}
              onChange={onSectorChange}
              options={[
                { value: "all", label: "Barcha sohalar" },
                ...sectors.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          )}

          <Select
            id="tf-org"
            label="Tashkilot"
            value={organizationFilter}
            onChange={onOrganizationChange}
            options={[
              { value: "all", label: "Barcha tashkilotlar" },
              ...organizations.map((o) => ({
                value: String(o.id),
                label: o.name ?? String(o.id),
              })),
            ]}
          />
        </div>
      </PremiumFilterShell>

      {/* Faol filtrlar — har birini alohida olib tashlash mumkin */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-1 text-xs font-medium text-primary-soft-foreground"
            >
              {c.label}
              <button
                type="button"
                onClick={c.onRemove}
                aria-label={`${c.label} — olib tashlash`}
                className="rounded-xs hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- Yordamchi */

function Select({
  id,
  label,
  value,
  onChange,
  options,
  className,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
