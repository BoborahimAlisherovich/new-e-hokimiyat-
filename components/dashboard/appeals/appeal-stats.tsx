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
      iconBg: "bg-primary-soft",
      textColor: "text-secondary-foreground",
      borderColor: "border-border"
    },
    {
      label: "Kutilmoqda",
      value: stats.pending,
      icon: Calendar,
      iconBg: "bg-primary-soft",
      textColor: "text-primary",
      borderColor: "border-border"
    },
    {
      label: "Jarayonda",
      value: stats.inProgress,
      icon: TrendingUp,
      iconBg: "bg-success-soft",
      textColor: "text-success",
      borderColor: "border-border"
    },
    {
      label: "Hal etilgan",
      value: stats.resolved,
      icon: Archive,
      iconBg: "bg-success-soft",
      textColor: "text-success",
      borderColor: "border-border"
    }
  ]

  return <PremiumStatsGrid items={statsData.map((stat, index) => ({
    ...stat,
    hint: index === 3 && stats.total > 0 ? `${Math.round((stats.resolved / stats.total) * 100)}% hal etilgan` : undefined,
  }))} />
}
