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
  MoreHorizontal,
  Eye,
  Edit,
  Lock,
  UserCheck,
  Shield,
  AlertCircle,
  Building,
  Archive,
  Phone,
  Mail,
  Loader2,
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { User, Organization } from "@/types"
import { getUsers, getOrganizations } from "@/lib/api"
import { cn } from "@/lib/utils"

// Constants
const ROLE_COLORS = {
  ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
  MODERATOR: "bg-blue-100 text-blue-800 border-blue-200",
  OPERATOR: "bg-green-100 text-green-800 border-green-200",
  USER: "bg-gray-100 text-gray-800 border-gray-200"
}

const STATUS_COLORS = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  INACTIVE: "bg-red-100 text-red-800 border-red-200"
}

const ROLE_LABELS = {
  ADMIN: "Администратор",
  MODERATOR: "Модератор", 
  OPERATOR: "Оператор",
  USER: "Фойдаланувчи"
}

const STATUS_LABELS = {
  ACTIVE: "Актив",
  INACTIVE: "Нофаол"
}

// Helper functions
const maskPnfl = (pnfl: string): string => {
  if (!pnfl || pnfl.length !== 14) return pnfl
  return `${pnfl.slice(0, 3)} ${pnfl.slice(3, 6)} ${pnfl.slice(6, 9)} ${pnfl.slice(9, 13)} ${pnfl.slice(13, 14)}`
}

const roleCabinet = (role: string): string => {
  const cabinets: Record<string, string> = {
    ADMIN: "/admin/dashboard",
    MODERATOR: "/moderator/dashboard", 
    OPERATOR: "/operator/dashboard",
    USER: "/user/dashboard"
  }
  return cabinets[role] || "/dashboard"
}

