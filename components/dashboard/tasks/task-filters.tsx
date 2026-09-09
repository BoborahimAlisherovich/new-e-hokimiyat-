"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { CalendarRange, Filter, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { TASK_STATUSES, TASK_STATUS_LABEL, PRIORITIES, PRIORITY_LABEL } from "@/lib/status-styles"
import type { Sector } from "@/lib/api/sectors.api"

/**
 * TOPSHIRIQ FILTRLARI — ro'yxat sahifasi uchun
 *
 * Yangi tuzilma:
 *  1. TEZKOR KO'RINISHLAR (TaskViewTabs) — «Barchasi / Menga tegishli /
 *     Tasdiqlashda / Kechikkan / Ijroda / Yopilgan». Ilgari foydalanuvchi
 *     har safar «Holat» ro'yxatini ochib, kerakli qiymatni izlashi kerak
 *     edi; endi bir bosishda.
 *  2. QIDIRUV panel ichida yashiringan edi (panel esa yopiq holatda
 *     boshlanardi) — ya'ni eng ko'p ishlatiladigan maydon ikki bosish
 *     ortida qolgan. Endi doim ko'rinadi.
 *  3. «Mas'ul» (hokim yordamchisi) va «Muallif» filtrlari yo'q edi —
 *     hokim uchun eng kerakli ikki kesim. Qo'shildi.
 *  4. Muddat oralig'i (dan/gacha) qo'shildi.
 *  5. Barcha maydonlar chegara emas, ichki halqa (inset ring) bilan —
 *     loyiha dizayn standarti.
 *  6. Faol filtrlar chipi har birini alohida olib tashlash imkonini
 *     beradi va tanlangan ko'rinishni ham ko'rsatadi.
 */

/* ------------------------------------------------------------- KO'RINISHLAR */

export type TaskView = "all" | "mine" | "awaiting" | "overdue" | "active" | "closed"

export type TaskViewDef = {
  key: TaskView
  label: string
  hint: string
  /** Faqat tasdiqlash huquqi bo'lganlarga */
  approverOnly?: boolean
}

export const TASK_VIEWS: TaskViewDef[] = [
  { key: "all", label: "Barchasi", hint: "Sizga ko‘rinadigan barcha topshiriqlar" },
  { key: "mine", label: "Menga tegishli", hint: "Men yaratgan yoki menga biriktirilgan" },
  { key: "awaiting", label: "Tasdiqlashda", hint: "Hisobot yuborilgan, tasdiq kutilmoqda" },
  { key: "overdue", label: "Kechikkan", hint: "Muddati o‘tgan, hali yopilmagan" },
  { key: "active", label: "Ijroda", hint: "Ijro jarayonida" },
  { key: "closed", label: "Yopilgan", hint: "Nazoratdan yechilgan yoki bajarilmagan" },
]

/** Ko'rinishni backend query parametrlariga aylantiradi */
export function viewToParams(view: TaskView): Record<string, string> {
  switch (view) {
    case "mine":
      return { mine: "1" }
    case "awaiting":
      return { awaiting: "1" }
    case "overdue":
      return { overdue: "1" }
    case "active":
      return { status: "IJRODA" }
    case "closed":
      return { status: "NAZORATDAN_YECHILDI" }
    default:
      return {}
  }
}

export type TaskViewCounts = Partial<Record<TaskView, number>>

