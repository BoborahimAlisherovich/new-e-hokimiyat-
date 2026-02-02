import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CreateOrganizationFormData {
  name: string
  servicePhone: string
  address: string
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
  formData = { name: '', servicePhone: '', address: '' },
  onChange = () => {},
  onSubmit = () => {},
  loading = false
}: OrganizationCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Yangi tashkilot qo'shish</DialogTitle>
          <DialogDescription>Tashkilot ma'lumotlarini kiriting</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Tashkilot nomi *</Label>
            <Input 
              id="orgName" 
              value={formData.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Tashkilot nomini kiriting" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgServicePhone">Tashkilot xizmat telefoni</Label>
            <Input 
              id="orgServicePhone" 
              value={formData.servicePhone}
              onChange={(e) => onChange("servicePhone", e.target.value)}
              placeholder="+998 XX XXX XX XX" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgAddress">Tashkilot manzili</Label>
            <Textarea 
              id="orgAddress" 
              value={formData.address}
              onChange={(e) => onChange("address", e.target.value)}
              placeholder="Tashkilot manzilini kiriting" 
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Bekor qilish
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? "Yuklanmoqda..." : "Qo'shish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
