"use client"

import { Header } from "@/components/layout/header"
import { useState, useEffect, useCallback, useMemo } from "react"
import { getAppeals } from "@/lib/api"
import { Appeal, FilterOptions, Stats } from "@/types"
import { AppealFilters } from "@/components/dashboard/appeals/appeal-filters"
import { AppealStats } from "@/components/dashboard/appeals/appeal-stats"
import { AppealTable } from "@/components/dashboard/appeals/appeal-table"
import { AppealDetailDialog } from "@/components/dashboard/appeals/appeal-detail-dialog"
import { useTranslation } from "@/lib/i18n/context"

export default function AppealsPage() {
  const t = useTranslation()
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
        status: { all: "Barchasi", pending: "Kutilmoqda", in_progress: "Bajarilmoqda", resolved: "Hal etilgan" },
        priority: { all: "Barchasi", low: "Past", medium: "O'rtacha", high: "Yuqori" },
        category: { all: "Barchasi", social: "Ijtimoiy", economic: "Iqtisodiy", legal: "Huquqiy", other: "Boshqa" },
        districts: ["Hatirchi tumani"]
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
        <Header title="Murojaatlar" description="Fuqarolar murojaatlari boshqaruvi tizimi" />
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-slate-600 text-sm">Yuklanmoqda...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.pages.appeals.title} description={t.pages.appeals.description} />
      <div className="space-y-6">
        {/* Stats Cards */}
        <AppealStats stats={calculatedStats} />

        {/* Filters */}
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
          totalCount={appeals.length}
          filteredCount={filteredAppeals.length}
        />

        {/* Appeals Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Murojaatlar Jadvali</h2>
          </div>
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
