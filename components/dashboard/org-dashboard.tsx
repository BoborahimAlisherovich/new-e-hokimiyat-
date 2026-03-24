// @ts-nocheck
"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ListTodo,
  CheckCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  Users,
  Building2,
  ArrowRight,
  FileText,
  TrendingUp,
  Eye,
  CalendarClock,
  Star,
  ShieldCheck,
} from "lucide-react"
import { getOrgDashboard, type OrgDashboardData } from "@/lib/api"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useTranslation } from "@/lib/i18n/context"
import Link from "next/link"

const STATUS_LABELS: Record<string, string> = {
  YANGI: "Yangi",
  IJRODA: "Ijroda",
  TEKSHIRUVDA: "Tekshiruvda",
  QAYTA_IJROGA_YUBORILDI: "Qayta ijroga",
  MUDDATI_KECH: "Muddati o'tgan",
  BAJARILDI: "Bajarildi",
  NAZORATDAN_YECHILDI: "Nazoratdan yechildi",
  BAJARILMADI: "Bajarilmadi",
  pending_review: "Ko'rib chiqilmoqda",
  pending_ai: "AI tahlilida",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
  responded: "Javob berilgan",
  resolved: "Hal qilingan",
  forwarded: "Yo'naltirilgan",
}

const STATUS_COLORS: Record<string, string> = {
  YANGI: "bg-blue-100 text-blue-700",
  IJRODA: "bg-amber-100 text-amber-700",
  TEKSHIRUVDA: "bg-purple-100 text-purple-700",
  QAYTA_IJROGA_YUBORILDI: "bg-orange-100 text-orange-700",
  MUDDATI_KECH: "bg-red-100 text-red-700",
  BAJARILDI: "bg-emerald-100 text-emerald-700",
  NAZORATDAN_YECHILDI: "bg-teal-100 text-teal-700",
  pending_review: "bg-yellow-100 text-yellow-700",
  pending_ai: "bg-indigo-100 text-indigo-700",
  approved: "bg-green-100 text-green-700",
  responded: "bg-cyan-100 text-cyan-700",
  resolved: "bg-emerald-100 text-emerald-700",
}

const PRIORITY_COLORS: Record<string, string> = {
  FAVQULODDA: "bg-red-100 text-red-700 border-red-200",
  YUQORI: "bg-orange-100 text-orange-700 border-orange-200",
  ODDIY: "bg-blue-100 text-blue-700 border-blue-200",
  PAST: "bg-slate-100 text-slate-600 border-slate-200",
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-orange-100 text-orange-700 border-orange-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
}

