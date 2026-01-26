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
  return (
    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Фильтрлаш ва қидирув</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <Input
              placeholder="Фойдаланувчиларни қидирув..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
          <Button onClick={onCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Янги фойдаланувчи
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Select value={roleFilter} onValueChange={onRoleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Ролни танланг" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Барчаси</SelectItem>
              <SelectItem value="HOKIM">Ҳоким</SelectItem>
              <SelectItem value="HOKIMLIK_MASUL">Ҳокимлик масъули</SelectItem>
              <SelectItem value="TASHKILOT_RAHBAR">Ташкилот раҳбари</SelectItem>
              <SelectItem value="TASHKILOT_MASUL">Ташкилот масъули</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Ҳолатни танланг" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Барчаси</SelectItem>
              <SelectItem value="ACTIVE">Актив</SelectItem>
              <SelectItem value="INACTIVE">Нофаол</SelectItem>
              <SelectItem value="BLOCKED">Блокланган</SelectItem>
            </SelectContent>
          </Select>

          <Select value={organizationFilter} onValueChange={onOrganizationChange}>
            <SelectTrigger>
              <SelectValue placeholder="Ташкилотни танланг" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Барчаси</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={String(org.id)}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
