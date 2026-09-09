"use client"

import { Header } from "@/components/layout/header"
import { DashboardPageFrame } from "@/components/layout/dashboard-page-frame"
import { useState, useEffect, useCallback, useMemo } from "react"
import { User, Organization, PositionOption } from "@/types"
import { getUsers, getOrganizations, getCurrentUser, getSectors, getPositions } from "@/lib/api"
import { UserStats } from "@/components/dashboard/users/user-stats"
import { UserFilters } from "@/components/dashboard/users/user-filters"
import { UserTable } from "@/components/dashboard/users/user-table"
import { UserCreateDialog } from "@/components/dashboard/users/user-create-dialog"
import { useTranslation } from "@/lib/i18n/context"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { Building2, Plus, ShieldCheck, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n/context"
import { normalizeUserRole } from "@/lib/role-utils"
import { getUserStatusKey } from "@/components/dashboard/users/user-constants"

export default function UsersPage() {
  const t = useTranslation()
  const { language } = useI18n()
  const pageRef = useGSAPPageEntrance()
  // State management
  const [users, setUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [sectors, setSectors] = useState<Array<{ id: string; name: string; is_active?: boolean }>>([])
  const [positions, setPositions] = useState<PositionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [organizationFilter, setOrganizationFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; login: string; password: string } | null>(null)
  const [canManageUsers, setCanManageUsers] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
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
    sectorId: "",
    supervisorId: "",
  })

  // Data loading
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
 const [usersData, orgsData, sectorsData, positionsData, me] = await Promise.all([
 getUsers(),
 getOrganizations(),
 getSectors().catch(() => []),
 getPositions().catch(() => []),
 getCurrentUser().catch(() => null)
 ])
 setUsers(Array.isArray(usersData) ? usersData : [])
 setOrganizations(Array.isArray(orgsData) ? orgsData : [])
      setSectors(Array.isArray(sectorsData) ? sectorsData.filter((sector) => sector?.is_active !== false) : [])
      setPositions(Array.isArray(positionsData) ? positionsData.filter((position) => position?.is_active !== false) : [])
      setCurrentUser(me)
      const role = normalizeUserRole(me?.role)
      setCanManageUsers(Boolean(role && ["HOKIM", "HOKIM_YORDAMCHISI", "TASHKILOT_RAHBARI", "ADMIN"].includes(role)))
    } catch (error) {
      console.error("Error loading data:", error)
      setUsers([])
      setOrganizations([])
      setPositions([])
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
      const matchesStatus = statusFilter === "all" || getUserStatusKey(user) === statusFilter
      const matchesOrganization = organizationFilter === "all" || String(user.organization?.id) === organizationFilter

      return matchesSearch && matchesRole && matchesStatus && matchesOrganization
    })
  }, [users, searchQuery, roleFilter, statusFilter, organizationFilter])

  // Event handlers
  const handleCreateUser = () => {
    setIsCreateDialogOpen(true)
  }

  const handleUserCreated = async (createdUser: User, plainPassword: string) => {
    setIsCreateDialogOpen(false)
    setCreatedCredentials({
      name: createdUser.full_name || `${createdUser.last_name || ""} ${createdUser.first_name || ""}`.trim() || "Yangi foydalanuvchi",
      login: createdUser.login,
      password: plainPassword,
    })
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
      sectorId: "",
      supervisorId: "",
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ring mx-auto"></div>
              <p className="mt-4 text-muted-foreground">{t.common.loading}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        title={t.pages.users.title}
        description={t.pages.users.description}
        actions={
          canManageUsers ? (
            <Button
              data-gsap-action
              onClick={handleCreateUser}
              className="bg-primary h-9 w-9 rounded-xl px-0 text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md md:w-auto md:px-4"
              aria-label={{
                uz: "Yangi foydalanuvchi",
                "uz-cyrl": "Янги фойдаланувчи",
                ru: "Новый пользователь",
                en: "New user",
              }[language]}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">
                {{
                  uz: "Yangi foydalanuvchi",
                  "uz-cyrl": "Янги фойдаланувчи",
                  ru: "Новый пользователь",
                  en: "New user",
                }[language]}
              </span>
            </Button>
          ) : null
        }
      />
      <div ref={pageRef}>
      <DashboardPageFrame
        eyebrow="Foydalanuvchilar"
        title="Jamoa, rollar va tashkilotlar kesimida boshqaruv bir xil uslubda yuritiladi."
        description="Faol xodimlar, tashkilotlar bo‘yicha taqsimot va yangi foydalanuvchi yaratish jarayoni bir oqimda boshqariladi."
        stats={[
          { label: "Jami", value: users.length, icon: UsersRound, tone: "from-cyan-500/18 to-cyan-100/70" },
          { label: "Faol", value: users.filter((u) => getUserStatusKey(u) === "ACTIVE").length, icon: ShieldCheck, tone: "from-emerald-500/18 to-emerald-100/70" },
          { label: "Tashkilotlar", value: organizations.length, icon: Building2, tone: "from-amber-400/24 to-amber-100/75" },
        ]}
      >
          <section data-gsap-section>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">Ko'rish: rolga mos foydalanuvchi ro'yxati</span>
              <span className="rounded-full bg-white px-3 py-1 shadow-sm">Boshqaruv: hokim, hokim o'rinbosari, tashkilot rahbari, administrator</span>
            </div>
          </section>
          {/* Stats Cards */}
          <section data-gsap-section>
            <UserStats
              total={users.length}
              active={users.filter((u) => getUserStatusKey(u) === "ACTIVE").length}
              inactive={users.filter((u) => getUserStatusKey(u) === "INACTIVE").length}
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
            showCreateButton={canManageUsers}
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
        sectors={sectors}
        positions={positions}
        users={users}
        currentUser={currentUser}
        onChange={handleInputChange}
        onCreated={handleUserCreated}
      />
      <Dialog open={Boolean(createdCredentials)} onOpenChange={(open) => !open && setCreatedCredentials(null)}>
        <DialogContent className="max-w-md rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle>Foydalanuvchi yaratildi</DialogTitle>
            <DialogDescription>Login va parolni admin/hokim keyin ham foydalanuvchi profilida ko'ra oladi.</DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-3 rounded-2xl border border-border bg-primary-soft p-4 text-sm text-secondary-foreground">
              <p><span className="font-semibold text-foreground">Foydalanuvchi:</span> {createdCredentials.name}</p>
              <p><span className="font-semibold text-foreground">Login:</span> {createdCredentials.login}</p>
              <p><span className="font-semibold text-foreground">Parol:</span> {createdCredentials.password}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
