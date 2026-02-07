"use client"

import { useTranslation } from "@/lib/i18n/context"
import { ClipboardList, Clock, Loader2, CheckCircle2, TrendingUp } from "lucide-react"

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
      iconBg: "bg-slate-100",
      textColor: "text-slate-700",
      borderColor: "border-slate-200/50"
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
  
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
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
                    {index === 3 && total > 0 && (
                      <span className="text-xs font-medium text-emerald-500 flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        {Math.round((completed / total) * 100)}%
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
