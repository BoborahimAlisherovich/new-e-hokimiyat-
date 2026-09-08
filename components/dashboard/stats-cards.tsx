"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, ListTodo, Loader2, ShieldCheck } from "lucide-react"

import { getTaskStats } from "@/lib/api/tasks.api"
import {
  PremiumStatsGrid,
  PremiumStatsSkeleton,
  type PremiumStatItem,
} from "@/components/dashboard/premium-dashboard-ui"
import { useTranslation } from "@/lib/i18n/context"
import { useCurrentUser } from "@/components/layout/current-user-provider"

/**
 * DASHBOARD KPI QATORI
 *
 * Olib tashlangan narsalar:
 *  1. QO'LDA YOZILGAN o'sish ko'rsatkichlari: `trendValue: "+12%"`,
 *     `"+8%"`, `"-3%"`, `"+5%"` — ular haqiqiy ma'lumot sifatida, o'sish
 *     strelkasi bilan chiqarilardi. Ijro nazorati tizimida bu shunchaki
 *     bezak emas, xato ma'lumot.
 *  2. Har kartadagi progress chizig'i `value / totalTasks` ni hisoblab
 *     "bajarilish foizi" deb yozardi — MUDDATI KECHIKKAN kartada u
 *     "kechikkan / jami" ni bajarilish foizi sifatida ko'rsatardi.
 *  3. `.catch(() => {})` — so'rov yiqilsa hammasi nol ko'rinardi va
 *     bu haqiqiy nol bilan farqlanmasdi. Endi xato ko'rsatiladi.
 *  4. Kartaning ichida 7 ta kontent uyasi bor edi (yorliq, qiymat, soxta
 *     trend, o'zgarish, izoh, 56px ikonka, progress) va u bitta raqam
 *     uchun ~250px balandlik egallardi.
 */

interface Stats {
  total: number
  pending: number
  in_progress: number
  completed: number
  awaiting_approval: number
  overdue: number
  active_sectors: number
}

const ZERO: Stats = {
  total: 0,
  pending: 0,
  in_progress: 0,
  completed: 0,
  awaiting_approval: 0,
  overdue: 0,
  active_sectors: 0,
}

export function StatsCards() {
  const t = useTranslation()
  const { role } = useCurrentUser()
  const [stats, setStats] = useState<Stats>(ZERO)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getTaskStats()
      .then((data: any) => {
        if (!alive) return
        setStats({ ...ZERO, ...data })
        setError(null)
      })
      .catch((err: any) => {
        if (!alive) return
        setError(err?.message || "Ko‘rsatkichlarni yuklab bo‘lmadi")
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading) return <PremiumStatsSkeleton count={4} />

  if (error) {
    return (
      <div role="alert" className="surface p-4 text-center">
        <p className="text-sm font-semibold text-foreground">Ko‘rsatkichlar yuklanmadi</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  const canApprove = role === "HOKIM"

  const items: PremiumStatItem[] = [
    {
      label: t.dashboard?.totalTasks ?? "Jami topshiriq",
      value: stats.total,
      icon: ListTodo,
      tone: "neutral",
      hint:
        stats.active_sectors > 0
          ? `${stats.active_sectors} ta sohada`
          : undefined,
      href: "/dashboard/tasks",
    },
    {
      label: "Ijroda",
      value: stats.in_progress,
      icon: Loader2,
      tone: "warning",
      href: "/dashboard/tasks?status=IJRODA",
    },
    {
      label: "Tasdiqlashda",
      value: stats.awaiting_approval,
      icon: ShieldCheck,
      tone: "info",
      hint: stats.awaiting_approval > 0 ? "Hokim tasdig‘ini kutmoqda" : "Navbat bo‘sh",
      href: canApprove ? "/dashboard/tasks/pending-approval" : "/dashboard/tasks",
    },
    {
      label: "Muddati kechikkan",
      value: stats.overdue,
      icon: AlertTriangle,
      tone: stats.overdue > 0 ? "danger" : "success",
      href: "/dashboard/tasks?status=MUDDATI_KECH",
    },
    {
      label: "Nazoratdan yechildi",
      value: stats.completed,
      icon: CheckCircle2,
      tone: "success",
      hint:
        stats.total > 0
          ? `${Math.round((stats.completed / stats.total) * 100)}% yakunlangan`
          : undefined,
      href: "/dashboard/tasks?status=NAZORATDAN_YECHILDI",
    },
  ]

  return <PremiumStatsGrid items={items} columns={3} />
}

export default StatsCards
