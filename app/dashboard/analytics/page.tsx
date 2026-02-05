"use client"

import { Header } from "@/components/layout/header"
import { getTasks, getOrganizations, getAppeals } from "@/lib/api"
import { useEffect, useState, useCallback } from "react"
import { AnalyticsOverview } from "@/components/dashboard/analytics/analytics-overview"
import { AnalyticsTabs } from "@/components/dashboard/analytics/analytics-tabs"
import { AnalyticsMetrics } from "@/components/dashboard/analytics/analytics-metrics"
import { VillageAnalytics } from "@/components/dashboard/analytics/village-analytics"
import { AnalyticsCharts } from "@/components/dashboard/analytics/analytics-charts"
import { Loader2 } from "lucide-react"
import { motion } from "framer-motion"

export default function AnalyticsPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [orgs, setOrgs] = useState<any[]>([])
  const [appeals, setAppeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [tasksList, orgsList, appealsList] = await Promise.all([
        getTasks(),
        getOrganizations(),
        getAppeals()
      ])
      console.log('Analytics Data Loaded:', {
        tasks: tasksList?.length || 0,
        organizations: orgsList?.length || 0,
        appeals: appealsList?.length || 0,
        orgsData: orgsList
      })
      setTasks(Array.isArray(tasksList) ? tasksList : [])
      setOrgs(Array.isArray(orgsList) ? orgsList : [])
      setAppeals(Array.isArray(appealsList) ? appealsList : [])
    } catch (err) {
      console.error('Analytics data load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <>
        <Header title="Analitika" description="Tizimning statistik ko'rsatkichlari va analitik ma'lumotlari" />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
          <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
              <p className="mt-4 text-slate-600">Yuklanmoqda...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Analitika" description="Tizimning statistik ko'rsatkichlari va analitik ma'lumotlari" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-200/15 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-purple-200/10 to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/3 left-1/2 w-48 h-48 bg-gradient-to-br from-cyan-200/8 to-transparent rounded-full blur-lg" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 py-8">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <AnalyticsOverview tasks={tasks} organizations={orgs} appeals={appeals} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AnalyticsTabs tasks={tasks} organizations={orgs} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <AnalyticsCharts tasks={tasks} organizations={orgs} appeals={appeals} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <AnalyticsMetrics tasks={tasks} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <VillageAnalytics />
            </motion.div>

          </div>
        </div>
      </div>
    </>
  )
}
