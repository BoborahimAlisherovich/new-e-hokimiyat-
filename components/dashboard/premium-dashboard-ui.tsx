"use client"

import type React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * SAYTNING ASOSIY KOMPONENT TO'PLAMI — 15 sahifa shu fayldan ko'rinish oladi.
 *
 * O'zgartirildi:
 *  1. Ranglar endi design tokenlardan (bg-card, border-border, text-foreground…)
 *     keladi, oldingi qo'lda yozilgan bg-white/78 + cyan/amber gradientlar
 *     o'rniga. Shu sababli dark tema va yuqori kontrast rejimi o'zi ishlaydi.
 *  2. `tone` — semantik enum ("primary" | "success" | ...). Ilgari har bir
 *     chaqiruv joyi 5 ta xom Tailwind class satrini uzatishi kerak edi
 *     (gradient, bgGradient, iconBg, textColor, borderColor) — bu tizimning
 *     bir joyda saqlanishini imkonsiz qilardi. Eski proplar hali ham qabul
 *     qilinadi va ulardan tone avtomatik aniqlanadi, shuning uchun eski
 *     chaqiruvlarni o'zgartirmasdan ham to'g'ri ko'rinadi.
 *  3. framer-motion olib tashlandi. Kirish animatsiyasi CSS (.animate-fade-in)
 *     bilan — har sahifa almashinuvida 4-8 ta JS animatsiya qayta ishga
 *     tushmaydi, va prefers-reduced-motion avtomatik hurmat qilinadi.
 *  4. backdrop-blur-xl olib tashlandi (saytda 161 ta bor edi) — u element
 *     orqasidagi hamma narsani har kadrda qayta rasterizatsiya qiladi.
 */

/* ------------------------------------------------------------------- TONLAR */

export type Tone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet"
  | "neutral"

const toneStyles: Record<Tone, { chip: string; value: string; bar: string }> = {
  primary: {
    chip: "bg-primary-soft text-primary-soft-foreground",
    value: "text-foreground",
    bar: "bg-primary",
  },
  success: {
    chip: "bg-success-soft text-success-soft-foreground",
    value: "text-foreground",
    bar: "bg-success",
  },
  warning: {
    chip: "bg-warning-soft text-warning-soft-foreground",
    value: "text-foreground",
    bar: "bg-warning",
  },
  danger: {
    chip: "bg-destructive-soft text-destructive-soft-foreground",
    value: "text-foreground",
    bar: "bg-destructive",
  },
  info: {
    chip: "bg-info-soft text-info-soft-foreground",
    value: "text-foreground",
    bar: "bg-info",
  },
  violet: {
    chip: "bg-[var(--st-tekshiruvda-bg)] text-[var(--st-tekshiruvda-fg)]",
    value: "text-foreground",
    bar: "bg-[var(--st-tekshiruvda-fg)]",
  },
  neutral: {
    chip: "bg-muted text-muted-foreground",
    value: "text-foreground",
    bar: "bg-border-strong",
  },
}

/**
 * Eski chaqiruv joylari `textColor: "text-success"` kabi xom class
 * uzatadi. Ularni o'zgartirmasdan to'g'ri rangga solish uchun tonni
 * shu satrlardan aniqlaymiz.
 */
function inferTone(item: {
  tone?: Tone
  textColor?: string
  iconBg?: string
  gradient?: string
}): Tone {
  if (item.tone) return item.tone

  const s = `${item.textColor ?? ""} ${item.iconBg ?? ""} ${item.gradient ?? ""}`

  // 1) Dizayn tizimi tokenlari (palitra migratsiyasidan keyin asosiy yo'l)
  if (/\bsuccess\b/.test(s)) return "success"
  if (/\bwarning\b/.test(s)) return "warning"
  if (/\bdestructive\b/.test(s)) return "danger"
  if (/st-tekshiruvda/.test(s)) return "violet"
  if (/\binfo\b/.test(s)) return "info"
  if (/\bprimary\b/.test(s)) return "primary"
  if (/\bmuted\b|\bsecondary\b/.test(s)) return "neutral"

  // 2) Eski xom Tailwind oilalari (hali qolgan chaqiruv joylari uchun)
  if (/emerald|green|teal/.test(s)) return "success"
  if (/amber|yellow|orange/.test(s)) return "warning"
  if (/red|rose|pink/.test(s)) return "danger"
  if (/violet|purple|fuchsia/.test(s)) return "violet"
  if (/blue|indigo/.test(s)) return "primary"
  if (/cyan|sky/.test(s)) return "info"
  return "neutral"
}

/* ------------------------------------------------------------ STATISTIKA */

