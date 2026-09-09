import { AlertCircle, Building, Shield, UserCheck, TrendingUp, Users, Sparkles } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { PremiumStatsGrid } from "@/components/dashboard/premium-dashboard-ui"

interface UserStatsProps {
  total: number
  active: number
  inactive: number
  organizations: number
}

export function UserStats({ total, active, inactive, organizations }: UserStatsProps) {
  const { language } = useI18n()
  const labels = {
    uz: {
      total: "Jami foydalanuvchilar",
      active: "Faol foydalanuvchilar",
      inactive: "Nofaol foydalanuvchilar",
      organizations: "Tashkilotlar",
    },
    "uz-cyrl": {
      total: "Жами фойдаланувчилар",
      active: "Фаол фойдаланувчилар",
      inactive: "Нофаол фойдаланувчилар",
      organizations: "Ташкилотлар",
    },
    ru: {
      total: "Всего пользователей",
      active: "Активные пользователи",
      inactive: "Неактивные пользователи",
      organizations: "Организации",
    },
    en: {
      total: "Total users",
      active: "Active users",
      inactive: "Inactive users",
      organizations: "Organizations",
    },
  }[language]

  const stats = [
    {
      label: labels.total,
      value: total,
      icon: Users,
      gradient: "from-blue-500 to-indigo-600",
      bgGradient: "from-blue-50 to-indigo-50",
      iconBg: "bg-primary-soft",
      textColor: "text-primary",
      borderColor: "border-border"
    },
    {
      label: labels.active,
      value: active,
      icon: UserCheck,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      iconBg: "bg-success-soft",
      textColor: "text-success",
      borderColor: "border-border"
    },
    {
      label: labels.inactive,
      value: inactive,
      icon: AlertCircle,
      gradient: "from-red-500 to-rose-600",
      bgGradient: "from-red-50 to-rose-50",
      iconBg: "bg-destructive-soft",
      textColor: "text-destructive",
      borderColor: "border-border"
    },
    {
      label: labels.organizations,
      value: organizations,
      icon: Building,
      gradient: "from-violet-500 to-purple-600",
      bgGradient: "from-violet-50 to-purple-50",
      iconBg: "bg-[var(--st-tekshiruvda-bg)]",
      textColor: "text-[var(--st-tekshiruvda-fg)]",
      borderColor: "border-border"
    }
  ]

  return <PremiumStatsGrid items={stats.map((stat, index) => ({
    ...stat,
    hint: index === 1 && total > 0 ? `${Math.round((active / total) * 100)}% faol` : undefined,
  }))} />
}
