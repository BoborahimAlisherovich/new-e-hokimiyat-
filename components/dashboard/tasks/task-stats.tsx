"use client"

import { useTranslation } from "@/lib/i18n/context"
import { ClipboardList, Clock, Loader2, CheckCircle2, TrendingUp } from "lucide-react"
import { PremiumStatsGrid } from "@/components/dashboard/premium-dashboard-ui"

type TaskStatsProps = {
  total: number
  pending: number
  inProgress: number
  completed: number
}

export function TaskStats({ total, pending, inProgress, completed }: TaskStatsProps) {
  const t = useTranslation()
  
  const stats = [
    {
      label: t.dashboard.totalTasks,
      value: total,
      icon: ClipboardList,
      gradient: "from-slate-500 to-slate-700",
      bgGradient: "from-slate-50 to-slate-100",
      iconBg: "bg-indigo-50/50",
      textColor: "text-slate-700",
      borderColor: "border-indigo-100/40"
    },
    {
      label: t.task.statuses.NEW,
      value: pending,
      icon: Clock,
      gradient: "from-amber-500 to-orange-600",
      bgGradient: "from-amber-50 to-orange-50",
      iconBg: "bg-amber-100",
      textColor: "text-amber-600",
      borderColor: "border-amber-200/50"
    },
    {
      label: t.task.statuses.IN_PROGRESS,
      value: inProgress,
      icon: Loader2,
      gradient: "from-blue-500 to-indigo-600",
      bgGradient: "from-blue-50 to-indigo-50",
      iconBg: "bg-blue-100",
      textColor: "text-blue-600",
      borderColor: "border-blue-200/50"
    },
    {
      label: t.task.statuses.COMPLETED,
      value: completed,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      iconBg: "bg-emerald-100",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-200/50"
    }
  ]
  
  return <PremiumStatsGrid items={stats.map((stat, index) => ({
    ...stat,
    hint: index === 3 && total > 0 ? `${Math.round((completed / total) * 100)}% yakunlangan` : undefined,
  }))} />
}
