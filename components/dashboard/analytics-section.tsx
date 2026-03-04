"use client"

import React from "react"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { getAnalyticsTrends } from "@/lib/api"
import EmptyState from "./empty-state"

export default function AnalyticsSection() {
  const [hasData, setHasData] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    let mounted = true
    getAnalyticsTrends()
      .then((d: any) => {
        if (mounted) {
          // Ma'lumot bor-yo'qligini tekshirish - har xil formatlarni qo'llab-quvvatlash
          const hasTrends = d?.created_trend?.length > 0 || d?.status_distribution?.length > 0 || d?.data?.length > 0
          setHasData(hasTrends)
        }
      })
      .catch(() => {
        if (mounted) {
          setHasData(false)
        }
      })
    return () => { mounted = false }
  }, [])

  if (hasData === null) return null // loading
  return hasData ? <ActivityChart /> : <EmptyState />
}
