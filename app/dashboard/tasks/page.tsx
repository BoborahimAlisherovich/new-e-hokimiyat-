"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreateTaskDialog } from "@/components/dashboard/tasks/create-task-dialog"
import { TaskFilters } from "@/components/dashboard/tasks/task-filters"
import { TaskStats } from "@/components/dashboard/tasks/task-stats"
import { TaskTable } from "@/components/dashboard/tasks/task-table"
import { TaskDetailDialog } from "@/components/dashboard/tasks/task-detail-dialog"
import type { Task } from "@/types"
import { getOrganizations, getTaskStats, getTasksPage, getUsers, deleteTask } from "@/lib/api"
import { ensureDevAuth } from "@/lib/dev-auth"
import { motion } from "framer-motion"
import { useTranslation } from "@/lib/i18n/context"


export default function TasksPage() {
  const t = useTranslation()
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  })

  // Build filters object - memoized to avoid recreation
  const buildTaskFilters = useCallback(() => {
    const filters: Record<string, string> = {}
    if (statusFilter && statusFilter !== "all") filters.status = statusFilter
    if (priorityFilter && priorityFilter !== "all") filters.priority = priorityFilter
    if (categoryFilter && categoryFilter !== "all") filters.category = categoryFilter
    return filters
  }, [statusFilter, priorityFilter, categoryFilter])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const filters = buildTaskFilters()
      const [usersData, orgsData, tasksPage, statsData] = await Promise.all([
        getUsers(),
        getOrganizations(),
        getTasksPage(filters, page, pageSize),
        getTaskStats(filters),
      ])
      setUsers(usersData || [])
      setOrganizations(orgsData || [])
      setTasks(tasksPage?.results || [])
      setTotalCount(tasksPage?.count ?? 0)
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">{t.common.loading}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.pages.tasks.title} description={t.pages.tasks.description} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-400/8 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-purple-400/6 to-transparent rounded-full blur-xl" />
        </div>
        
        <div className="relative z-10 p-6 space-y-6">
          <TaskStats
            total={stats.total}
            pending={stats.pending}
            inProgress={stats.inProgress}
            completed={stats.completed}
          />

          {/* Filters and Actions – redesigned for clarity and UX */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t.pages.tasks.filtersTitle}</CardTitle>
              </CardHeader>
            <CardContent>
              <TaskFilters
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                priorityFilter={priorityFilter}
                categoryFilter={categoryFilter}
                onSearchChange={setSearchQuery}
                onStatusChange={(value) => setStatusFilter(value as any)}
                onPriorityChange={(value) => setPriorityFilter(value as any)}
                onCategoryChange={setCategoryFilter}
                onCreate={handleCreateTask}
                onClear={() => {
                  setSearchQuery("")
                  setStatusFilter("all")
                  setPriorityFilter("all")
                  setCategoryFilter("all")
                }}
              />
            </CardContent>
          </Card>
          </motion.div>

          {/* Tasks Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl">
            <CardContent className="p-0">
              <TaskTable
                tasks={filteredTasks}
                onView={handleViewTask}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            </CardContent>
          </Card>
          </motion.div>

          <motion.div 
            className="flex items-center justify-between text-sm bg-white/95 backdrop-blur-xl shadow-lg p-5 rounded-2xl border border-slate-200 hover:shadow-xl transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-slate-700">
              {t.pages.tasks.totalLabel}: <span className="font-semibold text-slate-900">{totalCount}</span>
              {searchQuery && <span className="text-slate-600"> ({t.pages.tasks.filteredLabel}: <span className="font-semibold text-blue-600">{filteredTasks.length}</span>)</span>}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.pages.tasks.previous}
              </Button>
              <span className="font-semibold text-slate-900 bg-slate-100 px-4 py-1.5 rounded-lg">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.pages.tasks.next}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <TaskDetailDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        organizations={organizations}
        onCreated={loadData}
      />
    </>
  )
}