export default function UsersPage() {
  // State management
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [organizationFilter, setOrganizationFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    phone: "",
    pnfl: "",
    position: "",
    role: "USER" as User["role"],
    organizationId: ""
  })

  // Data loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [usersData, orgsData] = await Promise.all([
        getUsers(),
        getOrganizations()
      ])
      setUsers(usersData || [])
      setOrganizations(orgsData || [])
      setError(null)
    } catch (error) {
        console.error("Error loading data:", error)
        setError("Маълумотларни юклашда хатолик юз берди")
    } finally {
        setLoading(false)
    }
  }, [])

  // Effects
  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.phone.includes(searchQuery)
      
      const matchesRole = roleFilter === "all" || user.role === roleFilter
      const matchesStatus = statusFilter === "all" || user.status === statusFilter
      const matchesOrganization = organizationFilter === "all" || user.organization?.id === organizationFilter

      return matchesSearch && matchesRole && matchesStatus && matchesOrganization
    })
  }, [users, searchQuery, roleFilter, statusFilter, organizationFilter])

  // Event handlers
  const handleViewUser = (user: User) => {
    setSelectedUser(user)
  }

  const handleCreateUser = () => {
    setIsCreateDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId))
  }

  const handleCreateSubmit = async () => {
    try {
      // API call to create user
      console.log("Creating user:", createFormData)
      setIsCreateDialogOpen(false)
      setCreateFormData({
        firstName: "",
        lastName: "",
        middleName: "",
        email: "",
        phone: "",
        pnfl: "",
        position: "",
        role: "USER",
        organizationId: ""
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
        <Header title="Фойдаланувчилар бошқаруви" description="Тизим фойдаланувчиларининг рўйхати, роллари ва бошқаруви" />
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

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Header title="Фойдаланувчилар бошқаруви" description="Тизим фойдаланувчиларининг рўйхати, роллари ва бошқаруви" />
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
                    <p className="text-sm font-medium text-muted-foreground">Жами фойдаланувчилар</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Актив фойдаланувчилар</p>
                    <p className="text-2xl font-bold text-green-600">
                      {users.filter(u => u.status === 'ACTIVE').length}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Нофаол фойдаланувчилар</p>
                    <p className="text-2xl font-bold text-red-600">
                      {users.filter(u => u.status === 'INACTIVE').length}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ташкилотлар</p>
                    <p className="text-2xl font-bold text-blue-600">{organizations.length}</p>
                  </div>
                  <Building className="h-8 w-8 text-blue-600" />
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
                    placeholder="Фойдаланувчиларни қидирув..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button onClick={handleCreateUser} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Янги фойдаланувчи
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full bg-background/50 border-2 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Ролни танланг" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl">
                    <SelectItem value="all">Барчаси</SelectItem>
                    <SelectItem value="ADMIN">Администратор</SelectItem>
                    <SelectItem value="MODERATOR">Модератор</SelectItem>
                    <SelectItem value="OPERATOR">Оператор</SelectItem>
                    <SelectItem value="USER">Фойдаланувчи</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full bg-background/50 border-2 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Ҳолатни танланг" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl">
                    <SelectItem value="all">Барчаси</SelectItem>
                    <SelectItem value="ACTIVE">Актив</SelectItem>
                    <SelectItem value="INACTIVE">Нофаол</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                  <SelectTrigger className="w-full bg-background/50 border-2 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Ташкилотни танланг" />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl max-h-60 overflow-y-auto">
                    <SelectItem value="all">Барчаси</SelectItem>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>ПНФЛ</TableHead>
                    <TableHead>Лавозим</TableHead>
                    <TableHead>Ташкилот</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Ҳолат</TableHead>
                    <TableHead>Рўйхат</TableHead>
                    <TableHead>Амаллар</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.lastName} {user.firstName} {user.middleName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.position}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{maskPnfl(user.pnfl)}</TableCell>
                      <TableCell>{user.position}</TableCell>
                      <TableCell>{user.organization?.name || "Ташкилот белгиланмаган"}</TableCell>
                      <TableCell>
                        <Badge className={cn("px-2 py-1 text-xs font-medium", ROLE_COLORS[user.role])}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[user.status])}>
                          {STATUS_LABELS[user.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString("uz-UZ")}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewUser(user)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Батафсил
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Таҳрирлаш
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteUser(user.id)}>
                              <Archive className="mr-2 h-4 w-4" />
                              Ўчириш
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={roleCabinet(user.role)} className="flex items-center">
                                <Lock className="mr-2 h-4 w-4" />
                                Кабинетга ўтиш
                              </Link>
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

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Фойдаланувчи маълумотлари</DialogTitle>
            <DialogDescription>
              Фойдаланувчи ҳақида тўлиқ маълумотлар
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                    {selectedUser.firstName?.charAt(0)}{selectedUser.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-semibold">
                    {selectedUser.lastName} {selectedUser.firstName} {selectedUser.middleName}
                  </h3>
                  <p className="text-muted-foreground">{selectedUser.position}</p>
                  <div className="flex gap-2">
                    <Badge className={cn("px-2 py-1 text-xs font-medium", ROLE_COLORS[selectedUser.role])}>
                      {ROLE_LABELS[selectedUser.role]}
                    </Badge>
                    <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[selectedUser.status])}>
                      {STATUS_LABELS[selectedUser.status]}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>ПНФЛ</Label>
                  <p className="font-mono">{maskPnfl(selectedUser.pnfl)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {selectedUser.phone}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {selectedUser.email}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Ташкилот</Label>
                  <p className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {selectedUser.organization?.name || "Ташкилот белгиланмаган"}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Ёпиш
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Янги фойдаланувчи қўшиш</DialogTitle>
            <DialogDescription>
              Тизимга янги фойдаланувчи қўшиш учун маълумотларни киритинг
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Исм</Label>
                <Input
                  id="firstName"
                  value={createFormData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder="Исмни киритинг"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input
                  id="lastName"
                  value={createFormData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Фамилияни киритинг"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Шарифи</Label>
                <Input
                  id="middleName"
                  value={createFormData.middleName}
                  onChange={(e) => handleInputChange("middleName", e.target.value)}
                  placeholder="Шарифни киритинг"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="email@manzil.uz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={createFormData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+998 XX XXX XX XX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pnfl">ПНФЛ</Label>
                <Input
                  id="pnfl"
                  value={createFormData.pnfl}
                  onChange={(e) => handleInputChange("pnfl", e.target.value)}
                  placeholder="14 таракамли ракам"
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Лавозим</Label>
                <Input
                  id="position"
                  value={createFormData.position}
                  onChange={(e) => handleInputChange("position", e.target.value)}
                  placeholder="Лавозимни киритинг"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Роль</Label>
                <Select value={createFormData.role} onValueChange={(value) => handleInputChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Фойдаланувчи</SelectItem>
                    <SelectItem value="OPERATOR">Оператор</SelectItem>
                    <SelectItem value="MODERATOR">Модератор</SelectItem>
                    <SelectItem value="ADMIN">Администратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationId">Ташкилот</Label>
                <Select value={createFormData.organizationId} onValueChange={(value) => handleInputChange("organizationId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ташкилотни танланг" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
