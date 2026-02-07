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

export default function DashboardPage() {
  const t = useTranslation()
  return (
    <>
      <Header title={t.pages.dashboard.title} description={t.pages.dashboard.description} />
      <div className="p-6 space-y-6">

            {/* 1. Task Summary (KPI) */}
            <section className="animate-slide-up">
              <StatsCards />
            </section>

            {/* 2. Analytics (charts only if data) */}
            <section className="animate-slide-up">
              <AnalyticsSection />
            </section>

            {/* 2.1 Additional Analytics Charts */}
            <section className="animate-slide-up">
              <DashboardAnalyticsCharts />
            </section>

            {/* 3. Organization Performance */}
            <section className="animate-slide-up">
              <OrganizationRanking />
            </section>

            {/* 3.1 Sector Overview */}
            <section className="animate-slide-up">
              <SectorOverview />
            </section>

            {/* 4. Deadline‑Critical Tasks */}
            <section className="animate-slide-up">
              <DeadlineCriticalTasks />
            </section>

      </div>
    </>
  )
}
