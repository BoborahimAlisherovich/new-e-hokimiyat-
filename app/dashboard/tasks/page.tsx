"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Header } from "@/components/layout/header"
import { DashboardPageFrame } from "@/components/layout/dashboard-page-frame"
import { Button } from "@/components/ui/button"
import { CreateTaskDialog } from "@/components/dashboard/tasks/create-task-dialog"
import { TaskFilters } from "@/components/dashboard/tasks/task-filters"
import { TaskStats } from "@/components/dashboard/tasks/task-stats"
import { TaskTable } from "@/components/dashboard/tasks/task-table"
import { TaskDetailDialog } from "@/components/dashboard/tasks/task-detail-dialog"
import type { Task } from "@/types"
import { getOrganizations, getTaskStats, getTasksPage, getUsers, deleteTask, getCurrentUser } from "@/lib/api"
import { useTranslation } from "@/lib/i18n/context"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { CheckCircle2, Clock3, ListTodo, Mic, Plus, Sparkles } from "lucide-react"


export default function TasksPage() {
  const t = useTranslation()
  const pageRef = useGSAPPageEntrance()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<Task["status"] | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<Task["priority"] | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [organizationFilter, setOrganizationFilter] = useState<string>("all")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createTaskMode, setCreateTaskMode] = useState<"manual" | "audio">("manual")
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  })
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Rolga qarab topshiriq yaratish imkoniyati
  const canCreateTask = Boolean(currentUser?.permissions?.can_create_tasks)
  const isDistrictGovernor = currentUser?.role === "HOKIM"
  const visibleOrganizations = useMemo(() => {
    if (!currentUser) return organizations

    if (currentUser.role === "TASHKILOT_RAHBARI") {
      const currentOrgId =
        typeof currentUser.organization === "object" && currentUser.organization?.id
          ? String(currentUser.organization.id)
          : String(currentUser.organization_id || "")
      return organizations.filter((org) => String(org.id) === currentOrgId)
    }

    if (currentUser.role === "HOKIM_YORDAMCHISI") {
      const currentSectorId =
        typeof currentUser.sector === "object" && currentUser.sector?.id
          ? String(currentUser.sector.id)
          : String(currentUser.sector_id || "")
      return organizations.filter((org: any) => String(org.sector ?? org.sector_id ?? "") === currentSectorId)
    }

    return organizations
  }, [organizations, currentUser])

  // Build filters object - memoized to avoid recreation
  const buildTaskFilters = useCallback(() => {
    const filters: Record<string, string> = {}
    if (statusFilter && statusFilter !== "all") filters.status = statusFilter
    if (priorityFilter && priorityFilter !== "all") filters.priority = priorityFilter
    if (categoryFilter && categoryFilter !== "all") filters.category = categoryFilter
    if (organizationFilter && organizationFilter !== "all") filters.organization = organizationFilter
    return filters
  }, [statusFilter, priorityFilter, categoryFilter, organizationFilter])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const filters = buildTaskFilters()
      const [usersData, orgsData, tasksPage, statsData, me] = await Promise.all([
        getUsers(),
        getOrganizations(),
        getTasksPage(filters, page, pageSize, '-created_at'),
        getTaskStats(filters),
        getCurrentUser(),
      ])
      setUsers(usersData || [])
      setOrganizations(orgsData || [])
      setTasks(tasksPage?.results || [])
      setTotalCount(tasksPage?.count ?? 0)
      setCurrentUser(me)
      setStats({
        total: statsData.total ?? 0,
        pending: statsData.pending ?? 0,
        inProgress: statsData.in_progress ?? 0,
        completed: statsData.completed ?? 0,
      })
    } catch (error) {
      console.error("Tasks load error:", error)
      setUsers([])
      setOrganizations([])
      setTasks([])
      setTotalCount(0)
      setStats({
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [buildTaskFilters, page, pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (typeof window === "undefined") return
    const media = window.matchMedia?.("(max-width: 767px)")
    const apply = () => setPageSize(media?.matches ? 20 : 50)
    apply()
    media?.addEventListener?.("change", apply)
    return () => media?.removeEventListener?.("change", apply)
  }, [])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, priorityFilter, categoryFilter])

  useEffect(() => {
    if (!isDistrictGovernor && categoryFilter !== "all") {
      setCategoryFilter("all")
    }
  }, [categoryFilter, isDistrictGovernor])

  // Client-side search filter only (status/priority/category are handled server-side)
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks
    const query = searchQuery.toLowerCase()
    return tasks.filter(task => 
      (task.title || '').toLowerCase().includes(query) ||
      (task.description || '').toLowerCase().includes(query)
    )
  }, [tasks, searchQuery])

  // Event handlers
  const handleViewTask = (task: Task) => {
    setSelectedTask(task)
  }

  const handleCreateTask = (mode: "manual" | "audio" = "manual") => {
    setCreateTaskMode(mode)
    setIsCreateDialogOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm(t.pages.tasks.deleteConfirm)) return
    try {
      await deleteTask(taskId)
      setTasks(prev => prev.filter(task => task.id !== taskId))
    } catch (error) {
      console.error("Delete task error:", error)
      alert(t.pages.tasks.deleteError)
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  if (loading) {
    return (
      <>
        <Header title={t.pages.tasks.title} description={t.pages.tasks.description} />
        <div className="p-6 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-slate-500 text-sm">{t.common.loading}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.pages.tasks.title} description={t.pages.tasks.description} />
      <div ref={pageRef}>
      <DashboardPageFrame
        eyebrow="Topshiriqlar"
        title="Ijro intizomi, yuklama va nazorat bir joyda boshqariladi."
        description="Filtrlash, nazorat va bajarilish holatini bir ekranda kuzatib, muhim topshiriqlarni tezroq boshqarish mumkin."
        stats={[
          { label: "Jami", value: totalCount, icon: ListTodo, tone: "from-cyan-500/18 to-cyan-100/70" },
          { label: "Ijroda", value: stats.inProgress, icon: Clock3, tone: "from-amber-400/24 to-amber-100/75" },
          { label: "Bajarildi", value: stats.completed, icon: CheckCircle2, tone: "from-emerald-500/18 to-emerald-100/70" },
        ]}
      >
        {/* Stats */}
        <section data-gsap-section>
          <TaskStats
            total={stats.total}
            pending={stats.pending}
            inProgress={stats.inProgress}
            completed={stats.completed}
          />
        </section>

        {/* Filters */}
        <section data-gsap-section>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">Ko'rish: rolga mos topshiriq oqimi</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">Boshqaruv: hokim, hokim o'rinbosari, administrator</span>
          </div>
          <div className="rounded-[26px] border border-white/70 bg-white/78 p-5 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
            <h3 className="text-base font-semibold text-slate-800 mb-4">{t.pages.tasks.filtersTitle}</h3>
            <TaskFilters
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            categoryFilter={categoryFilter}
            showCategoryFilter={isDistrictGovernor}
            organizationFilter={organizationFilter}
            organizations={visibleOrganizations}
            onSearchChange={setSearchQuery}
            onStatusChange={(value) => setStatusFilter(value as any)}
            onPriorityChange={(value) => setPriorityFilter(value as any)}
            onCategoryChange={setCategoryFilter}
            onOrganizationChange={setOrganizationFilter}
            onCreate={handleCreateTask}
            showCreateButton={canCreateTask}
            onClear={() => {
              setSearchQuery("")
              setStatusFilter("all")
              setPriorityFilter("all")
              setCategoryFilter("all")
              setOrganizationFilter("all")
            }}
          />
        </div>
        </section>

        {/* Tasks Table */}
        <section data-gsap-section>
          <div className="overflow-hidden rounded-[26px] border border-white/70 bg-white/78 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
            <div className="border-b border-cyan-100/60 bg-gradient-to-r from-cyan-50/55 via-white/30 to-transparent px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">{t.pages.tasks.tableTitle}</h2>
            </div>
            <TaskTable
              tasks={filteredTasks}
              onView={handleViewTask}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          </div>
        </section>

        {/* Pagination */}
        <section data-gsap-section>
          <div className="flex flex-col items-center justify-between gap-4 rounded-[24px] border border-white/70 bg-white/78 p-4 shadow-[0_20px_46px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl sm:flex-row">
          <div className="text-sm text-slate-600">
            {t.pages.tasks.totalLabel}: <span className="font-semibold text-slate-800">{totalCount}</span>
            {searchQuery && <span className="ml-2">({t.pages.tasks.filteredLabel}: <span className="font-semibold text-blue-600">{filteredTasks.length}</span>)</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-sm"
            >
              {t.pages.tasks.previous}
            </Button>
            <span className="text-sm font-medium text-slate-700 px-3 py-1.5 bg-slate-100 rounded-md">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="text-sm"
            >
              {t.pages.tasks.next}
            </Button>
          </div>
        </div>
        </section>
      </DashboardPageFrame>
      </div>

      <TaskDetailDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        organizations={organizations}
        onCreated={loadData}
        preferredInputMode={createTaskMode}
      />

      {canCreateTask && (
        <div className="fixed inset-x-0 bottom-4 z-30 px-4 sm:hidden">
          <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border border-cyan-100/70 bg-white/92 p-2 shadow-[0_22px_48px_-26px_rgba(2,132,199,0.45)] backdrop-blur-xl">
            <Button
              type="button"
              onClick={() => handleCreateTask("audio")}
              className="h-12 flex-1 rounded-xl bg-cyan-600 text-white shadow-sm hover:bg-cyan-700"
            >
              <Mic className="mr-2 h-4 w-4" />
              Audio orqali
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleCreateTask("manual")}
              className="h-12 flex-1 rounded-xl border-slate-200 bg-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Yangi topshiriq
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-cyan-600" />
            Telefon uchun tezkor yaratish pastki panel orqali ishlaydi
          </div>
        </div>
      )}
    </>
  )
}
