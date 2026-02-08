"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, X, Filter, Sparkles } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

type Organization = {
  id: string
  name: string
}

type TaskFiltersProps = {
  searchQuery: string
  statusFilter: string
  priorityFilter: string
  categoryFilter: string
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
    categoryFilter !== "all" || organizationFilter !== "all" || searchQuery !== ""

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
    categoryFilter !== "all"
      ? { label: "Soha", value: categoryLabels[categoryFilter] || categoryFilter }
      : null,
    organizationFilter !== "all"
      ? { label: "Tashkilot", value: organizationLabel || organizationFilter }
      : null,
  ].filter(Boolean) as { label: string; value: string }[]
  
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      {/* Header with gradient accent */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border-b border-slate-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white shadow-sm">
              <Filter className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Topshiriqlar filtri</h3>
              <p className="text-xs text-slate-500">Topshiriqlarni qidiring va filtrlang</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                <Sparkles className="h-3 w-3 mr-1" />
                {activeFilters.length} ta filtr
              </Badge>
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onClear} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                <X className="h-4 w-4 mr-1" />
                Tozalash
              </Button>
            )}
          </div>
        </div>
        {hasActiveFilters && activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <Badge key={`${filter.label}-${filter.value}`} variant="outline" className="text-xs border-orange-200 text-orange-700">
                {filter.label}: {filter.value}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Search and Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Topshiriqlarni qidirish (sarlavha/tavsif)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-10 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {showCreateButton && onCreate && (
              <Button onClick={onCreate} className="h-10 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-700 hover:to-rose-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all">
                <Plus className="h-4 w-4 mr-1" />
                {t.tasks.newTask}
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="h-10 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400">
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

          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger className="h-10 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400">
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

          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-10 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400">
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

          {onOrganizationChange && (
            <Select value={organizationFilter} onValueChange={onOrganizationChange}>
              <SelectTrigger className="h-10 border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-400">
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
          )}
        </div>
      </div>
    </div>
  )
}
