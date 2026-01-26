// @ts-nocheck
import { Header } from "@/components/layout/header"
import { StatsCards } from "@/components/dashboard/stats-cards" // TaskSummary (KPI)
import { RecentTasks as AttentionRequired } from "@/components/dashboard/recent-tasks" // Attention section
import { OrganizationRatings as OrganizationRanking } from "@/components/dashboard/organization-ratings"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { SectorOverview } from "@/components/dashboard/sector-overview"
// Role‑based actions component (dynamic import for role handling)
// Empty state component for charts without data
import MyActions from "@/components/dashboard/my-actions"
import AnalyticsSection from "@/components/dashboard/analytics-section"
import DeadlineCriticalTasks from "@/components/dashboard/deadline-critical-tasks"

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

            {/* 3. Organization Performance */}
            <section className="animate-slide-up">
              <OrganizationRanking />
            </section>

            {/* 4. Deadline‑Critical Tasks */}
            <section className="animate-slide-up">
              <DeadlineCriticalTasks />
            </section>

            {/* 5. My Actions (role‑based) */}
            <section className="animate-slide-up">
              <MyActions />
            </section>

          </div>
        </div>
      </div>
    </>
  )
}
