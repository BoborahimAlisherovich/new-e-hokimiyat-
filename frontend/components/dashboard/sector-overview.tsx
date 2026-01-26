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

export function SectorOverview() {
  const [sectorStats, setSectorStats] = React.useState<any[]>([])

  React.useEffect(() => {
    let mounted = true
    getTasks()
      .then((tasks) => {
        if (!mounted) return
        const sectors = Array.from(new Set(tasks.map((t: any) => t.sector))).filter((s) => s !== undefined && s !== null)
        const stats = sectors
          .map((sector) => {
            const sTasks = tasks.filter((t: any) => t.sector === sector)
            const completed = sTasks.filter((t: any) => t.status === "BAJARILDI" || t.status === "NAZORATDAN_YECHILDI").length
            const late = sTasks.filter((t: any) => t.status === "MUDDATI_KECH").length
            return {
              sector,
              label: sector || "Номаълум",
              total: sTasks.length,
              completed,
              late,
              inProgress: sTasks.length - completed - late,
              completionRate: sTasks.length > 0 ? Math.round((completed / sTasks.length) * 100) : 0,
            }
          })
          .filter((s) => s.total > 0)
        setSectorStats(stats.slice(0, 6))
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

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
    <Card className="bg-white/70 backdrop-blur-xl border border-gray-200/50 shadow-sm hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
      
      <CardHeader className="relative z-10 border-b border-gray-200/50 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
              <Grid3X3 className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg font-semibold text-gray-900">Сохалар бўйича статистикаси</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/analytics">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-250"
              >
                Барчасини кўриш
              </Button>
            </Link>
            <div className="w-2 h-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full animate-pulse-modern" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sectorStats.map((sector, index) => (
            <div
              key={sector.sector}
              className={cn(
                "group/sector relative rounded-xl border border-gray-200/50 bg-white/60 backdrop-blur-sm p-4 transition-all duration-300 hover:scale-102 hover:shadow-lg hover:border-emerald-300/50 hover:bg-white/80 animate-slide-up",
                "hover:bg-emerald-50/50"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
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
                  <h3 className="font-semibold text-gray-900 group-hover/sector:text-emerald-600 transition-colors duration-250">
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
                <Progress 
                  value={sector.completionRate} 
                  className={cn(
                    "h-3 transition-all duration-1000 ease-out",
                    sector.completionRate >= 80 ? "bg-emerald-600" : 
                    sector.completionRate >= 50 ? "bg-amber-600" : "bg-red-600"
                  )}
                />
              </div>
              
              {/* Stats */}
              <div className="relative z-10 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-emerald-50/70 backdrop-blur-sm border border-emerald-200/50 transition-all duration-300 hover:scale-105 hover:bg-emerald-100/70">
                    <BarChart4 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-emerald-600">{sector.total}</div>
                    <div className="text-xs text-gray-500">Жами</div>
                  </div>
                  
                  <div className="p-2 rounded-lg bg-emerald-50/70 backdrop-blur-sm border border-emerald-200/50 transition-all duration-300 hover:scale-105 hover:bg-emerald-100/70">
                    <PieChart className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-emerald-600">{sector.completed}</div>
                    <div className="text-xs text-gray-500">Бажарилган</div>
                  </div>
                  
                  <div className="p-2 rounded-lg bg-amber-50/70 backdrop-blur-sm border border-amber-200/50 transition-all duration-300 hover:scale-105 hover:bg-amber-100/70">
                    <TrendingUp className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                    <div className="text-lg font-bold text-amber-600">{sector.inProgress}</div>
                    <div className="text-xs text-gray-500">Ижрода</div>
                  </div>
                </div>
                
                {sector.late > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-red-50/70 backdrop-blur-sm border border-red-200/50 transition-all duration-300 hover:bg-red-100/70">
                    <span className="text-sm font-medium text-red-600">Кечиккан: {sector.late}</span>
                    <span className="text-xs text-gray-500">Топшириқ</span>
                  </div>
                )}
              </div>
              
            </div>
          ))}
        </div>
        
        {sectorStats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Grid3X3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Сохалар топилмади</h3>
            <p className="text-sm text-gray-500 max-w-md">
              Ҳозирча ҳеч қандай сохалар мавжуд эмас. Топшириқлар яратиш учун сохаларни қўшиш керак.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
