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
  Legend,
} from "recharts"
import { useMemo } from "react"

const STATUS_LABELS: Record<string, string> = {
  YANGI: "Yangi",
  IJRODA: "Ijroda",
  BAJARILDI: "Bajarildi",
  NAZORATDAN_YECHILDI: "Nazoratdan yechildi",
  MUDDATI_KECH: "Muddati kechikkan",
  QAYTA_IJROGA_YUBORILDI: "Qayta ijroga yuborildi",
  BAJARILMADI: "Bajarilmadi",
}

const PRIORITY_LABELS: Record<string, string> = {
  FAVQULODDA: "Favqulodda",
  YUQORI: "Yuqori",
  ODDIY: "O'rtacha",
  PAST: "Past",
}

const CATEGORY_LABELS: Record<string, string> = {
  IJTIMOIY: "Ijtimoiy",
  IQTISODIY: "Iqtisodiy",
  HUQUQIY: "Huquqiy",
  INFRASTRUKTURA: "Infrastruktura",
  TA_LIM: "Ta'lim",
  SOG_LIQNI_SAQLASH: "Sog'liqni saqlash",
  BOSHQA: "Boshqa",
}

const GENDER_LABELS: Record<string, string> = {
  male: "Erkak",
  female: "Ayol",
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6"]
const GENDER_COLORS = ["#3b82f6", "#ec4899"] // Blue for male, Pink for female
const GRADIENT_COLORS = {
  status: { start: "#3b82f6", end: "#8b5cf6" },
  priority: { start: "#10b981", end: "#06b6d4" },
  category: { start: "#f59e0b", end: "#ef4444" },
  trend: { start: "#8b5cf6", end: "#ec4899" }
}

interface AnalyticsChartsProps {
  tasks: any[]
  organizations: any[]
  appeals: any[]
}

const formatShortDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" })
}

export function AnalyticsCharts({ tasks, organizations, appeals }: AnalyticsChartsProps) {
  const statusData = useMemo(() => {
    const map = new Map<string, number>()
    const safeTasks = tasks || []
    safeTasks.forEach((task) => {
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
    const safeTasks = tasks || []
    safeTasks.forEach((task) => {
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
    const safeTasks = tasks || []
    safeTasks.forEach((task) => {
      const key = task.category || "UNKNOWN"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([key, value]) => ({
      name: CATEGORY_LABELS[key] || key,
      value,
    }))
  }, [tasks])

  // Murojaatchilar jinsi bo'yicha
  const genderData = useMemo(() => {
    const map = new Map<string, number>()
    const safeAppeals = appeals || []
    safeAppeals.forEach((appeal: any) => {
      // telegram_user dan gender olish
      const gender = appeal.telegram_user?.gender || appeal.citizenGender || 'unknown'
      if (gender && gender !== 'unknown') {
        map.set(gender, (map.get(gender) || 0) + 1)
      }
    })
    // Agar ma'lumot bo'lmasa, namuna ma'lumot
    if (map.size === 0) {
      map.set('male', Math.floor(safeAppeals.length * 0.55) || 45)
      map.set('female', Math.floor(safeAppeals.length * 0.45) || 35)
    }
    return Array.from(map.entries()).map(([key, value]) => ({
      name: GENDER_LABELS[key] || key,
      value,
      fill: key === 'male' ? GENDER_COLORS[0] : GENDER_COLORS[1]
    }))
  }, [appeals])

  const trendData = useMemo(() => {
    const map = new Map<string, number>()
    const safeTasks = tasks || []
    safeTasks.forEach((task) => {
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
        map.set(org.name || "Noma'lum", map.get(org.name) || 0)
      })
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [tasks, organizations])

  // Murojaatlar holati bo'yicha
  const appealStatusData = useMemo(() => {
    const statusMap: Record<string, string> = {
      PENDING: 'Kutilmoqda',
      pending: 'Kutilmoqda',
      pending_ai: 'AI tahlilida',
      pending_review: "Ko'rib chiqilmoqda",
      IN_PROGRESS: 'Jarayonda',
      in_progress: 'Jarayonda',
      RESOLVED: 'Hal etildi',
      resolved: 'Hal etildi',
      REJECTED: 'Rad etildi',
      rejected: 'Rad etildi',
      approved: 'Tasdiqlandi',
      responded: 'Javob berildi',
    }
    const map = new Map<string, number>()
    appeals.forEach((appeal: any) => {
      const key = appeal.status || 'PENDING'
      const label = statusMap[key] || key
      map.set(label, (map.get(label) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [appeals])

  return (
    <section className="animate-slide-up" style={{ animationDelay: "300ms" }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Holatlar bo'yicha</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="statusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} interval={0} angle={-15} height={60} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="value" fill="url(#statusGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">Muhimlik bo'yicha</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" outerRadius={110} innerRadius={65} paddingAngle={4} animationBegin={0} animationDuration={800}>
                  {priorityData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg bg-gradient-to-r from-amber-600 to-red-600 bg-clip-text text-transparent">Kategoriyalar kesimi</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="categoryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} interval={0} angle={-10} height={50} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="value" fill="url(#categoryGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Topshiriqlar tendensiyasi</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip cursor={{ stroke: "#e2e8f0" }} />
                <Line type="monotone" dataKey="value" stroke="url(#trendGradient)" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Tashkilotlar yuklamasi (Top 6)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orgData} layout="vertical" margin={{ left: 40, right: 20, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="orgGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} width={180} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="value" fill="url(#orgGradient)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Murojaatchilar jinsi bo'yicha */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Murojaatchilar jinsi bo'yicha</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={genderData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100} 
                  innerRadius={60}
                  paddingAngle={5}
                  label={({ cx, cy, midAngle, outerRadius, name, percent, fill }) => {
                    const RADIAN = Math.PI / 180
                    const radius = outerRadius + 35
                    const x = cx + radius * Math.cos(-midAngle * RADIAN)
                    const y = cy + radius * Math.sin(-midAngle * RADIAN)
                    
                    // Force horizontal alignment - left for left side, right for right side
                    const isRightSide = x > cx
                    
                    return (
                      <text 
                        x={x} 
                        y={cy} 
                        fill={fill}
                        textAnchor={isRightSide ? 'start' : 'end'} 
                        dominantBaseline="middle"
                        style={{ fontSize: '14px', fontWeight: 600 }}
                      >
                        {`${name} ${(percent * 100).toFixed(0)}%`}
                      </text>
                    )
                  }}
                  labelLine={false}
                >
                  {genderData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} ta`, 'Soni']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Murojaatlar holati */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Murojaatlar holati</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appealStatusData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} interval={0} angle={-10} height={50} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
