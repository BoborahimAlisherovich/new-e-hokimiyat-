"use client"

import { Header } from "@/components/layout/header"
import { DashboardPageFrame } from "@/components/layout/dashboard-page-frame"
import { getOrganizations, createOrganization, getUsers, deleteOrganization, updateOrganization, getCurrentUser } from "@/lib/api"
import { useState, useEffect, useCallback, useMemo } from "react"
import { OrganizationFilters } from "@/components/dashboard/organizations/organization-filters"
import { OrganizationTable } from "@/components/dashboard/organizations/organization-table"
import { OrganizationCreateDialog } from "@/components/dashboard/organizations/organization-create-dialog"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/i18n/context"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { Building2, BriefcaseBusiness, Plus, ShieldCheck } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { Button } from "@/components/ui/button"
import { normalizeUserRole } from "@/lib/role-utils"

export default function OrganizationsPage() {
  const t = useTranslation()
  const { language } = useI18n()
  const { toast } = useToast()
  const pageRef = useGSAPPageEntrance()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [canManageOrganizations, setCanManageOrganizations] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    servicePhone: '',
    address: '',
    sector_id: ''
  })

  const loadOrganizations = useCallback(async () => {
    try {
      const [orgsList, usersList, me] = await Promise.all([
        getOrganizations(),
        getUsers(),
        getCurrentUser().catch(() => null)
      ])
 const orgItems = Array.isArray(orgsList) ? orgsList : []
 const userItems = Array.isArray(usersList) ? usersList : []
      setOrganizations(orgItems)
      setUsers(userItems)
      const role = normalizeUserRole(me?.role)
      setCanManageOrganizations(Boolean(role && ["HOKIM", "HOKIM_YORDAMCHISI", "ADMIN"].includes(role)))
      setError(null)
    } catch (err) {
      console.error("Tashkilotlarni yuklashda xatolik:", err)
      setError(t.pages.organizations.loadError)
    }
  }, [t.pages.organizations.loadError])

  useEffect(() => {
    let mounted = true
    const initData = async () => {
      try {
        await loadOrganizations()
      } catch (err) {
        console.error("Tashkilotlarni yuklashda xatolik:", err)
        if (mounted) setError(t.pages.organizations.loadError)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    initData()
    return () => {
      mounted = false
    }
  }, [loadOrganizations, t.pages.organizations.loadError])

  const handleFormChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: t.common.error,
        description: t.pages.organizations.createRequiredName,
        variant: "destructive"
      })
      return
    }

    try {
      setCreating(true)
      await createOrganization({
        name: formData.name,
        phone: formData.servicePhone,
        address: formData.address,
        sector: formData.sector_id || undefined
      })
      
      toast({
        title: t.common.success,
        description: t.pages.organizations.createSuccess
      })
      
      setIsCreateOpen(false)
      setFormData({ name: '', servicePhone: '', address: '', sector_id: '' })
      await loadOrganizations()
    } catch (err: any) {
      toast({
        title: t.common.error,
        description: err?.message || t.pages.organizations.createError,
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      const matchesStatus = statusFilter === "all" || (org.is_active ? "ACTIVE" : "INACTIVE") === statusFilter
      const matchesType =
        typeFilter === "all" ||
        String(org.sector ?? "") === typeFilter ||
        String(org.sector_id ?? "") === typeFilter
      const matchesSearch =
        (org.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (org.head || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (org.phone || "").toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesType && matchesSearch
    })
  }, [organizations, statusFilter, typeFilter, searchQuery])

  const handleDeleteOrganization = useCallback(async (id: number) => {
    if (!confirm(t.pages.organizations.deleteConfirm)) return
    try {
      await deleteOrganization(id)
      toast({ title: t.common.success, description: t.pages.organizations.deleteSuccess })
      await loadOrganizations()
    } catch (err: any) {
      toast({ title: t.common.error, description: err?.message || t.pages.organizations.deleteError, variant: "destructive" })
    }
  }, [
    loadOrganizations,
    t.common.error,
    t.common.success,
    t.pages.organizations.deleteConfirm,
    t.pages.organizations.deleteError,
    t.pages.organizations.deleteSuccess,
    toast,
  ])

  const handleToggleStatus = useCallback(async (id: number, currentStatus: boolean) => {
    try {
      await updateOrganization(id, { is_active: !currentStatus })
      toast({
        title: t.common.success,
        description: currentStatus ? t.pages.organizations.toggleDeactivated : t.pages.organizations.toggleActivated,
      })
      await loadOrganizations()
    } catch (err: any) {
      toast({ title: t.common.error, description: err?.message || t.pages.organizations.toggleError, variant: "destructive" })
    }
  }, [
    loadOrganizations,
    t.common.error,
    t.common.success,
    t.pages.organizations.toggleActivated,
    t.pages.organizations.toggleDeactivated,
    t.pages.organizations.toggleError,
    toast,
  ])

  return (
    <>
      <Header
        title={t.pages.organizations.title}
        description={t.pages.organizations.description}
        actions={
          canManageOrganizations ? (
            <Button
              data-gsap-action
              onClick={() => setIsCreateOpen(true)}
              className="h-9 w-9 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-0 text-white shadow-sm transition-all hover:from-violet-700 hover:to-purple-700 hover:shadow-md md:w-auto md:px-4"
              aria-label={{
                uz: "Yangi tashkilot",
                "uz-cyrl": "Янги ташкилот",
                ru: "Новая организация",
                en: "New organization",
              }[language]}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">
                {{
                uz: "Yangi tashkilot",
                "uz-cyrl": "Янги ташкилот",
                ru: "Новая организация",
                en: "New organization",
              }[language]}
              </span>
            </Button>
          ) : null
        }
      />
      <div ref={pageRef}>
      <DashboardPageFrame
        eyebrow="Tashkilotlar"
        title="Tashkilotlar tuzilmasi, holati va sektorlarga bog‘lanishi yagona ko‘rinishda boshqariladi."
        description="Faol tashkilotlar, sektorlar va mas’ullar kesimida tizimni nazorat qilish va yangilarini qo‘shish uchun toza ish maydoni."
        stats={[
          { label: "Jami", value: organizations.length, icon: Building2, tone: "from-cyan-500/18 to-cyan-100/70" },
          { label: "Faol", value: organizations.filter((org) => org.is_active).length, icon: ShieldCheck, tone: "from-emerald-500/18 to-emerald-100/70" },
          { label: "Mas'ullar", value: users.length, icon: BriefcaseBusiness, tone: "from-amber-400/24 to-amber-100/75" },
        ]}
      >
            <section data-gsap-section>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">Ko'rish: rolga mos tashkilotlar kesimi</span>
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">Boshqaruv: hokim, hokim o'rinbosari, administrator</span>
              </div>
            </section>
            {/* Filters and Actions */}
            <section data-gsap-section>
              <OrganizationFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              onCreate={() => setIsCreateOpen(true)}
              showCreateButton={canManageOrganizations}
              totalCount={organizations.length}
              filteredCount={filteredOrganizations.length}
            />
            </section>

            <OrganizationCreateDialog 
              open={isCreateOpen} 
              onOpenChange={setIsCreateOpen}
              formData={formData}
              onChange={handleFormChange}
              onSubmit={handleSubmit}
              loading={creating}
            />

            {/* Organizations Table */}
            <section data-gsap-section>
            {loading ? (
              <div className="flex items-center justify-center rounded-[26px] border border-white/70 bg-white/78 py-16 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                <span className="ml-3 text-slate-500">{t.pages.organizations.loading}</span>
              </div>
            ) : error ? (
              <div className="rounded-[26px] border border-white/70 bg-white/78 py-16 text-center shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
                <p className="text-red-500">{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {t.pages.organizations.retry}
                </button>
              </div>
            ) : (
              <OrganizationTable 
                organizations={filteredOrganizations} 
                users={users}
                onDelete={handleDeleteOrganization}
                onToggleStatus={handleToggleStatus}
              />
            )}
            </section>
      </DashboardPageFrame>
      </div>
    </>
  )
}
