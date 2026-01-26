import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilterOptions } from "@/types"

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
}: AppealFiltersProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Фильтрлаш ва қидирув</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <Input
              placeholder="Мурожаатларни қидирув..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Ҳолат</Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Ҳолатни танланг" />
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

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Муҳимлик даражаси</Label>
            <Select value={priorityFilter} onValueChange={onPriorityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Муҳимликни танланг" />
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

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Соҳалар</Label>
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Соҳани танланг" />
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

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Ҳудудлар</Label>
            <Select value={districtFilter} onValueChange={onDistrictChange}>
              <SelectTrigger>
                <SelectValue placeholder="Ҳудудни танланг" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Барчаси</SelectItem>
                {options.districts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
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
