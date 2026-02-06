"use client"

import { useEffect } from "react"

export function PerformanceGuard() {
  useEffect(() => {
    if (typeof performance === "undefined" || typeof performance.measure !== "function") {
      return
    }

    const originalMeasure = performance.measure.bind(performance)

    performance.measure = ((name: string, startOrOptions?: any, end?: any) => {
      try {
        return originalMeasure(name, startOrOptions as any, end as any)
      } catch {
        return undefined
      }
    }) as typeof performance.measure

    return () => {
      performance.measure = originalMeasure
    }
  }, [])

  return null
}