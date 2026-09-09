import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Building, Plus, Search, X, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { getSectors, type Sector } from "@/lib/api/sectors.api"
import { useI18n } from "@/lib/i18n/context"
import { PremiumCountBadge, PremiumFilterShell } from "@/components/dashboard/premium-dashboard-ui"

interface OrganizationFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  onCreate: () => void
  showCreateButton?: boolean
  totalCount?: number
  filteredCount?: number
}

export function OrganizationFilters({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  statusFilter,
  onStatusChange,
  onCreate,
  showCreateButton = true,
  totalCount = 0,
  filteredCount = 0,
}: OrganizationFiltersProps) {
  const { language } = useI18n()
  const tr = {
    uz: {
      title: "Tashkilotlar filtri",
      desc: "Tashkilotlarni qidiring va filtrlang",
      clear: "Tozalash",
      search: "Tashkilot nomi, mas'ul yoki telefon...",
      sector: "Sektor",
      allSectors: "Barcha sektorlar",
      status: "Holat",
      allStatuses: "Barcha holatlar",
      active: "Faol",
      inactive: "Nofaol",
      create: "Yangi tashkilot",
      itemShort: "ta",
    },
    "uz-cyrl": {
      title: "Ташкилотлар фильтри",
      desc: "Ташкилотларни қидиринг ва фильтрланг",
      clear: "Тозалаш",
      search: "Ташкилот номи, масъул ёки телефон...",
      sector: "Сектор",
      allSectors: "Барча секторлар",
      status: "Ҳолат",
      allStatuses: "Барча ҳолатлар",
      active: "Фаол",
      inactive: "Нофаол",
      create: "Янги ташкилот",
      itemShort: "та",
    },
    ru: {
      title: "Фильтр организаций",
      desc: "Ищите и фильтруйте организации",
      clear: "Очистить",
      search: "Название, ответственный или телефон...",
      sector: "Сектор",
      allSectors: "Все секторы",
      status: "Статус",
      allStatuses: "Все статусы",
      active: "Активный",
      inactive: "Неактивный",
      create: "Новая организация",
      itemShort: "шт",
    },
    en: {
      title: "Organization filters",
      desc: "Search and filter organizations",
      clear: "Clear",
      search: "Organization name, manager or phone...",
      sector: "Sector",
      allSectors: "All sectors",
      status: "Status",
      allStatuses: "All statuses",
      active: "Active",
      inactive: "Inactive",
      create: "New organization",
      itemShort: "items",
    },
  }[language]

  const [sectors, setSectors] = useState<Sector[]>([])
  const hasActiveFilters = searchQuery || typeFilter !== "all" || statusFilter !== "all"

  useEffect(() => {
    getSectors()
      .then((items) => setSectors(items.filter((sector) => sector.is_active)))
      .catch((error) => {
        console.error("Failed to load sectors for filters:", error)
        setSectors([])
      })
  }, [])

  const handleClearFilters = () => {
    onSearchChange("")
    onTypeChange("all")
    onStatusChange("all")
  }

  return (
    <PremiumFilterShell
      icon={Building}
      title={tr.title}
      description={tr.desc}
      accentClassName="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50"
      badge={
        hasActiveFilters ? (
          <PremiumCountBadge className="border-violet-200 bg-violet-100 text-violet-700">
            <Sparkles className="mr-1 h-3 w-3" />
            {filteredCount} / {totalCount} {tr.itemShort}
          </PremiumCountBadge>
        ) : undefined
      }
      clearAction={
        hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground hover:text-red-600 hover:bg-red-50">
            <X className="mr-1 h-4 w-4" />
            {tr.clear}
          </Button>
        ) : undefined
      }
    >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
            <div className="relative flex-1 lg:min-w-[260px] lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={tr.search}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="rounded-xl border-border bg-white/90 pl-9 focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
              />
            </div>
            <Select value={typeFilter} onValueChange={onTypeChange}>
              <SelectTrigger className="w-full lg:w-[220px] rounded-xl border-border bg-white/90 focus:ring-2 focus:ring-violet-200 focus:border-violet-400">
                <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder={tr.sector} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tr.allSectors}</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector.id} value={String(sector.id)}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full lg:w-[150px] rounded-xl border-border bg-white/90 focus:ring-2 focus:ring-violet-200 focus:border-violet-400">
                <SelectValue placeholder={tr.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tr.allStatuses}</SelectItem>
                <SelectItem value="ACTIVE">{tr.active}</SelectItem>
                <SelectItem value="INACTIVE">{tr.inactive}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showCreateButton && (
            <Button 
              onClick={onCreate}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm transition-all hover:from-violet-700 hover:to-purple-700 hover:shadow-md sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              {tr.create}
            </Button>
          )}
        </div>
    </PremiumFilterShell>
  )
}
