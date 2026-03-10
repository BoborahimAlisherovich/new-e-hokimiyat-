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
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[550px] bg-white/95 backdrop-blur-xl rounded-2xl border-white/50 ring-1 ring-indigo-50/30 shadow-2xl">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            Yangi tashkilot qo'shish
          </DialogTitle>
          <DialogDescription className="text-slate-600">Tashkilot ma'lumotlarini kiriting</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="orgName" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-violet-500" />
              Tashkilot nomi *
            </Label>
            <Input 
              id="orgName" 
              value={formData.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Tashkilot nomini kiriting" 
              className="h-11 rounded-xl border-indigo-100/60 focus:border-violet-500 focus:ring-violet-500/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="orgSector" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-500" />
              Soha
            </Label>
            <Select
              value={formData.sector_id || "none"}
              onValueChange={(value) => onChange("sector_id", value === "none" ? "" : value)}
            >
              <SelectTrigger className="h-11 rounded-xl border-indigo-100/60 focus:border-violet-500 focus:ring-violet-500/20">
                <SelectValue placeholder={loadingSectors ? "Yuklanmoqda..." : "Sohani tanlang"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">Tanlanmagan</SelectItem>
                {sectors.map((sector) => (
                  <SelectItem key={sector.id} value={String(sector.id)}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingSectors && sectors.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Sohalar topilmadi.
                <button
                  type="button"
                  onClick={handlePopulateDefaults}
                  disabled={populatingDefaults}
                  className="ml-2 font-semibold underline underline-offset-2 disabled:opacity-50"
                >
                  {populatingDefaults ? "Yuklanmoqda..." : "Standart sohalarni yuklash"}
                </button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="orgServicePhone" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Phone className="h-4 w-4 text-violet-500" />
              Tashkilot xizmat telefoni
            </Label>
            <Input 
              id="orgServicePhone" 
              value={formData.servicePhone}
              onChange={(e) => onChange("servicePhone", e.target.value)}
              placeholder="+998 XX XXX XX XX" 
              className="h-11 rounded-xl border-indigo-100/60 focus:border-violet-500 focus:ring-violet-500/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="orgAddress" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-violet-500" />
              Tashkilot manzili
            </Label>
            <Textarea 
              id="orgAddress" 
              value={formData.address}
              onChange={(e) => onChange("address", e.target.value)}
              placeholder="Tashkilot manzilini kiriting" 
              rows={3}
              className="rounded-xl border-indigo-100/60 focus:border-violet-500 focus:ring-violet-500/20 resize-none"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={loading}
            className="rounded-xl border-indigo-100/60 hover:bg-indigo-50/30"
          >
            Bekor qilish
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25"
          >
            {loading ? "Yuklanmoqda..." : "Qo'shish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
