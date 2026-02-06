// @ts-nocheck
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { BarChart4 } from "lucide-react"
import React from "react"
import { getAnalyticsTrends } from "@/lib/api"
import { motion } from "framer-motion"
import { useTranslation } from "@/lib/i18n/context"

type ChartPoint = {
  period: string
  bajarildi: number
  yaratildi: number
  jami: number
}

export function ActivityChart() {
  const t = useTranslation()
  const [data, setData] = React.useState<ChartPoint[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true
    setIsLoading(true)
    getAnalyticsTrends()
      .then((response: any) => {
        if (!mounted) return
        // API { created_trend: [{date, count}], completed_trend: [{date, count}], status_distribution: [...] } formatida qaytaradi
        const createdTrend = response?.created_trend || []
        const completedTrend = response?.completed_trend || []
        const statusDist = response?.status_distribution || []
        
        // Barcha sanalarni yig'ish
        const dateMap = new Map<string, { yaratildi: number; bajarildi: number; jami: number }>()
        
        // Created trend ni qo'shish
        createdTrend.forEach((item: any) => {
          const dateKey = item.date || ''
          if (!dateKey) return
          const existing = dateMap.get(dateKey) || { yaratildi: 0, bajarildi: 0, jami: 0 }
          existing.yaratildi = item.count ?? 0
          existing.jami += item.count ?? 0
          dateMap.set(dateKey, existing)
        })
        
        // Completed trend ni qo'shish
        completedTrend.forEach((item: any) => {
          const dateKey = item.date || ''
          if (!dateKey) return
          const existing = dateMap.get(dateKey) || { yaratildi: 0, bajarildi: 0, jami: 0 }
          existing.bajarildi = item.count ?? 0
          dateMap.set(dateKey, existing)
        })
        
        // Map dan array yaratish va saralash
        const mapped = Array.from(dateMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, counts]) => ({
            period: new Date(date).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' }),
            yaratildi: counts.yaratildi,
            bajarildi: counts.bajarildi,
            jami: counts.yaratildi, // Jami = yaratilgan
          }))
        
        // Agar kunlik ma'lumot kam bo'lsa, status distribution dan umumiy ko'rsatamiz
        if (mapped.length === 0 && statusDist.length > 0) {
          const statusMapped = statusDist.map((s: any) => ({
            period: s.status,
            yaratildi: s.count ?? 0,
            bajarildi: (s.status === 'BAJARILDI' || s.status === 'NAZORATDAN_YECHILDI') ? s.count : 0,
            jami: s.count ?? 0,
          }))
          setData(statusMapped)
        } else {
          setData(mapped)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const last = data.length > 0 ? data[data.length - 1] : undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between rounded-t-2xl bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <BarChart4 className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t.dashboard.taskDynamics}</CardTitle>
          </div>
        </CardHeader>
      
      <CardContent className="p-6">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bajarildi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="yaratildi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(240, 60%, 50%)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(240, 60%, 50%)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="jami" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(27, 87%, 67%)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="hsl(27, 87%, 67%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(220, 13%, 85%)" 
                className="opacity-50"
              />
              
              <XAxis 
                dataKey="period" 
                stroke="hsl(220, 9%, 46%)" 
                fontSize={12} 
                tickLine={false}
                tick={{ fill: 'hsl(220, 9%, 46%)' }}
              />
              
              <YAxis 
                stroke="hsl(220, 9%, 46%)" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'hsl(220, 9%, 46%)' }}
              />
              
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(240, 10%, 15%)",
                  border: "1px solid hsl(240, 10%, 25%)",
                  borderRadius: "8px",
                  color: "hsl(0, 0%, 95%)",
                  fontSize: "12px",
                  padding: "8px 12px",
                }}
                labelStyle={{ color: 'hsl(240, 5%, 50%)', fontWeight: 500 }}
              />
              
              <Area
                type="monotone"
                dataKey="jami"
                stroke="hsl(27, 87%, 67%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#jami)"
                name={t.dashboard.total}
                strokeOpacity={0.6}
              />
              
              <Area
                type="monotone"
                dataKey="bajarildi"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#bajarildi)"
                name={t.dashboard.completed}
              />
              
              <Area
                type="monotone"
                dataKey="yaratildi"
                stroke="hsl(240, 60%, 50%)"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#yaratildi)"
                name={t.dashboard.createdTasks}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="mt-6 flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-foreground">{t.dashboard.completed}</span>
            <span className="text-xs text-muted-foreground">({data.reduce((sum, item) => sum + item.bajarildi, 0)})</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-foreground">{t.dashboard.createdTasks}</span>
            <span className="text-xs text-muted-foreground">({data.reduce((sum, item) => sum + item.yaratildi, 0)})</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-foreground">{t.dashboard.total}</span>
            <span className="text-xs text-muted-foreground">({data.reduce((sum, item) => sum + item.jami, 0)})</span>
          </div>
        </div>
        
        {/* Stats summary */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-green-50 backdrop-blur-sm border border-green-200 hover:bg-green-100 hover:shadow-md transition-all duration-300">
            <div className="text-2xl font-bold text-green-600">{isLoading ? "…" : data.reduce((sum, item) => sum + item.bajarildi, 0)}</div>
            <div className="text-xs text-slate-600">{t.dashboard.monthlyCompleted}</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-blue-50 backdrop-blur-sm border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all duration-300">
            <div className="text-2xl font-bold text-blue-600">{isLoading ? "…" : data.reduce((sum, item) => sum + item.yaratildi, 0)}</div>
            <div className="text-xs text-slate-600">{t.dashboard.monthlyCreated}</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-amber-50 backdrop-blur-sm border border-amber-200 hover:bg-amber-100 hover:shadow-md transition-all duration-300">
            <div className="text-2xl font-bold text-amber-600">{isLoading ? "…" : data.reduce((sum, item) => sum + item.jami, 0)}</div>
            <div className="text-xs text-slate-600">{t.dashboard.monthlyTotal}</div>
          </div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  )
}
