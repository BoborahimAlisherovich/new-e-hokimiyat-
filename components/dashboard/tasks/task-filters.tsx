"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X } from "lucide-react"
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
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <Input
            placeholder={t.tasks.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-white"
          />
        </div>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="outline" onClick={onClear} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Tozalash
            </Button>
          )}
          {showCreateButton && onCreate && (
            <Button onClick={onCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t.tasks.newTask}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{t.tasks.statusFilterLabel}</Label>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className={statusFilter !== "all" ? "border-primary bg-primary/5" : "bg-white"}>
              <SelectValue placeholder={t.tasks.allOption} />
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

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{t.tasks.priorityFilterLabel}</Label>
          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger className={priorityFilter !== "all" ? "border-primary bg-primary/5" : "bg-white"}>
              <SelectValue placeholder={t.tasks.allOption} />
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

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{t.tasks.categoryFilterLabel}</Label>
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className={categoryFilter !== "all" ? "border-primary bg-primary/5" : "bg-white"}>
              <SelectValue placeholder={t.tasks.allOption} />
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

        {onOrganizationChange && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Tashkilot</Label>
            <Select value={organizationFilter} onValueChange={onOrganizationChange}>
              <SelectTrigger className={organizationFilter !== "all" ? "border-primary bg-primary/5" : "bg-white"}>
                <SelectValue placeholder="Barchasi" />
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
  )
}
