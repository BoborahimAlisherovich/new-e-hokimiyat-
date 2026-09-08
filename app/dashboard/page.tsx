"use client"

import type React from "react"
import { useState } from "react"
import dynamic from "next/dynamic"

import { Header } from "@/components/layout/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { DashboardQuickRibbon } from "@/components/dashboard/dashboard-quick-ribbon"
import { OrganizationRatings as OrganizationRanking } from "@/components/dashboard/organization-ratings"
import { SectorOverview } from "@/components/dashboard/sector-overview"
import DeadlineCriticalTasks from "@/components/dashboard/deadline-critical-tasks"
import { ProjectsShowcase } from "@/components/dashboard/projects-showcase"
import { cn } from "@/lib/utils"
import { useI18n, useTranslation } from "@/lib/i18n/context"
import { useCurrentUser } from "@/components/layout/current-user-provider"
import { isOrganizationRole } from "@/lib/role-utils"
import { canAccessDashboardPath } from "@/lib/dashboard-access"

/**
 * ASOSIY SAHIFA
 *
 * Tuzatilgan nuqsonlar:
 *  1. Sahifa SAKKIZ ta ustma-ust bo'limdan iborat edi, hech qanday
 *     bo'linish yo'q. Birinchi ikkitasi (QuickRibbon 4 plita +
 *     StatsCards 4 plita) bir xil shakldagi SAKKIZ karta edi — ierarxiya
 *     yo'q. Endi: bitta KPI qatori + tezkor harakatlar paneli, qolgani
 *     tablarga bo'lingan.
 *  2. Uchta 288–384px `blur-3xl` dekorativ shar (qobiq va freymlar yana
 *     oltitasini qo'shardi).
 *  3. `RecentTasks` `AttentionRequired` nomi bilan import qilinardi va
 *     HECH QACHON render qilinmasdi.
 *  4. `getCurrentUser()` shu sahifada ham alohida chaqirilardi (sahifada
 *     to'rtinchi marta) va `.catch(() => setUserRole(null))` bilan xato
 *     yashirilardi — HOKIM jimgina cheklangan sahifani ko'rardi.
 *  5. Recharts va ularning `ResponsiveContainer` lari (har biri o'z
 *     `ResizeObserver` i bilan) sahifa bundle'ida statik import edi.
 *     Endi tab ochilganda yuklanadi.
 *  6. GSAP kirish animatsiyasi har navigatsiyada qayta ishga tushardi.
 */

// Recharts og'ir — faqat «Tahlil» tabi ochilganda yuklanadi
const AnalyticsSection = dynamic(() => import("@/components/dashboard/analytics-section"), {
  ssr: false,
  loading: () => <SectionSkeleton />,
})
const DashboardAnalyticsCharts = dynamic(
  () => import("@/components/dashboard/dashboard-analytics-charts"),
  { ssr: false, loading: () => <SectionSkeleton /> },
)
const OrgDashboard = dynamic(() => import("@/components/dashboard/org-dashboard"), {
  ssr: false,
  loading: () => <SectionSkeleton />,
})

type TabKey = "overview" | "analytics" | "organizations"

export default function DashboardPage() {
  const t = useTranslation()
  const { language } = useI18n()
  const { role, status, error, refresh } = useCurrentUser()
  const [tab, setTab] = useState<TabKey>("overview")

  const orgText = {
    uz: {
      title: "Mening tashkilotim",
      description: "Tashkilotingizga tegishli topshiriqlar va murojaatlar",
    },
    "uz-cyrl": {
      title: "Менинг ташкилотим",
      description: "Ташкилотингизга тегишли топшириқлар ва мурожаатлар",
    },
    ru: {
      title: "Моя организация",
      description: "Поручения и обращения, относящиеся к вашей организации",
    },
    en: {
      title: "My organization",
      description: "Tasks and appeals assigned to your organization",
    },
  }[language] ?? {
    title: "Mening tashkilotim",
    description: "Tashkilotingizga tegishli topshiriqlar va murojaatlar",
  }

  /* Rol hali yechilmagan — skelet */
  if (status === "loading" && !role) {
    return (
      <>
        <Header
          title={t.pages?.dashboard?.title ?? "Asosiy sahifa"}
          description={t.pages?.dashboard?.description}
        />
        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="surface h-[92px] animate-pulse" />
            ))}
          </div>
          <SectionSkeleton />
        </div>
      </>
    )
  }

  const isOrgUser = isOrganizationRole(role)
  const canViewProjects = canAccessDashboardPath(role as any, "/dashboard/projects")
  const canViewSectorOverview = role === "HOKIM"
  const canViewAnalytics = canAccessDashboardPath(role as any, "/dashboard/analytics")

  /* Tashkilot rollari uchun alohida ko'rinish */
  if (isOrgUser) {
    return (
      <>
        <Header title={orgText.title} description={orgText.description} />
        <div className="p-4 sm:p-6">
          <OrgDashboard />
        </div>
      </>
    )
  }

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: "overview", label: "Umumiy", show: true },
    { key: "analytics", label: "Tahlil", show: canViewAnalytics },
    { key: "organizations", label: "Tashkilotlar", show: true },
  ]
  const visibleTabs = tabs.filter((x) => x.show)

  return (
    <>
      <Header
        title={t.pages?.dashboard?.title ?? "Asosiy sahifa"}
        description={t.pages?.dashboard?.description}
      />

      <div className="space-y-4 p-4 sm:p-6">
        {status === "error" && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground"
          >
            <span className="min-w-0 flex-1">
              {t.navigation?.roleError ?? "Rolni aniqlash muvaffaqiyatsiz"}
              {error ? ` — ${error}` : ""}
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="h-9 rounded-md border border-border px-2.5 text-xs font-semibold"
            >
              {t.common?.retry ?? "Qayta urinish"}
            </button>
          </div>
        )}

        {/* KPI — sahifadagi yagona ko'rsatkichlar qatori */}
        <StatsCards />

        {/* Tezkor harakatlar */}
        <DashboardQuickRibbon />

        {/* Tablar */}
        {visibleTabs.length > 1 && (
          <div
            role="tablist"
            aria-label="Dashboard bo‘limlari"
            className="scroll-x flex gap-1 border-b border-border"
          >
            {visibleTabs.map((x) => (
              <button
                key={x.key}
                role="tab"
                type="button"
                aria-selected={tab === x.key}
                aria-controls={`panel-${x.key}`}
                id={`tab-${x.key}`}
                onClick={() => setTab(x.key)}
                className={cn(
                  "relative h-11 shrink-0 px-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                  tab === x.key
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {x.label}
                {tab === x.key && (
                  <span
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                    aria-hidden
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {tab === "overview" && (
          <div
            role="tabpanel"
            id="panel-overview"
            aria-labelledby="tab-overview"
            className="space-y-4"
          >
            <DeadlineCriticalTasks />
            {canViewProjects && <ProjectsShowcase />}
          </div>
        )}

        {tab === "analytics" && canViewAnalytics && (
          <div
            role="tabpanel"
            id="panel-analytics"
            aria-labelledby="tab-analytics"
            className="space-y-4"
          >
            <AnalyticsSection />
            <DashboardAnalyticsCharts />
          </div>
        )}

        {tab === "organizations" && (
          <div
            role="tabpanel"
            id="panel-organizations"
            aria-labelledby="tab-organizations"
            className="space-y-4"
          >
            <OrganizationRanking />
            {canViewSectorOverview && <SectorOverview />}
          </div>
        )}
      </div>
    </>
  )
}

function SectionSkeleton() {
  return <div className="surface h-64 animate-pulse" aria-busy="true" />
}
