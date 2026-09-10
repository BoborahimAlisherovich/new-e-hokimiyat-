"use client"

import { cn } from "@/lib/utils"

/**
 * TOPSHIRIQ KO'RSATKICHLARI — ixcham qator
 *
 * Nima uchun qayta yozildi:
 *  1. Oldingi ko'rinish 6 ta katta plita edi (p-4, 3xl raqam, 40px ikonka
 *     doirasi) — telefonda 2 ustunda 3 qator, ya'ni ~300px. Ro'yxatga
 *     yetib borish uchun butun ekranni aylantirish kerak edi. Ish
 *     boshqaruvida asosiy narsa — TOPSHIRIQLAR RO'YXATI, ko'rsatkich
 *     emas.
 *  2. «Ijroda», «Tasdiqlashda», «Kechikkan» sanoqlari endi tezkor
 *     ko'rinish tablarida ham bor edi — bir xil raqam ikki joyda.
 *     Takrorlash olib tashlandi: bu qatorda faqat tablarda YO'Q
 *     ko'rsatkichlar qoldi.
 *  3. Yagona bosiladigan plita — «Tasdiqlashda», u tasdiqlash navbatiga
 *     olib boradi. Qolganlari ma'lumot uchun, shuning uchun tugma emas
 *     (bosiladiganday ko'rinib, hech narsa qilmasligi eng yomon holat).
 */

export type TaskStatsProps = {
  total: number
  pending: number
  /** Nazoratdan yechilgan (yakunlangan) */
  completed: number
  /** Hisobot topshirilgan, tasdiq kutmoqda */
  awaitingApproval: number
  /** Tasdiqlash navbatiga havola ko'rsatilsinmi */
  canApprove?: boolean
  className?: string
}

type Tile = {
  label: string
  value: string
  hint?: string
  bar: string
  value_class?: string
}

export function TaskStats({
  total,
  pending,
  completed,
  awaitingApproval,
  canApprove = false,
  className,
}: TaskStatsProps) {
  const rate = total > 0 ? Math.round((completed / total) * 100) : null

  const tiles: Tile[] = [
    { label: "Jami topshiriq", value: String(total), bar: "bg-primary" },
    { label: "Yangi", value: String(pending), hint: "hali ijroga olinmagan", bar: "bg-primary" },
    {
      label: "Nazoratdan yechildi",
      value: String(completed),
      hint: rate === null ? undefined : `${rate}% yakunlangan`,
      bar: "bg-success",
      value_class: "text-success",
    },
  ]

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3", className)}>
      {tiles.map((t) => (
        <div key={t.label} className="surface relative overflow-hidden p-3 sm:p-3.5">
          <span className={cn("absolute inset-x-0 top-0 h-0.5", t.bar)} aria-hidden />
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.label}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold leading-none tracking-tight tabular-nums",
              t.value_class ?? "text-foreground",
            )}
          >
            {t.value}
          </p>
          {t.hint && <p className="mt-1 truncate text-[11px] text-muted-foreground">{t.hint}</p>}
        </div>
      ))}

      {/* Tasdiqlash navbati — yagona bosiladigan plita */}
      {canApprove ? (
        <a
          href="/dashboard/tasks/pending-approval"
          className="surface surface-interactive relative overflow-hidden p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-3.5"
        >
          <span className="absolute inset-x-0 top-0 h-0.5 bg-warning" aria-hidden />
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tasdiqlashda
          </p>
          <p className="mt-1 text-2xl font-bold leading-none tracking-tight tabular-nums text-warning">
            {awaitingApproval}
          </p>
          <p className="mt-1 truncate text-[11px] font-semibold text-primary">
            Navbatni ochish →
          </p>
        </a>
      ) : (
        <div className="surface relative overflow-hidden p-3 sm:p-3.5">
          <span className="absolute inset-x-0 top-0 h-0.5 bg-warning" aria-hidden />
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tasdiqlashda
          </p>
          <p className="mt-1 text-2xl font-bold leading-none tracking-tight tabular-nums text-warning">
            {awaitingApproval}
          </p>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {awaitingApproval > 0 ? "tasdiq kutilmoqda" : "navbat bo‘sh"}
          </p>
        </div>
      )}
    </div>
  )
}
