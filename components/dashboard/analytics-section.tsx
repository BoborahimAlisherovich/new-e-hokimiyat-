"use client"

import React from "react"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { getAnalyticsTrends } from "@/lib/api"
import EmptyState from "./empty-state"

interface TrendsData {
  created_trend: Array<{ date: string; count: number }>
  status_distribution: Array<{ status: string; count: number }>
  average_completion_days: number
}

export default function AnalyticsSection() {
  const [data, setData] = React.useState<TrendsData | null>(null)
  const [hasData, setHasData] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    let mounted = true
    getAnalyticsTrends()
      .then((d: TrendsData) => {
        if (mounted) {
          setData(d)
          // Ma'lumot bor-yo'qligini tekshirish
          const hasTrends = d?.created_trend?.length > 0 || d?.status_distribution?.length > 0
          setHasData(hasTrends)
        }
      })
      .catch(() => {
        if (mounted) {
          setData(null)
          setHasData(false)
        }
      })
    return () => { mounted = false }
  }, [])

  if (hasData === null) return null // loading
  return hasData ? <ActivityChart /> : <EmptyState />
}
