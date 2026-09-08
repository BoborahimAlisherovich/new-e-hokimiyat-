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
      iconBg: "bg-blue-100",
      textColor: "text-blue-600",
      borderColor: "border-blue-200/50"
    },
    {
      label: labels.active,
      value: active,
      icon: UserCheck,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      iconBg: "bg-emerald-100",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-200/50"
    },
    {
      label: labels.inactive,
      value: inactive,
      icon: AlertCircle,
      gradient: "from-red-500 to-rose-600",
      bgGradient: "from-red-50 to-rose-50",
      iconBg: "bg-red-100",
      textColor: "text-red-600",
      borderColor: "border-red-200/50"
    },
    {
      label: labels.organizations,
      value: organizations,
      icon: Building,
      gradient: "from-violet-500 to-purple-600",
      bgGradient: "from-violet-50 to-purple-50",
      iconBg: "bg-violet-100",
      textColor: "text-violet-600",
      borderColor: "border-violet-200/50"
    }
  ]

  return <PremiumStatsGrid items={stats.map((stat, index) => ({
    ...stat,
    hint: index === 1 && total > 0 ? `${Math.round((active / total) * 100)}% faol` : undefined,
  }))} />
}
