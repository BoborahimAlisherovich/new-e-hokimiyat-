import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilterOptions } from "@/types"
import { Search, X, Filter, MessageSquare, Sparkles } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

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
      district: "Hudud",
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
      district: "Ҳудуд",
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
      district: "Район",
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
      district: "District",
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
    <div className="bg-white rounded-2xl border border-white/50 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] ring-1 ring-indigo-50/30 overflow-hidden">
      {/* Header with gradient accent */}
      <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-sky-50 border-b border-indigo-50/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white shadow-sm">
              <MessageSquare className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">{tr.title}</h3>
              <p className="text-xs text-slate-500">{tr.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700 border-teal-200">
                <Sparkles className="h-3 w-3 mr-1" />
                {filteredCount} / {totalCount} {tr.itemShort}
              </Badge>
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                <X className="h-4 w-4 mr-1" />
                {tr.clear}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={tr.search}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 border-indigo-100/60 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="h-10 border-indigo-100/60 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400">
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

          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger className="h-10 border-indigo-100/60 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400">
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

          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="h-10 border-indigo-100/60 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400">
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

          <Select value={districtFilter} onValueChange={onDistrictChange}>
            <SelectTrigger className="h-10 border-indigo-100/60 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-400">
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
  )
}
