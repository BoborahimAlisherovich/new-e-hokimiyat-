// @ts-nocheck
"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAnalyticsOrganizations } from "@/lib/api"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, TrendingUp, Building } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useTranslation } from "@/lib/i18n/context"

export function OrganizationRatings() {
  const t = useTranslation()
  const [orgs, setOrgs] = React.useState<any[]>([])

  React.useEffect(() => {
    let mounted = true
    getAnalyticsOrganizations()
      .then((list) => {
        if (!mounted) return
        // Map API response to component's expected format
        const mappedList = (list || []).map((item: any) => ({
          id: item.organization?.id || item.id,
          name: item.organization?.name || item.name,
          shortName: item.organization?.short_name || item.short_name,
          totalTasks: item.total_tasks ?? 0,
          completedTasks: item.completed_tasks ?? 0,
          inProgressTasks: item.in_progress_tasks ?? 0,
          overdueTasks: item.overdue_tasks ?? 0,
          completionRate: item.completion_rate ?? 0,
          rating: item.rating ?? 0,
          performance: item.rating ?? item.completion_rate ?? 0,
        }))
        setOrgs(mappedList)
      })
      .catch((err) => {
        console.error("Tashkilotlar reytingini yuklashda xatolik:", err)
      })
    return () => {
      mounted = false
    }
  }, [])

  // Sort by rating/performance descending
  const sortedOrgs = [...orgs].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return "from-emerald-400 to-emerald-600"
      case 1: return "from-gray-400 to-gray-600"
      case 2: return "from-amber-400 to-amber-600"
      default: return "from-gray-400 to-gray-600"
    }
  }

  const getRankBg = (index: number) => {
    switch (index) {
      case 0: return "from-emerald-400/20 to-emerald-600/20"
      case 1: return "from-gray-400/20 to-gray-600/20"
      case 2: return "from-amber-400/20 to-amber-600/20"
      default: return "from-gray-100/50 to-gray-600/50"
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 90) return "text-emerald-600"
    if (rating >= 70) return "text-amber-600"
    return "text-red-600"
  }

  const getRatingGradient = (rating: number) => {
    if (rating >= 90) return "from-emerald-500 to-emerald-600"
    if (rating >= 70) return "from-amber-500 to-amber-600"
    return "from-red-500 to-red-600"
  }

  return (
    <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] hover:shadow-2xl transition-all duration-300 group relative overflow-hidden rounded-2xl">

      <CardHeader className="relative z-10 border-b border-indigo-100/40 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <CardTitle className="text-lg font-semibold text-foreground">{t.dashboard.organizationRatings}</CardTitle>
          </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">{t.dashboard.performanceLabel}</span>
              </div>
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 space-y-4 p-6">
        {sortedOrgs && sortedOrgs.length > 0 ? sortedOrgs.map((org, index) => (
          <motion.div
            key={`org-${org.id || index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className={cn(
              "group/org relative space-y-3 rounded-xl border border-white/50 bg-white/80 backdrop-blur-sm p-4 transition-all duration-300 hover:shadow-lg hover:border-blue-300"
            )}
          >
            
            {/* Rank and Name */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 group-hover/org:scale-110",
                  "bg-gradient-to-br " + getRankBg(index)
                )}>
                  <span className={cn(
                    "bg-gradient-to-br " + getRankColor(index),
                    "bg-clip-text text-transparent"
                  )}>
                    {index + 1}
                  </span>
                  {/* Decorative ring */}
                  <div className={cn(
                    "absolute -inset-1 rounded-full bg-gradient-to-br opacity-20 animate-pulse",
                    getRatingGradient(org.rating)
                  )} />
                </div>
                
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-500 group-hover/org:text-blue-600 transition-colors duration-250" />
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover/org:text-blue-600 transition-colors duration-250">
                      {org.name}
                    </h3>
                    <p className="text-xs text-slate-600 group-hover/org:text-slate-700 transition-colors duration-250">
                      {t.dashboard.total}: {org.totalTasks} {t.common.itemsShort}, {t.dashboard.completed}: {org.completedTasks} {t.common.itemsShort}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Rating (completion rate) */}
              <div className="relative">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-lg transition-all duration-250",
                  "bg-emerald-50 text-emerald-700"
                )}>
                  <Star className={cn(
                    "w-4 h-4 transition-all duration-250",
                    getRatingColor(org.completionRate)
                  )} />
                  <span className={cn(
                    "text-sm font-bold transition-all duration-250",
                    getRatingColor(org.completionRate)
                  )}>
                    {org.completionRate}%
                  </span>
                </div>
                {/* Decorative glow */}
                <div className={cn(
                  "absolute -inset-1 rounded-lg bg-gradient-to-r opacity-0 transition-opacity duration-300",
                  getRatingGradient(org.completionRate) + "/10"
                )} />
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative z-10 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>{t.dashboard.completionLabel}</span>
                <span className="font-medium">{org.completedTasks}/{org.totalTasks} {t.dashboard.taskUnit}</span>
              </div>
              <div className="relative">
                <Progress value={org.completionRate} className="h-2" />
              </div>
            </div>
            
          </motion.div>
        )) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-indigo-50/50 rounded-2xl flex items-center justify-center mb-4">
              <Building className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t.dashboard.organizationsEmptyTitle}</h3>
            <p className="text-sm text-slate-600 max-w-md">
              {t.dashboard.organizationsEmptyDescription}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
