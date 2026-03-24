import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Organization } from "@/types"
import { Plus, X, Search, Filter, Sparkles } from "lucide-react"
import { PremiumCountBadge, PremiumFilterShell } from "@/components/dashboard/premium-dashboard-ui"

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
  showCreateButton?: boolean
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
  showCreateButton = true,
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
    <PremiumFilterShell
      icon={Filter}
      title="Filtrlash va qidiruv"
      description="Foydalanuvchilarni qidiring, saralang va tez boshqaring"
      accentClassName="bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50"
      badge={
        hasActiveFilters ? (
          <PremiumCountBadge className="border-indigo-200 bg-indigo-100 text-indigo-700">
            <Sparkles className="mr-1 h-3 w-3" />
            {filteredCount} / {totalCount} ta
          </PremiumCountBadge>
        ) : undefined
      }
      clearAction={
        hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-slate-500 hover:text-red-600 hover:bg-red-50">
            <X className="mr-1 h-4 w-4" />
            Tozalash
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Foydalanuvchilarni qidirish..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border-cyan-100/60 bg-white/90 pl-9 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
            />
          </div>
          {showCreateButton && (
            <Button onClick={onCreate} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md">
              <Plus className="h-4 w-4 mr-1" />
              Yangi foydalanuvchi
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 ml-1">Rol bo'yicha</label>
            <Select value={roleFilter} onValueChange={onRoleChange}>
              <SelectTrigger className="rounded-xl border-cyan-100/60 bg-white/90 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400">
                <SelectValue placeholder="Rolni tanlang" />
              </SelectTrigger>
              <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="HOKIM">Hokim</SelectItem>
              <SelectItem value="HOKIM_YORDAMCHISI">Hokim o'rinbosari</SelectItem>
              <SelectItem value="HOKIMLIK_MASUL">Hokimlik mutaxassisi</SelectItem>
              <SelectItem value="TASHKILOT_RAHBARI">Tashkilot rahbari</SelectItem>
              <SelectItem value="TASHKILOT_MASUL">Tashkilot mas'uli</SelectItem>
              <SelectItem value="ADMIN">Administrator</SelectItem>
            </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 ml-1">Holat bo'yicha</label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="rounded-xl border-cyan-100/60 bg-white/90 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400">
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 ml-1">Tashkilot bo'yicha</label>
            <Select value={organizationFilter} onValueChange={onOrganizationChange}>
              <SelectTrigger className="rounded-xl border-cyan-100/60 bg-white/90 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400">
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
    </PremiumFilterShell>
  )
}
