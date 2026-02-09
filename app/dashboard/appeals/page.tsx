"use client"

import { Header } from "@/components/layout/header"
import { useState, useEffect, useCallback, useMemo } from "react"
import { api, getAppeals } from "@/lib/api"
import { Appeal, FilterOptions } from "@/types"
import { AppealFilters } from "@/components/dashboard/appeals/appeal-filters"
import { AppealStats } from "@/components/dashboard/appeals/appeal-stats"
import { AppealTable } from "@/components/dashboard/appeals/appeal-table"
import { AppealDetailDialog } from "@/components/dashboard/appeals/appeal-detail-dialog"
import { useTranslation } from "@/lib/i18n/context"
import { PRIORITY_LABELS, STATUS_LABELS } from "@/components/dashboard/appeals/appeal-constants"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"

export default function AppealsPage() {
  const t = useTranslation()
  const pageRef = useGSAPPageEntrance()
  // State management
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [options, setOptions] = useState<FilterOptions>({ status: {}, priority: {}, category: {}, districts: [] })
  const [regions, setRegions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [districtFilter, setDistrictFilter] = useState("all")
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)

  // Data loading
  const loadRegions = useCallback(async () => {
    try {
      const response = await api.get<any>("/telegram-bot/regions/")
      const raw = Array.isArray(response.data) ? response.data : (response.data?.results ?? [])
      const names = raw
        .map((region: any) => region.name_uz || region.name || region.name_ru || region.name_en || "")
        .filter(Boolean)
      setRegions(names)
    } catch {
      setRegions([])
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
    loadRegions()
  }, [loadRegions])

  useEffect(() => {
    loadAppeals()
  }, [loadAppeals])

  useEffect(() => {
    const statusOptions: Record<string, string> = { all: "Barchasi" }
    const priorityOptions: Record<string, string> = { all: "Barchasi" }
    const categoryOptions: Record<string, string> = { all: "Barchasi" }

    const statusSet = new Set(appeals.map((appeal) => appeal.status).filter(Boolean))
    statusSet.forEach((status) => {
      statusOptions[status] = STATUS_LABELS[status] || status
    })

    const prioritySet = new Set(appeals.map((appeal) => appeal.priority).filter(Boolean))
    prioritySet.forEach((priority) => {
      priorityOptions[priority] = PRIORITY_LABELS[priority] || priority
    })

    const categorySet = new Set(appeals.map((appeal) => appeal.category).filter(Boolean))
    categorySet.forEach((category) => {
      categoryOptions[category] = category
    })

    const districtOptions = (regions.length
      ? regions
      : Array.from(new Set(appeals.map((appeal) => appeal.district).filter(Boolean)))
    ).sort((a, b) => a.localeCompare(b))

    setOptions({
      status: statusOptions,
      priority: priorityOptions,
      category: categoryOptions,
      districts: districtOptions,
    })
  }, [appeals, regions])

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
        <div className="p-6 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-slate-600 text-sm">Yuklanmoqda...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.pages.appeals.title} description={t.pages.appeals.description} />
      <div ref={pageRef} className="p-6 space-y-6">
        {/* Stats Cards */}
        <section data-gsap-section>
          <AppealStats stats={calculatedStats} />
        </section>

        {/* Filters */}
        <section data-gsap-section>
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
        </section>

        {/* Appeals Table */}
        <section data-gsap-section>
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
        </section>
      </div>
      <AppealDetailDialog appeal={selectedAppeal} onClose={() => setSelectedAppeal(null)} />
    </>
  )
}
