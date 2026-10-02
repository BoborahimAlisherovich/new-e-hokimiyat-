"use client"

import { useMemo, useState } from "react"
import { SlidersHorizontal, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/status-styles"
import type { Sector } from "@/lib/api/sectors.api"
import type { PersonOption, TaskFilterState } from "@/components/dashboard/tasks/task-filters"

/**
 * QO'SHIMCHA FILTRLAR
 *
 * DashStack «Order List» filtr qatoriga faqat to'rtta segment sig'adi
 * (Muddat / Muhimlik / Holat / Tozalash). Soha, ijrochi tashkilot va
 * mas'ul yordamchi kesimlari hokim uchun baribir kerak — ular shu
 * yig'iladigan panelga chiqarilgan, plita ustida turadi va ochilmagan
 * holatda bitta 44px tugmadan boshqa joy olmaydi.
 *
 * Faol filtrlar chipi qaytadan ko'rsatiladi: foydalanuvchi qaysi kesim
 * yoqilganini plitani ochmasdan ko'rishi va bittalab olib tashlashi kerak.
 */

type Props = {
  value: TaskFilterState
  onChange: (patch: Partial<TaskFilterState>) => void
  sectors: Sector[]
  organizations: { id: string | number; name?: string }[]
  deputies?: PersonOption[]
  authors?: PersonOption[]
  showSectorFilter?: boolean
  scopeNote?: string
}

export function TaskAdvancedFilters({
  value,
  onChange,
  sectors,
  organizations,
  deputies = [],
  authors = [],
  showSectorFilter = true,
  scopeNote,
}: Props) {
  const [open, setOpen] = useState(false)

  const nameOf = (list: { id: string | number; name?: string }[], id: string) =>
    list.find((x) => String(x.id) === id)?.name

  const chips = useMemo(() => {
    const out: { key: string; label: string; onRemove: () => void }[] = []

    if (value.search.trim())
      out.push({
        key: "q",
        label: `Qidiruv: «${value.search.trim()}»`,
        onRemove: () => onChange({ search: "" }),
      })
    if (value.status !== "all")
      out.push({
        key: "status",
        label: `Holat: ${TASK_STATUS_LABEL[value.status] ?? value.status}`,
        onRemove: () => onChange({ status: "all" }),
      })
    if (value.priority !== "all")
      out.push({
        key: "priority",
        label: `Muhimlik: ${PRIORITY_LABEL[value.priority] ?? value.priority}`,
        onRemove: () => onChange({ priority: "all" }),
      })
    if (value.sector !== "all") {
      const n = sectors.find((s) => String(s.id) === value.sector)?.name
      if (n) out.push({ key: "sector", label: `Soha: ${n}`, onRemove: () => onChange({ sector: "all" }) })
    }
    if (value.organization !== "all") {
      const n = nameOf(organizations, value.organization)
      if (n)
        out.push({
          key: "org",
          label: `Tashkilot: ${n}`,
          onRemove: () => onChange({ organization: "all" }),
        })
    }
    if (value.deputy !== "all") {
      const n = nameOf(deputies, value.deputy)
      if (n) out.push({ key: "deputy", label: `Mas'ul: ${n}`, onRemove: () => onChange({ deputy: "all" }) })
    }
    if (value.author !== "all") {
      const n = nameOf(authors, value.author)
      if (n)
        out.push({ key: "author", label: `Muallif: ${n}`, onRemove: () => onChange({ author: "all" }) })
    }
    if (value.deadlineFrom)
      out.push({
        key: "dfrom",
        label: `Muddat ${value.deadlineFrom} dan`,
        onRemove: () => onChange({ deadlineFrom: "" }),
      })
    if (value.deadlineTo)
      out.push({
        key: "dto",
        label: `Muddat ${value.deadlineTo} gacha`,
        onRemove: () => onChange({ deadlineTo: "" }),
      })

    return out
  }, [value, sectors, organizations, deputies, authors, onChange])

  const advancedCount = [
    value.sector !== "all",
    value.organization !== "all",
    value.deputy !== "all",
    value.author !== "all",
  ].filter(Boolean).length

  const hasAdvancedFields =
    showSectorFilter || organizations.length > 0 || deputies.length > 0 || authors.length > 0

  if (!hasAdvancedFields && chips.length === 0) return null

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {hasAdvancedFields && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-[10px] px-3.5 text-sm font-semibold transition-colors",
              advancedCount > 0
                ? "bg-primary-soft text-primary-soft-foreground"
                : "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-muted",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Qo'shimcha kesim
            {advancedCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-card px-1 text-2xs font-bold tabular-nums text-primary-soft-foreground">
                {advancedCount}
              </span>
            )}
          </button>
        )}

        {/* Faol filtrlar — bittalab olib tashlanadi */}
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

      {open && hasAdvancedFields && (
        <section className="grid gap-3 rounded-[14px] bg-card p-4 shadow-[inset_0_0_0_1px_var(--border)] sm:grid-cols-2 lg:grid-cols-3">
          {showSectorFilter && (
            <Field
              id="taf-sector"
              label="Soha"
              value={value.sector}
              onChange={(v) => onChange({ sector: v })}
              options={[
                { value: "all", label: "Barcha sohalar" },
                ...sectors.map((s) => ({ value: String(s.id), label: s.name })),
              ]}
            />
          )}

          <Field
            id="taf-org"
            label="Ijrochi tashkilot"
            hint={scopeNote}
            value={value.organization}
            onChange={(v) => onChange({ organization: v })}
            options={[
              { value: "all", label: "Barcha tashkilotlar" },
              ...organizations.map((o) => ({ value: String(o.id), label: o.name ?? String(o.id) })),
            ]}
          />

          {deputies.length > 0 && (
            <Field
              id="taf-deputy"
              label="Mas'ul yordamchi"
              value={value.deputy}
              onChange={(v) => onChange({ deputy: v })}
              options={[
                { value: "all", label: "Barchasi" },
                ...deputies.map((d) => ({ value: String(d.id), label: d.name })),
              ]}
            />
          )}

          {authors.length > 0 && (
            <Field
              id="taf-author"
              label="Topshiriq muallifi"
              value={value.author}
              onChange={(v) => onChange({ author: v })}
              options={[
                { value: "all", label: "Barchasi" },
                ...authors.map((a) => ({ value: String(a.id), label: a.name })),
              ]}
            />
          )}

          <DateField
            id="taf-dfrom"
            label="Muddat — dan"
            value={value.deadlineFrom}
            onChange={(v) => onChange({ deadlineFrom: v })}
          />
          <DateField
            id="taf-dto"
            label="Muddat — gacha"
            value={value.deadlineTo}
            onChange={(v) => onChange({ deadlineTo: v })}
          />
        </section>
      )}
    </div>
  )
}

const FIELD =
  "h-11 w-full rounded-[10px] bg-card px-3 text-sm text-foreground shadow-[inset_0_0_0_1px_var(--border)] focus:shadow-[inset_0_0_0_1.5px_var(--primary)] focus:outline-none"

function Field({
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
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
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
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD}
      />
    </div>
  )
}
