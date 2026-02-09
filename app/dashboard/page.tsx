"use client"
// @ts-nocheck
import { Header } from "@/components/layout/header"
import { StatsCards } from "@/components/dashboard/stats-cards" // TaskSummary (KPI)
import { RecentTasks as AttentionRequired } from "@/components/dashboard/recent-tasks" // Attention section
import { OrganizationRatings as OrganizationRanking } from "@/components/dashboard/organization-ratings"
import { SectorOverview } from "@/components/dashboard/sector-overview"
import AnalyticsSection from "@/components/dashboard/analytics-section"
import DeadlineCriticalTasks from "@/components/dashboard/deadline-critical-tasks"
import DashboardAnalyticsCharts from "@/components/dashboard/dashboard-analytics-charts"
import { useTranslation } from "@/lib/i18n/context"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"

export default function DashboardPage() {
  const t = useTranslation()
  const pageRef = useGSAPPageEntrance()
  
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
