"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { taskStatusLabels, sectorLabels, sectorColors, type TaskStatus, type Sector } from "@/lib/mock-data"
import { getTasks, getOrganizations } from "@/lib/api"
import React from "react"
import { TrendingUp, TrendingDown, Clock, Target, Layers, Building2 } from "lucide-react"

export default function AnalyticsPage() {
  const [tasks, setTasks] = React.useState<any[]>([])
  const [orgs, setOrgs] = React.useState<any[]>([])

  React.useEffect(() => {
    let mounted = true
    Promise.all([getTasks(), getOrganizations()])
      .then(([tasksList, orgsList]) => {
        if (!mounted) return
        setTasks(tasksList)
        setOrgs(orgsList)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const statusCounts = tasks.reduce((acc: Record<string, number>, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1
    return acc
  }, {})

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: taskStatusLabels[status as TaskStatus] || status,
    value: count,
    status,
  }))

  const sectors = Array.from(new Set(tasks.map((t) => t.sector)))
  const sectorStats = sectors
    .map((sector) => {
      const sTasks = tasks.filter((t) => t.sector === sector)
      const completed = sTasks.filter((t) => t.status === "BAJARILDI" || t.status === "NAZORATDAN_YECHILDI").length
      const total = sTasks.length
      return {
        name: sectorLabels[sector as Sector] || sector,
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    })
    .sort((a, b) => b.total - a.total)

  const orgStats = orgs
    .map((org) => {
      const oTasks = tasks.filter((t) => t.organizations?.includes(org.id))
      const completed = oTasks.filter((t) => t.status === "BAJARILDI" || t.status === "NAZORATDAN_YECHILDI").length
      const total = oTasks.length
      return {
        name: org.name,
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    })
    .sort((a, b) => b.total - a.total)

  return (
    <>
      <Header title="Аналитика" description="Тизимнинг статистик кўрсаткичлари ва аналитик маълумотлари" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-200/15 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-purple-200/10 to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/3 left-1/2 w-48 h-48 bg-gradient-to-br from-cyan-200/8 to-transparent rounded-full blur-lg" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 py-8">

            {/* Overview Cards */}
            <section className="animate-slide-up">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
                        <p className="text-sm text-muted-foreground">Жами топшириқлар</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-linear-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">
                          {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'BAJARILDI' || t.status === 'NAZORATDAN_YECHILDI').length / tasks.length) * 100) : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">Бажарилганлик</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-linear-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{tasks.filter(t => t.status === 'MUDDATI_KECH').length}</p>
                        <p className="text-sm text-muted-foreground">Кечиккан топшириқлар</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{orgs.length}</p>
                        <p className="text-sm text-muted-foreground">Фаол ташкилотлар</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Charts Section */}
            <section className="animate-slide-up" style={{ animationDelay: "200ms" }}>
              <Tabs defaultValue="status" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-muted/20 rounded-xl p-1">
                  <TabsTrigger value="status" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Ҳолат бўйича</TabsTrigger>
                  <TabsTrigger value="sector" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Сўҳа бўйича</TabsTrigger>
                  <TabsTrigger value="organizations" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Ташкилотлар</TabsTrigger>
                </TabsList>
              </Tabs>
            </section>

            {/* Additional Metrics */}
            <section className="animate-slide-up" style={{ animationDelay: "400ms" }}>
              <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
                <CardContent className="p-6">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <Clock className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Ўртача ижро муддати</p>
                            <p className="text-2xl font-bold text-foreground">4.2 кун</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-linear-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                            <Target className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Ижро самарадорлиги</p>
                            <p className="text-2xl font-bold text-foreground">87%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-linear-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Кечикиш фоизи</p>
                            <p className="text-2xl font-bold text-foreground">8%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Умумий рейтинг</p>
                            <p className="text-2xl font-bold text-foreground">86.8</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </section>

          </div>
        </div>
      </div>
    </>
  )
}
