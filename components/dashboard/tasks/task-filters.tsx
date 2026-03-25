"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, X, Filter, Sparkles } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { PremiumCountBadge, PremiumFilterShell } from "@/components/dashboard/premium-dashboard-ui"

type Organization = {
  id: string
  name: string
}

type TaskFiltersProps = {
  searchQuery: string
  statusFilter: string
  priorityFilter: string
  categoryFilter: string
  showCategoryFilter?: boolean
  organizationFilter?: string
  organizations?: Organization[]
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onPriorityChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onOrganizationChange?: (value: string) => void
  onCreate?: () => void
  onClear: () => void
  showCreateButton?: boolean
}

export function TaskFilters({
  searchQuery,
  statusFilter,
  priorityFilter,
  categoryFilter,
  showCategoryFilter = true,
  organizationFilter = "all",
  organizations = [],
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onCategoryChange,
  onOrganizationChange,
  onCreate,
  onClear,
  showCreateButton = true,
}: TaskFiltersProps) {
  const t = useTranslation()
  
  const hasActiveFilters = statusFilter !== "all" || priorityFilter !== "all" || 
    (showCategoryFilter && categoryFilter !== "all") || organizationFilter !== "all" || searchQuery !== ""

  const statusLabels: Record<string, string> = {
    YANGI: t.task.statuses.NEW,
    IJRODA: t.task.statuses.IN_PROGRESS,
    BAJARILDI: t.task.statuses.COMPLETED,
    QAYTA_IJROGA_YUBORILDI: t.task.statuses.REASSIGNED,
    MUDDATI_KECH: t.task.statuses.OVERDUE,
    BAJARILMADI: t.task.statuses.FAILED,
    NAZORATDAN_YECHILDI: t.task.statuses.RESOLVED,
  }

  const priorityLabels: Record<string, string> = {
    FAVQULODDA: t.tasks.priorityOptionCritical,
    YUQORI: t.tasks.priorityOptionHigh,
    ODDIY: t.tasks.priorityOptionMedium,
    PAST: t.tasks.priorityOptionLow,
  }

  const categoryLabels: Record<string, string> = {
    IJTIMOIY: t.task.categories.IJTIMOIY,
    IQTISODIY: t.task.categories.IQTISODIY,
    HUQUQIY: t.task.categories.HUQUQIY,
    INFRASTRUKTURA: t.task.categories.INFRASTRUKTURA,
    TA_LIM: t.task.categories.TA_LIM,
    SOG_LIQNI_SAQLASH: t.task.categories.SOG_LIQNI_SAQLASH,
    BOSHQA: t.task.categories.BOSHQA,
  }

  const organizationLabel = organizations.find(
    (org) => String(org.id) === String(organizationFilter)
  )?.name

  const activeFilters = [
    searchQuery ? { label: "Qidiruv", value: searchQuery } : null,
    statusFilter !== "all"
      ? { label: "Holat", value: statusLabels[statusFilter] || statusFilter }
      : null,
    priorityFilter !== "all"
      ? { label: "Muhimlik", value: priorityLabels[priorityFilter] || priorityFilter }
      : null,
    showCategoryFilter && categoryFilter !== "all"
      ? { label: "Soha", value: categoryLabels[categoryFilter] || categoryFilter }
      : null,
    organizationFilter !== "all"
      ? { label: "Tashkilot", value: organizationLabel || organizationFilter }
      : null,
  ].filter(Boolean) as { label: string; value: string }[]
  
  return (
    <PremiumFilterShell
      icon={Filter}
      title="Topshiriqlar filtri"
      description="Topshiriqlarni qidiring, saralang va kerakli oqimni ajrating"
      accentClassName="bg-gradient-to-r from-amber-50 via-orange-50/90 to-rose-50/80"
      badge={
        hasActiveFilters ? (
          <PremiumCountBadge className="border-orange-200 bg-orange-100 text-orange-700">
            <Sparkles className="mr-1 h-3 w-3" />
            {activeFilters.length} ta filtr
          </PremiumCountBadge>
        ) : undefined
      }
      clearAction={
        hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-slate-500 hover:bg-red-50 hover:text-red-600">
            <X className="mr-1 h-4 w-4" />
            Tozalash
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {hasActiveFilters && activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Badge key={`${filter.label}-${filter.value}`} variant="outline" className="border-orange-200 bg-white/70 text-xs text-orange-700">
                {filter.label}: {filter.value}
              </Badge>
            ))}
          </div>
        )}
        {/* Search and Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Topshiriqlarni qidirish (sarlavha/tavsif)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-11 rounded-xl border-cyan-100/60 bg-white/90 pl-10 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {showCreateButton && onCreate && (
              <Button onClick={onCreate} className="h-11 rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 text-white shadow-sm transition-all hover:from-orange-700 hover:to-rose-700 hover:shadow-md">
                <Plus className="h-4 w-4 mr-1" />
                {t.tasks.newTask}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className={`grid gap-3 sm:grid-cols-2 ${showCategoryFilter ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Holat bo'yicha</Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="h-11 rounded-xl border-cyan-100/60 bg-white/90 focus:border-orange-400 focus:ring-2 focus:ring-orange-200">
                <SelectValue placeholder="Holat bo'yicha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.tasks.allOption}</SelectItem>
                <SelectItem value="YANGI">{t.task.statuses.NEW}</SelectItem>
                <SelectItem value="IJRODA">{t.task.statuses.IN_PROGRESS}</SelectItem>
                <SelectItem value="BAJARILDI">{t.task.statuses.COMPLETED}</SelectItem>
                <SelectItem value="QAYTA_IJROGA_YUBORILDI">{t.task.statuses.REASSIGNED}</SelectItem>
                <SelectItem value="MUDDATI_KECH">{t.task.statuses.OVERDUE}</SelectItem>
                <SelectItem value="BAJARILMADI">{t.task.statuses.FAILED}</SelectItem>
                <SelectItem value="NAZORATDAN_YECHILDI">{t.task.statuses.RESOLVED}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Muhimlik bo'yicha</Label>
            <Select value={priorityFilter} onValueChange={onPriorityChange}>
              <SelectTrigger className="h-11 rounded-xl border-cyan-100/60 bg-white/90 focus:border-orange-400 focus:ring-2 focus:ring-orange-200">
                <SelectValue placeholder="Muhimlik bo'yicha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.tasks.allOption}</SelectItem>
                <SelectItem value="FAVQULODDA">{t.tasks.priorityOptionCritical}</SelectItem>
                <SelectItem value="YUQORI">{t.tasks.priorityOptionHigh}</SelectItem>
                <SelectItem value="ODDIY">{t.tasks.priorityOptionMedium}</SelectItem>
                <SelectItem value="PAST">{t.tasks.priorityOptionLow}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showCategoryFilter && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Soha bo'yicha</Label>
              <Select value={categoryFilter} onValueChange={onCategoryChange}>
                <SelectTrigger className="h-11 rounded-xl border-cyan-100/60 bg-white/90 focus:border-orange-400 focus:ring-2 focus:ring-orange-200">
                  <SelectValue placeholder="Soha bo'yicha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.tasks.allOption}</SelectItem>
                  <SelectItem value="IJTIMOIY">{t.task.categories.IJTIMOIY}</SelectItem>
                  <SelectItem value="IQTISODIY">{t.task.categories.IQTISODIY}</SelectItem>
                  <SelectItem value="HUQUQIY">{t.task.categories.HUQUQIY}</SelectItem>
                  <SelectItem value="INFRASTRUKTURA">{t.task.categories.INFRASTRUKTURA}</SelectItem>
                  <SelectItem value="TA_LIM">{t.task.categories.TA_LIM}</SelectItem>
                  <SelectItem value="SOG_LIQNI_SAQLASH">{t.task.categories.SOG_LIQNI_SAQLASH}</SelectItem>
                  <SelectItem value="BOSHQA">{t.task.categories.BOSHQA}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {onOrganizationChange && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Tashkilot bo'yicha</Label>
              <Select value={organizationFilter} onValueChange={onOrganizationChange}>
              <SelectTrigger className="h-11 rounded-xl border-cyan-100/60 bg-white/90 focus:border-orange-400 focus:ring-2 focus:ring-orange-200">
                  <SelectValue placeholder="Tashkilot bo'yicha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barchasi</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </PremiumFilterShell>
  )
}
