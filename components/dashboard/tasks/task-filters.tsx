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
            placeholder="Topshiriqlarni qidirish..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full"
          />
        </div>
        <Button onClick={onCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yangi topshiriq
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="flex flex-col space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">Holat</Label>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className={statusFilter !== "all" ? "border-primary" : ""}>
              <SelectValue placeholder="Barchasi" />
            </SelectTrigger>
            <SelectContent className="bg-card border shadow-lg z-[100]" position="popper" sideOffset={4}>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="YANGI">Yangi</SelectItem>
              <SelectItem value="IJRODA">Ijroda</SelectItem>
              <SelectItem value="BAJARILDI">Bajarildi</SelectItem>
              <SelectItem value="QAYTA_IJROGA_YUBORILDI">Qayta ijroga yuborildi</SelectItem>
              <SelectItem value="MUDDATI_KECH">Muddati kechikkan</SelectItem>
              <SelectItem value="BAJARILMADI">Bajarilmadi</SelectItem>
              <SelectItem value="NAZORATDAN_YECHILDI">Nazoratdan yechildi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">Muhimlik darajasi</Label>
          <Select value={priorityFilter} onValueChange={onPriorityChange}>
            <SelectTrigger className={priorityFilter !== "all" ? "border-primary" : ""}>
              <SelectValue placeholder="Barchasi" />
            </SelectTrigger>
            <SelectContent className="bg-card border shadow-lg z-[100]" position="popper" sideOffset={4}>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="FAVQULODDA">Muhim va shoshilinch (1 kun)</SelectItem>
              <SelectItem value="YUQORI">Muhim, lekin shoshilinch emas (3 kun)</SelectItem>
              <SelectItem value="ODDIY">Shoshilinch, lekin muhim emas (5 kun)</SelectItem>
              <SelectItem value="PAST">Muhim emas va shoshilinch emas (7 kun)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <Label className="text-sm font-medium text-muted-foreground">Sohalar</Label>
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className={categoryFilter !== "all" ? "border-primary" : ""}>
              <SelectValue placeholder="Barchasi" />
            </SelectTrigger>
            <SelectContent 
              className="bg-card border shadow-lg z-[100]" 
              position="popper" 
              sideOffset={4}
              style={{ maxHeight: '300px', overflowY: 'auto' }}
            >
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="IJTIMOIY">Ijtimoiy</SelectItem>
              <SelectItem value="IQTISODIY">Iqtisodiy</SelectItem>
              <SelectItem value="HUQUQIY">Huquqiy</SelectItem>
              <SelectItem value="INFRASTRUKTURA">Infrastruktura</SelectItem>
              <SelectItem value="TA_LIM">Ta'lim</SelectItem>
              <SelectItem value="SOG_LIQNI_SAQLASH">Sog'liqni saqlash</SelectItem>
              <SelectItem value="BOSHQA">Boshqa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
