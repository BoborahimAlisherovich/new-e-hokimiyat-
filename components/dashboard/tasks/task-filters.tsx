"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

type TaskFiltersProps = {
  searchQuery: string
  statusFilter: string
  priorityFilter: string
  categoryFilter: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onPriorityChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onCreate: () => void
  onClear: () => void
}

export function TaskFilters({
  searchQuery,
  statusFilter,
  priorityFilter,
  categoryFilter,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onCategoryChange,
  onCreate,
  onClear,
}: TaskFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1">
          <Input
            placeholder="Топшириқларни қидирув..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <Button onClick={onCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Янги топшириқ
        </Button>
        <Button
          variant="outline"
          onClick={onClear}
          className="hidden md:flex"
        >
          Барчасини тозалаш
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="flex flex-col space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">Ҳолат</Label>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className={statusFilter !== "all" ? "border-primary" : ""}>
              <SelectValue placeholder="Барчаси" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all">Барчаси</SelectItem>
              <SelectItem value="YANGI">Янги</SelectItem>
              <SelectItem value="QABUL_QILINDI">Қабул қилинди</SelectItem>
              <SelectItem value="JARAYONDA">Жараёнда</SelectItem>
              <SelectItem value="BAJARILDI">Бажарилди</SelectItem>
              <SelectItem value="BEKOR_QILINDI">Бекор қилинди</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">Муҳимлик даражаси</Label>
          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger className={priorityFilter !== "all" ? "border-primary" : ""}>
              <SelectValue placeholder="Барчаси" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all">Барчаси</SelectItem>
              <SelectItem value="FAVQULODDA">Муҳим ва шошилинч (1 кун)</SelectItem>
              <SelectItem value="YUQORI">Муҳим, лекин шошилинч эмас (3 кун)</SelectItem>
              <SelectItem value="ODDIY">Шошилинч, лекин муҳим эмас (5 кун)</SelectItem>
              <SelectItem value="PAST">Муҳим эмас ва шошилинч эмас (7 кун)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">Соҳалар</Label>
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className={categoryFilter !== "all" ? "border-primary" : ""}>
              <SelectValue placeholder="Барчаси" />
            </SelectTrigger>
            <SelectContent className="bg-card">
              <SelectItem value="all">Барчаси</SelectItem>
              <SelectItem value="Ижтимоий">Ижтимоий</SelectItem>
              <SelectItem value="Иқтисодий">Иқтисодий</SelectItem>
              <SelectItem value="Ҳуқуқий">Ҳуқуқий</SelectItem>
              <SelectItem value="Бошқа">Бошқа</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
