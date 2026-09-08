"use client"

import type React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * SAHIFA FREYMI — 12 sahifa ishlatadi.
 *
 * O'zgartirildi:
 *  1. Uchta 288–384px `blur-3xl` dekorativ shar olib tashlandi. Qobiq va
 *     dashboard sahifasi yana oltitasini qo'shardi — `/dashboard/tasks` da
 *     jami OLTI shar ustma-ust turardi (~240k px² GPU blur).
 *  2. Cyan→teal gradientli "hero" bloki olib tashlandi. U saytdagi uchta
 *     raqib palitradan biri edi va oq matn gradient ustida joyiga qarab
 *     4.5:1 chegarasiga tushib ketardi.
 *  3. `<h2>` sarlavhasi. Ilgari bu blok Header'ning `<h1>` idan keyin
 *     ikkinchi sarlavhani chiqarardi va unga TITLE emas, to'liq gap
 *     yozilardi ("Ijro intizomi, yuklama va nazorat bir joyda
 *     boshqariladi."). Endi u tavsif sifatida ko'rsatiladi, sarlavha
 *     ierarxiyasi buzilmaydi.
 *  4. Statistika plitalari chaqiruv joyidan xom Tailwind gradient satrini
 *     olardi (`tone`). Endi `tone` e'tiborsiz qoldiriladi va ranglar
 *     tokenlardan keladi — eski chaqiruvlarni o'zgartirish shart emas.
 */

interface PageStat {
  label: string
  value: string | number
  icon: LucideIcon
  /** Eski prop — endi ishlatilmaydi */
  tone?: string
}

interface DashboardPageFrameProps {
  eyebrow?: string
  /** Sahifa tavsifi (sarlavha emas — sarlavhani Header beradi) */
  title?: string
  description?: string
  stats?: PageStat[]
  children: React.ReactNode
  className?: string
}

export function DashboardPageFrame({
  eyebrow,
  title,
  description,
  stats = [],
  children,
  className,
}: DashboardPageFrameProps) {
  const hasIntro = Boolean(eyebrow || title || description)

  return (
    <div className={cn("space-y-4 p-4 sm:p-6", className)}>
      {(hasIntro || stats.length > 0) && (
        <section className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {hasIntro && (
            <div className="surface animate-fade-in p-4">
              {eyebrow && (
                <p className="text-2xs font-bold uppercase tracking-[0.1em] text-primary">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2 className="mt-1 max-w-2xl text-md font-semibold text-foreground text-balance">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          )}

          {stats.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
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
      )}

      {children}
    </div>
  )
}
