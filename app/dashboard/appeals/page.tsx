"use client"

import { Header } from "@/components/layout/header"
import { useState, useEffect, useCallback, useMemo } from "react"
import { getAppeals } from "@/lib/api"
import { Appeal, FilterOptions, Stats } from "@/types"
import { AppealFilters } from "@/components/dashboard/appeals/appeal-filters"
import { AppealStats } from "@/components/dashboard/appeals/appeal-stats"
import { AppealTable } from "@/components/dashboard/appeals/appeal-table"
import { AppealDetailDialog } from "@/components/dashboard/appeals/appeal-detail-dialog"

export default function AppealsPage() {
  // State management
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, inProgress: 0, resolved: 0 })
  const [options, setOptions] = useState<FilterOptions>({ status: {}, priority: {}, category: {}, districts: [] })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [districtFilter, setDistrictFilter] = useState("all")
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)

  // Data loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      // Mock data for now
      const mockStats: Stats = {
        total: 1247,
        pending: 423,
        inProgress: 189,
        resolved: 635
      }
      setStats(mockStats)

      const mockOptions: FilterOptions = {
        status: { all: "Барчаси", pending: "Кутилмоқда", in_progress: "Бажарилмоқда", resolved: "Ҳал этилган" },
        priority: { all: "Барчаси", low: "Паст", medium: "Ўртача", high: "Юқори" },
        category: { all: "Барчаси", social: "Ижтимоий", economic: "Иқтисодий", legal: "Ҳуқуқий", other: "Бошқа" },
        districts: ["Тошкент шаҳри", "Андижон вилояти", "Бухоро вилояти", "Фарғона вилояти", "Жиззах вилояти", "Қашқадарё вилояти", "Навоий вилояти", "Наманган вилояти", "Самарқанд вилояти", "Сирдарё вилояти", "Сурхондарё вилояти", "Тошкент вилояти", "Хоразм вилояти"]
      }
      setOptions(mockOptions)
    } catch (error) {
      // Error loading data
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAppeals = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAppeals()
      setAppeals(data || [])
    } catch (error) {
      setAppeals([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Effects
  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadAppeals()
  }, [loadAppeals])

  // Filtered appeals
  const filteredAppeals = useMemo(() => {
    return appeals.filter(appeal => {
      const matchesSearch = (appeal.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (appeal.citizenName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (appeal.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || appeal.status === statusFilter
      const matchesCategory = categoryFilter === "all" || appeal.category === categoryFilter
      const matchesPriority = priorityFilter === "all" || appeal.priority === priorityFilter
      const matchesDistrict = districtFilter === "all" || appeal.district === districtFilter

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority && matchesDistrict
    })
  }, [appeals, searchQuery, statusFilter, categoryFilter, priorityFilter, districtFilter])

  // Stats calculations
  const calculatedStats = useMemo(() => ({
    total: appeals.length,
    pending: appeals.filter(a => a.status === 'PENDING').length,
    inProgress: appeals.filter(a => a.status === 'IN_PROGRESS').length,
    resolved: appeals.filter(a => a.status === 'RESOLVED').length
  }), [appeals])

  // Event handlers
  const handleViewAppeal = (appeal: Appeal) => {
    setSelectedAppeal(appeal)
  }

  const handleArchiveAppeal = (appealId: string) => {
    setAppeals(prev => prev.filter(appeal => appeal.id !== appealId))
  }

  if (loading) {
    return (
      <>
        <Header title="Мурожаатлар" description="Фуқаролар мурожаатлари бошқаруви тизими" />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Юкланмоқда...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Мурожаатлар" description="Фуқаролар мурожаатлари бошқаруви тизими" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-200/15 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-purple-200/10 to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/3 left-1/2 w-48 h-48 bg-gradient-to-br from-cyan-200/8 to-transparent rounded-full blur-lg" />
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        </div>
        
        <div className="relative z-10 p-6 space-y-6">
          {/* Stats Cards */}
          <AppealStats stats={calculatedStats} />

          {/* Filters and Actions */}
          <AppealFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            districtFilter={districtFilter}
            onDistrictChange={setDistrictFilter}
            options={options}
          />

          {/* Appeals Table */}
          <AppealTable
            appeals={filteredAppeals}
            onView={handleViewAppeal}
            onArchive={handleArchiveAppeal}
          />
        </div>
      </div>
      <AppealDetailDialog appeal={selectedAppeal} onClose={() => setSelectedAppeal(null)} />
    </>
  )
}
