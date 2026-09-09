import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilterOptions } from "@/types"
import { Search, X, Filter, MessageSquare, Sparkles } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { PremiumCountBadge, PremiumFilterShell } from "@/components/dashboard/premium-dashboard-ui"

interface AppealFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  priorityFilter: string
  onPriorityChange: (value: string) => void
  categoryFilter: string
  onCategoryChange: (value: string) => void
  districtFilter: string
  onDistrictChange: (value: string) => void
  options: FilterOptions
  totalCount?: number
  filteredCount?: number
}

export function AppealFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  categoryFilter,
  onCategoryChange,
  districtFilter,
  onDistrictChange,
  options,
  totalCount = 0,
  filteredCount = 0,
}: AppealFiltersProps) {
  const { language } = useI18n()
  const tr = {
    uz: {
      title: "Murojaatlar filtri",
      desc: "Murojaatlarni qidiring va filtrlang",
      clear: "Tozalash",
      itemShort: "ta",
      search: "Murojaatlarni qidirish...",
      status: "Holat",
      priority: "Muhimlik",
      category: "Soha",
      district: "Mahalla",
      all: "Barchasi",
    },
    "uz-cyrl": {
      title: "Мурожаатлар фильтри",
      desc: "Мурожаатларни қидиринг ва фильтрланг",
      clear: "Тозалаш",
      itemShort: "та",
      search: "Мурожаатларни қидириш...",
      status: "Ҳолат",
      priority: "Муҳимлик",
      category: "Соҳa",
      district: "Маҳалла",
      all: "Барчаси",
    },
    ru: {
      title: "Фильтр обращений",
      desc: "Ищите и фильтруйте обращения",
      clear: "Очистить",
      itemShort: "шт",
      search: "Поиск обращений...",
      status: "Статус",
      priority: "Приоритет",
      category: "Категория",
      district: "Махалля",
      all: "Все",
    },
    en: {
      title: "Appeal filters",
      desc: "Search and filter appeals",
      clear: "Clear",
      itemShort: "items",
      search: "Search appeals...",
      status: "Status",
      priority: "Priority",
      category: "Category",
      district: "Mahalla",
      all: "All",
    },
  }[language]

  const hasActiveFilters = searchQuery || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || districtFilter !== "all"

  const handleClearFilters = () => {
    onSearchChange("")
    onStatusChange("all")
    onPriorityChange("all")
    onCategoryChange("all")
    onDistrictChange("all")
  }

  return (
    <PremiumFilterShell
      icon={MessageSquare}
      title={tr.title}
      description={tr.desc}
      accentClassName="bg-success-soft"
      badge={
        hasActiveFilters ? (
          <PremiumCountBadge className="border-border bg-success-soft text-success-soft-foreground">
            <Sparkles className="mr-1 h-3 w-3" />
            {filteredCount} / {totalCount} {tr.itemShort}
          </PremiumCountBadge>
        ) : undefined
      }
      clearAction={
        hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground hover:text-destructive-soft-foreground hover:bg-destructive-soft">
            <X className="mr-1 h-4 w-4" />
            {tr.clear}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tr.search}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 rounded-xl border-border bg-white/90 pl-10 focus:ring-2 focus:ring-success/25 focus:border-success transition-all"
          />
        </div>

        {/* Filters */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{tr.status}</Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="h-11 rounded-xl border-border bg-white/90 focus:ring-2 focus:ring-success/25 focus:border-success">
                <SelectValue placeholder={tr.status} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(options.status).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{tr.priority}</Label>
            <Select value={priorityFilter} onValueChange={onPriorityChange}>
              <SelectTrigger className="h-11 rounded-xl border-border bg-white/90 focus:ring-2 focus:ring-success/25 focus:border-success">
                <SelectValue placeholder={tr.priority} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(options.priority).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{tr.category}</Label>
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-11 rounded-xl border-border bg-white/90 focus:ring-2 focus:ring-success/25 focus:border-success">
                <SelectValue placeholder={tr.category} />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(options.category).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{tr.district}</Label>
            <Select value={districtFilter} onValueChange={onDistrictChange}>
              <SelectTrigger className="h-11 rounded-xl border-border bg-white/90 focus:ring-2 focus:ring-success/25 focus:border-success">
                <SelectValue placeholder={tr.district} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tr.all}</SelectItem>
                {options.districts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </PremiumFilterShell>
  )
}
