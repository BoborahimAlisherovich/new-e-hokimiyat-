"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { useMemo } from "react"

const STATUS_LABELS: Record<string, string> = {
  YANGI: "Янги",
  IJRODA: "Ижрода",
  BAJARILDI: "Бажарилди",
  NAZORATDAN_YECHILDI: "Назоратдан ечилди",
  MUDDATI_KECH: "Кечиккан",
  QAYTA_IJROGA_YUBORILDI: "Қайта ижро",
  QABUL_QILINDI: "Қабул қилинди",
  JARAYONDA: "Жараёнда",
  TEKSHIRUVDA: "Текширувда",
  RAD_ETILDI: "Рад этилди",
  BEKOR_QILINDI: "Бекор қилинди",
}

const PRIORITY_LABELS: Record<string, string> = {
  FAVQULODDA: "Фавқулодда",
  MUHIM: "Муҳим",
  MUHIM_SHOSHILINCH: "Муҳим/шошилинч",
  SHOSHILINCH: "Шошилинч",
  ODDIY: "Оддий",
  PAST: "Паст",
  YUQORI: "Юқори",
}

const CATEGORY_LABELS: Record<string, string> = {
  IJRO: "Ижро",
  NAZORAT: "Назорат",
  HISOBOT: "Ҳисобот",
  YIGIRISH: "Йиғилиш",
  BOSHQA: "Бошқа",
}

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"]

interface AnalyticsChartsProps {
  tasks: any[]
  organizations: any[]
}

const formatShortDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" })
}

export function AnalyticsCharts({ tasks, organizations }: AnalyticsChartsProps) {
  const statusData = useMemo(() => {
    const map = new Map<string, number>()
    tasks.forEach((task) => {
      const key = task.status || "UNKNOWN"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([key, value]) => ({
      name: STATUS_LABELS[key] || key,
      value,
    }))
  }, [tasks])

  const priorityData = useMemo(() => {
    const map = new Map<string, number>()
    tasks.forEach((task) => {
      const key = task.priority || "UNKNOWN"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([key, value]) => ({
      name: PRIORITY_LABELS[key] || key,
      value,
    }))
  }, [tasks])

  const categoryData = useMemo(() => {
    const map = new Map<string, number>()
    tasks.forEach((task) => {
      const key = task.category || "UNKNOWN"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([key, value]) => ({
      name: CATEGORY_LABELS[key] || key,
      value,
    }))
  }, [tasks])

  const trendData = useMemo(() => {
    const map = new Map<string, number>()
    tasks.forEach((task) => {
      const key = task.created_at || task.createdAt || task.created || ""
      if (!key) return
      const dateKey = new Date(key).toISOString().slice(0, 10)
      map.set(dateKey, (map.get(dateKey) || 0) + 1)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([key, value]) => ({
        date: formatShortDate(key),
        value,
      }))
  }, [tasks])

  const orgData = useMemo(() => {
    const map = new Map<string, number>()
    tasks.forEach((task) => {
      const assignments = task.assigned_organizations || task.organizations || []
      if (Array.isArray(assignments) && assignments.length > 0) {
        assignments.forEach((item: any) => {
          const name = item?.organization?.name || item?.name || "Номаълум"
          map.set(name, (map.get(name) || 0) + 1)
        })
      } else if (task.organization?.name) {
        const name = task.organization.name
        map.set(name, (map.get(name) || 0) + 1)
      }
    })

    if (map.size === 0 && organizations?.length) {
      organizations.forEach((org) => {
        map.set(org.name || "Номаълум", map.get(org.name) || 0)
      })
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [tasks, organizations])

  return (
    <section className="animate-slide-up" style={{ animationDelay: "300ms" }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ҳолатлар бўйича</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} interval={0} angle={-15} height={60} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Муҳимлик бўйича</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" outerRadius={110} innerRadius={65} paddingAngle={4}>
                  {priorityData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Категориялар кесими</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} interval={0} angle={-10} height={50} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Топшириқлар тенденцияси</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip cursor={{ stroke: "hsl(var(--border))" }} />
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Ташкилотлар юкламаси (Top 6)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orgData} layout="vertical" margin={{ left: 40, right: 20, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={180} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
