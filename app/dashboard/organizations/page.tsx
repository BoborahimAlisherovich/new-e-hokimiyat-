"use client"

import { Header } from "@/components/layout/header"
import { getOrganizations } from "@/lib/api"
import { ensureDevAuth } from "@/lib/dev-auth"
import { useState, useEffect } from "react"
import { OrganizationFilters } from "@/components/dashboard/organizations/organization-filters"
import { OrganizationTable } from "@/components/dashboard/organizations/organization-table"
import { OrganizationCreateDialog } from "@/components/dashboard/organizations/organization-create-dialog"

export default function OrganizationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const initAuth = async () => {
      try {
        await ensureDevAuth()
        const orgsList = await getOrganizations()
        if (!mounted) return
        setOrganizations(orgsList || [])
        setError(null)
      } catch (err) {
        console.error("Tashkilotlarni yuklashda xatolik:", err)
        setError("Tashkilotlarni yuklashda xatolik yuz berdi")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    initAuth()
    return () => {
      mounted = false
    }
  }, [])

  const filteredOrganizations = organizations.filter((org) => {
    const matchesStatus = statusFilter === "all" || (org.is_active ? "ACTIVE" : "INACTIVE") === statusFilter
    const matchesType = typeFilter === "all" || org.sector === typeFilter
    const matchesSearch =
      (org.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.head || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.phone || "").toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesType && matchesSearch
  })

  return (
    <>
      <Header title="Ташкилотлар бошқаруви" description="Тизимдаги барча ташкилотларнинг рўйхати, маълумотлари ва бошқаруви" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-200/15 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-purple-200/10 to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/3 left-1/2 w-48 h-48 bg-gradient-to-br from-cyan-200/8 to-transparent rounded-full blur-lg" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 py-8">

            {/* Filters and Actions */}
            <section className="animate-slide-up">
              <OrganizationFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                typeFilter={typeFilter}
                onTypeChange={setTypeFilter}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                onCreate={() => setIsCreateOpen(true)}
              />
            </section>

            <OrganizationCreateDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

            {/* Organizations Table */}
            <section className="animate-slide-up" style={{ animationDelay: "200ms" }}>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Yuklanmoqda...</span>
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <p className="text-red-500">{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Qayta urinish
                  </button>
                </div>
              ) : (
                <OrganizationTable organizations={filteredOrganizations} />
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
