"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateTaskDialog } from "@/components/dashboard/tasks/create-task-dialog"
import { TaskFilters } from "@/components/dashboard/tasks/task-filters"
import { TaskStats } from "@/components/dashboard/tasks/task-stats"
import { TaskTable } from "@/components/dashboard/tasks/task-table"
import { TaskDetailDialog } from "@/components/dashboard/tasks/task-detail-dialog"
import type { Task, TaskCategory } from "@/types"
import { getOrganizations, getTasks, getUsers } from "@/lib/api"
import { ensureDevAuth } from "@/lib/dev-auth"


export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<Task["status"] | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<Task["priority"] | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const usersPromise = getUsers()
      const orgsPromise = getOrganizations()
      const tasksPromise = getTasks(buildTaskFilters())
      const [usersData, orgsData, tasksData] = await Promise.all([usersPromise, orgsPromise, tasksPromise])
      setUsers(usersData || [])
      setOrganizations(orgsData || [])
      setTasks(tasksData || [])
    } catch (error) {
      setUsers([])
      setOrganizations([])
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, priorityFilter, categoryFilter, searchQuery])

  const CATEGORY_MAP: Record<string, TaskCategory> = {
    "Ижтимоий": "IJRO",
    "Иқтисодий": "NAZORAT",
    "Ҳуқуқий": "HISOBOT",
    "Бошқа": "BOSHQA",
  }

  const buildTaskFilters = () => {
    const filters: any = {}
    if (statusFilter && statusFilter !== "all") filters.status = statusFilter
    if (priorityFilter && priorityFilter !== "all") filters.priority = priorityFilter
    if (categoryFilter && categoryFilter !== "all") {
      filters.category = CATEGORY_MAP[categoryFilter] || categoryFilter
    }
    if (searchQuery) filters.search = searchQuery
    return filters
  }

  useEffect(() => {
    const init = async () => {
      await ensureDevAuth()
      await loadData()
    }
    init()
  }, [loadData])
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

  // Stats calculations
  // Stats based on backend TaskStatus values
  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'YANGI').length,
    inProgress: tasks.filter(t => t.status === 'QABUL_QILINDI' || t.status === 'JARAYONDA').length,
    completed: tasks.filter(t => t.status === 'BAJARILDI').length,
  }), [tasks])

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
