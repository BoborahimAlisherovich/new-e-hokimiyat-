"use client"

import { Header } from "@/components/layout/header"
import { getTasks, getOrganizations, getAppeals } from "@/lib/api"
import { useEffect, useState, useCallback } from "react"
import { AnalyticsOverview } from "@/components/dashboard/analytics/analytics-overview"
import { AnalyticsTabs } from "@/components/dashboard/analytics/analytics-tabs"
import { AnalyticsMetrics } from "@/components/dashboard/analytics/analytics-metrics"
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
        <div className="px-3 py-4 sm:px-4 lg:px-6">
          <div className="flex min-h-[60vh] items-center justify-center rounded-[26px] border border-border bg-card">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="mt-4 text-muted-foreground">{t.common.loading}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.pages.analytics.title} description={t.pages.analytics.description} />
      <div className="relative px-2 py-3 sm:px-3 lg:px-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="bg-primary-soft absolute top-0 left-0 hidden h-96 w-96 rounded-full blur-3xl md:block" />
          <div className="bg-success-soft absolute top-1/2 right-0 hidden h-80 w-80 rounded-full blur-3xl lg:block" />
          <div className="bg-warning-soft absolute bottom-0 left-1/4 hidden h-72 w-72 rounded-full blur-3xl xl:block" />
        </div>
        
        <div ref={pageRef} className="relative z-10 mx-auto max-w-7xl">
          <div className="space-y-6 py-3 sm:space-y-8 sm:py-4 lg:space-y-10">

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

            {/*
              XARITA BU YERDAN OLIB TASHLANDI.
              Ilgari aynan bir xil `DistrictMap` ikki joyda chizilardi:
              shu sahifada va «Interaktiv xarita» bo'limida. Xarita
              1.21 MiB GeoJSON yuklab, 69 ta SVG yo'lni DOM'ga yozadi —
              analitika ochilganda bu ish bekorga takrorlanardi va
              sahifa sezilarli sekinlashardi.
              Xaritaning yagona joyi: /dashboard/map
            */}

          </div>
        </div>
      </div>
    </>
  )
}
