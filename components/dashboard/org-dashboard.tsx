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
  YANGI: "bg-primary-soft text-primary-soft-foreground",
  IJRODA: "bg-warning-soft text-warning-soft-foreground",
  TEKSHIRUVDA: "bg-[var(--st-tekshiruvda-bg)] text-[var(--st-tekshiruvda-fg)]",
  QAYTA_IJROGA_YUBORILDI: "bg-warning-soft text-warning-soft-foreground",
  MUDDATI_KECH: "bg-destructive-soft text-destructive-soft-foreground",
  BAJARILDI: "bg-success-soft text-success-soft-foreground",
  NAZORATDAN_YECHILDI: "bg-success-soft text-success-soft-foreground",
  pending_review: "bg-warning-soft text-warning-soft-foreground",
  pending_ai: "bg-primary-soft text-primary-soft-foreground",
  approved: "bg-success-soft text-success-soft-foreground",
  responded: "bg-primary-soft text-primary-soft-foreground",
  resolved: "bg-success-soft text-success-soft-foreground",
}

const PRIORITY_COLORS: Record<string, string> = {
  FAVQULODDA: "bg-destructive-soft text-destructive-soft-foreground border-border",
  YUQORI: "bg-warning-soft text-warning-soft-foreground border-border",
  ODDIY: "bg-primary-soft text-primary-soft-foreground border-border",
  PAST: "bg-muted text-muted-foreground border-border",
  high: "bg-destructive-soft text-destructive-soft-foreground border-border",
  medium: "bg-warning-soft text-warning-soft-foreground border-border",
  low: "bg-primary-soft text-primary-soft-foreground border-border",
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
            <Card key={i} className="animate-pulse bg-card">
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-secondary rounded mb-3" />
                <div className="h-8 w-16 bg-secondary rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-card">
              <CardContent className="p-6">
                <div className="h-6 w-36 bg-secondary rounded mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-12 bg-secondary rounded" />
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
      <Card className="bg-card">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <p className="text-lg font-medium text-secondary-foreground">
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
      bgColor: "bg-primary-soft",
      iconColor: "text-primary-soft-foreground",
      sub: `${tasks.completion_rate}% bajarilgan`,
    },
    {
      label: "Faol topshiriqlar",
      value: tasks.new + tasks.in_progress + tasks.resubmitted,
      icon: Clock,
      bgColor: "bg-warning-soft",
      iconColor: "text-warning-soft-foreground",
      sub: `${tasks.new} yangi, ${tasks.in_progress} ijroda`,
    },
    {
      label: "Bajarilgan",
      value: tasks.completed,
      icon: CheckCircle,
      bgColor: "bg-success-soft",
      iconColor: "text-success-soft-foreground",
      sub: tasks.total > 0 ? `${Math.round((tasks.completed / tasks.total) * 100)}%` : "0%",
    },
    {
      label: "Kechikkan",
      value: tasks.overdue,
      icon: AlertCircle,
      bgColor: "bg-destructive-soft",
      iconColor: "text-destructive-soft-foreground",
      sub: tasks.overdue > 0 ? "E'tibor talab qiladi!" : "Yo'q",
    },
  ]

  const serviceCards = [
    {
      label: "Ko'rib chiqish standarti",
      value: `${data.service.target_review_days} kun`,
      sub: "Yangi murojaatni dastlabki ko'rish muddati",
      icon: ShieldCheck,
      tone: "bg-primary-soft text-primary-soft-foreground",
    },
    {
      label: "Javob berish standarti",
      value: `${data.service.target_response_days} kun`,
      sub: "Fuqaroga rasmiy javob yuborish muddati",
      icon: Clock,
      tone: "bg-warning-soft text-warning-soft-foreground",
    },
    {
      label: "O'rtacha yechim vaqti",
      value: appeals.avg_resolution_days ? `${appeals.avg_resolution_days} kun` : "—",
      sub: "Yopilgan murojaatlar asosida hisoblandi",
      icon: TrendingUp,
      tone: "bg-success-soft text-success-soft-foreground",
    },
    {
      label: "Fuqarolar bahosi",
      value: appeals.average_rating ? `${appeals.average_rating}/5` : "Baholanmagan",
      sub: appeals.rated_count > 0 ? `${appeals.rated_count} ta baholangan murojaat` : "Hali baho kelmagan",
      icon: Star,
      tone: "bg-destructive-soft text-destructive-soft-foreground",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Tashkilot info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-soft">
              <Building2 className="h-7 w-7 text-primary-soft-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{organization.name}</h2>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
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
            <Card className="bg-card border-border rounded-xl shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-foreground mt-1">{stat.value}</h3>
                  </div>
                  <div className={cn("p-2.5 rounded-xl", stat.bgColor)}>
                    <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Murojaatlar statistikasi */}
      {appeals.total > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Murojaatlar
                </CardTitle>
                <Link href="/dashboard/appeals">
                  <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                    Barchasi <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-primary-soft text-center">
                  <p className="text-2xl font-bold text-primary">{appeals.total}</p>
                  <p className="text-xs text-primary mt-0.5">Jami</p>
                </div>
                <div className="p-3 rounded-lg bg-warning-soft text-center">
                  <p className="text-2xl font-bold text-warning">{appeals.pending}</p>
                  <p className="text-xs text-warning mt-0.5">Kutilmoqda</p>
                </div>
                <div className="p-3 rounded-lg bg-success-soft text-center">
                  <p className="text-2xl font-bold text-success">{appeals.responded}</p>
                  <p className="text-xs text-success mt-0.5">Javob berilgan</p>
                </div>
                <div className="p-3 rounded-lg bg-success-soft text-center">
                  <p className="text-2xl font-bold text-success">{appeals.resolved}</p>
                  <p className="text-xs text-success mt-0.5">Hal qilingan</p>
                </div>
              </div>

              {/* Oxirgi murojaatlar */}
              {appeals.recent.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Oxirgi murojaatlar</p>
                  {appeals.recent.map((appeal) => (
                    <Link
                      key={appeal.id}
                      href={`/dashboard/appeals?id=${appeal.id}`}
                      className="block p-3 rounded-lg bg-background hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground line-clamp-1">{appeal.text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{appeal.user_name}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(appeal.created_at)}</span>
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
                            className={cn("text-[10px] px-1.5", STATUS_COLORS[appeal.status] || "bg-muted text-muted-foreground")}
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
            <Card key={item.label} className="border-border bg-card">
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <h3 className="mt-1 text-2xl font-bold text-foreground">{item.value}</h3>
                  </div>
                  <div className={cn("rounded-2xl p-2.5", item.tone)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{item.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Faol topshiriqlar ro'yxati */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-primary" />
                Faol topshiriqlar
              </CardTitle>
              <Link href="/dashboard/tasks">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary">
                  Barcha topshiriqlar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pb-5">
            {tasks.recent.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-10 w-10 text-success mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Faol topshiriq yo'q</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.recent.map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    className="block p-3 rounded-lg bg-background hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {task.assigned_to && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {task.assigned_to}
                            </span>
                          )}
                          {task.deadline && (
                            <span className={cn(
                              "text-xs flex items-center gap-1",
                              isOverdue(task.deadline) ? "text-destructive font-medium" : "text-muted-foreground"
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
                          className={cn("text-[10px] px-1.5", STATUS_COLORS[task.status] || "bg-muted text-muted-foreground")}
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
