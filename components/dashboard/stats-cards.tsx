// @ts-nocheck
"use client"

import { Card, CardContent } from "@/components/ui/card"
import React from "react"
import { ListTodo, CheckCircle, AlertCircle, Clock, TrendingUp, ArrowUp } from "lucide-react"
import { getTaskStats } from "@/lib/api"
import { cn } from "@/lib/utils"
import { StatsCardSkeleton } from "@/components/ui/loading-skeleton"
import { motion } from "framer-motion"
import { useTranslation } from "@/lib/i18n/context"

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
  const t = useTranslation()
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
      label: t.dashboard.totalTasks,
      value: totalTasks.toString(),
      change: `${activeSectors}`,
      changeLabel: t.dashboard.inSectors,
      icon: ListTodo,
      gradient: "from-blue-500 to-cyan-500",
      bgColor: "bg-gradient-to-br from-blue-500/10 to-cyan-500/10",
      iconColor: "text-blue-600",
      trend: "up",
      trendValue: "+12%",
      description: t.dashboard.allTasksDescription,
    },
    {
      label: t.dashboard.completed,
      value: completedTasks.toString(),
      change: totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%",
      changeLabel: t.dashboard.completionLabel,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-teal-500",
      bgColor: "bg-gradient-to-br from-emerald-500/10 to-teal-500/10",
      iconColor: "text-emerald-600",
      trend: "up",
      trendValue: "+8%",
      description: t.dashboard.completedDescription,
    },
    {
      label: t.dashboard.overdue,
      value: overdueTasks.toString(),
      change: t.dashboard.overdueStatus,
      changeLabel: t.dashboard.statusLabel,
      icon: AlertCircle,
      gradient: "from-red-500 to-pink-500",
      bgColor: "bg-gradient-to-br from-red-500/10 to-pink-500/10",
      iconColor: "text-red-600",
      trend: "down",
      trendValue: "-3%",
      description: t.dashboard.overdueDescription,
    },
    {
      label: t.dashboard.inProgress,
      value: inProgressTasks.toString(),
      change: t.dashboard.active,
      changeLabel: t.dashboard.statusLabel,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bgColor: "bg-gradient-to-br from-amber-500/10 to-orange-500/10",
      iconColor: "text-amber-600",
      trend: "up",
      trendValue: "+5%",
      description: t.dashboard.inProgressDescription,
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
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              delay: index * 0.1,
              type: "spring",
              stiffness: 300,
              damping: 24
            }}
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <Card
              className="group relative overflow-hidden bg-white/95 backdrop-blur-xl border-slate-200 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
          
              <CardContent className="relative z-10 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                    <div className="flex items-baseline gap-3">
                      <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
                      <motion.div 
                        className="flex items-center gap-2"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                      >
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
                      </motion.div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600">{stat.change}</span>
                      <span className="text-xs text-slate-500">{stat.changeLabel}</span>
                    </div>
                  </div>
                </div>
            
                {/* Icon container */}
                <div className="relative">
                  <motion.div 
                    className={cn(
                      "relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-md",
                      stat.bgColor
                    )}
                    whileHover={{ rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <stat.icon className={cn(
                      "h-7 w-7 transition-colors duration-250",
                      stat.iconColor
                    )} />
                  </motion.div>
                </div>
            
                {/* Progress indicator */}
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>{t.dashboard.completionLabel}</span>
                    <span>{stat.change}</span>
                  </div>
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full rounded-full bg-gradient-to-r ${stat.gradient}`}
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.min(100, (parseInt(stat.value) / Math.max(1, totalTasks)) * 100)}%`
                      }}
                      transition={{ 
                        delay: index * 0.1 + 0.5,
                        duration: 1,
                        ease: "easeOut"
                      }}
                    />
                  </div>
                </div>
            
                {/* Description */}
                <p className="text-xs text-slate-500 mt-3">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  )
}
