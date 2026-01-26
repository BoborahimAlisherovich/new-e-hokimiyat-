"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Archive,
} from "lucide-react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Task, FilterOptions } from "@/types"
import { getTasks, getUsers } from "@/lib/api"

// Constants
const PRIORITY_COLORS = {
  LOW: "bg-gray-100 text-gray-800 border-gray-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  URGENT: "bg-red-100 text-red-800 border-red-200"
}

const STATUS_COLORS = {
  PENDING: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-orange-100 text-orange-800 border-orange-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200"
}

const PRIORITY_LABELS = {
  LOW: "Паст",
  MEDIUM: "Ўртача", 
  HIGH: "Юқори",
  URGENT: "Фавқул"
}

const STATUS_LABELS = {
  PENDING: "Кутилмоқда",
  IN_PROGRESS: "Бажарилмоқда",
  COMPLETED: "Тугатилган",
  CANCELLED: "Бекор қилинган"
}

export default function TasksPage() {
  // State management
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as Task["priority"],
    category: "",
    assignedTo: "",
    dueDate: ""
  })

  // Data loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [tasksData, usersData] = await Promise.all([
        getTasks(),
        getUsers()
      ])
      setTasks(tasksData || [])
      setUsers(usersData || [])
    } catch (error) {
      setTasks([])
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Effects
  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
      const matchesCategory = categoryFilter === "all" || task.category === categoryFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory
    })
  }, [tasks, searchQuery, statusFilter, priorityFilter, categoryFilter])

  // Stats calculations
  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length
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

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }

  const handleCreateSubmit = async () => {
    try {
      // API call to create task
      console.log("Creating task:", createFormData)
      setIsCreateDialogOpen(false)
      setCreateFormData({
        title: "",
        description: "",
        priority: "MEDIUM",
        category: "",
        assignedTo: "",
        dueDate: ""
      })
      await loadData()
    } catch (error) {
      // Handle error
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setCreateFormData(prev => ({
      ...prev,
      [field]: value
    }))
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
          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Жами топшириқлар</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Кутилмоқда</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Бажарилмоқда</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Тугатилган</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Фильтрлаш ва қидирув</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex-1">
                  <Input
                    placeholder="Топшириқларни қидирув..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button onClick={handleCreateTask} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Янги топшириқ
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ҳолатни танланг" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Барча ҳолатлар</SelectItem>
                    <SelectItem value="PENDING">Кутилмоқда</SelectItem>
                    <SelectItem value="IN_PROGRESS">Бажарилмоқда</SelectItem>
                    <SelectItem value="COMPLETED">Тугатилган</SelectItem>
                    <SelectItem value="CANCELLED">Бекор қилинган</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Муҳимликни танланг" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Барча муҳимликлар</SelectItem>
                    <SelectItem value="LOW">Паст</SelectItem>
                    <SelectItem value="MEDIUM">Ўртача</SelectItem>
                    <SelectItem value="HIGH">Юқори</SelectItem>
                    <SelectItem value="URGENT">Фавқул</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Категорияни танланг" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Барча категориялар</SelectItem>
                    <SelectItem value="Ижтимоий">Ижтимоий</SelectItem>
                    <SelectItem value="Иқтисодий">Иқтисодий</SelectItem>
                    <SelectItem value="Ҳуқуқий">Ҳуқуқий</SelectItem>
                    <SelectItem value="Бошқа">Бошқа</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Table */}
          <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сарлавҳа</TableHead>
                    <TableHead>Топшириқ</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Муҳимлик</TableHead>
                    <TableHead>Жавобгар</TableHead>
                    <TableHead>Муддат</TableHead>
                    <TableHead>Ҳолат</TableHead>
                    <TableHead>Амаллар</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                              {task.assignedTo?.firstName?.charAt(0)}{task.assignedTo?.lastName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{task.assignedTo?.firstName} {task.assignedTo?.lastName}</div>
                            <div className="text-sm text-muted-foreground">{task.assignedTo?.position}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={task.title}>
                          {task.title}
                        </div>
                      </TableCell>
                      <TableCell>{task.category}</TableCell>
                      <TableCell>
                        <Badge className={cn("px-2 py-1 text-xs font-medium", PRIORITY_COLORS[task.priority])}>
                          {PRIORITY_LABELS[task.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.createdBy?.firstName} {task.createdBy?.lastName}</TableCell>
                      <TableCell>{new Date(task.dueDate).toLocaleDateString("uz-UZ")}</TableCell>
                      <TableCell>
                        <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[task.status])}>
                          {STATUS_LABELS[task.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewTask(task)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Батафсил
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditTask(task)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Таҳрирлаш
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteTask(task.id)}>
                              <Archive className="mr-2 h-4 w-4" />
                              Ўчириш
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Топшириқ тафсилотлари</DialogTitle>
            <DialogDescription>
              Топшириқ ҳақида тўлиқ маълумотлар
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Сарлавҳа</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                      {selectedTask.assignedTo?.firstName?.charAt(0)}{selectedTask.assignedTo?.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-lg">
                      {selectedTask.assignedTo?.firstName} {selectedTask.assignedTo?.lastName}
                    </div>
                    <div className="text-muted-foreground">{selectedTask.assignedTo?.position}</div>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Топшириқ</Label>
                  <p className="font-medium">{selectedTask.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Категория</Label>
                  <p className="font-medium">{selectedTask.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Муҳимлик</Label>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", PRIORITY_COLORS[selectedTask.priority])}>
                    {PRIORITY_LABELS[selectedTask.priority]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Муддат</Label>
                  <p className="font-medium">{new Date(selectedTask.dueDate).toLocaleDateString("uz-UZ")}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Тафсилотлар</Label>
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedTask.description}</p>
              </div>
              
              <div className="flex gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Ҳолат</Label>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[selectedTask.status])}>
                    {STATUS_LABELS[selectedTask.status]}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Яратувчи</Label>
                  <p className="font-medium">{selectedTask.createdBy?.firstName} {selectedTask.createdBy?.lastName}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>
              Ёпиш
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Янги топшириқ қўшиш</DialogTitle>
            <DialogDescription>
              Тизимга янги топшириқ қўшиш учун маълумотларни киритинг
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Топшириқ номи</Label>
              <Input
                id="title"
                value={createFormData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Топшириқ номини киритинг"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Тафсилотлар</Label>
              <Textarea
                id="description"
                value={createFormData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Топшириқ ҳақида тўлиқ маълумотларни киритинг"
                rows={4}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priority">Муҳимлик</Label>
                <Select value={createFormData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Паст</SelectItem>
                    <SelectItem value="MEDIUM">Ўртача</SelectItem>
                    <SelectItem value="HIGH">Юқори</SelectItem>
                    <SelectItem value="URGENT">Фавқул</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <Input
                  id="category"
                  value={createFormData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  placeholder="Категорияни киритинг"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Жавобгар</Label>
                <Select value={createFormData.assignedTo} onValueChange={(value) => handleInputChange("assignedTo", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Жавобгарни танланг" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} - {user.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Муддат</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={createFormData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Бекор қилиш
            </Button>
            <Button onClick={handleCreateSubmit}>
              Қўшиш
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
