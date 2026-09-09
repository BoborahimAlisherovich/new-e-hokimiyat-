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
      iconBg: "bg-primary-soft",
      textColor: "text-primary",
      borderColor: "border-border"
    },
    {
      label: labels.active,
      value: active,
      icon: UserCheck,
      iconBg: "bg-success-soft",
      textColor: "text-success",
      borderColor: "border-border"
    },
    {
      label: labels.inactive,
      value: inactive,
      icon: AlertCircle,
      iconBg: "bg-destructive-soft",
      textColor: "text-destructive",
      borderColor: "border-border"
    },
    {
      label: labels.organizations,
      value: organizations,
      icon: Building,
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