export interface PremiumStatItem {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  /** Yangi, tavsiya etilgan usul */
  tone?: Tone
  /** Sahifaga o'tish — karta bosiladigan bo'ladi */
  href?: string
  onClick?: () => void
  /** --- Eski proplar (endi ishlatilmaydi, faqat moslik uchun) --- */
  gradient?: string
  bgGradient?: string
  iconBg?: string
  textColor?: string
  borderColor?: string
}

export function PremiumStatsGrid({
  items,
  columns = 4,
}: {
  items: PremiumStatItem[]
  columns?: 2 | 3 | 4
}) {
  const gridCols =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4"

  return (
    <div className={cn("grid gap-3", gridCols)}>
      {items.map((item, index) => {
        const Icon = item.icon
        const tone = toneStyles[inferTone(item)]
        const clickable = Boolean(item.href || item.onClick)

        const body = (
          <>
            <span className={cn("absolute inset-x-0 top-0 h-0.5", tone.bar)} aria-hidden />
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className={cn("mt-1.5 text-3xl font-bold leading-none tracking-tight tabular-nums", tone.value)}>
                  {item.value}
                </p>
                {item.hint && (
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">{item.hint}</p>
                )}
              </div>
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tone.chip)}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
            </div>
          </>
        )

        const base = cn(
          "surface animate-fade-in relative block overflow-hidden text-left",
          clickable && "surface-interactive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )
        const style = { animationDelay: `${Math.min(index, 6) * 40}ms` }

        if (item.href) {
          return (
            <a key={item.label} href={item.href} className={base} style={style}>
              {body}
            </a>
          )
        }
        if (item.onClick) {
          return (
            <button key={item.label} type="button" onClick={item.onClick} className={base} style={style}>
              {body}
            </button>
          )
        }
        return (
          <div key={item.label} className={base} style={style}>
            {body}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------- FILTR PANELI */

export function PremiumFilterShell({
  icon: Icon,
  title,
  description,
  badge,
  clearAction,
  children,
  /** Boshlanishida yopiq holatda ko'rsatish (mobil uchun foydali) */
  collapsible = false,
  defaultOpen = true,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  /** Eski prop — ishlatilmaydi */
  accentClassName?: string
  badge?: React.ReactNode
  clearAction?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  className?: string
}) {
  const header = (
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-md font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {(badge || clearAction) && (
        <div className="flex flex-wrap items-center gap-2">
          {badge}
          {clearAction}
        </div>
      )}
    </div>
  )

  if (collapsible) {
    return (
      <details className={cn("surface animate-fade-in overflow-hidden", className)} open={defaultOpen}>
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          {header}
        </summary>
        <div className="p-4">{children}</div>
      </details>
    )
  }

  return (
    <section className={cn("surface animate-fade-in overflow-hidden", className)}>
      {header}
      <div className="p-4">{children}</div>
    </section>
  )
}

/* ---------------------------------------------------------------- NISHONLAR */

export function PremiumCountBadge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode
  className?: string
  tone?: Tone
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
        toneStyles[tone].chip,
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------ JADVAL QOBIG'I */

export function PremiumTableShell({
  icon: Icon,
  title,
  countLabel,
  children,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  countLabel?: string
  /** Eski prop — ishlatilmaydi */
  accentClassName?: string
  children: React.ReactNode
  /** O'ng tomonda qo'shimcha tugma (eksport, ustunlar va h.k.) */
  action?: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("surface animate-fade-in overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" aria-hidden />
          <h2 className="truncate text-md font-semibold text-foreground">{title}</h2>
          {countLabel && (
            <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {countLabel}
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/* ---------------------------------------------------------------- BO'SH HOLAT */

export function PremiumEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  /** Eski prop — ishlatilmaydi */
  tone?: string
  /**
   * Harakat tugmasi. Bo'sh holat foydalanuvchini boshi berk ko'chaga
   * olib bormasligi kerak — shuning uchun CTA qo'shildi.
   */
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "animate-fade-in flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <h3 className="mb-1.5 text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ----------------------------------------------------------- YUKLANISH HOLATI */

/**
 * Skelet — kontentning haqiqiy shakliga mos kelishi kerak, aks holda
 * sahifa "sakraydi". Ilgari jadval sahifasida markazda bitta spinner
 * ko'rsatilardi.
 */
export function PremiumTableSkeleton({ rows = 6, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="p-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yuklanmoqda…</span>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3">
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={c}
                className="h-11 flex-1 animate-pulse rounded-md bg-muted"
                style={{ animationDelay: `${(r * columns + c) * 20}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function PremiumStatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface h-[92px] animate-pulse" />
      ))}
    </div>
  )
}
