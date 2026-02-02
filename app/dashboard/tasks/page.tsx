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
import type { Task, TaskCategory } from "@/types"
import { getOrganizations, getTaskStats, getTasksPage, getUsers } from "@/lib/api"
import { ensureDevAuth } from "@/lib/dev-auth"


export default function TasksPage() {
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const usersPromise = getUsers()
      const orgsPromise = getOrganizations()
      const tasksPromise = getTasksPage(buildTaskFilters(), page, pageSize)
      const statsPromise = getTaskStats(buildTaskFilters())
      const [usersData, orgsData, tasksPage, statsData] = await Promise.all([
        usersPromise,
        orgsPromise,
        tasksPromise,
        statsPromise,
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
  }, [statusFilter, priorityFilter, categoryFilter, page, pageSize])

  const CATEGORY_MAP: Record<string, string> = {
    "IJTIMOIY": "IJTIMOIY",
    "IQTISODIY": "IQTISODIY",
    "HUQUQIY": "HUQUQIY",
    "INFRASTRUKTURA": "INFRASTRUKTURA",
    "TA_LIM": "TA_LIM",
    "SOG_LIQNI_SAQLASH": "SOG_LIQNI_SAQLASH",
    "BOSHQA": "BOSHQA",
  }

  const buildTaskFilters = () => {
    const filters: any = {}
    if (statusFilter && statusFilter !== "all") filters.status = statusFilter
    if (priorityFilter && priorityFilter !== "all") filters.priority = priorityFilter
    if (categoryFilter && categoryFilter !== "all") {
      filters.category = CATEGORY_MAP[categoryFilter] || categoryFilter
    }
    return filters
  }

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
  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = (task.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (task.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
      const matchesCategory = categoryFilter === "all" || task.category === categoryFilter
      return matchesSearch && matchesStatus && matchesPriority && matchesCategory
    })
  }, [tasks, searchQuery, statusFilter, priorityFilter, categoryFilter])

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

  const handleDeleteTask = (taskId: number) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }

  if (loading) {
    return (
      <>
        <Header title="Топшириқлар бошқаруви" description="Барча топшириқларнинг рўйхати, фильтрлаш ва бошқаруви" />
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
      <Header title="Топшириқлар бошқаруви" description="Барча топшириқларнинг рўйхати, фильтрлаш ва бошқаруви" />
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
          <TaskStats
            total={stats.total}
            pending={stats.pending}
            inProgress={stats.inProgress}
            completed={stats.completed}
          />

          {/* Filters and Actions – redesigned for clarity and UX */}
          <Card className="bg-card border border-border shadow-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Фильтрлаш ва қидирув</CardTitle>
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

          {/* Tasks Table */}
          <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
            <CardContent className="p-0">
              <TaskTable
                tasks={filteredTasks}
                onView={handleViewTask}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Жами: <span className="font-medium text-foreground">{totalCount}</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Oldingi
              </Button>
              <span>
                {page} / {Math.max(1, Math.ceil(totalCount / pageSize))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize)}
              >
                Keyingi
              </Button>
            </div>
          </div>
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
