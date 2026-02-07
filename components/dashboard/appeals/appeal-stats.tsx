import { Archive, Calendar, MessageSquare, TrendingUp } from "lucide-react"
import { Stats } from "@/types"

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
      iconBg: "bg-slate-100",
      textColor: "text-slate-700",
      borderColor: "border-slate-200/50"
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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div 
            key={index}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.bgGradient} border ${stat.borderColor} shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5`}
          >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
            
            {/* Decorative blur circle */}
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-500`} />
            
            <div className="relative p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
                    {index === 3 && stats.total > 0 && (
                      <span className="text-xs font-medium text-teal-500 flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        {Math.round((stats.resolved / stats.total) * 100)}%
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
