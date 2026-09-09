import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useTranslation } from "@/lib/i18n/context"
import { Save, UserCheck, Loader2, Camera, Trash2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { updateCurrentUserProfile, uploadAvatar, deleteAvatar } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Translation = ReturnType<typeof useTranslation>

interface CurrentUser {
  id?: number | string
  login?: string
  firstName: string
  lastName: string
  middleName?: string
  phone?: string
  pnfl?: string
  role: string
  avatar_url?: string | null
}

interface SettingsProfileTabProps {
  t: Translation
  currentUser: CurrentUser
  onUserUpdate?: () => void
  onSave?: () => Promise<void>
  saving?: boolean
}

export function SettingsProfileTab({ t, currentUser, onUserUpdate }: SettingsProfileTabProps) {
  const { toast } = useToast()
  const [firstName, setFirstName] = useState(currentUser.firstName)
  const [lastName, setLastName] = useState(currentUser.lastName)
  const [middleName, setMiddleName] = useState(currentUser.middleName || "")
  const [phone, setPhone] = useState(currentUser.phone || "")
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser.avatar_url || null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update state when currentUser changes
  useEffect(() => {
    setFirstName(currentUser.firstName)
    setLastName(currentUser.lastName)
    setMiddleName(currentUser.middleName || "")
    setPhone(currentUser.phone || "")
    setAvatarUrl(currentUser.avatar_url || null)
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
      
      // Notify parent to refresh user data
      onUserUpdate?.()
      
      // Dispatch event to update sidebar
      window.dispatchEvent(new Event('userUpdated'))
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Xatolik",
        description: "Faqat JPEG, PNG, WebP va GIF formatidagi rasmlar qabul qilinadi.",
        variant: "destructive",
      })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Xatolik",
        description: "Rasm hajmi 5 MB dan oshmasligi kerak.",
        variant: "destructive",
      })
      return
    }

    setUploadingAvatar(true)
    try {
      const result = await uploadAvatar(file)
      setAvatarUrl(result.avatar_url)

      // Update localStorage
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        user.avatar_url = result.avatar_url
        localStorage.setItem('user', JSON.stringify(user))
      }

      toast({
        title: "Muvaffaqiyatli",
        description: "Profil rasmi yuklandi",
      })

      onUserUpdate?.()
      window.dispatchEvent(new Event('userUpdated'))
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Rasm yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAvatarDelete = async () => {
    setUploadingAvatar(true)
    try {
      await deleteAvatar()
      setAvatarUrl(null)

      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        user.avatar_url = null
        localStorage.setItem('user', JSON.stringify(user))
      }

      toast({
        title: "Muvaffaqiyatli",
        description: "Profil rasmi o'chirildi",
      })

      onUserUpdate?.()
      window.dispatchEvent(new Event('userUpdated'))
    } catch (error: any) {
      toast({
        title: "Xatolik",
        description: error.message || "Rasmni o'chirishda xatolik",
        variant: "destructive",
      })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      ADMIN: "Администратор",
      HOKIM: "Ҳоким",
      HOKIMLIK_MASUL: "Ҳокимлик мутахассиси",
      TASHKILOT_RAHBAR: "Ташкилот раҳбари",
      TASHKILOT_RAHBARI: "Ташкилот раҳбари",
      TASHKILOT_MASUL: "Ташкилот масъули",
      USER: "Фойдаланувчи",
    }
    return roleLabels[role] || role
  }

  return (
    <TabsContent value="profile" className="mt-6">
      <Card className="bg-white border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">{t.settings.profile}</CardTitle>
          <CardDescription className="text-muted-foreground">{t.settings.profileDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <UserAvatar
                firstName={firstName}
                lastName={lastName}
                avatarUrl={avatarUrl}
                size="xl"
                className="ring-4 ring-primary/25"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full cursor-pointer"
                aria-label="Rasm yuklash"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground">
                {lastName} {firstName} {middleName}
              </h3>
              <p className="text-sm text-muted-foreground">{getRoleLabel(currentUser.role)}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-primary-soft text-primary-soft-foreground border-border">
                  <UserCheck className="mr-1 h-3 w-3" />
                  Login faollashtirilgan
                </Badge>
                {avatarUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAvatarDelete}
                    disabled={uploadingAvatar}
                    className="h-7 px-2 text-xs text-destructive-soft-foreground hover:text-destructive-soft-foreground hover:bg-destructive-soft"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Rasmni o'chirish
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-secondary-foreground">{t.settings.lastName}</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11 border border-border-strong rounded-md focus:border-primary focus:ring-1 focus:ring-primary/25"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-secondary-foreground">{t.settings.firstName}</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11 border border-border-strong rounded-md focus:border-primary focus:ring-1 focus:ring-primary/25"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-secondary-foreground">{t.settings.middleName}</Label>
              <Input
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="h-11 border border-border-strong rounded-md focus:border-primary focus:ring-1 focus:ring-primary/25"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-secondary-foreground">{t.settings.phone}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 XX XXX XX XX"
                className="h-11 border border-border-strong rounded-md focus:border-primary focus:ring-1 focus:ring-primary/25"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-secondary-foreground">Login</Label>
              <Input
                value={currentUser.login || ""}
                disabled
                className="h-11 border border-border-strong rounded-md bg-background text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-secondary-foreground">ПНФЛ (JSHSHIR)</Label>
              <Input
                value={currentUser.pnfl || ""}
                disabled
                className="h-11 border border-border-strong rounded-md bg-background text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-secondary-foreground">Роль</Label>
              <Input
                value={getRoleLabel(currentUser.role)}
                disabled
                className="h-11 border border-border-strong rounded-md bg-background text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-11 px-6 bg-primary hover:bg-primary text-white font-medium disabled:opacity-50"
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