export function TaskViewTabs({
  value,
  counts,
  canApprove = false,
  onChange,
  className,
}: {
  value: TaskView
  counts?: TaskViewCounts
  canApprove?: boolean
  onChange: (v: TaskView) => void
  className?: string
}) {
  const views = useMemo(
    () => TASK_VIEWS.filter((v) => !v.approverOnly || canApprove),
    [canApprove],
  )

  return (
    <div
      role="tablist"
      aria-label="Topshiriq ko‘rinishlari"
      className={cn(
        "scroll-x -mx-1 flex gap-1 rounded-2xl bg-surface-sunken p-1",
        className,
      )}
    >
      {views.map((v) => {
        const active = v.key === value
        const count = counts?.[v.key]
        return (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={active}
            title={v.hint}
            onClick={() => onChange(v.key)}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold whitespace-nowrap transition-colors",
              active
                ? "bg-card text-foreground shadow-[0_1px_2px_rgb(13_21_36_/_0.06),0_8px_20px_-14px_rgb(13_21_36_/_0.24)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
            {typeof count === "number" && count > 0 && (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-2xs font-bold tabular-nums",
                  active ? "bg-primary-soft text-primary-soft-foreground" : "bg-card text-muted-foreground",
                )}
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ FILTRLAR */

export type TaskFilterState = {
  search: string
  status: string
  priority: string
  sector: string
  organization: string
  deputy: string
  author: string
  deadlineFrom: string
  deadlineTo: string
}

export const EMPTY_TASK_FILTERS: TaskFilterState = {
  search: "",
  status: "all",
  priority: "all",
  sector: "all",
  organization: "all",
  deputy: "all",
  author: "all",
  deadlineFrom: "",
  deadlineTo: "",
}

export type PersonOption = { id: string | number; name: string }

export type TaskFiltersProps = {
  value: TaskFilterState
  onChange: (patch: Partial<TaskFilterState>) => void
  onClear: () => void
  sectors: Sector[]
  organizations: { id: string | number; name?: string }[]
  /** Mas'ul hokim yordamchilari (faqat hokim/admin ko'radi) */
  deputies?: PersonOption[]
  /** Topshiriq muallif­lari (faqat hokim/admin ko'radi) */
  authors?: PersonOption[]
  showSectorFilter?: boolean
  resultCount?: number
  /** Tanlangan tashkilot doirasi haqida izoh (masalan: faqat biriktirilganlar) */
  scopeNote?: string
}

export function TaskFilters({
  value,
  onChange,
  onClear,
  sectors,
  organizations,
  deputies = [],
  authors = [],
  showSectorFilter = true,
  resultCount,
  scopeNote,
}: TaskFiltersProps) {
  const [open, setOpen] = useState(false)

  // Yozish paytida input o'z holatini yuritadi, so'rov debounce bilan ketadi
  const [localSearch, setLocalSearch] = useState(value.search)

  useEffect(() => {
    setLocalSearch(value.search)
  }, [value.search])

  useEffect(() => {
    if (localSearch === value.search) return
    const t = setTimeout(() => onChange({ search: localSearch }), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch])

  const nameOf = (list: { id: string | number; name?: string }[], id: string) =>
    list.find((x) => String(x.id) === id)?.name

  const chips: { key: string; label: string; onRemove: () => void }[] = []
  if (value.search.trim())
    chips.push({
      key: "q",
      label: `Qidiruv: «${value.search.trim()}»`,
      onRemove: () => {
        setLocalSearch("")
        onChange({ search: "" })
      },
    })
  if (value.status !== "all")
    chips.push({
      key: "status",
      label: `Holat: ${TASK_STATUS_LABEL[value.status] ?? value.status}`,
      onRemove: () => onChange({ status: "all" }),
    })
  if (value.priority !== "all")
    chips.push({
      key: "priority",
      label: `Muhimlik: ${PRIORITY_LABEL[value.priority] ?? value.priority}`,
      onRemove: () => onChange({ priority: "all" }),
    })
  if (value.sector !== "all") {
    const n = sectors.find((s) => String(s.id) === value.sector)?.name
    if (n) chips.push({ key: "sector", label: `Soha: ${n}`, onRemove: () => onChange({ sector: "all" }) })
  }
  if (value.organization !== "all") {
    const n = nameOf(organizations, value.organization)
    if (n) chips.push({ key: "org", label: `Tashkilot: ${n}`, onRemove: () => onChange({ organization: "all" }) })
  }
  if (value.deputy !== "all") {
    const n = nameOf(deputies, value.deputy)
    if (n) chips.push({ key: "deputy", label: `Mas’ul: ${n}`, onRemove: () => onChange({ deputy: "all" }) })
  }
  if (value.author !== "all") {
    const n = nameOf(authors, value.author)
    if (n) chips.push({ key: "author", label: `Muallif: ${n}`, onRemove: () => onChange({ author: "all" }) })
  }
  if (value.deadlineFrom)
    chips.push({
      key: "dfrom",
      label: `Muddat ${value.deadlineFrom} dan`,
      onRemove: () => onChange({ deadlineFrom: "" }),
    })
  if (value.deadlineTo)
    chips.push({
      key: "dto",
      label: `Muddat ${value.deadlineTo} gacha`,
      onRemove: () => onChange({ deadlineTo: "" }),
    })

  const hasFilters = chips.length > 0
  const advancedCount = chips.filter((c) => c.key !== "q").length

  return (
    <div className="space-y-3">
      {/* Qidiruv + filtr tugmasi — bir qatorda, doim ko'rinadi */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <label htmlFor="tf-search" className="sr-only">
            Topshiriqlar orasidan qidirish
          </label>
          <input
            id="tf-search"
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Topshiriq nomi yoki mazmuni bo‘yicha qidirish…"
            className={cn(
              "h-11 w-full rounded-xl bg-card pl-9.5 pr-3 text-sm text-foreground placeholder:text-muted-foreground",
              "shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1.5px_var(--primary)] focus:outline-none",
            )}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold",
              advancedCount > 0
                ? "bg-primary-soft text-primary-soft-foreground"
                : "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-muted",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filtrlar
            {advancedCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-card px-1 text-2xs font-bold tabular-nums text-primary-soft-foreground">
                {advancedCount}
              </span>
            )}
          </button>

          {typeof resultCount === "number" && (
            <span className="hidden whitespace-nowrap text-sm text-muted-foreground sm:inline">
              <span className="font-semibold tabular-nums text-foreground">{resultCount}</span> natija
            </span>
          )}
        </div>
      </div>

      {/* Kengaytirilgan filtrlar */}
      {open && (
        <section className="surface animate-fade-in p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Saralash mezonlari
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch("")
                  onClear()
                }}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Tozalash
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              id="tf-status"
              label="Holat"
              value={value.status}
              onChange={(v) => onChange({ status: v })}
              options={[
                { value: "all", label: "Barchasi" },
                ...TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] })),
              ]}
            />

            <Select
              id="tf-priority"
              label="Muhimlik"
              value={value.priority}
              onChange={(v) => onChange({ priority: v })}
              options={[
                { value: "all", label: "Barchasi" },
                ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] })),
              ]}
            />

            {showSectorFilter && (
              <Select
                id="tf-sector"
                label="Soha"
                value={value.sector}
                onChange={(v) => onChange({ sector: v })}
                options={[
                  { value: "all", label: "Barcha sohalar" },
                  ...sectors.map((s) => ({ value: String(s.id), label: s.name })),
                ]}
              />
            )}

            <Select
              id="tf-org"
              label="Ijrochi tashkilot"
              hint={scopeNote}
              value={value.organization}
              onChange={(v) => onChange({ organization: v })}
              options={[
                { value: "all", label: "Barcha tashkilotlar" },
                ...organizations.map((o) => ({
                  value: String(o.id),
                  label: o.name ?? String(o.id),
                })),
              ]}
            />

            {deputies.length > 0 && (
              <Select
                id="tf-deputy"
                label="Mas’ul yordamchi"
                value={value.deputy}
                onChange={(v) => onChange({ deputy: v })}
                options={[
                  { value: "all", label: "Barchasi" },
                  ...deputies.map((d) => ({ value: String(d.id), label: d.name })),
                ]}
              />
            )}

            {authors.length > 0 && (
              <Select
                id="tf-author"
                label="Topshiriq muallifi"
                value={value.author}
                onChange={(v) => onChange({ author: v })}
                options={[
                  { value: "all", label: "Barchasi" },
                  ...authors.map((a) => ({ value: String(a.id), label: a.name })),
                ]}
              />
            )}

            {/* Muddat oralig'i */}
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CalendarRange className="h-3.5 w-3.5" aria-hidden />
                Muddat oralig‘i
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <DateField
                  id="tf-dfrom"
                  label="dan"
                  value={value.deadlineFrom}
                  onChange={(v) => onChange({ deadlineFrom: v })}
                />
                <DateField
                  id="tf-dto"
                  label="gacha"
                  value={value.deadlineTo}
                  onChange={(v) => onChange({ deadlineTo: v })}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Faol filtrlar — har birini alohida olib tashlash mumkin */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2 py-1 text-xs font-medium text-primary-soft-foreground"
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

const FIELD =
  "h-11 w-full rounded-xl bg-card px-3 text-sm text-foreground shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1.5px_var(--primary)] focus:outline-none"

function Select({
  id,
  label,
  hint,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-2xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} className={FIELD} />
    </div>
  )
}
