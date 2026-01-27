// @ts-nocheck
"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAnalyticsOrganizations } from "@/lib/api"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, TrendingUp, Building } from "lucide-react"
import { cn } from "@/lib/utils"

export function OrganizationRatings() {
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
    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md hover:shadow-xl transition-all duration-300 group relative overflow-hidden rounded-2xl">

      <CardHeader className="relative z-10 border-b border-border bg-card/60 backdrop-blur-sm rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <CardTitle className="text-lg font-semibold text-foreground">Ташкилотлар рейтиги</CardTitle>
          </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Самарадорлик</span>
              </div>
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 space-y-4 p-6">
        {sortedOrgs && sortedOrgs.length > 0 ? sortedOrgs.map((org, index) => (
          <div
            key={`org-${org.id || index}`}
            className={cn(
              "group/org relative space-y-3 rounded-xl border border-gray-200/50 bg-white/60 backdrop-blur-sm p-4 transition-all duration-300 hover:scale-102 hover:shadow-lg hover:border-emerald-300/50 hover:bg-white/80 animate-slide-up",
              "hover:bg-emerald-50/50"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
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
                  <Building className="w-4 h-4 text-gray-500 group-hover/org:text-emerald-600 transition-colors duration-250" />
                  <div>
                    <h3 className="font-semibold text-foreground group-hover/org:text-emerald-600 transition-colors duration-250">
                      {org.name}
                    </h3>
                    <p className="text-xs text-muted-foreground group-hover/org:text-gray-600 transition-colors duration-250">
                      Жами: {org.totalTasks} та, бажарилган: {org.completedTasks} та
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
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Тўлиқлик</span>
                <span className="font-medium">{org.completedTasks}/{org.totalTasks} топшириқ</span>
              </div>
              <div className="relative">
                <Progress value={org.completionRate} className="h-2" />
              </div>
            </div>
            
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Building className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ташкилотлар топилмади</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Ҳозирча ҳеч қандай ташкилотлар мавжуд эмас. Ташкилотларни қўшиш учун ташкилотлар бўлимига ўтинг.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
