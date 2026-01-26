"use client"

import React from "react"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { getAnalyticsTrends } from "@/lib/api"
import EmptyState from "./empty-state"

export default function AnalyticsSection() {
  const [data, setData] = React.useState<any[] | null>(null)

  React.useEffect(() => {
    let mounted = true
    getAnalyticsTrends()
      .then((d) => {
        if (mounted) setData(Array.isArray(d) ? d : [])
      })
      .catch(() => {
        if (mounted) setData([])
      })
    return () => { mounted = false }
  }, [])

  if (data === null) return null // loading
  return data.length > 0 ? <ActivityChart /> : <EmptyState />
}
