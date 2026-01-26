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
}

export function OrganizationCreateDialog({ 
  open, 
  onOpenChange,
  formData = { name: '', servicePhone: '', address: '' },
  onChange = () => {},
  onSubmit = () => {}
}: OrganizationCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Янги ташкилот қўшиш</DialogTitle>
          <DialogDescription>Ташкилот маълумотларини киритинг</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Ташкилот номи</Label>
            <Input 
              id="orgName" 
              value={formData.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Ташкилот номини киритинг" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgServicePhone">Ташкилот хизмат телефони</Label>
            <Input 
              id="orgServicePhone" 
              value={formData.servicePhone}
              onChange={(e) => onChange("servicePhone", e.target.value)}
              placeholder="+998 XX XXX XX XX" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgAddress">Ташкилот манзили</Label>
            <Textarea 
              id="orgAddress" 
              value={formData.address}
              onChange={(e) => onChange("address", e.target.value)}
              placeholder="Ташкилот манзилини киритинг" 
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Бекор қилиш
          </Button>
          <Button onClick={onSubmit}>Қўшиш</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
