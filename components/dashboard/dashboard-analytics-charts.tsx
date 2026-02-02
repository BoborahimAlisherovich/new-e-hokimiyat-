"use client"

import React from "react"
import { getOrganizations, getTasks, getAppeals } from "@/lib/api"
import { AnalyticsCharts } from "@/components/dashboard/analytics/analytics-charts"
import EmptyState from "@/components/dashboard/empty-state"

export default function DashboardAnalyticsCharts() {
  const [tasks, setTasks] = React.useState<any[] | null>(null)
  const [orgs, setOrgs] = React.useState<any[] | null>(null)
  const [appeals, setAppeals] = React.useState<any[] | null>(null)

  React.useEffect(() => {
    let mounted = true
    Promise.all([getTasks(), getOrganizations(), getAppeals()])
      .then(([tasksList, orgsList, appealsList]) => {
        if (!mounted) return
        setTasks(Array.isArray(tasksList) ? tasksList : [])
        setOrgs(Array.isArray(orgsList) ? orgsList : [])
        setAppeals(Array.isArray(appealsList) ? appealsList : [])
      })
      .catch(() => {
        if (!mounted) return
        setTasks([])
        setOrgs([])
        setAppeals([])
      })
    return () => {
      mounted = false
    }
  }, [])

  if (tasks === null || orgs === null || appeals === null) return null
  if (tasks.length === 0 && orgs.length === 0) return <EmptyState />

  return <AnalyticsCharts tasks={tasks} organizations={orgs} appeals={appeals} />
}
