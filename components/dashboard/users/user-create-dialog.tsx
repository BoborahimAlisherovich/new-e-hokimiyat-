"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Organization, User } from "@/types"
import { createUser } from "@/lib/api"
import { Loader2 } from "lucide-react"

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const organizationItems = Array.isArray(organizations)
    ? organizations
    : (organizations as { results?: Organization[] } | null | undefined)?.results || []

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.firstName.trim()) newErrors.firstName = "Ism majburiy"
    if (!formData.lastName.trim()) newErrors.lastName = "Familiya majburiy"
    if (!formData.phone.trim()) newErrors.phone = "Telefon majburiy"
    if (formData.pnfl && formData.pnfl.length !== 14) newErrors.pnfl = "PNFL 14 ta raqamdan iborat bo'lishi kerak"
    if (!formData.organizationId) newErrors.organizationId = "Tashkilot tanlang"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    
    setIsSubmitting(true)
    try {
      await createUser({
        first_name: formData.firstName,
        last_name: formData.lastName,
        middle_name: formData.middleName,
        email: formData.email || undefined,
        phone: formData.phone,
        pnfl: formData.pnfl,
        position: formData.position || undefined,
        role: formData.role,
        organization: formData.organizationId,
      })
      onSubmit()
    } catch (error: any) {
      console.error("Create user error:", error)
      
      // Handle field-specific errors from API
      const fieldErrors: Record<string, string> = {}
      
      if (error.data && typeof error.data === 'object') {
        // Map backend field names to frontend field names
        const fieldMap: Record<string, string> = {
          'first_name': 'firstName',
          'last_name': 'lastName',
          'middle_name': 'middleName',
          'organization': 'organizationId',
          'pnfl': 'pnfl',
          'phone': 'phone',
          'email': 'email',
          'role': 'role',
          'position': 'position',
        }
        
        for (const [field, errors] of Object.entries(error.data)) {
          const frontendField = fieldMap[field] || field
          const errorMsg = Array.isArray(errors) ? errors.join(', ') : String(errors)
          fieldErrors[frontendField] = errorMsg
        }
      }
      
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
      } else {
        setErrors({ submit: error.message || "Yaratishda xatolik yuz berdi" })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Yangi foydalanuvchi qo'shish</DialogTitle>
          <DialogDescription>
            Tizimga yangi foydalanuvchi qo'shish uchun ma'lumotlarni kiriting
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {errors.submit && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              {errors.submit}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lastName">Familiya <span className="text-red-500">*</span></Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => onChange("lastName", e.target.value)}
                placeholder="Familiyani kiriting"
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Ism <span className="text-red-500">*</span></Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => onChange("firstName", e.target.value)}
                placeholder="Ismni kiriting"
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Sharifi</Label>
              <Input
                id="middleName"
                value={formData.middleName}
                onChange={(e) => onChange("middleName", e.target.value)}
                placeholder="Sharifni kiriting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon <span className="text-red-500">*</span></Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                placeholder="+998 XX XXX XX XX"
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
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
              <Label htmlFor="pnfl">PNFL</Label>
              <Input
                id="pnfl"
                value={formData.pnfl}
                onChange={(e) => onChange("pnfl", e.target.value.replace(/\D/g, ''))}
                placeholder="14 ta raqam"
                maxLength={14}
                className={errors.pnfl ? "border-red-500" : ""}
              />
              {errors.pnfl && <p className="text-xs text-red-500">{errors.pnfl}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Lavozim</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => onChange("position", e.target.value)}
                placeholder="Lavozimni kiriting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol <span className="text-red-500">*</span></Label>
              <Select value={formData.role} onValueChange={(value) => onChange("role", value)}>
                <SelectTrigger className={errors.role ? "border-red-500" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOKIM">Hokim</SelectItem>
                  <SelectItem value="HOKIMLIK_MASUL">Hokimlik mas'uli</SelectItem>
                  <SelectItem value="TASHKILOT_RAHBARI">Tashkilot rahbari</SelectItem>
                  <SelectItem value="TASHKILOT_MASUL">Tashkilot mas'uli</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationId">Tashkilot <span className="text-red-500">*</span></Label>
            <Select value={formData.organizationId} onValueChange={(value) => onChange("organizationId", value)}>
              <SelectTrigger className={errors.organizationId ? "border-red-500" : ""}>
                <SelectValue placeholder="Tashkilotni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {organizationItems.map((org) => (
                  <SelectItem key={org.id} value={String(org.id)}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.organizationId && <p className="text-xs text-red-500">{errors.organizationId}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Bekor qilish
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Qo'shish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
