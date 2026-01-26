import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building, Plus, Search } from "lucide-react"

interface OrganizationFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  onCreate: () => void
}

export function OrganizationFilters({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  statusFilter,
  onStatusChange,
  onCreate,
}: OrganizationFiltersProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center flex-wrap">
            <div className="relative flex-1 md:max-w-sm">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Ташкилот номи, масъул шахс ёки телефон бўйича қидирув..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-12 h-12 bg-background/50 border-2 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
              />
            </div>
            <Select value={typeFilter} onValueChange={onTypeChange}>
              <SelectTrigger className="w-full md:w-[200px] h-11 bg-background/50 border-2 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Сектор" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl">
                <SelectItem value="all">Барча секторлар</SelectItem>
                <SelectItem value="IQTISODIYOT_BIZNES">Иқтисодиёт ва бизнес</SelectItem>
                <SelectItem value="KOMMUNAL_SOHA">Коммунал соҳа</SelectItem>
                <SelectItem value="SOGLIQNI_SAQLASH">Соғлиқни сақлаш</SelectItem>
                <SelectItem value="TA_LIM">Таълим</SelectItem>
                <SelectItem value="MADANIYAT_SPORT">Маданият ва спорт</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full md:w-[180px] h-11 bg-background/50 border-2 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                <SelectValue placeholder="Ҳолат" />
              </SelectTrigger>
              <SelectContent className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl">
                <SelectItem value="all">Барча ҳолатлар</SelectItem>
                <SelectItem value="ACTIVE">Фаол</SelectItem>
                <SelectItem value="INACTIVE">Нофаол</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground h-12 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
            onClick={onCreate}
          >
            <Plus className="mr-2 h-5 w-5" />
            Янги ташкилот қўшиш
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
