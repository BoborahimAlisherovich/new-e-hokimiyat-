"use client"
// @ts-nocheck
import React, { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { StatsCards } from "@/components/dashboard/stats-cards" // TaskSummary (KPI)
import { RecentTasks as AttentionRequired } from "@/components/dashboard/recent-tasks" // Attention section
import { OrganizationRatings as OrganizationRanking } from "@/components/dashboard/organization-ratings"
import { SectorOverview } from "@/components/dashboard/sector-overview"
import AnalyticsSection from "@/components/dashboard/analytics-section"
import DeadlineCriticalTasks from "@/components/dashboard/deadline-critical-tasks"
import DashboardAnalyticsCharts from "@/components/dashboard/dashboard-analytics-charts"
import OrgDashboard from "@/components/dashboard/org-dashboard"
import { useTranslation } from "@/lib/i18n/context"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { getCurrentUser } from "@/lib/api"
import { isOrganizationRole } from "@/lib/role-utils"

export default function DashboardPage() {
  const t = useTranslation()
  const pageRef = useGSAPPageEntrance()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser()
      .then((user) => setUserRole(user?.role || null))
      .catch(() => setUserRole(null))
      .finally(() => setLoading(false))
  }, [])

  const isOrgUser = isOrganizationRole(userRole)

  if (loading) {
    return (
      <>
        <Header title={t.pages.dashboard.title} description={t.pages.dashboard.description} />
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-white/50 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  // Tashkilot rahbari/mas'uli uchun maxsus dashboard
  if (isOrgUser) {
    return (
      <>
        <Header
          title="Mening tashkilotim"
          description="Tashkilotingizga tegishli topshiriqlar va murojaatlar"
        />
        <div ref={pageRef} className="p-6">
          <OrgDashboard />
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.pages.dashboard.title} description={t.pages.dashboard.description} />
      <div ref={pageRef} className="p-6 space-y-6">

            {/* 1. Task Summary (KPI) */}
            <section data-gsap-section>
              <StatsCards />
            </section>

            {/* 2. Analytics (charts only if data) */}
            <section data-gsap-section>
              <AnalyticsSection />
            </section>

            {/* 2.1 Additional Analytics Charts */}
            <section data-gsap-section>
              <DashboardAnalyticsCharts />
            </section>

            {/* 3. Organization Performance */}
            <section data-gsap-section>
              <OrganizationRanking />
            </section>

            {/* 3.1 Sector Overview */}
            <section data-gsap-section>
              <SectorOverview />
            </section>

            {/* 4. Deadline‑Critical Tasks */}
            <section data-gsap-section>
              <DeadlineCriticalTasks />
            </section>

      </div>
    </>
  )
}
