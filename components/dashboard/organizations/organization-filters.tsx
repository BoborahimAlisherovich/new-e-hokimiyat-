import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Building, Plus, Search, X, Filter, Sparkles } from "lucide-react"

interface OrganizationFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  onCreate: () => void
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
  totalCount = 0,
  filteredCount = 0,
}: OrganizationFiltersProps) {
  const hasActiveFilters = searchQuery || typeFilter !== "all" || statusFilter !== "all"

  const handleClearFilters = () => {
    onSearchChange("")
    onTypeChange("all")
    onStatusChange("all")
  }

  return (
    <div className="bg-white rounded-2xl border border-white/50 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] ring-1 ring-indigo-50/30 overflow-hidden">
      {/* Header with gradient accent */}
      <div className="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 border-b border-indigo-50/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white shadow-sm">
              <Building className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Tashkilotlar filtri</h3>
              <p className="text-xs text-slate-500">Tashkilotlarni qidiring va filtrlang</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 border-violet-200">
                <Sparkles className="h-3 w-3 mr-1" />
                {filteredCount} / {totalCount} ta
              </Badge>
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                <X className="h-4 w-4 mr-1" />
                Tozalash
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center flex-wrap">
            <div className="relative flex-1 md:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Tashkilot nomi, mas'ul yoki telefon..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 border-indigo-100/60 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
              />
            </div>
            <Select value={typeFilter} onValueChange={onTypeChange}>
              <SelectTrigger className="w-full md:w-[200px] border-indigo-100/60 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-400">
                <Building className="mr-2 h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Sektor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha sektorlar</SelectItem>
                <SelectItem value="IQTISODIYOT_BIZNES">Iqtisodiyot va biznes</SelectItem>
                <SelectItem value="KOMMUNAL_SOHA">Kommunal soha</SelectItem>
                <SelectItem value="SOGLIQNI_SAQLASH">Sog'liqni saqlash</SelectItem>
                <SelectItem value="TA_LIM">Ta'lim</SelectItem>
                <SelectItem value="MADANIYAT_SPORT">Madaniyat va sport</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full md:w-[150px] border-indigo-100/60 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-400">
                <SelectValue placeholder="Holat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="ACTIVE">Faol</SelectItem>
                <SelectItem value="INACTIVE">Nofaol</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={onCreate}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Yangi tashkilot
          </Button>
        </div>
      </div>
    </div>
  )
}
