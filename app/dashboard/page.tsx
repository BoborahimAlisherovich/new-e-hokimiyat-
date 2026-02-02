// @ts-nocheck
import { Header } from "@/components/layout/header"
import { StatsCards } from "@/components/dashboard/stats-cards" // TaskSummary (KPI)
import { RecentTasks as AttentionRequired } from "@/components/dashboard/recent-tasks" // Attention section
import { OrganizationRatings as OrganizationRanking } from "@/components/dashboard/organization-ratings"
import { SectorOverview } from "@/components/dashboard/sector-overview"
import AnalyticsSection from "@/components/dashboard/analytics-section"
import DeadlineCriticalTasks from "@/components/dashboard/deadline-critical-tasks"
import DashboardAnalyticsCharts from "@/components/dashboard/dashboard-analytics-charts"

export default function DashboardPage() {
  return (
    <>
      <Header title="Бош саҳифа" description="Туман ҳокимлиги топшириқлар бошқарув тизими" />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 py-8">

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
        </div>
      </div>
    </>
  )
}
