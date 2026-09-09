"use client"

import { DashboardDetailFrame } from "@/components/layout/dashboard-detail-frame"
import { Header } from "@/components/layout/header"
import { PremiumEmptyState, PremiumTableShell } from "@/components/dashboard/premium-dashboard-ui"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import { LoadingSpinner } from "@/components/ui/loading"
import { getUserById, blockUser, unblockUser, archiveUser } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/types"
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Building,
  Calendar,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Shield,
  Unlock,
  UserIcon,
  Users,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

const ROLE_LABELS: Record<string, string> = {
  HOKIM: "Hokim",
  HOKIM_YORDAMCHISI: "Hokim o'rinbosari",
  HOKIMLIK_MASUL: "Hokimlik mutaxassisi",
  TASHKILOT_RAHBARI: "Tashkilot rahbari",
  TASHKILOT_MASUL: "Tashkilot mas'uli",
  ADMIN: "Administrator",
}

const STATUS_LABELS: Record<string, string> = {
  FAOL: "Faol",
  ACTIVE: "Faol",
  BLOKLANGAN: "Bloklangan",
  BLOCKED: "Bloklangan",
  ARXIV: "Arxiv",
  KUTILMOQDA: "Kutilmoqda",
  INACTIVE: "Nofaol",
  DRAFT: "Qoralama",
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-[22px] border border-border bg-card p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]">
      <div className="rounded-2xl bg-muted p-2.5 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-foreground">{value || "—"}</p>
      </div>
    </div>
  )
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const userId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      try {
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
      const updated = await blockUser(user.id)
      setUser(updated)
      toast({ title: "Bloklandi", description: "Foydalanuvchi vaqtinchalik bloklandi" })
    } catch (error: any) {
      toast({
        title: "Xato",
        description: error?.message || "Foydalanuvchini bloklab bo'lmadi",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnblock = async () => {
    if (!user) return

    try {
      setActionLoading(true)
      const updated = await unblockUser(user.id)
      setUser(updated)
      toast({ title: "Faollashtirildi", description: "Foydalanuvchi blokdan chiqarildi" })
    } catch (error: any) {
      toast({
        title: "Xato",
        description: error?.message || "Foydalanuvchini faollashtirib bo'lmadi",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!user) return

    try {
      setActionLoading(true)
      const updated = await archiveUser(user.id)
      setUser(updated)
      toast({ title: "Arxivlandi", description: "Foydalanuvchi arxivga o'tkazildi" })
    } catch (error: any) {
      toast({
        title: "Xato",
        description: error?.message || "Foydalanuvchini arxivga o'tkazib bo'lmadi",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const userStats = useMemo(() => {
    if (!user) return []

    return [
      {
        label: "Holat",
        value: user.status === "FAOL" ? "Faol" : user.status === "BLOKLANGAN" ? "Bloklangan" : user.status === "ARXIV" ? "Arxiv" : "Kutilmoqda",
        icon: Shield,
        tone: "via-white bg-info",
      },
      {
        label: "Rol",
        value: ROLE_LABELS[user.role] || user.role,
        icon: Users,
        tone: "via-white bg-success",
      },
      {
        label: "Tashkilot",
        value: user.organization?.name || user.organization_name || "Biriktirilmagan",
        icon: Building,
        tone: "via-white bg-warning",
      },
    ]
  }, [user])

  if (loading) {
    return (
      <>
        <Header title="Foydalanuvchi" description="Foydalanuvchi ma'lumotlari yuklanmoqda" />
        <DashboardDetailFrame
          eyebrow="Foydalanuvchi"
          title="Ma'lumotlar tayyorlanmoqda"
          description="Shaxsiy ma'lumotlar va boshqaruv imkoniyatlari yuklanmoqda."
          backHref="/dashboard/users"
          stats={[]}
        >
          <div className="rounded-[28px] border border-border bg-card p-10 text-center shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)]">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-sm text-muted-foreground">Foydalanuvchi ma'lumotlari yuklanmoqda...</p>
          </div>
        </DashboardDetailFrame>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Header title="Foydalanuvchi topilmadi" description="So'ralgan foydalanuvchi mavjud emas" />
        <DashboardDetailFrame
          eyebrow="Foydalanuvchi"
          title="Foydalanuvchi topilmadi"
          description="So'ralgan foydalanuvchi mavjud emas yoki o'chirilgan."
          backHref="/dashboard/users"
          stats={[]}
        >
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)]">
            <PremiumEmptyState
              icon={AlertTriangle}
              title="Ma'lumot topilmadi"
              description="Ro'yxatga qayting yoki boshqa foydalanuvchini tanlang."
              tone="text-warning bg-warning"
            />
          </div>
        </DashboardDetailFrame>
      </>
    )
  }

  return (
    <>
      <Header
        title={`${user.last_name || ""} ${user.first_name || ""}`.trim() || "Foydalanuvchi"}
        description="Foydalanuvchi ma'lumotlari va boshqaruvi"
      />
      <DashboardDetailFrame
        eyebrow="Foydalanuvchi kartasi"
        title={user.full_name || `${user.last_name || ""} ${user.first_name || ""}`.trim()}
        description={user.position || "Lavozim ko'rsatilmagan"}
        backHref="/dashboard/users"
        stats={userStats}
        badges={
          <>
            <Badge className="border-white/20 bg-white/12 text-white hover:bg-white/15">
              {ROLE_LABELS[user.role] || user.role}
            </Badge>
            <Badge className="border-white/20 bg-white/12 text-white hover:bg-white/15">
              {STATUS_LABELS[user.status] || user.status}
            </Badge>
          </>
        }
        actions={
          <>
            <Button
              asChild
              variant="secondary"
              className="border-white/20 bg-white/10 text-white shadow-none hover:bg-white/18"
            >
              <Link href={`/dashboard/users/${user.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Tahrirlash
              </Link>
            </Button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <PremiumTableShell
            icon={UserIcon}
            title="Asosiy ma'lumotlar"
            countLabel="Shaxsiy va tizim ma'lumotlari"
            accentClassName="bg-primary-soft"
          >
            <div className="space-y-6 p-6">
              <div className="bg-background flex flex-col gap-4 rounded-[26px] border border-border p-5 sm:flex-row sm:items-center">
                <UserAvatar
                  firstName={user.first_name}
                  lastName={user.last_name}
                  avatarUrl={user.avatar_url}
                  size="xl"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {user.last_name} {user.first_name} {user.middle_name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{user.position || "Lavozim ko'rsatilmagan"}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Login: {user.login || "—"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailItem icon={UserIcon} label="Login" value={user.login || "—"} />
                {user.visible_password ? (
                  <div className="rounded-[22px] border border-border bg-card p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-muted p-2.5 text-muted-foreground">
                          <Lock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Parol</p>
                          <p className="mt-1 break-words text-sm font-medium text-foreground">
                            {showPassword ? user.visible_password : "•".repeat(Math.max(8, user.visible_password.length))}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : null}
                <DetailItem icon={UserIcon} label="PNFL" value={user.masked_pnfl || user.pnfl || "—"} />
                <DetailItem icon={Phone} label="Telefon" value={user.phone || "—"} />
                <DetailItem icon={Mail} label="Elektron pochta" value={user.email || "—"} />
                <DetailItem
                  icon={Building}
                  label="Tashkilot"
                  value={user.organization?.name || (user as User & { organization_name?: string }).organization_name || "Belgilanmagan"}
                />
                <DetailItem icon={Shield} label="Rol" value={ROLE_LABELS[user.role] || user.role} />
                <DetailItem
                  icon={Calendar}
                  label="Ro'yxatdan o'tgan sana"
                  value={user.created_at ? new Date(user.created_at).toLocaleDateString("uz-UZ") : "—"}
                />
                <DetailItem
                  icon={Calendar}
                  label="So'nggi kirish"
                  value={user.last_login ? new Date(user.last_login).toLocaleString("uz-UZ") : "Hali kirilmagan"}
                />
              </div>
            </div>
          </PremiumTableShell>

          <div className="space-y-6">
            <PremiumTableShell
              icon={Shield}
              title="Holat boshqaruvi"
              countLabel="Tezkor amallar"
              accentClassName="bg-success-soft"
            >
              <div className="space-y-3 p-6">
                <Button
                  asChild
                  className="h-11 w-full justify-start rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  <Link href={`/dashboard/users/${user.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Tahrirlash sahifasini ochish
                  </Link>
                </Button>

                {user.status === "BLOKLANGAN" ? (
                  <Button
                    className="h-11 w-full justify-start rounded-2xl border-border bg-success-soft text-success-soft-foreground hover:bg-success-soft"
                    variant="outline"
                    onClick={handleUnblock}
                    disabled={actionLoading}
                  >
                    <Unlock className="mr-2 h-4 w-4" />
                    Blokdan chiqarish
                  </Button>
                ) : (
                  <Button
                    className="h-11 w-full justify-start rounded-2xl border-border bg-destructive-soft text-destructive-soft-foreground hover:bg-destructive-soft"
                    variant="outline"
                    onClick={handleBlock}
                    disabled={actionLoading || user.status === "ARXIV"}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Vaqtincha bloklash
                  </Button>
                )}

                {user.status !== "ARXIV" && (
                  <Button
                    className="h-11 w-full justify-start rounded-2xl border-border bg-warning-soft text-warning-soft-foreground hover:bg-warning-soft"
                    variant="outline"
                    onClick={handleArchive}
                    disabled={actionLoading}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Arxivga o'tkazish
                  </Button>
                )}

                <Button
                  variant="ghost"
                  className="h-11 w-full justify-start rounded-2xl text-muted-foreground hover:bg-muted"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Oldingi sahifaga qaytish
                </Button>
              </div>
            </PremiumTableShell>
          </div>
        </div>
      </DashboardDetailFrame>
    </>
  )
}
