import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilterOptions } from "@/types"
import { Search, X } from "lucide-react"

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
  const hasActiveFilters = searchQuery || statusFilter !== "all" || priorityFilter !== "all" || categoryFilter !== "all" || districtFilter !== "all"

  const handleClearFilters = () => {
    onSearchChange("")
    onStatusChange("all")
    onPriorityChange("all")
    onCategoryChange("all")
    onDistrictChange("all")
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-slate-800">Filtrlash</h3>
            {hasActiveFilters && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                {filteredCount} / {totalCount}
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-slate-500 hover:text-slate-700 h-8">
              <X className="h-4 w-4 mr-1" />
              Tozalash
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Murojaatlarni qidirish..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 border-slate-200 focus:border-slate-300 focus:ring-slate-200"
          />
        </div>

        {/* Filters */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="h-10 border-slate-200">
              <SelectValue placeholder="Holat" />
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
            <SelectTrigger className="h-10 border-slate-200">
              <SelectValue placeholder="Muhimlik" />
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
            <SelectTrigger className="h-10 border-slate-200">
              <SelectValue placeholder="Soha" />
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
            <SelectTrigger className="h-10 border-slate-200">
              <SelectValue placeholder="Hudud" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
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
