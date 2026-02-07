import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Organization } from "@/types"
import { Plus, X, Search } from "lucide-react"

interface UserFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  roleFilter: string
  onRoleChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  organizationFilter: string
  onOrganizationChange: (value: string) => void
  organizations: Organization[]
  onCreate: () => void
  totalCount?: number
  filteredCount?: number
}

export function UserFilters({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleChange,
  statusFilter,
  onStatusChange,
  organizationFilter,
  onOrganizationChange,
  organizations,
  onCreate,
  totalCount = 0,
  filteredCount = 0,
}: UserFiltersProps) {
  const organizationItems = Array.isArray(organizations)
    ? organizations
    : (organizations as { results?: Organization[] } | null | undefined)?.results || []

  const hasActiveFilters = searchQuery || roleFilter !== "all" || statusFilter !== "all" || organizationFilter !== "all"

  const handleClearFilters = () => {
    onSearchChange("")
    onRoleChange("all")
    onStatusChange("all")
    onOrganizationChange("all")
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-slate-800">Filtrlash va qidiruv</h3>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
              {filteredCount} / {totalCount} ta
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-slate-500 hover:text-slate-700">
            <X className="h-4 w-4 mr-1" />
            Tozalash
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Foydalanuvchilarni qidirish..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 border-slate-200"
          />
        </div>
        <Button onClick={onCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yangi foydalanuvchi
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Rol bo'yicha</label>
          <Select value={roleFilter} onValueChange={onRoleChange}>
            <SelectTrigger className="border-slate-200">
              <SelectValue placeholder="Rolni tanlang" />
            </SelectTrigger>
          <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="HOKIM">Hokim</SelectItem>
              <SelectItem value="HOKIMLIK_MASUL">Hokimlik mas'uli</SelectItem>
              <SelectItem value="TASHKILOT_RAHBARI">Tashkilot rahbari</SelectItem>
              <SelectItem value="TASHKILOT_MASUL">Tashkilot mas'uli</SelectItem>
              <SelectItem value="ADMIN">Administrator</SelectItem>
            </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Holat bo'yicha</label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Holatni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="FAOL">Faol</SelectItem>
                <SelectItem value="KUTILMOQDA">Kutilmoqda</SelectItem>
                <SelectItem value="BLOKLANGAN">Bloklangan</SelectItem>
                <SelectItem value="ARXIV">Arxiv</SelectItem>
                <SelectItem value="DRAFT">Qoralama</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Tashkilot bo'yicha</label>
            <Select value={organizationFilter} onValueChange={onOrganizationChange}>
              <SelectTrigger className="border-slate-200">
                <SelectValue placeholder="Tashkilotni tanlang" />
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              {organizationItems.map((org) => (
                <SelectItem key={org.id} value={String(org.id)}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
            </Select>
          </div>
        </div>
    </div>
  )
}
