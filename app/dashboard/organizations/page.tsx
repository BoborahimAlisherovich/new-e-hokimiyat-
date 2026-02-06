"use client"

import { Header } from "@/components/layout/header"
import { getOrganizations, createOrganization, getUsers, deleteOrganization, updateOrganization } from "@/lib/api"
import { ensureDevAuth } from "@/lib/dev-auth"
import { useState, useEffect, useCallback, useMemo } from "react"
import { OrganizationFilters } from "@/components/dashboard/organizations/organization-filters"
import { OrganizationTable } from "@/components/dashboard/organizations/organization-table"
import { OrganizationCreateDialog } from "@/components/dashboard/organizations/organization-create-dialog"
import { useToast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { useTranslation } from "@/lib/i18n/context"

export default function OrganizationsPage() {
  const t = useTranslation()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    servicePhone: '',
    address: ''
  })

  const loadOrganizations = useCallback(async () => {
    try {
      const [orgsList, usersList] = await Promise.all([
        getOrganizations(),
        getUsers()
      ])
      const orgItems = Array.isArray(orgsList)
        ? orgsList
        : orgsList?.results || []
      const userItems = Array.isArray(usersList)
        ? usersList
        : usersList?.results || []
      setOrganizations(orgItems)
      setUsers(userItems)
      setError(null)
    } catch (err) {
      console.error("Tashkilotlarni yuklashda xatolik:", err)
      setError(t.pages.organizations.loadError)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const initAuth = async () => {
      try {
        await ensureDevAuth()
        await loadOrganizations()
      } catch (err) {
        console.error("Tashkilotlarni yuklashda xatolik:", err)
        if (mounted) setError(t.pages.organizations.loadError)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    initAuth()
    return () => {
      mounted = false
    }
  }, [loadOrganizations])

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
        address: formData.address
      })
      
      toast({
        title: t.common.success,
        description: t.pages.organizations.createSuccess
      })
      
      setIsCreateOpen(false)
      setFormData({ name: '', servicePhone: '', address: '' })
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
      const matchesType = typeFilter === "all" || org.sector === typeFilter
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
  }, [loadOrganizations, toast])

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
  }, [loadOrganizations, toast])

  return (
    <>
      <Header title={t.pages.organizations.title} description={t.pages.organizations.description} />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-400/8 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-purple-400/6 to-transparent rounded-full blur-xl" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 py-8">

            {/* Filters and Actions */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <OrganizationFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                typeFilter={typeFilter}
                onTypeChange={setTypeFilter}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                onCreate={() => setIsCreateOpen(true)}
                totalCount={organizations.length}
                filteredCount={filteredOrganizations.length}
              />
            </motion.section>

            <OrganizationCreateDialog 
              open={isCreateOpen} 
              onOpenChange={setIsCreateOpen}
              formData={formData}
              onChange={handleFormChange}
              onSubmit={handleSubmit}
              loading={creating}
            />

            {/* Organizations Table */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">{t.pages.organizations.loading}</span>
                </div>
              ) : error ? (
                <div className="text-center py-16">
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
            </motion.section>
          </div>
        </div>
      </div>
    </>
  )
}
