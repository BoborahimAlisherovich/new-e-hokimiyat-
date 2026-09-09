"use client"

import { Header } from "@/components/layout/header"
import { DashboardPageFrame } from "@/components/layout/dashboard-page-frame"
import { useState, useEffect, useCallback, useMemo } from "react"
import { api, getAppeals, getCurrentUser } from "@/lib/api"
import { Appeal, FilterOptions } from "@/types"
import { AppealFilters } from "@/components/dashboard/appeals/appeal-filters"
import { AppealStats } from "@/components/dashboard/appeals/appeal-stats"
import { AppealTable } from "@/components/dashboard/appeals/appeal-table"
import { AppealDetailDialog } from "@/components/dashboard/appeals/appeal-detail-dialog"
import { useTranslation } from "@/lib/i18n/context"
import { PRIORITY_LABELS, STATUS_LABELS } from "@/components/dashboard/appeals/appeal-constants"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { CircleAlert, MessageCircleMore, ShieldCheck, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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
  const [canCreateManual, setCanCreateManual] = useState(false)

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
    getCurrentUser()
      .then((user: any) => {
        const role = String(user?.role || "")
        setCanCreateManual(role === "HOKIM" || role === "HOKIM_YORDAMCHISI" || role === "ADMIN")
      })
      .catch(() => setCanCreateManual(false))
  }, [])

  useEffect(() => {
    const handleAppealsRead = () => loadAppeals()
    window.addEventListener("appealsRead", handleAppealsRead)
    return () => window.removeEventListener("appealsRead", handleAppealsRead)
  }, [loadAppeals])

  useEffect(() => {
    const statusOptions: Record<string, string> = { all: t.common.all }
    const priorityOptions: Record<string, string> = { all: t.common.all }
    const categoryOptions: Record<string, string> = { all: t.common.all }

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
  }, [appeals, regions, t.common.all])

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
        <Header title={t.pages.appeals.title} description={t.pages.appeals.description} />
        <div className="px-3 py-4 sm:px-4 lg:px-6 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-ring border-t-transparent mx-auto"></div>
            <p className="mt-4 text-muted-foreground text-sm">{t.pages.appeals.loading}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.pages.appeals.title} description={t.pages.appeals.description} />
      <div ref={pageRef}>
      <DashboardPageFrame
        eyebrow="Murojaatlar"
        title="Fuqarolar murojaatlari holati, ustuvorligi va oqimi bir markazda ko‘rinadi."
        description="Murojaatlarni tez saralash, nazoratga olish va javob jarayonini yo‘qotmasdan boshqarish uchun yagona ish maydoni."
        stats={[
          { label: "Jami", value: calculatedStats.total, icon: MessageCircleMore, tone: "from-cyan-500/18 to-cyan-100/70" },
          { label: "Kutilmoqda", value: calculatedStats.pending, icon: CircleAlert, tone: "from-amber-400/24 to-amber-100/75" },
          { label: "Hal etildi", value: calculatedStats.resolved, icon: ShieldCheck, tone: "from-emerald-500/18 to-emerald-100/70" },
        ]}
      >
        {/* Stats Cards */}
        <section data-gsap-section>
          <AppealStats stats={calculatedStats} />
        </section>

        {/* Filters */}
        <section data-gsap-section>
          {canCreateManual && (
            <div className="mb-3 flex items-center justify-end">
              <Button asChild className="gap-2">
                <Link href="/dashboard/appeals/new">
                  <Plus className="h-4 w-4" />
                  Qo'lda murojaat qo'shish
                </Link>
              </Button>
            </div>
          )}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:mb-4">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">Ko'rish: rol va biriktirish asosida</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">Jarayon boshqaruvi: hokimlik va tashkilot mas'ullari oqimida</span>
          </div>
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
          <div className="overflow-hidden rounded-[26px] border border-white/70 bg-white/78 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
            <div className="border-b border-border bg-gradient-to-r from-cyan-50/55 via-white/30 to-transparent px-4 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-foreground sm:text-lg">{t.pages.appeals.tableTitle}</h2>
            </div>
            <AppealTable
              appeals={filteredAppeals}
              onView={handleViewAppeal}
              onArchive={handleArchiveAppeal}
            />
          </div>
        </section>
      </DashboardPageFrame>
      </div>
      <AppealDetailDialog appeal={selectedAppeal} onClose={() => setSelectedAppeal(null)} />
    </>
  )
}
