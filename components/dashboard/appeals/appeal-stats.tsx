import { Archive, Calendar, MessageSquare, TrendingUp } from "lucide-react"
import { Stats } from "@/types"
import { PremiumStatsGrid } from "@/components/dashboard/premium-dashboard-ui"

interface AppealStatsProps {
  stats: Stats
}

export function AppealStats({ stats }: AppealStatsProps) {
  const statsData = [
    {
      label: "Jami murojaatlar",
      value: stats.total,
      icon: MessageSquare,
      gradient: "from-slate-500 to-slate-700",
      bgGradient: "from-slate-50 to-slate-100",
      iconBg: "bg-primary-soft",
      textColor: "text-secondary-foreground",
      borderColor: "border-border"
    },
    {
      label: "Kutilmoqda",
      value: stats.pending,
      icon: Calendar,
      gradient: "from-blue-500 to-indigo-600",
      bgGradient: "from-blue-50 to-indigo-50",
      iconBg: "bg-blue-100",
      textColor: "text-blue-600",
      borderColor: "border-blue-200/50"
    },
    {
      label: "Jarayonda",
      value: stats.inProgress,
      icon: TrendingUp,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      iconBg: "bg-emerald-100",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-200/50"
    },
    {
      label: "Hal etilgan",
      value: stats.resolved,
      icon: Archive,
      gradient: "from-teal-500 to-cyan-600",
      bgGradient: "from-teal-50 to-cyan-50",
      iconBg: "bg-teal-100",
      textColor: "text-teal-600",
      borderColor: "border-teal-200/50"
    }
  ]

  return <PremiumStatsGrid items={statsData.map((stat, index) => ({
    ...stat,
    hint: index === 3 && stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}% hal etilgan` : undefined,
  }))} />
}
