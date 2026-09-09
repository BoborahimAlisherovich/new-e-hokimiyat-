"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Organization, PositionOption, User } from "@/types"
import { createUser } from "@/lib/api"
import { Eye, EyeOff, Loader2 } from "lucide-react"

interface CreateUserFormData {
  login: string
  firstName: string
  lastName: string
  middleName: string
  email: string
  phone: string
  pnfl: string
  position: string
  password: string
  role: User["role"]
  organizationId: string
  sectorId: string
  supervisorId: string
}

interface UserCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: CreateUserFormData
  organizations: Organization[]
  sectors: Array<{ id: string; name: string }>
  positions: PositionOption[]
  users: User[]
  currentUser: User | null
  onChange: (field: keyof CreateUserFormData, value: string) => void
  onCreated: (createdUser: User, plainPassword: string) => void
}

export function UserCreateDialog({
  open,
  onOpenChange,
  formData,
  organizations,
  sectors,
  positions,
  users,
  currentUser,
  onChange,
  onCreated,
}: UserCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  const organizationItems = Array.isArray(organizations)
    ? organizations
    : (organizations as { results?: Organization[] } | null | undefined)?.results || []
  const isOrganizationRole = ["TASHKILOT_RAHBARI", "TASHKILOT_MASUL"].includes(formData.role)
  const isHokimlikRole = ["HOKIM_YORDAMCHISI", "HOKIMLIK_MASUL"].includes(formData.role)
  const requiresSupervisor = formData.role === "HOKIMLIK_MASUL"
  const availableSupervisors = users.filter((user) => {
    if (user.role !== "HOKIM_YORDAMCHISI") return false
    const supervisorSectorId =
      typeof user.sector === "object" && user.sector?.id
        ? String(user.sector.id)
        : String(user.sector_id || "")

    if (formData.sectorId && supervisorSectorId && supervisorSectorId !== formData.sectorId) {
      return false
    }

    if (currentUser?.role === "HOKIM_YORDAMCHISI") {
      return String(user.id) === String(currentUser.id)
    }

    return true
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}
    const phone = formData.phone.trim()
    const email = formData.email.trim()
    if (!formData.login.trim()) newErrors.login = "Login majburiy"
    if (!formData.firstName.trim()) newErrors.firstName = "Ism majburiy"
    if (!formData.lastName.trim()) newErrors.lastName = "Familiya majburiy"
    if (!phone) newErrors.phone = "Telefon majburiy"
    if (phone && !/^\+998\d{9}$/.test(phone)) newErrors.phone = "Telefon +998XXXXXXXXX formatida bo'lishi kerak"
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Email formati noto'g'ri"
    if (!formData.pnfl.trim()) newErrors.pnfl = "PNFL majburiy"
    if (!formData.password.trim()) newErrors.password = "Parol majburiy"
    if (formData.password && formData.password.length < 6) newErrors.password = "Parol kamida 6 ta belgidan iborat bo'lishi kerak"
    if (formData.pnfl && formData.pnfl.length !== 14) newErrors.pnfl = "PNFL 14 ta raqamdan iborat bo'lishi kerak"
    if (isOrganizationRole && !formData.organizationId) {
      newErrors.organizationId = "Tashkilot tanlang"
    }
    if (isHokimlikRole && !formData.sectorId) newErrors.sectorId = "Soha yoki kompleksni tanlang"
    if (formData.role === "HOKIMLIK_MASUL" && !formData.supervisorId) newErrors.supervisorId = "Bevosita rahbarni tanlang"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    
    setIsSubmitting(true)
    try {
      const createdUser = await createUser({
        login: formData.login.trim(),
        first_name: formData.firstName,
        last_name: formData.lastName,
        middle_name: formData.middleName,
        email: formData.email || undefined,
        phone: formData.phone,
        pnfl: formData.pnfl,
        position: formData.position || undefined,
        password: formData.password,
        role: formData.role,
        organization: formData.organizationId || undefined,
        sector: formData.sectorId || undefined,
        supervisor: formData.supervisorId || undefined,
      })
      onCreated(createdUser, formData.password)
    } catch (error: any) {
      console.error("Create user error:", error)
      
      // Handle field-specific errors from API
      const fieldErrors: Record<string, string> = {}
      
      if (error.data && typeof error.data === 'object') {
        // Map backend field names to frontend field names
        const fieldMap: Record<string, string> = {
          'login': 'login',
          'first_name': 'firstName',
          'last_name': 'lastName',
          'middle_name': 'middleName',
          'organization': 'organizationId',
          'sector': 'sectorId',
          'supervisor': 'supervisorId',
          'pnfl': 'pnfl',
          'phone': 'phone',
          'email': 'email',
          'role': 'role',
          'position': 'position',
          'password': 'password',
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
      <DialogContent className="max-w-lg bg-white/95 backdrop-blur-2xl rounded-2xl border-white/60">
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
              <Label htmlFor="login">Login <span className="text-red-500">*</span></Label>
              <Input
                id="login"
                value={formData.login}
                onChange={(e) => onChange("login", e.target.value)}
                placeholder="Masalan: admin-user"
                className={errors.login ? "border-red-500" : ""}
              />
              {errors.login && <p className="text-xs text-red-500">{errors.login}</p>}
            </div>
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
                onChange={(e) => {
                  const raw = e.target.value
                  const normalized = raw.startsWith("+")
                    ? `+${raw.slice(1).replace(/\D/g, "")}`
                    : raw.replace(/[^\d+]/g, "")
                  onChange("phone", normalized)
                }}
                placeholder="+998 XX XXX XX XX"
                inputMode="tel"
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
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pnfl">PNFL <span className="text-red-500">*</span></Label>
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
              <Label htmlFor="password">Parol <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => onChange("password", e.target.value)}
                  placeholder="Kamida 6 ta belgi"
                  autoComplete="new-password"
                  className={`${errors.password ? "border-red-500" : ""} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-secondary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Lavozim</Label>
              <Select value={formData.position || "none"} onValueChange={(value) => onChange("position", value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Lavozimni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belgilanmagan</SelectItem>
                  {positions.map((position) => (
                    <SelectItem key={position.id} value={position.name}>
                      {position.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol <span className="text-red-500">*</span></Label>
              <Select
                value={formData.role}
                onValueChange={(value) => {
                  onChange("role", value)
                  if (value !== "HOKIMLIK_MASUL") {
                    onChange("supervisorId", "")
                  }
                }}
              >
                <SelectTrigger className={errors.role ? "border-red-500" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOKIM">Hokim</SelectItem>
                  <SelectItem value="HOKIM_YORDAMCHISI">Hokim o'rinbosari</SelectItem>
                  <SelectItem value="HOKIMLIK_MASUL">Hokimlik mutaxassisi</SelectItem>
                  <SelectItem value="TASHKILOT_RAHBARI">Tashkilot rahbari</SelectItem>
                  <SelectItem value="TASHKILOT_MASUL">Tashkilot mas'uli</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sectorId">
                Soha / kompleks {isHokimlikRole && <span className="text-red-500">*</span>}
              </Label>
              <Select value={formData.sectorId || "none"} onValueChange={(value) => onChange("sectorId", value === "none" ? "" : value)}>
                <SelectTrigger className={errors.sectorId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Sohani tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belgilanmagan</SelectItem>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={String(sector.id)}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sectorId && <p className="text-xs text-red-500">{errors.sectorId}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationId">
              Tashkilot {isOrganizationRole && <span className="text-red-500">*</span>}
            </Label>
            <Select value={formData.organizationId || "none"} onValueChange={(value) => onChange("organizationId", value === "none" ? "" : value)}>
              <SelectTrigger className={errors.organizationId ? "border-red-500" : ""}>
                <SelectValue placeholder="Tashkilotni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Belgilanmagan</SelectItem>
                {organizationItems.map((org) => (
                  <SelectItem key={org.id} value={String(org.id)}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.organizationId && <p className="text-xs text-red-500">{errors.organizationId}</p>}
          </div>
          {requiresSupervisor && (
            <div className="space-y-2">
              <Label htmlFor="supervisorId">
                Bevosita rahbar <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.supervisorId || "none"} onValueChange={(value) => onChange("supervisorId", value === "none" ? "" : value)}>
                <SelectTrigger className={errors.supervisorId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Rahbarni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belgilanmagan</SelectItem>
                  {availableSupervisors.map((supervisor) => (
                    <SelectItem key={supervisor.id} value={String(supervisor.id)}>
                      {supervisor.full_name || `${supervisor.last_name} ${supervisor.first_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supervisorId && <p className="text-xs text-red-500">{errors.supervisorId}</p>}
            </div>
          )}
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
