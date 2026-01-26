// @ts-nocheck
"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getTasks, getOrganizations } from "@/lib/api"
import { TaskStatusBadge, PriorityBadge } from "@/components/ui/status-badge"
import { ArrowRight, Calendar, Building, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"

export function RecentTasks() {
  const [upcomingTasks, setUpcomingTasks] = React.useState<any[]>([])
  const [orgsMap, setOrgsMap] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    let mounted = true
    Promise.all([getTasks(), getOrganizations()])
      .then(([tasks, orgs]) => {
        if (!mounted) return
        
        // Filter tasks that are not completed and sort by deadline proximity
        const activeTasks = tasks.filter(task => 
          task.status !== "BAJARILDI" && 
          task.status !== "NAZORATDAN_YECHILDI"
        )
        
        // Sort by deadline (closest first)
        const sortedByDeadline = activeTasks.sort((a, b) => 
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        )
        
        setUpcomingTasks(sortedByDeadline.slice(0, 5))
        
        const map: Record<string, string> = {}
        orgs.forEach((o: any) => (map[o.id] = o.name))
        setOrgsMap(map)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDeadlineColor = (days: number) => {
    if (days < 0) return "text-red-500"
    if (days <= 1) return "text-red-500"
    if (days <= 3) return "text-orange-500"
    if (days <= 7) return "text-yellow-500"
    return "text-green-500"
  }

  const getDeadlineIcon = (days: number) => {
    if (days < 0) return <AlertCircle className="h-3 w-3" />
    return <Clock className="h-3 w-3" />
  }

  return (
    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl">
      {/* Removed duplicate 'Муддати яқинлашаётган топшириқлар' section header to prevent double rendering. */}
      <CardContent className="space-y-4">
        {upcomingTasks.map((task) => {
          const daysUntil = getDaysUntilDeadline(task.deadline)
          const deadlineColor = getDeadlineColor(daysUntil)
          const deadlineIcon = getDeadlineIcon(daysUntil)
          
          return (
            <div
              key={task.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-gray-200/50 bg-white/60 backdrop-blur-sm p-4 transition-all duration-300 hover:bg-white/80 hover:border-emerald-300/50 hover:shadow-md"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-foreground">{task.title}</h4>
                  <PriorityBadge priority={task.priority} />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className={`flex items-center gap-1 ${deadlineColor}`}>
                    {deadlineIcon}
                    {daysUntil < 0 
                      ? `${Math.abs(daysUntil)} кун кечикган` 
                      : daysUntil === 0 
                      ? "Бугун" 
                      : `${daysUntil} кун қолди`
                    }
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
            </div>
          )
        })}
        
        {upcomingTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Топшириқлар топилмади</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Ҳозирча фаол топшириқлар мавжуд эмас. Барча топшириқлар бажарилган ёки нозоратдан ечилган.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
