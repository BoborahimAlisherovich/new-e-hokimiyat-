import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Phone, MapPin, Layers } from "lucide-react"
import { useEffect, useState } from "react"
import { getSectors, type Sector } from "@/lib/api/sectors.api"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"

interface CreateOrganizationFormData {
  name: string
  servicePhone: string
  address: string
  sector_id: string
}

interface OrganizationCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData?: CreateOrganizationFormData
  onChange?: (field: keyof CreateOrganizationFormData, value: string) => void
  onSubmit?: () => void
  loading?: boolean
}

export function OrganizationCreateDialog({ 
 open, 
 onOpenChange,
 formData = { name: '', servicePhone: '', address: '', sector_id: '' },
 onChange = () => {},
 onSubmit = () => {},
 loading = false
}: OrganizationCreateDialogProps) {
 const { language } = useI18n()
 const tr = {
   uz: {
     title: "Yangi tashkilot qo'shish",
     desc: "Tashkilot ma'lumotlarini kiriting",
     name: "Tashkilot nomi *",
     namePlaceholder: "Tashkilot nomini kiriting",
     sector: "Soha",
     loading: "Yuklanmoqda...",
     selectSector: "Sohani tanlang",
     notSelected: "Tanlanmagan",
     noSectors: "Sohalar topilmadi.",
     loadDefaults: "Standart sohalarni yuklash",
     servicePhone: "Tashkilot xizmat telefoni",
     address: "Tashkilot manzili",
     addressPlaceholder: "Tashkilot manzilini kiriting",
     cancel: "Bekor qilish",
     add: "Qo'shish",
   },
   "uz-cyrl": {
     title: "Янги ташкилот қўшиш",
     desc: "Ташкилот маълумотларини киритинг",
     name: "Ташкилот номи *",
     namePlaceholder: "Ташкилот номини киритинг",
     sector: "Соҳa",
     loading: "Юкланмоқда...",
     selectSector: "Соҳани танланг",
     notSelected: "Танланмаган",
     noSectors: "Соҳалар топилмади.",
     loadDefaults: "Стандарт соҳаларни юклаш",
     servicePhone: "Ташкилот хизмат телефони",
     address: "Ташкилот манзили",
     addressPlaceholder: "Ташкилот манзилини киритинг",
     cancel: "Бекор қилиш",
     add: "Қўшиш",
   },
   ru: {
     title: "Добавить организацию",
     desc: "Введите данные организации",
     name: "Название организации *",
     namePlaceholder: "Введите название организации",
     sector: "Сфера",
     loading: "Загрузка...",
     selectSector: "Выберите сферу",
     notSelected: "Не выбрано",
     noSectors: "Сферы не найдены.",
     loadDefaults: "Загрузить стандартные сферы",
     servicePhone: "Служебный телефон организации",
     address: "Адрес организации",
     addressPlaceholder: "Введите адрес организации",
     cancel: "Отмена",
     add: "Добавить",
   },
   en: {
     title: "Add new organization",
     desc: "Enter organization details",
     name: "Organization name *",
     namePlaceholder: "Enter organization name",
     sector: "Sector",
     loading: "Loading...",
     selectSector: "Select sector",
     notSelected: "Not selected",
     noSectors: "No sectors found.",
     loadDefaults: "Load default sectors",
     servicePhone: "Organization service phone",
     address: "Organization address",
     addressPlaceholder: "Enter organization address",
     cancel: "Cancel",
     add: "Add",
   },
 }[language]

 const [sectors, setSectors] = useState<Sector[]>([])
 const [loadingSectors, setLoadingSectors] = useState(false)
 const [populatingDefaults, setPopulatingDefaults] = useState(false)

 useEffect(() => {
 if (!open) return

 setLoadingSectors(true)
 getSectors()
 .then((items) => setSectors(items.filter((sector) => sector.is_active)))
 .catch((error) => {
 console.error("Failed to load sectors:", error)
 setSectors([])
 })
 .finally(() => setLoadingSectors(false))
 }, [open])

 const handlePopulateDefaults = async () => {
 setPopulatingDefaults(true)
 try {
 await api.post("/organizations/sectors/populate_defaults/")
 const items = await getSectors()
 setSectors(items.filter((sector) => sector.is_active))
 } catch (error) {
 console.error("Failed to populate default sectors:", error)
 } finally {
 setPopulatingDefaults(false)
 }
 }

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[550px] bg-white/95 backdrop-blur-xl rounded-2xl border-white/50 ring-1 ring-ring/20 shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            {tr.title}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">{tr.desc}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="orgName" className="text-sm font-semibold text-secondary-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-violet-500" />
              {tr.name}
            </Label>
            <Input 
              id="orgName" 
              value={formData.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder={tr.namePlaceholder}
              className="h-11 rounded-xl border-border focus:border-violet-500 focus:ring-violet-500/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="orgSector" className="text-sm font-semibold text-secondary-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-500" />
              {tr.sector}
            </Label>
            <Select
              value={formData.sector_id || "none"}
              onValueChange={(value) => onChange("sector_id", value === "none" ? "" : value)}
            >
              <SelectTrigger className="h-11 rounded-xl border-border focus:border-violet-500 focus:ring-violet-500/20">
                <SelectValue placeholder={loadingSectors ? tr.loading : tr.selectSector} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">{tr.notSelected}</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector.id} value={String(sector.id)}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingSectors && sectors.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {tr.noSectors}
                <button
                  type="button"
                  onClick={handlePopulateDefaults}
                  disabled={populatingDefaults}
                  className="ml-2 font-semibold underline underline-offset-2 disabled:opacity-50"
                >
                  {populatingDefaults ? tr.loading : tr.loadDefaults}
                </button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="orgServicePhone" className="text-sm font-semibold text-secondary-foreground flex items-center gap-2">
              <Phone className="h-4 w-4 text-violet-500" />
              {tr.servicePhone}
            </Label>
            <Input 
              id="orgServicePhone" 
              value={formData.servicePhone}
              onChange={(e) => onChange("servicePhone", e.target.value.replace(/[^\d+\s()-]/g, ""))}
              placeholder="+998 XX XXX XX XX" 
              inputMode="tel"
              className="h-11 rounded-xl border-border focus:border-violet-500 focus:ring-violet-500/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="orgAddress" className="text-sm font-semibold text-secondary-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-violet-500" />
              {tr.address}
            </Label>
            <Textarea 
              id="orgAddress" 
              value={formData.address}
              onChange={(e) => onChange("address", e.target.value)}
              placeholder={tr.addressPlaceholder}
              rows={3}
              className="rounded-xl border-border focus:border-violet-500 focus:ring-violet-500/20 resize-none"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={loading}
            className="rounded-xl border-border hover:bg-primary-soft"
          >
            {tr.cancel}
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25"
          >
            {loading ? tr.loading : tr.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
