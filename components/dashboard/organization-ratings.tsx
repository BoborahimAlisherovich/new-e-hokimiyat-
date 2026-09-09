"use client"

import React from "react"
import { Building2, Trophy } from "lucide-react"

import { getAnalyticsOrganizations } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/context"

/**
 * TASHKILOTLAR REYTINGI
 *
 * Qayta yozildi. Ilgari:
 *  - `bg-gradient-to-br` + `bg-clip-text text-transparent` bilan yozilgan
 *    o'rin raqami — gradiyent tokenga aylantirilgandan keyin raqam
 *    ko'rinmay qoldi (shaffof matn to'q fon ustida).
 *  - «Dekorativ halqa», «glow», `animate-pulse` nuqta va
 *    `whileHover={{ scale: 1.02 }}` — ma'lumot bermaydigan harakat.
 *  - Har bir satrda `border border-border` + `hover:border-primary`:
 *    qalin chegara loyiha standarti bilan ziddiyatda.
 *  - `ring-1 ring-ring/20` + qattiq `rgba(99,102,241,...)` soya.
 *
 * Endi: yumshoq fon kontrasti bilan ajratilgan satrlar, tokenlardagi
 * ranglar, o'lchangan kontrast va telefonda ham buzilmaydigan tuzilma.
 */

type OrgRating = {
  id: string | number
  name: string
  shortName?: string
  totalTasks: number
  completedTasks: number
  completionRate: number
  rating: number
}

/** Reyting darajasi — bitta joyda, chunki uch joyda ishlatiladi */
function tone(rate: number) {
  if (rate >= 90) return { chip: "bg-success-soft text-success-soft-foreground", bar: "bg-success" }
  if (rate >= 70) return { chip: "bg-warning-soft text-warning-soft-foreground", bar: "bg-warning" }
  return { chip: "bg-destructive-soft text-destructive-soft-foreground", bar: "bg-destructive" }
}

/** Faqat uchta birinchi o'rin ajratiladi, qolganlari betaraf */
function rankClass(index: number) {
  if (index === 0) return "bg-warning-soft text-warning-soft-foreground"
  if (index === 1) return "bg-primary-soft text-primary-soft-foreground"
  if (index === 2) return "bg-success-soft text-success-soft-foreground"
  return "bg-muted text-muted-foreground"
}

export function OrganizationRatings() {
  const t = useTranslation()
  const [orgs, setOrgs] = React.useState<OrgRating[]>([])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    getAnalyticsOrganizations()
      .then((list: any[]) => {
        if (!mounted) return
        setOrgs(
          (list || []).map((item: any) => ({
            id: item.organization?.id ?? item.id,
            name: item.organization?.name ?? item.name,
            shortName: item.organization?.short_name ?? item.short_name,
            totalTasks: item.total_tasks ?? 0,
            completedTasks: item.completed_tasks ?? 0,
            completionRate: item.completion_rate ?? 0,
            rating: item.rating ?? item.completion_rate ?? 0,
          })),
        )
      })
      .catch(() => {
        if (mounted) setError("Reytingni yuklab bo‘lmadi.")
      })
    return () => {
      mounted = false
    }
  }, [])

  const sorted = React.useMemo(
    () => [...orgs].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [orgs],
  )

  return (
    <section className="surface overflow-hidden">
      {/* Sarlavha */}
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
          <Trophy className="h-4.5 w-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-md font-semibold text-foreground">
            {t.dashboard.organizationRatings}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            Bajarilish darajasi bo‘yicha
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mx-4 mb-4 rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground sm:mx-5">
          {error}
        </p>
      )}

      {/* Ro'yxat */}
      {sorted.length > 0 ? (
        <ul className="space-y-2 px-4 pb-4 sm:px-5 sm:pb-5">
          {sorted.map((org, index) => {
            const rate = Math.max(0, Math.min(100, Number(org.completionRate) || 0))
            const st = tone(rate)
            return (
              <li key={`org-${org.id ?? index}`} className="rounded-2xl bg-background p-3.5">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                      rankClass(index),
                    )}
                    aria-label={`${index + 1}-o‘rin`}
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-words text-sm font-semibold text-foreground">
                        {org.name}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums",
                          st.chip,
                        )}
                      >
                        {rate}%
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.dashboard.completed}: {org.completedTasks}/{org.totalTasks}{" "}
                      {t.dashboard.taskUnit}
                    </p>

                    {/* Progress — bitta div, kutubxonasiz */}
                    <div
                      className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
                      role="progressbar"
                      aria-valuenow={rate}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${org.name} — bajarilish darajasi`}
                    >
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-500", st.bar)}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        !error && (
          <div className="flex flex-col items-center px-4 pb-8 pt-2 text-center sm:px-5">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-background">
              <Building2 className="h-6 w-6 text-muted-foreground" aria-hidden />
            </span>
            <p className="text-md font-semibold text-foreground">
              {t.dashboard.organizationsEmptyTitle}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t.dashboard.organizationsEmptyDescription}
            </p>
          </div>
        )
      )}
    </section>
  )
}
