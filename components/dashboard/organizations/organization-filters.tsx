import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Building, Plus, Search, X } from "lucide-react"

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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
      {/* Header with count */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
            {filteredCount} / {totalCount} ta tashkilot
          </Badge>
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-slate-500 hover:text-slate-700">
            <X className="h-4 w-4 mr-1" />
            Tozalash
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center flex-wrap">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tashkilot nomi, mas'ul yoki telefon bo'yicha qidiruv..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 border-slate-200"
            />
          </div>
          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger className="w-full md:w-[200px] border-slate-200">
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
            <SelectTrigger className="w-full md:w-[150px] border-slate-200">
              <SelectValue placeholder="Holat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha holatlar</SelectItem>
              <SelectItem value="ACTIVE">Faol</SelectItem>
              <SelectItem value="INACTIVE">Nofaol</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Yangi tashkilot qo'shish
        </Button>
      </div>
    </div>
  )
}
