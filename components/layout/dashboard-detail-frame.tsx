"use client"

import type React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * TAFSILOT FREYMI — topshiriq, murojaat, loyiha, foydalanuvchi, tashkilot
 * sahifalari ishlatadi.
 *
 * O'zgartirildi:
 *  1. Uchta `blur-3xl` dekorativ shar va cyan→teal gradientli hero olib
 *     tashlandi (tokenlarga o'tildi).
 *  2. `<h1>` → `<h2>`. Header allaqachon `<h1>` chiqaradi, shuning uchun
 *     tafsilot sahifalarida IKKI `<h1>` bo'lardi.
 *  3. Nonlar zanjiri (breadcrumb) qo'shildi: ilgari yo'l ko'rsatuvchi
 *     yagona element chaqiruvchi eslab qolishi kerak bo'lgan `backHref`
 *     tugmasi edi.
 *  4. Sensorli nishonlar >= 44px.
 */

interface DetailStat {
  label: string
  value: string | number
  icon: LucideIcon
  /** Eski prop — endi ishlatilmaydi */
  tone?: string
}

interface DashboardDetailFrameProps {
  eyebrow?: string
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  /** Nonlar zanjiri: [{label, href}] — oxirgisi joriy sahifa */
  breadcrumbs?: { label: string; href?: string }[]
  stats?: DetailStat[]
  badges?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function DashboardDetailFrame({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Orqaga",
  breadcrumbs,
  stats = [],
  badges,
  actions,
  children,
  className,
}: DashboardDetailFrameProps) {
  return (
    <div className={cn("space-y-4 p-4 sm:p-6", className)}>
      {/* Nonlar zanjiri */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Nonlar zanjiri">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((b, i) => {
              const last = i === breadcrumbs.length - 1
              return (
                <li key={`${b.label}-${i}`} className="flex items-center gap-1">
                  {b.href && !last ? (
                    <Link href={b.href} className="hover:text-foreground hover:underline">
                      {b.label}
                    </Link>
                  ) : (
                    <span className={cn(last && "font-medium text-foreground")} aria-current={last ? "page" : undefined}>
                      {b.label}
                    </span>
                  )}
                  {!last && <span aria-hidden>/</span>}
                </li>
              )
            })}
          </ol>
        </nav>
      )}

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="surface animate-fade-in p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              {eyebrow && (
                <p className="text-2xs font-bold uppercase tracking-[0.1em] text-primary">
                  {eyebrow}
                </p>
              )}
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground text-balance">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {backHref && (
                <Link
                  href={backHref}
                  className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-3.5 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  {backLabel}
                </Link>
              )}
              {actions}
            </div>
          </div>
        </div>

        {stats.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {stats.map((stat) => (
              <div key={stat.label} className="surface animate-fade-in p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <stat.icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {children}
    </div>
  )
}
