"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getUserById, updateUser, getOrganizations, getSectors, getUsers, getPositions } from "@/lib/api"
import { User, Organization, PositionOption } from "@/types"
import { ArrowLeft, Save, AlertTriangle, Eye, EyeOff } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// Role and status options
const ROLES = [
  { value: "HOKIM", label: "Hokim" },
  { value: "HOKIM_YORDAMCHISI", label: "Hokim o'rinbosari" },
  { value: "HOKIMLIK_MASUL", label: "Hokimlik mutaxassisi" },
  { value: "TASHKILOT_RAHBARI", label: "Tashkilot rahbari" },
  { value: "TASHKILOT_MASUL", label: "Tashkilot mas'uli" },
  { value: "ADMIN", label: "Administrator" },
]

const STATUSES = [
  { value: "FAOL", label: "Faol" },
  { value: "KUTILMOQDA", label: "Kutilmoqda" },
  { value: "BLOKLANGAN", label: "Bloklangan" },
  { value: "ARXIV", label: "Arxivlangan" },
  { value: "DRAFT", label: "Qoralama" },
]

export default function UserEditPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  
  const [user, setUser] = useState<User | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [sectors, setSectors] = useState<Array<{ id: string; name: string; is_active?: boolean }>>([])
  const [positions, setPositions] = useState<PositionOption[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [initialPassword, setInitialPassword] = useState("")
  
  // Form state
  const [formData, setFormData] = useState({
    login: "",
    first_name: "",
    last_name: "",
    middle_name: "",
    phone: "",
    email: "",
    position: "",
    password: "",
    role: "",
    status: "",
    organization: "",
    sector: "",
    supervisor: "",
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, orgsData, sectorsData, usersData, positionsData] = await Promise.all([
          getUserById(userId),
          getOrganizations(),
          getSectors().catch(() => []),
          getUsers().catch(() => []),
          getPositions().catch(() => []),
        ])
        setUser(userData)
        setOrganizations(orgsData || [])
        setSectors(Array.isArray(sectorsData) ? sectorsData.filter((sector) => sector?.is_active !== false) : [])
        setAllUsers(Array.isArray(usersData) ? usersData : [])
        setPositions(Array.isArray(positionsData) ? positionsData.filter((position) => position?.is_active !== false) : [])
        
        // Populate form with user data
        // organization can be either an object with id or a string (UUID)
        const orgId = typeof userData.organization === 'object' && userData.organization?.id 
          ? userData.organization.id.toString() 
          : (userData.organization || (userData as any).organization_id || "")
        
        const sectorId = typeof userData.sector === 'object' && userData.sector?.id
          ? String(userData.sector.id)
          : String(userData.sector_id || "")
        const supervisorId = typeof userData.supervisor === 'object' && userData.supervisor?.id
          ? String(userData.supervisor.id)
          : String(userData.supervisor_id || "")

        setFormData({
          login: userData.login || "",
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          middle_name: userData.middle_name || "",
          phone: userData.phone || "",
          email: userData.email || "",
          position: userData.position || "",
          password: userData.visible_password || "",
          role: userData.role || "",
          status: userData.status || "",
          organization: orgId,
          sector: sectorId,
          supervisor: supervisorId,
        })
        setInitialPassword(userData.visible_password || "")
      } catch (err) {
        console.error("Error loading user:", err)
        setError("Foydalanuvchi ma'lumotlarini yuklashda xatolik")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [userId])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    
    try {
      const updateData: any = {
        login: formData.login.trim(),
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name,
        phone: formData.phone,
        email: formData.email,
        position: formData.position,
        role: formData.role,
        status: formData.status,
      }

      if (formData.password.trim() && formData.password.trim() !== initialPassword) {
        updateData.password = formData.password
      }
      
      updateData.organization = formData.organization || null
      updateData.sector = formData.sector || null
      updateData.supervisor = formData.supervisor || null
      
      await updateUser(userId, updateData)
      router.push(`/dashboard/users/${userId}`)
    } catch (err: any) {
      console.error("Error updating user:", err)
      setError(err.message || "Foydalanuvchini yangilashda xatolik")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Foydalanuvchini tahrirlash" description="Ma'lumotlar yuklanmoqda..." />
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Yuklanmoqda...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Header title="Foydalanuvchi topilmadi" description="So'ralgan foydalanuvchi mavjud emas" />
        <div className="p-6">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <AlertTriangle className="h-16 w-16 text-yellow-500" />
            <p className="text-muted-foreground">Foydalanuvchi topilmadi</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Orqaga qaytish
            </Button>
          </div>
        </div>
      </>
    )
  }

  const availableSupervisors = allUsers.filter((item) => {
    if (item.role !== "HOKIM_YORDAMCHISI") return false
    const supervisorSectorId =
      typeof item.sector === "object" && item.sector?.id
        ? String(item.sector.id)
        : String(item.sector_id || "")
    return !formData.sector || !supervisorSectorId || supervisorSectorId === formData.sector
  })

  return (
    <>
      <Header 
        title="Foydalanuvchini tahrirlash" 
        description={`${user.last_name} ${user.first_name} ma'lumotlarini o'zgartirish`} 
      />
      <div className="p-6">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Orqaga
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Personal info */}
            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
              <CardHeader>
                <CardTitle>Shaxsiy ma'lumotlar</CardTitle>
                <CardDescription>Foydalanuvchining asosiy ma'lumotlari</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="login">Login</Label>
                    <Input
                      id="login"
                      value={formData.login}
                      onChange={(e) => handleChange("login", e.target.value)}
                      placeholder="Loginni kiriting"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Parol</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                        placeholder="Parolni kiriting"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-700"
                        aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Familiya</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleChange("last_name", e.target.value)}
                      placeholder="Familiyani kiriting"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Ism</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleChange("first_name", e.target.value)}
                      placeholder="Ismni kiriting"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="middle_name">Otasining ismi</Label>
                  <Input
                    id="middle_name"
                    value={formData.middle_name}
                    onChange={(e) => handleChange("middle_name", e.target.value)}
                    placeholder="Otasining ismini kiriting"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="position">Lavozim</Label>
                  <Select value={formData.position || "none"} onValueChange={(v) => handleChange("position", v === "none" ? "" : v)}>
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
              </CardContent>
            </Card>

            {/* Contact info */}
            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
              <CardHeader>
                <CardTitle>Aloqa ma'lumotlari</CardTitle>
                <CardDescription>Telefon va email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon raqam</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Role and organization */}
            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl lg:col-span-2">
              <CardHeader>
                <CardTitle>Rol va tashkilot</CardTitle>
                <CardDescription>Foydalanuvchining roli va tegishli tashkiloti</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select value={formData.role} onValueChange={(v) => handleChange("role", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Rolni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Holat</Label>
                    <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Holatni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tashkilot</Label>
                    <Select value={formData.organization || "none"} onValueChange={(v) => handleChange("organization", v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tashkilotni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Belgilanmagan</SelectItem>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Soha / kompleks</Label>
                    <Select value={formData.sector || "none"} onValueChange={(v) => handleChange("sector", v === "none" ? "" : v)}>
                      <SelectTrigger>
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
                  </div>
                  <div className="space-y-2">
                    <Label>Bevosita rahbar</Label>
                    <Select value={formData.supervisor || "none"} onValueChange={(v) => handleChange("supervisor", v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Rahbarni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Belgilanmagan</SelectItem>
                        {availableSupervisors.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.full_name || `${item.last_name} ${item.first_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Bekor qilish
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </>
  )
}
