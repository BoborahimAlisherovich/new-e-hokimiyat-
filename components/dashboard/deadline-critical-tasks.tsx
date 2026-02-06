"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getTasks, getOrganizations } from "@/lib/api"
import { TaskStatusBadge, PriorityBadge } from "@/components/ui/status-badge"
import { ArrowRight, Calendar, Building, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useTranslation } from "@/lib/i18n/context"

/**
 * Lists tasks ordered by urgency: overdue first, then nearest deadline.
 * Shows title, deadline, status, priority, and remaining/overdue days.
 */
export default function DeadlineCriticalTasks() {
  const t = useTranslation()
  const [tasks, setTasks] = React.useState<any[]>([])
  const [orgsMap, setOrgsMap] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    let mounted = true
    Promise.all([getTasks(), getOrganizations()])
      .then(([tasksData, orgs]) => {
        if (!mounted) return
          const active = tasksData.filter((t: any) =>
          t.status !== "BAJARILDI" && t.status !== "NAZORATDAN_YECHILDI"
        )
        const sorted = active.sort((a: any, b: any) => {
          const diffA = new Date(a.deadline).getTime() - Date.now()
          const diffB = new Date(b.deadline).getTime() - Date.now()
          // Overdue tasks (negative diff) come first, ordered by most overdue
          if (diffA < 0 && diffB < 0) return diffA - diffB
          if (diffA < 0) return -1
          if (diffB < 0) return 1
          // Both upcoming: nearest deadline first
          return diffA - diffB
        })
        setTasks(sorted.slice(0, 5))
        const map: Record<string, string> = {}
        orgs.forEach((o: any) => (map[o.id] = o.name))
        setOrgsMap(map)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  const daysUntil = (deadline: string) => {
    const today = new Date()
    const d = new Date(deadline)
    return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const badgeColor = (d: number) => {
    if (d < 0) return "text-red-500"
    if (d <= 1) return "text-red-500"
    if (d <= 3) return "text-orange-500"
    if (d <= 7) return "text-yellow-500"
    return "text-green-500"
  }

  const badgeIcon = (d: number) => {
    if (d < 0) return <AlertCircle className="h-3 w-3" />
    return <Clock className="h-3 w-3" />
  }

  return (
    <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-red-50 to-orange-50">
        <CardTitle className="text-lg font-semibold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">{t.dashboard.deadlineTitle}</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/tasks" className="flex items-center gap-1">
            {t.common.all} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.map((task, index) => {
          const d = daysUntil(task.deadline)
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 300 }}
              whileHover={{ scale: 1.02, x: 4 }}
              className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 transition-all duration-300 hover:border-red-300 hover:shadow-lg"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-slate-900">{task.title}</h4>
                  <PriorityBadge priority={task.priority} />
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{task.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className={`flex items-center gap-1 ${badgeColor(d)}`}>
                    {badgeIcon(d)}
                    {d < 0 ? `${Math.abs(d)} ${t.common.daysOverdue}` : d === 0 ? t.common.today : `${d} ${t.common.daysRemaining}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(task.deadline).toLocaleDateString("uz-UZ")}
                  </span>
                  {(task.organizations || []).length > 0 && (
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {(task.organizations || []).map((id: string) => orgsMap[id]).filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <TaskStatusBadge status={task.status} />
              {/* Removed extra action buttons (Close Task, Reassign Task, Remove Control) and redundant info for a cleaner UI. */}
            </motion.div>
          )
        })}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Clock className="w-8 h-8 text-slate-400 mb-2" />
            <h3 className="text-base font-semibold text-slate-900 mb-1">{t.dashboard.deadlineEmptyTitle}</h3>
            <p className="text-xs text-slate-600 max-w-md">
              {t.dashboard.deadlineEmptyDescription}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
