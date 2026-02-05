import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilterOptions } from "@/types"
import { X } from "lucide-react"

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
    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Filtrlash va qidiruv</CardTitle>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                {filteredCount} / {totalCount} ta
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" />
              Tozalash
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <Input
              placeholder="Murojaatlarni qidirish..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Holat</Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Holatni tanlang" />
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
            <Label className="text-sm font-medium text-muted-foreground">Muhimlik darajasi</Label>
            <Select value={priorityFilter} onValueChange={onPriorityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Muhimlikni tanlang" />
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
            <Label className="text-sm font-medium text-muted-foreground">Sohalar</Label>
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sohani tanlang" />
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
            <Label className="text-sm font-medium text-muted-foreground">Hududlar</Label>
            <Select value={districtFilter} onValueChange={onDistrictChange}>
              <SelectTrigger>
                <SelectValue placeholder="Hududni tanlang" />
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
      </CardContent>
    </Card>
  )
}
