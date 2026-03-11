"use client"

import { Header } from "@/components/layout/header"
import { getTasks, getOrganizations, getAppeals } from "@/lib/api"
import { useEffect, useState, useCallback } from "react"
import { AnalyticsOverview } from "@/components/dashboard/analytics/analytics-overview"
import { AnalyticsTabs } from "@/components/dashboard/analytics/analytics-tabs"
import { AnalyticsMetrics } from "@/components/dashboard/analytics/analytics-metrics"
import { VillageAnalytics } from "@/components/dashboard/analytics/village-analytics"
import { AnalyticsCharts } from "@/components/dashboard/analytics/analytics-charts"
import { Loader2 } from "lucide-react"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { useTranslation } from "@/lib/i18n/context"

export default function AnalyticsPage() {
  const t = useTranslation()
  const pageRef = useGSAPPageEntrance()
  const [tasks, setTasks] = useState<any[]>([])
  const [orgs, setOrgs] = useState<any[]>([])
  const [appeals, setAppeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tasksList, orgsList, appealsList] = await Promise.all([
        getTasks(),
        getOrganizations(),
        getAppeals()
      ])
      console.log('Analytics Data Loaded:', {
        tasks: tasksList?.length || 0,
        organizations: orgsList?.length || 0,
        appeals: appealsList?.length || 0,
        orgsData: orgsList
      })
      setTasks(Array.isArray(tasksList) ? tasksList : [])
      setOrgs(Array.isArray(orgsList) ? orgsList : [])
      setAppeals(Array.isArray(appealsList) ? appealsList : [])
    } catch (err) {
      console.error('Analytics data load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <>
        <Header title={t.pages.analytics.title} description={t.pages.analytics.description} />
        <div className="p-6">
          <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mx-auto" />
              <p className="mt-4 text-slate-500">{t.common.loading}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.pages.analytics.title} description={t.pages.analytics.description} />
      <div className="p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-200/26 to-transparent blur-3xl" />
          <div className="absolute top-1/2 right-0 h-80 w-80 rounded-full bg-gradient-to-bl from-emerald-200/20 to-transparent blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-gradient-to-tr from-amber-200/16 to-transparent blur-3xl" />
          <div className="absolute top-1/3 left-1/2 h-48 w-48 rounded-full bg-gradient-to-br from-sky-200/10 to-transparent blur-2xl" />
        </div>
        
        <div ref={pageRef} className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-10 py-8">

            <section data-gsap-section>
              <AnalyticsOverview tasks={tasks} organizations={orgs} appeals={appeals} />
            </section>
            
            <section data-gsap-section>
              <AnalyticsTabs tasks={tasks} organizations={orgs} />
            </section>
            
            <section data-gsap-section>
              <AnalyticsCharts tasks={tasks} organizations={orgs} appeals={appeals} />
            </section>
            
            <section data-gsap-section>
              <AnalyticsMetrics tasks={tasks} />
            </section>
            
            <section data-gsap-section>
              <VillageAnalytics />
            </section>

          </div>
        </div>
      </div>
    </>
  )
}
