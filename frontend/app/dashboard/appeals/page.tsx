"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Search, 
  Filter, 
  MessageSquare, 
  User, 
  Calendar, 
  MoreHorizontal,
  Eye,
  Archive
} from "lucide-react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getAppeals } from "@/lib/api"
import { Appeal, FilterOptions, Stats } from "@/types"

// Constants
const PRIORITY_COLORS = {
  LOW: "bg-gray-100 text-gray-800 border-gray-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  HIGH: "bg-red-100 text-red-800 border-red-200"
}

const STATUS_COLORS = {
  PENDING: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-orange-100 text-orange-800 border-orange-200",
  RESOLVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200"
}

const PRIORITY_LABELS = {
  LOW: "Паст",
  MEDIUM: "Ўртача", 
  HIGH: "Юқори"
}

const STATUS_LABELS = {
  PENDING: "Кутилмоқда",
  IN_PROGRESS: "Бажарилмоқда",
  RESOLVED: "Ҳал этилган",
  REJECTED: "Рад этилган"
}

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

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
      console.error("Error loading data:", error)
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
      console.error("Error loading appeals:", error)
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
    const mapStatus = (key: string) => {
      switch (key) {
        case 'pending':
          return 'PENDING'
        case 'in_progress':
          return 'IN_PROGRESS'
        case 'resolved':
          return 'RESOLVED'
        case 'rejected':
          return 'REJECTED'
        default:
          return key?.toUpperCase()
      }
    }

    return appeals.filter(appeal => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = (appeal.subject || '').toLowerCase().includes(q) ||
        (appeal.citizenName || '').toLowerCase().includes(q) ||
        (appeal.description || '').toLowerCase().includes(q)

      const matchesStatus = statusFilter === 'all' || (appeal.status || '').toUpperCase() === mapStatus(statusFilter)
      const matchesCategory = categoryFilter === 'all' || (appeal.category || '').toLowerCase() === (categoryFilter || '').toLowerCase()
      const matchesPriority = priorityFilter === 'all' || (appeal.priority || '').toUpperCase() === (priorityFilter || '').toUpperCase()
      const matchesDistrict = districtFilter === 'all' || (appeal.district || '').toLowerCase() === (districtFilter || '').toLowerCase()

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

  const handleCreateAppeal = () => {
    setIsCreateDialogOpen(true)
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Жами мурожаатлар</p>
                    <p className="text-2xl font-bold">{calculatedStats.total}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Кутилмоқда</p>
                    <p className="text-2xl font-bold text-blue-600">{calculatedStats.pending}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Бажарилмоқда</p>
                    <p className="text-2xl font-bold text-orange-600">{calculatedStats.inProgress}</p>
                  </div>
                  <Search className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ҳал этилган</p>
                    <p className="text-2xl font-bold text-green-600">{calculatedStats.resolved}</p>
                  </div>
                  <Archive className="h-8 w-8 text-green-600" />
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
                    placeholder="Мурожаатларни қидирув..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Ҳолат</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ҳолатни танланг" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(options.status).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Муҳимлик даражаси</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Муҳимликни танланг" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(options.priority).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Соҳалар</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Соҳани танланг" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(options.category).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Ҳудудлар</Label>
                  <Select value={districtFilter} onValueChange={setDistrictFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ҳудудни танланг" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Барчаси</SelectItem>
                      {options.districts.map(district => (
                        <SelectItem key={district} value={district}>{district}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appeals Table */}
          <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Фуқаро</TableHead>
                    <TableHead>Мавзу</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Ҳолат</TableHead>
                    {/* Priority column removed */}
                    <TableHead>Ҳудуд</TableHead>
                    <TableHead>Сана</TableHead>
                    <TableHead>Амаллар</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppeals.map((appeal) => (
                    <TableRow key={appeal.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{appeal.citizenName}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={appeal.subject}>
                          {appeal.subject}
                        </div>
                      </TableCell>
                      <TableCell>{appeal.category}</TableCell>
                      <TableCell>
                        <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[appeal.status])}>
                          {STATUS_LABELS[appeal.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("px-2 py-1 text-xs font-medium", PRIORITY_COLORS[appeal.priority])}>
                          {PRIORITY_LABELS[appeal.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>{appeal.district}</TableCell>
                      <TableCell>{new Date(appeal.createdAt).toLocaleDateString("uz-UZ")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewAppeal(appeal)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Батафсил
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchiveAppeal(appeal.id)}>
                              <Archive className="mr-2 h-4 w-4" />
                              Архивлаш
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

      {/* Appeal Detail Dialog */}
      <Dialog open={!!selectedAppeal} onOpenChange={() => setSelectedAppeal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Мурожаат тафсилотлари</DialogTitle>
            <DialogDescription>
              Мурожаат ҳақида тўлиқ маълумотлар
            </DialogDescription>
          </DialogHeader>
          {selectedAppeal && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Фуқаро</label>
                  <p className="font-medium">{selectedAppeal.citizenName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Телефон</label>
                  <p className="font-medium">{selectedAppeal.citizenPhone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="font-medium">{selectedAppeal.citizenEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ҳудуд</label>
                  <p className="font-medium">{selectedAppeal.district}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Мавзу</label>
                <p className="font-medium">{selectedAppeal.subject}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Тафсилотлар</label>
                <p className="text-muted-foreground whitespace-pre-wrap">{selectedAppeal.description}</p>
              </div>
              
              <div className="flex gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Ҳолат</label>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[selectedAppeal.status])}>
                    {STATUS_LABELS[selectedAppeal.status]}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Муҳимлик</label>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", PRIORITY_COLORS[selectedAppeal.priority])}>
                    {PRIORITY_LABELS[selectedAppeal.priority]}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAppeal(null)}>
              Ёпиш
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
