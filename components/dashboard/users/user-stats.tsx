import { AlertCircle, Building, Shield, UserCheck, TrendingUp, Users, Sparkles } from "lucide-react"

interface UserStatsProps {
  total: number
  active: number
  inactive: number
  organizations: number
}

export function UserStats({ total, active, inactive, organizations }: UserStatsProps) {
  const stats = [
    {
      label: "Jami foydalanuvchilar",
      value: total,
      icon: Users,
      gradient: "from-blue-500 to-indigo-600",
      bgGradient: "from-blue-50 to-indigo-50",
      iconBg: "bg-blue-100",
      textColor: "text-blue-600",
      borderColor: "border-blue-200/50"
    },
    {
      label: "Faol foydalanuvchilar",
      value: active,
      icon: UserCheck,
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      iconBg: "bg-emerald-100",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-200/50"
    },
    {
      label: "Nofaol foydalanuvchilar",
      value: inactive,
      icon: AlertCircle,
      gradient: "from-red-500 to-rose-600",
      bgGradient: "from-red-50 to-rose-50",
      iconBg: "bg-red-100",
      textColor: "text-red-600",
      borderColor: "border-red-200/50"
    },
    {
      label: "Tashkilotlar",
      value: organizations,
      icon: Building,
      gradient: "from-violet-500 to-purple-600",
      bgGradient: "from-violet-50 to-purple-50",
      iconBg: "bg-violet-100",
      textColor: "text-violet-600",
      borderColor: "border-violet-200/50"
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div 
            key={index}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.bgGradient} border ${stat.borderColor} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}
          >
            {/* Decorative gradient accent */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
            
            {/* Decorative floating circles */}
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-500`} />
            
            <div className="relative p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
                    {index === 1 && total > 0 && (
                      <span className="text-xs font-medium text-emerald-500 flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        {Math.round((active / total) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className={`${stat.iconBg} p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`h-6 w-6 ${stat.textColor}`} />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