const PRIORITY_LABELS: Record<string, string> = {
  FAVQULODDA: "Favqulodda",
  YUQORI: "Yuqori",
  ODDIY: "Oddiy",
  PAST: "Past",
  high: "Yuqori",
  medium: "O'rtacha",
  low: "Past",
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export default function OrgDashboard() {
  const t = useTranslation()
  const [data, setData] = useState<OrgDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    getOrgDashboard()
      .then((res) => {
        if (mounted) setData(res)
      })
      .catch((err) => {
        if (mounted) setError(err?.message || "Xatolik yuz berdi")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-white/60">
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
                <div className="h-8 w-16 bg-slate-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-white/60">
              <CardContent className="p-6">
                <div className="h-6 w-36 bg-slate-200 rounded mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-12 bg-slate-200 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="bg-white/80">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-lg font-medium text-slate-700">
            {error || "Ma'lumotlar yuklanmadi"}
          </p>
        </CardContent>
      </Card>
    )
  }

  const { organization, tasks, appeals, employees } = data

  const statsCards = [
    {
      label: "Jami topshiriqlar",
      value: tasks.total,
      icon: ListTodo,
      gradient: "from-indigo-500 to-violet-500",
      bgColor: "bg-gradient-to-br from-indigo-500/12 to-violet-500/12",
      iconColor: "text-indigo-600",
      sub: `${tasks.completion_rate}% bajarilgan`,
    },
    {
      label: "Faol topshiriqlar",
      value: tasks.new + tasks.in_progress + tasks.resubmitted,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bgColor: "bg-gradient-to-br from-amber-500/10 to-orange-500/10",
      iconColor: "text-amber-600",
      sub: `${tasks.new} yangi, ${tasks.in_progress} ijroda`,
    },
    {
      label: "Bajarilgan",
      value: tasks.completed,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-cyan-500",
      bgColor: "bg-gradient-to-br from-emerald-500/12 to-cyan-500/12",
      iconColor: "text-emerald-600",
      sub: tasks.total > 0 ? `${Math.round((tasks.completed / tasks.total) * 100)}%` : "0%",
    },
    {
      label: "Kechikkan",
      value: tasks.overdue,
      icon: AlertCircle,
      gradient: "from-rose-500 to-pink-500",
      bgColor: "bg-gradient-to-br from-rose-500/12 to-pink-500/12",
      iconColor: "text-rose-600",
      sub: tasks.overdue > 0 ? "E'tibor talab qiladi!" : "Yo'q",
    },
  ]

  const serviceCards = [
    {
      label: "Ko'rib chiqish standarti",
      value: `${data.service.target_review_days} kun`,
      sub: "Yangi murojaatni dastlabki ko'rish muddati",
      icon: ShieldCheck,
      tone: "bg-cyan-50 text-cyan-700",
    },
    {
      label: "Javob berish standarti",
      value: `${data.service.target_response_days} kun`,
      sub: "Fuqaroga rasmiy javob yuborish muddati",
      icon: Clock,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "O'rtacha yechim vaqti",
      value: appeals.avg_resolution_days ? `${appeals.avg_resolution_days} kun` : "—",
      sub: "Yopilgan murojaatlar asosida hisoblandi",
      icon: TrendingUp,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Fuqarolar bahosi",
      value: appeals.average_rating ? `${appeals.average_rating}/5` : "Baholanmagan",
      sub: appeals.rated_count > 0 ? `${appeals.rated_count} ta baholangan murojaat` : "Hali baho kelmagan",
      icon: Star,
      tone: "bg-rose-50 text-rose-700",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Tashkilot info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-purple-500/5 border-indigo-100/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10">
              <Building2 className="h-7 w-7 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-slate-800 truncate">{organization.name}</h2>
              <div className="flex items-center gap-3 text-sm text-slate-600 mt-0.5">
                {organization.sector && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {organization.sector}
                  </span>
                )}
                {organization.director_name && (
                  <span>Rahbar: {organization.director_name}</span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {employees.count} xodim
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className="bg-white/75 backdrop-blur-xl border-white/50 rounded-xl shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-slate-600">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</h3>
                  </div>
                  <div className={cn("p-2.5 rounded-xl", stat.bgColor)}>
                    <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                  </div>
                </div>
                <p className="text-xs text-slate-500">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Murojaatlar statistikasi */}
      {appeals.total > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-white/75 backdrop-blur-xl border-white/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-indigo-500" />
                  Murojaatlar
                </CardTitle>
                <Link href="/dashboard/appeals">
                  <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                    Barchasi <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-blue-50/80 text-center">
                  <p className="text-2xl font-bold text-blue-700">{appeals.total}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Jami</p>
                </div>
                <div className="p-3 rounded-lg bg-yellow-50/80 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{appeals.pending}</p>
                  <p className="text-xs text-yellow-600 mt-0.5">Kutilmoqda</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50/80 text-center">
                  <p className="text-2xl font-bold text-green-700">{appeals.responded}</p>
                  <p className="text-xs text-green-600 mt-0.5">Javob berilgan</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/80 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{appeals.resolved}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Hal qilingan</p>
                </div>
              </div>

              {/* Oxirgi murojaatlar */}
              {appeals.recent.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600 mb-2">Oxirgi murojaatlar</p>
                  {appeals.recent.map((appeal) => (
                    <Link
                      key={appeal.id}
                      href={`/dashboard/appeals?id=${appeal.id}`}
                      className="block p-3 rounded-lg bg-slate-50/80 hover:bg-slate-100/80 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 line-clamp-1">{appeal.text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">{appeal.user_name}</span>
                            <span className="text-xs text-slate-400">{formatDate(appeal.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {appeal.priority && (
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-1.5", PRIORITY_COLORS[appeal.priority])}
                            >
                              {PRIORITY_LABELS[appeal.priority] || appeal.priority}
                            </Badge>
                          )}
                          <Badge
                            className={cn("text-[10px] px-1.5", STATUS_COLORS[appeal.status] || "bg-slate-100 text-slate-600")}
                          >
                            {STATUS_LABELS[appeal.status] || appeal.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {serviceCards.map((item) => (
            <Card key={item.label} className="border-white/50 bg-white/75 backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-600">{item.label}</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900">{item.value}</h3>
                  </div>
                  <div className={cn("rounded-2xl p-2.5", item.tone)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs leading-5 text-slate-500">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Faol topshiriqlar ro'yxati */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="bg-white/75 backdrop-blur-xl border-white/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-indigo-500" />
                Faol topshiriqlar
              </CardTitle>
              <Link href="/dashboard/tasks">
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700">
                  Barcha topshiriqlar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pb-5">
            {tasks.recent.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-10 w-10 text-emerald-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Faol topshiriq yo'q</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.recent.map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    className="block p-3 rounded-lg bg-slate-50/80 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 line-clamp-1">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {task.assigned_to && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {task.assigned_to}
                            </span>
                          )}
                          {task.deadline && (
                            <span className={cn(
                              "text-xs flex items-center gap-1",
                              isOverdue(task.deadline) ? "text-red-600 font-medium" : "text-slate-500"
                            )}>
                              <CalendarClock className="h-3 w-3" />
                              {formatDate(task.deadline)}
                              {isOverdue(task.deadline) && " ⚠️"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5", PRIORITY_COLORS[task.priority])}
                        >
                          {PRIORITY_LABELS[task.priority] || task.priority}
                        </Badge>
                        <Badge
                          className={cn("text-[10px] px-1.5", STATUS_COLORS[task.status] || "bg-slate-100 text-slate-600")}
                        >
                          {STATUS_LABELS[task.status] || task.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
