"use client"

import { Header } from "@/components/layout/header"
import { useState, useEffect, useCallback, useMemo } from "react"
import { User, Organization } from "@/types"
import { getUsers, getOrganizations } from "@/lib/api"
import { ensureDevAuth } from "@/lib/dev-auth"
import { UserStats } from "@/components/dashboard/users/user-stats"
import { UserFilters } from "@/components/dashboard/users/user-filters"
import { UserTable } from "@/components/dashboard/users/user-table"
import { UserCreateDialog } from "@/components/dashboard/users/user-create-dialog"

export default function UsersPage() {
  // State management
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [organizationFilter, setOrganizationFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    phone: "",
    pnfl: "",
    position: "",
    role: "TASHKILOT_MASUL" as User["role"],
    organizationId: "",
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
    } catch (error) {
      console.error("Error loading data:", error)
      setUsers([])
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Effects
  useEffect(() => {
    const initAuth = async () => {
      await ensureDevAuth()
      loadData()
    }
    initAuth()
  }, [loadData])

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = (user.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
             (user.last_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.phone || '').includes(searchQuery)
      
      const matchesRole = roleFilter === "all" || user.role === roleFilter
      const matchesStatus = statusFilter === "all" || user.status === statusFilter
      const matchesOrganization = organizationFilter === "all" || String(user.organization?.id) === organizationFilter

      return matchesSearch && matchesRole && matchesStatus && matchesOrganization
    })
  }, [users, searchQuery, roleFilter, statusFilter, organizationFilter])

  // Event handlers
  const handleCreateUser = () => {
    setIsCreateDialogOpen(true)
  }

  const handleCreateSubmit = async () => {
    try {
      // API call to create user
      setIsCreateDialogOpen(false)
      setCreateFormData({
        firstName: "",
        lastName: "",
        middleName: "",
        email: "",
        phone: "",
        pnfl: "",
        position: "",
        role: "TASHKILOT_MASUL",
        organizationId: "",
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
        <Header title="Foydalanuvchilar boshqaruvi" description="Tizim foydalanuvchilarining ro'yxati, rollari va boshqaruvi" />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Yuklanmoqda...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Foydalanuvchilar boshqaruvi" description="Tizim foydalanuvchilarining ro'yxati, rollari va boshqaruvi" />
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
          <UserStats
            total={users.length}
            active={users.filter((u) => u.status === "FAOL").length}
            inactive={users.filter((u) => u.status === "BLOKLANGAN" || u.status === "ARXIV" || u.status === "DRAFT").length}
            organizations={organizations.length}
          />

          {/* Filters and Actions */}
          <UserFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            roleFilter={roleFilter}
            onRoleChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            organizationFilter={organizationFilter}
            onOrganizationChange={setOrganizationFilter}
            organizations={organizations}
            onCreate={handleCreateUser}
            totalCount={users.length}
            filteredCount={filteredUsers.length}
          />

          {/* Users Table */}
          <UserTable users={filteredUsers} />
        </div>
      </div>
      <UserCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        formData={createFormData}
        organizations={organizations}
        onChange={handleInputChange}
        onSubmit={handleCreateSubmit}
      />
    </>
  )
}
