"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { CreateTaskDialog } from "@/components/dashboard/tasks/create-task-dialog"
import { TaskFilters } from "@/components/dashboard/tasks/task-filters"
import { TaskStats } from "@/components/dashboard/tasks/task-stats"
import { TaskTable } from "@/components/dashboard/tasks/task-table"
import { TaskDetailDialog } from "@/components/dashboard/tasks/task-detail-dialog"
import type { Task } from "@/types"
import { getOrganizations, getTaskStats, getTasksPage, getUsers, deleteTask, getCurrentUser } from "@/lib/api"
import { ensureDevAuth } from "@/lib/dev-auth"
import { useTranslation } from "@/lib/i18n/context"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"


export default function TasksPage() {
  const t = useTranslation()
  const pageRef = useGSAPPageEntrance()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(100)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<Task["status"] | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<Task["priority"] | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [organizationFilter, setOrganizationFilter] = useState<string>("all")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  })
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Rolga qarab topshiriq yaratish imkoniyati
  const canCreateTask = currentUser?.role && ['HOKIM', 'HOKIMLIK_MASUL', 'ADMIN'].includes(currentUser.role)

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
    const init = async () => {
      await ensureDevAuth()
      await loadData()
    }
    init()
  }, [loadData])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, priorityFilter, categoryFilter])

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

  const handleCreateTask = () => {
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
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-slate-600 text-sm">{t.common.loading}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.pages.tasks.title} description={t.pages.tasks.description} />
      <div ref={pageRef} className="p-6 space-y-6">
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
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">{t.pages.tasks.filtersTitle}</h3>
            <TaskFilters
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            categoryFilter={categoryFilter}
            organizationFilter={organizationFilter}
            organizations={organizations}
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
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Topshiriqlar Jadvali</h2>
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
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
      />
    </>
  )
}
