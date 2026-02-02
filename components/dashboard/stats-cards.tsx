// @ts-nocheck
"use client"

import { Card, CardContent } from "@/components/ui/card"
import React from "react"
import { ListTodo, CheckCircle, AlertCircle, Clock, TrendingUp, ArrowUp } from "lucide-react"
import { getTaskStats } from "@/lib/api"
import { cn } from "@/lib/utils"
import { StatsCardSkeleton } from "@/components/ui/loading-skeleton"

const computeStats = (stats: {
  total: number
  completed: number
  overdue: number
  in_progress: number
  active_sectors: number
}) => {
  return {
    totalTasks: stats.total,
    completedTasks: stats.completed,
    overdueTasks: stats.overdue,
    inProgressTasks: stats.in_progress,
    activeSectors: stats.active_sectors,
  }
}

export function StatsCards() {
  const [statsData, setStatsData] = React.useState({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    inProgressTasks: 0,
    activeSectors: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true
    setIsLoading(true)
    getTaskStats()
      .then((stats) => {
        if (!mounted) return
        setStatsData(computeStats(stats))
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const { totalTasks, completedTasks, overdueTasks, inProgressTasks, activeSectors } = statsData

  const stats = [
    {
      label: "Жами топшириқлар",
      value: totalTasks.toString(),
      change: `${activeSectors}`,
      changeLabel: "та соҳада",
      icon: ListTodo,
      bgColor: "bg-emerald-100",
      iconColor: "text-emerald-600",
      trend: "up",
      trendValue: "+12%",
      description: "Барча топшириқлар",
    },
    {
      label: "Бажарилган",
      value: completedTasks.toString(),
      change: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%",
      changeLabel: "ўриндаги",
      icon: CheckCircle,
      bgColor: "bg-emerald-100",
      iconColor: "text-emerald-600",
      trend: "up",
      trendValue: "+8%",
      description: "Муваффақиятли бажарилган",
    },
    {
      label: "Муддат кечиккан",
      value: overdueTasks.toString(),
      change: "Ҳавфли",
      changeLabel: "ҳолат",
      icon: AlertCircle,
      bgColor: "bg-red-100",
      iconColor: "text-red-600",
      trend: "down",
      trendValue: "-3%",
      description: "Эътибор берилган топшириқлар",
    },
    {
      label: "Ижрода",
      value: inProgressTasks.toString(),
      change: "фаол",
      changeLabel: "ҳолат",
      icon: Clock,
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600",
      trend: "up",
      trendValue: "+5%",
      description: "Ҳозирда ижро бўлган",
    },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {isLoading ? (
        Array.from({ length: 4 }).map((_, index) => (
          <StatsCardSkeleton key={index} style={{ animationDelay: `${index * 100}ms` }} />
        ))
      ) : (
        stats.map((stat, index) => (
          <Card
            key={stat.label}
            className="group relative overflow-hidden bg-card/80 backdrop-blur-xl border border-border rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:border-primary/30 hover:bg-card hover:scale-102 interactive-card"
            style={{ animationDelay: `${index * 100}ms` }}
          >
          
          <CardContent className="relative z-10 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={cn(
                      "h-4 w-4 transition-colors duration-250",
                      stat.trend === "up" ? "text-emerald-600" : "text-red-600"
                    )} />
                    <span className={cn(
                      "text-sm font-semibold transition-colors duration-250",
                      stat.trend === "up" ? "text-emerald-600" : "text-red-600"
                    )}>
                      {stat.trendValue}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{stat.change}</span>
                  <span className="text-xs text-gray-400">{stat.changeLabel}</span>
                </div>
              </div>
            </div>
            
            {/* Icon container */}
            <div className="relative">
              <div className={cn(
                "relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm animate-float",
                stat.bgColor
              )}>
                <stat.icon className={cn(
                  "h-7 w-7 transition-colors duration-250",
                  stat.iconColor
                )} />
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Тўлиқлик</span>
                <span>{stat.change}</span>
              </div>
              <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out animate-shimmer",
                    stat.iconColor === "text-emerald-600" ? "bg-emerald-600" : 
                    stat.iconColor === "text-red-600" ? "bg-red-600" : "bg-amber-600"
                  )}
                  style={{ 
                    width: `${Math.min(100, (parseInt(stat.value) / Math.max(1, totalTasks)) * 100)}%`,
                    animationDelay: `${index * 200 + 500}ms`
                  }}
                />
              </div>
            </div>
            
            {/* Description */}
            <p className="text-xs text-gray-500 mt-3">
              {stat.description}
            </p>
          </CardContent>
        </Card>
        ))
      )}
    </div>
  )
}
