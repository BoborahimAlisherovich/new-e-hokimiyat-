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
    if (rate >= 80) return "bg-success"
    if (rate >= 50) return "bg-warning"
    return "bg-destructive"
  }

  const getCompletionTextColor = (rate: number) => {
    if (rate >= 80) return "text-success"
    if (rate >= 50) return "text-warning"
    return "text-destructive"
  }

  return (
    <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
      
      <CardHeader className="bg-success-soft relative z-10 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-success w-8 h-8 rounded-lg flex items-center justify-center shadow-lg">
              <Grid3X3 className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg font-semibold text-foreground">{t.dashboard.sectorStatsTitle}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/analytics">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-xs text-success-soft-foreground hover:text-success-soft-foreground hover:bg-success-soft transition-all duration-250"
              >
                {t.common.viewAll}
              </Button>
            </Link>
            <div className="bg-success w-2 h-2 rounded-full animate-pulse-modern" />
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
              className={cn( "group/sector relative rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:shadow-lg hover:border-success"
              )}
            >
              
              {/* Header */}
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn( "w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold transition-all duration-300 group-hover/sector:scale-110",
                    getCompletionColor(sector.completionRate)
                  )}>
                    {sector.label && sector.label.charAt ? sector.label.charAt(0) : "?"}
                  </div>
                  <h3 className="font-semibold text-foreground group-hover/sector:text-success transition-colors duration-250">
                    {sector.label}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={cn( "flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-250", "bg-success-soft text-success-soft-foreground"
                  )}>
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-xs font-bold text-success">{sector.completionRate}%</span>
                  </div>
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="relative z-10 mb-4">
                <div className={cn( "relative h-3 w-full overflow-hidden rounded-full transition-all duration-1000 ease-out",
                  sector.completionRate >= 80 ? "bg-success-soft" : 
                  sector.completionRate >= 50 ? "bg-warning-soft" : "bg-destructive-soft"
                )}>
                  <div 
                    className={cn( "h-full rounded-full transition-all duration-1000 ease-out",
                      sector.completionRate >= 80 ? "bg-success" : 
                      sector.completionRate >= 50 ? "bg-warning" : "bg-destructive"
                    )}
                    style={{ width: `${sector.completionRate}%` }}
                  />
                </div>
              </div>
              
              {/* Stats */}
              <div className="relative z-10 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-success-soft transition-all duration-300 hover:scale-105 hover:bg-success-soft hover:shadow-md">
                    <BarChart4 className="w-4 h-4 text-success mx-auto mb-1" />
                    <div className="text-lg font-bold text-success">{sector.total}</div>
                    <div className="text-xs text-muted-foreground">{t.dashboard.total}</div>
                  </div>
                  
                  <div className="p-2 rounded-lg bg-success-soft transition-all duration-300 hover:scale-105 hover:bg-success-soft hover:shadow-md">
                    <PieChart className="w-4 h-4 text-success mx-auto mb-1" />
                    <div className="text-lg font-bold text-success">{sector.completed}</div>
                    <div className="text-xs text-muted-foreground">{t.dashboard.completed}</div>
                  </div>
                  
                  <div className="p-2 rounded-lg bg-warning-soft transition-all duration-300 hover:scale-105 hover:bg-warning-soft hover:shadow-md">
                    <TrendingUp className="w-4 h-4 text-warning mx-auto mb-1" />
                    <div className="text-lg font-bold text-warning">{sector.inProgress}</div>
                    <div className="text-xs text-muted-foreground">{t.dashboard.inProgress}</div>
                  </div>
                </div>
                
                {sector.late > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-destructive-soft transition-all duration-300 hover:bg-destructive-soft hover:shadow-md">
                    <span className="text-sm font-medium text-destructive">{t.dashboard.overdue}: {sector.late}</span>
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
