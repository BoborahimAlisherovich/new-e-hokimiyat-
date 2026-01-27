import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TabsContent } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useTranslation } from "@/lib/i18n/context"
import { Save, UserCheck, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { updateCurrentUserProfile } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Translation = ReturnType<typeof useTranslation>

interface CurrentUser {
  id?: number | string
  firstName: string
  lastName: string
  middleName?: string
  phone?: string
  pnfl?: string
  role: string
}

interface SettingsProfileTabProps {
  t: Translation
  currentUser: CurrentUser
  onSave?: () => Promise<void>
  saving?: boolean
}

export function SettingsProfileTab({ t, currentUser }: SettingsProfileTabProps) {
  const { toast } = useToast()
  const [firstName, setFirstName] = useState(currentUser.firstName)
  const [lastName, setLastName] = useState(currentUser.lastName)
  const [middleName, setMiddleName] = useState(currentUser.middleName || "")
  const [phone, setPhone] = useState(currentUser.phone || "")
  const [saving, setSaving] = useState(false)

  // Update state when currentUser changes
  useEffect(() => {
    setFirstName(currentUser.firstName)
    setLastName(currentUser.lastName)
    setMiddleName(currentUser.middleName || "")
    setPhone(currentUser.phone || "")
  }, [currentUser])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCurrentUserProfile({
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        phone: phone,
      }, currentUser.id)
      
      // Update localStorage user
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        user.first_name = firstName
        user.last_name = lastName
        user.middle_name = middleName
        user.phone = phone
        localStorage.setItem('user', JSON.stringify(user))
      }
      
      toast({
        title: "Muvaffaqiyatli saqlandi",
        description: "Profil ma'lumotlari backendga saqlandi",
      })
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Profilni saqlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getInitials = () => {
    const first = firstName?.[0] || ""
    const last = lastName?.[0] || ""
    return (first + last).toUpperCase() || "ФИ"
  }

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      ADMIN: "Администратор",
      HOKIM: "Ҳоким",
      HOKIMLIK_MASUL: "Ҳокимлик масъули",
      TASHKILOT_RAHBAR: "Ташкилот раҳбари",
      TASHKILOT_MASUL: "Ташкилот масъули",
      USER: "Фойдаланувчи",
    }
    return roleLabels[role] || role
  }

  return (
    <TabsContent value="profile" className="mt-6">
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">{t.settings.profile}</CardTitle>
          <CardDescription className="text-gray-600">{t.settings.profileDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-emerald-600 text-white text-lg font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">
                {lastName} {firstName} {middleName}
              </h3>
              <p className="text-sm text-gray-600">{getRoleLabel(currentUser.role)}</p>
              <Badge variant="outline" className="mt-2 bg-emerald-50 text-emerald-600 border-emerald-200">
                <UserCheck className="mr-1 h-3 w-3" />
                {t.settings.oneIDConnected}
              </Badge>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t.settings.lastName}</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11 border border-gray-300 rounded-md focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t.settings.firstName}</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11 border border-gray-300 rounded-md focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t.settings.middleName}</Label>
              <Input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="h-11 border border-gray-300 rounded-md focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t.settings.phone}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 XX XXX XX XX"
                className="h-11 border border-gray-300 rounded-md focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">ПНФЛ (JSHSHIR)</Label>
              <Input
                value={currentUser.pnfl || ""}
                disabled
                className="h-11 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Роль</Label>
              <Input
                value={getRoleLabel(currentUser.role)}
                disabled
                className="h-11 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saqlanmoqda..." : t.common.save}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
