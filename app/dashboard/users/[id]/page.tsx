"use client"

import { Header } from "@/components/layout/header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getUserById, blockUser, unblockUser, archiveUser } from "@/lib/api"
import { ensureDevAuth } from "@/lib/dev-auth"
import { cn } from "@/lib/utils"
import { User } from "@/types"
import { 
  ArrowLeft, 
  Building, 
  Calendar, 
  Edit, 
  Lock, 
  Mail, 
  Phone, 
  Shield, 
  Unlock, 
  UserIcon, 
  Archive,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// Role configurations
const ROLE_COLORS: Record<string, string> = {
  HOKIM: "bg-purple-500 text-white",
  HOKIMLIK_MASUL: "bg-blue-500 text-white",
  TASHKILOT_RAHBARI: "bg-emerald-500 text-white",
  TASHKILOT_MASUL: "bg-cyan-500 text-white",
  ADMIN: "bg-red-500 text-white",
}

const ROLE_LABELS: Record<string, string> = {
  HOKIM: "Hokim",
  HOKIMLIK_MASUL: "Hokimlik mas'uli",
  TASHKILOT_RAHBARI: "Tashkilot rahbari",
  TASHKILOT_MASUL: "Tashkilot mas'uli",
  ADMIN: "Administrator",
}

const STATUS_COLORS: Record<string, string> = {
  FAOL: "bg-emerald-500 text-white",
  KUTILMOQDA: "bg-yellow-500 text-white",
  BLOKLANGAN: "bg-red-500 text-white",
  ARXIV: "bg-gray-500 text-white",
  DRAFT: "bg-slate-400 text-white",
}

const STATUS_LABELS: Record<string, string> = {
  FAOL: "Faol",
  KUTILMOQDA: "Kutilmoqda",
  BLOKLANGAN: "Bloklangan",
  ARXIV: "Arxivlangan",
  DRAFT: "Qoralama",
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      try {
        await ensureDevAuth()
        const userData = await getUserById(userId)
        setUser(userData)
      } catch (error) {
        console.error("Error loading user:", error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [userId])

  const handleBlock = async () => {
    if (!user) return
    try {
      setActionLoading(true)
      await blockUser(user.id)
      setUser(prev => prev ? { ...prev, status: "BLOKLANGAN" } : null)
    } catch (error) {
      console.error("Error blocking user:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnblock = async () => {
    if (!user) return
    try {
      setActionLoading(true)
      await unblockUser(user.id)
      setUser(prev => prev ? { ...prev, status: "FAOL" } : null)
    } catch (error) {
      console.error("Error unblocking user:", error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!user) return
    try {
      setActionLoading(true)
      await archiveUser(user.id)
      setUser(prev => prev ? { ...prev, status: "ARXIV" } : null)
    } catch (error) {
      console.error("Error archiving user:", error)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Foydalanuvchi" description="Foydalanuvchi ma'lumotlari yuklanmoqda..." />
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

  return (
    <>
      <Header 
        title={`${user.last_name || ''} ${user.first_name || ''}`} 
        description="Foydalanuvchi ma'lumotlari va boshqaruvi" 
      />
      <div className="p-6">
        {/* Back button */}
        <div className="mb-6">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Orqaga
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main info card */}
          <Card className="lg:col-span-2 bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">
                  {user.last_name} {user.first_name} {user.middle_name}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  {user.position || "Lavozim ko'rsatilmagan"}
                </CardDescription>
                <div className="flex gap-2 mt-3">
                  <Badge className={cn("px-3 py-1", ROLE_COLORS[user.role] || "bg-gray-100 text-gray-800")}>
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                  <Badge className={cn("px-3 py-1", STATUS_COLORS[user.status] || "bg-gray-100 text-gray-800")}>
                    {STATUS_LABELS[user.status] || user.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">PNFL</p>
                      <p className="font-mono">{(user as any).masked_pnfl || user.pnfl || "—"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <p>{user.phone || "—"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p>{user.email || "—"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Building className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tashkilot</p>
                      <p>{user.organization?.name || (user as any).organization_name || "Belgilanmagan"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rol</p>
                      <p>{ROLE_LABELS[user.role] || user.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ro'yxatdan o'tgan</p>
                      <p>{user.created_at ? new Date(user.created_at).toLocaleDateString("uz-UZ") : "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions card */}
          <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl h-fit">
            <CardHeader>
              <CardTitle>Amallar</CardTitle>
              <CardDescription>Foydalanuvchi ustida amallar bajarish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                asChild
              >
                <Link href={`/dashboard/users/${user.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Tahrirlash
                </Link>
              </Button>
              
              {user.status === "BLOKLANGAN" ? (
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleUnblock}
                  disabled={actionLoading}
                >
                  <Unlock className="mr-2 h-4 w-4" />
                  Blokdan chiqarish
                </Button>
              ) : (
                <Button 
                  className="w-full justify-start text-red-600 hover:text-red-700" 
                  variant="outline"
                  onClick={handleBlock}
                  disabled={actionLoading || user.status === "ARXIV"}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Bloklash
                </Button>
              )}
              
              {user.status !== "ARXIV" && (
                <Button 
                  className="w-full justify-start text-orange-600 hover:text-orange-700" 
                  variant="outline"
                  onClick={handleArchive}
                  disabled={actionLoading}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Arxivlash
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
