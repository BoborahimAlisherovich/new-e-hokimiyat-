import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Organization, User } from "@/types"

interface CreateUserFormData {
  firstName: string
  lastName: string
  middleName: string
  email: string
  phone: string
  pnfl: string
  position: string
  role: User["role"]
  organizationId: string
}

interface UserCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: CreateUserFormData
  organizations: Organization[]
  onChange: (field: keyof CreateUserFormData, value: string) => void
  onSubmit: () => void
}

export function UserCreateDialog({
  open,
  onOpenChange,
  formData,
  organizations,
  onChange,
  onSubmit,
}: UserCreateDialogProps) {
  const organizationItems = Array.isArray(organizations)
    ? organizations
    : (organizations as { results?: Organization[] } | null | undefined)?.results || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Янги фойдаланувчи қўшиш</DialogTitle>
          <DialogDescription>
            Тизимга янги фойдаланувчи қўшиш учун маълумотларни киритинг
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Исм</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => onChange("firstName", e.target.value)}
                placeholder="Исмни киритинг"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => onChange("lastName", e.target.value)}
                placeholder="Фамилияни киритинг"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Шарифи</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => onChange("middleName", e.target.value)}
                placeholder="Шарифни киритинг"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="email@manzil.uz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                placeholder="+998 XX XXX XX XX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pnfl">ПНФЛ</Label>
              <Input
                id="pnfl"
                value={formData.pnfl}
                onChange={(e) => onChange("pnfl", e.target.value)}
                placeholder="14 таракамли ракам"
                maxLength={14}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Лавозим</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => onChange("position", e.target.value)}
                placeholder="Лавозимни киритинг"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <Select value={formData.role} onValueChange={(value) => onChange("role", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOKIM">Ҳоким</SelectItem>
                  <SelectItem value="HOKIMLIK_MASUL">Ҳокимлик масъули</SelectItem>
                  <SelectItem value="TASHKILOT_RAHBAR">Ташкилот раҳбари</SelectItem>
                  <SelectItem value="TASHKILOT_MASUL">Ташкилот масъули</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationId">Ташкилот</Label>
              <Select value={formData.organizationId} onValueChange={(value) => onChange("organizationId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ташкилотни танланг" />
                </SelectTrigger>
                <SelectContent>
                  {organizationItems.map((org) => (
                    <SelectItem key={org.id} value={String(org.id)}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
