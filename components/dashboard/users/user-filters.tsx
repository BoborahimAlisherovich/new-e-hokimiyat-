import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Organization } from "@/types"
import { Plus } from "lucide-react"

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
}: UserFiltersProps) {
  const organizationItems = Array.isArray(organizations)
    ? organizations
    : (organizations as { results?: Organization[] } | null | undefined)?.results || []

  return (
    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Filtrlash va qidiruv</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <Input
              placeholder="Foydalanuvchilarni qidirish..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
          <Button onClick={onCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Yangi foydalanuvchi
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Rol bo'yicha</label>
            <Select value={roleFilter} onValueChange={onRoleChange}>
              <SelectTrigger>
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
            <label className="text-xs font-medium text-muted-foreground">Holat bo'yicha</label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
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
            <label className="text-xs font-medium text-muted-foreground">Tashkilot bo'yicha</label>
            <Select value={organizationFilter} onValueChange={onOrganizationChange}>
              <SelectTrigger>
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
      </CardContent>
    </Card>
  )
}
