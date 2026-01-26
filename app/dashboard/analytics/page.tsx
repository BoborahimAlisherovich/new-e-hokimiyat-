"use client"

import { Header } from "@/components/layout/header"
import { getTasks, getOrganizations } from "@/lib/api"
import { useEffect, useState } from "react"
import { AnalyticsOverview } from "@/components/dashboard/analytics/analytics-overview"
import { AnalyticsTabs } from "@/components/dashboard/analytics/analytics-tabs"
import { AnalyticsMetrics } from "@/components/dashboard/analytics/analytics-metrics"
import { VillageAnalytics } from "@/components/dashboard/analytics/village-analytics"
import { AnalyticsCharts } from "@/components/dashboard/analytics/analytics-charts"

export default function AnalyticsPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [orgs, setOrgs] = useState<any[]>([])

  useEffect(() => {
    let mounted = true
    Promise.all([getTasks(), getOrganizations()])
      .then(([tasksList, orgsList]) => {
        if (!mounted) return
        setTasks(tasksList)
        setOrgs(orgsList)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  return (
    <>
      <Header title="Аналитика" description="Тизимнинг статистик кўрсаткичлари ва аналитик маълумотлари" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-200/15 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-purple-200/10 to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/3 left-1/2 w-48 h-48 bg-gradient-to-br from-cyan-200/8 to-transparent rounded-full blur-lg" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 py-8">

            <AnalyticsOverview tasks={tasks} organizations={orgs} />
            <AnalyticsTabs />
            <AnalyticsCharts tasks={tasks} organizations={orgs} />
            <AnalyticsMetrics />
            <VillageAnalytics />

          </div>
        </div>
      </div>
    </>
  )
}
