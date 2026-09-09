// @ts-nocheck
"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getTasks } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Grid3X3, TrendingUp, BarChart4, PieChart } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useTranslation } from "@/lib/i18n/context"

function getCategoryLabel(category: string, unknownLabel: string): string {
  const labels: Record<string, string> = {
    'IJTIMOIY': 'Ijtimoiy',
    'IQTISODIY': 'Iqtisodiy',
    'INFRASTRUKTURA': 'Infrastruktura',
    'MADANIYAT': 'Madaniyat',
    'SPORT': 'Sport',
    'TALIM': "Ta'lim",
    'HUQUQIY': 'Huquqiy',
    'SOG_LIQNI_SAQLASH': "Sog'liqni saqlash",
    'QISHLOQ_XOJALIGI': "Qishloq xo'jaligi",
    'BOSHQA': 'Boshqa',
  }
  return labels[category] || category || unknownLabel
}

export function SectorOverview() {
  const t = useTranslation()
  const unknownLabel = t.common.unknown
  const [sectorStats, setSectorStats] = React.useState<any[]>([])

  React.useEffect(() => {
    let mounted = true
    getTasks()
      .then((tasks) => {
        if (!mounted) return
        // category field dan foydalanish (sector o'rniga)
        const categories = Array.from(new Set(tasks.map((t: any) => t.category))).filter((c) => c !== undefined && c !== null && c !== '')
        const stats = categories
          .map((category) => {
            const cTasks = tasks.filter((t: any) => t.category === category)
            const completed = cTasks.filter((t: any) => t.status === "BAJARILDI" || t.status === "NAZORATDAN_YECHILDI").length
            const late = cTasks.filter((t: any) => t.status === "MUDDATI_KECH").length
            return {
              sector: category,
              label: getCategoryLabel(category as string, unknownLabel),
              total: cTasks.length,
              completed,
              late,
              inProgress: cTasks.length - completed - late,
              completionRate: cTasks.length > 0 ? Math.round((completed / cTasks.length) * 100) : 0,
            }
          })
          .filter((s) => s.total > 0)
          .sort((a, b) => b.total - a.total)
        setSectorStats(stats.slice(0, 6))
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [unknownLabel])

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return "from-emerald-500 to-emerald-600"
    if (rate >= 50) return "from-amber-500 to-amber-600"
    return "from-red-500 to-red-600"
  }

  const getCompletionTextColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-600"
    if (rate >= 50) return "text-amber-600"
    return "text-red-600"
  }

  return (
    <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
      
      <CardHeader className="relative z-10 border-b border-border bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
              <Grid3X3 className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{t.dashboard.sectorStatsTitle}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/analytics">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-250"
              >
                {t.common.viewAll}
              </Button>
            </Link>
            <div className="w-2 h-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full animate-pulse-modern" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sectorStats.map((sector, index) => (
            <motion.div
              key={sector.sector}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className={cn(
                "group/sector relative rounded-xl border border-white/50 bg-white/80 backdrop-blur-sm p-4 transition-all duration-300 hover:shadow-lg hover:border-emerald-300"
              )}
            >
              
              {/* Header */}
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold transition-all duration-300 group-hover/sector:scale-110",
                    "bg-gradient-to-br " + getCompletionColor(sector.completionRate)
                  )}>
                    {sector.label && sector.label.charAt ? sector.label.charAt(0) : "?"}
                  </div>
                  <h3 className="font-semibold text-foreground group-hover/sector:text-emerald-600 transition-colors duration-250">
                    {sector.label}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-250",
                    "bg-emerald-100 text-emerald-700"
                  )}>
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">{sector.completionRate}%</span>
                  </div>
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="relative z-10 mb-4">
                <div className={cn(
                  "relative h-3 w-full overflow-hidden rounded-full transition-all duration-1000 ease-out",
                  sector.completionRate >= 80 ? "bg-emerald-100" : 
                  sector.completionRate >= 50 ? "bg-amber-100" : "bg-red-100"
                )}>
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000 ease-out",
                      sector.completionRate >= 80 ? "bg-emerald-500" : 
                      sector.completionRate >= 50 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${sector.completionRate}%` }}
                  />
                </div>
              </div>
              
              {/* Stats */}
              <div className="relative z-10 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 transition-all duration-300 hover:scale-105 hover:bg-emerald-100 hover:shadow-md">
                    <BarChart4 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-emerald-600">{sector.total}</div>
                    <div className="text-xs text-muted-foreground">{t.dashboard.total}</div>
                  </div>
                  
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 transition-all duration-300 hover:scale-105 hover:bg-emerald-100 hover:shadow-md">
                    <PieChart className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-emerald-600">{sector.completed}</div>
                    <div className="text-xs text-muted-foreground">{t.dashboard.completed}</div>
                  </div>
                  
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 transition-all duration-300 hover:scale-105 hover:bg-amber-100 hover:shadow-md">
                    <TrendingUp className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-amber-600">{sector.inProgress}</div>
                    <div className="text-xs text-muted-foreground">{t.dashboard.inProgress}</div>
                  </div>
                </div>
                
                {sector.late > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-200 transition-all duration-300 hover:bg-red-100 hover:shadow-md">
                    <span className="text-sm font-medium text-red-600">{t.dashboard.overdue}: {sector.late}</span>
                    <span className="text-xs text-muted-foreground">{t.dashboard.taskUnit}</span>
                  </div>
                )}
              </div>
              
            </motion.div>
          ))}
        </div>
        
        {sectorStats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-primary-soft rounded-2xl flex items-center justify-center mb-4">
              <Grid3X3 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t.dashboard.sectorsEmptyTitle}</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {t.dashboard.sectorsEmptyDescription}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
