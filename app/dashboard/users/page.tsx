"use client"

import { Header } from "@/components/layout/header"
import { DashboardPageFrame } from "@/components/layout/dashboard-page-frame"
import { useState, useEffect, useCallback, useMemo } from "react"
import { User, Organization } from "@/types"
import { getUsers, getOrganizations } from "@/lib/api"
import { UserStats } from "@/components/dashboard/users/user-stats"
import { UserFilters } from "@/components/dashboard/users/user-filters"
import { UserTable } from "@/components/dashboard/users/user-table"
import { UserCreateDialog } from "@/components/dashboard/users/user-create-dialog"
import { useTranslation } from "@/lib/i18n/context"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { Building2, ShieldCheck, UsersRound } from "lucide-react"

export default function UsersPage() {
  const t = useTranslation()
  const pageRef = useGSAPPageEntrance()
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
    login: "",
    firstName: "",
    lastName: "",
    middleName: "",
    email: "",
    phone: "",
    pnfl: "",
    position: "",
    password: "",
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
 setUsers(Array.isArray(usersData) ? usersData : [])
 setOrganizations(Array.isArray(orgsData) ? orgsData : [])
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
    loadData()
  }, [loadData])

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const normalizedQuery = searchQuery.toLowerCase()
      const matchesSearch = (user.login || "").toLowerCase().includes(normalizedQuery) ||
             (user.first_name || "").toLowerCase().includes(normalizedQuery) ||
             (user.last_name || "").toLowerCase().includes(normalizedQuery) ||
             (user.email || '').toLowerCase().includes(normalizedQuery) ||
             (user.phone || '').includes(searchQuery) ||
             (user.pnfl || '').includes(searchQuery)
      
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

  const handleUserCreated = async () => {
    setIsCreateDialogOpen(false)
    setCreateFormData({
      login: "",
      firstName: "",
      lastName: "",
      middleName: "",
      email: "",
      phone: "",
      pnfl: "",
      position: "",
      password: "",
      role: "TASHKILOT_MASUL",
      organizationId: "",
    })
    await loadData()
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
        <Header title={t.pages.users.title} description={t.pages.users.description} />
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="mt-4 text-slate-500">{t.common.loading}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.pages.users.title} description={t.pages.users.description} />
      <div ref={pageRef}>
      <DashboardPageFrame
        eyebrow="Foydalanuvchilar"
        title="Jamoa, rollar va tashkilotlar kesimida boshqaruv bir xil uslubda yuritiladi."
        description="Faol xodimlar, tashkilotlar bo‘yicha taqsimot va yangi foydalanuvchi yaratish jarayoni bir oqimda boshqariladi."
        stats={[
          { label: "Jami", value: users.length, icon: UsersRound, tone: "from-cyan-500/18 to-cyan-100/70" },
          { label: "Faol", value: users.filter((u) => u.status === "FAOL").length, icon: ShieldCheck, tone: "from-emerald-500/18 to-emerald-100/70" },
          { label: "Tashkilotlar", value: organizations.length, icon: Building2, tone: "from-amber-400/24 to-amber-100/75" },
        ]}
      >
          {/* Stats Cards */}
          <section data-gsap-section>
            <UserStats
              total={users.length}
              active={users.filter((u) => u.status === "FAOL").length}
              inactive={users.filter((u) => u.status === "BLOKLANGAN" || u.status === "ARXIV" || u.status === "DRAFT").length}
              organizations={organizations.length}
            />
          </section>

          {/* Filters and Actions */}
          <section data-gsap-section>
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
          </section>

          {/* Users Table */}
          <section data-gsap-section>
            <UserTable users={filteredUsers} />
          </section>
      </DashboardPageFrame>
      </div>
      <UserCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        formData={createFormData}
        organizations={organizations}
        onChange={handleInputChange}
        onCreated={handleUserCreated}
      />
    </>
  )
}
