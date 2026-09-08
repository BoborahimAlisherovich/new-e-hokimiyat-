"use client"

import { DashboardDetailFrame } from "@/components/layout/dashboard-detail-frame"
import { PremiumFieldGroup, PremiumFormLayout } from "@/components/dashboard/premium-activity"
import { Header } from "@/components/layout/header"
import {
  PremiumEmptyState,
  PremiumTableShell,
} from "@/components/dashboard/premium-dashboard-ui"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserAvatar } from "@/components/ui/user-avatar"
import { LoadingSpinner } from "@/components/ui/loading"
import { UserStatusBadge, TaskStatusBadge } from "@/components/ui/status-badge"
import { roleLabels } from "@/lib/constants"
import { getOrganizationById, getUsers, getTasks, updateOrganization, deleteOrganization } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  Edit,
  Loader2,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

export default function OrganizationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = params.id as string

  const [organization, setOrganization] = useState<any | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [editName, setEditName] = useState("")
  const [orgUsers, setOrgUsers] = useState<any[]>([])
  const [orgTasks, setOrgTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [org, users, tasks] = await Promise.all([getOrganizationById(id), getUsers(), getTasks()])
      const usersList = Array.isArray(users) ? users : (users as any).results || []
      const tasksList = Array.isArray(tasks) ? tasks : (tasks as any).results || []

      setOrganization(org)
      setIsActive(Boolean(org?.is_active || org?.isActive))
      setEditName(org?.name || "")
      setOrgUsers(usersList.filter((u: any) => String(u.organization) === String(id) || String(u.organization_id) === String(id)))
      setOrgTasks(
        tasksList.filter((t: any) => {
          const orgs = t.assigned_organizations || t.organizations || []
          return orgs.some((orgItem: any) => {
            const orgId =
              typeof orgItem === "object"
                ? orgItem.organization?.id || orgItem.organization_id || orgItem.id
                : orgItem
            return String(orgId) === String(id)
          })
        }),
      )
    } catch (err) {
      console.error("Yuklashda xatolik:", err)
      toast({ title: "Xato", description: "Ma'lumotlarni yuklashda xatolik", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await updateOrganization(id, {
        name: editName,
        is_active: isActive,
      })
      toast({ title: "Muvaffaqiyat", description: "Tashkilot yangilandi" })
      setIsEditOpen(false)
      await loadData()
    } catch (err: any) {
      toast({ title: "Xato", description: err?.message || "Saqlashda xatolik", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await deleteOrganization(id)
      toast({ title: "Muvaffaqiyat", description: "Tashkilot o'chirildi" })
      router.push("/dashboard/organizations")
    } catch (err: any) {
      toast({ title: "Xato", description: err?.message || "O'chirishda xatolik", variant: "destructive" })
      setIsDeleting(false)
    }
  }

  const completedTasks = orgTasks.filter((t) => t.status === "BAJARILDI" || t.status === "NAZORATDAN_YECHILDI").length
  const pendingTasks = orgTasks.filter((t) => t.status === "YANGI" || t.status === "IJRODA").length
  const overdueTasks = orgTasks.filter((t) => t.status === "MUDDATI_KECH").length
  const completionRate = Math.round((completedTasks / Math.max(orgTasks.length, 1)) * 100)

  const organizationStats = useMemo(
    () => [
      {
        label: "Xodimlar",
        value: orgUsers.length,
        icon: Users,
        tone: "from-cyan-50 via-white to-cyan-100/70",
      },
      {
        label: "Topshiriqlar",
        value: orgTasks.length,
        icon: ClipboardList,
        tone: "from-emerald-50 via-white to-emerald-100/70",
      },
      {
        label: "Ijro darajasi",
        value: `${completionRate}%`,
        icon: TrendingUp,
        tone: "from-amber-50 via-white to-amber-100/70",
      },
    ],
    [completionRate, orgTasks.length, orgUsers.length],
  )

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("uz-UZ")

  if (loading) {
    return (
      <>
        <Header title="Tashkilot ma'lumotlari" />
        <DashboardDetailFrame
          eyebrow="Tashkilot"
          title="Ma'lumotlar tayyorlanmoqda"
          description="Tashkilot, xodimlar va topshiriqlar bo'yicha ma'lumotlar yuklanmoqda."
          backHref="/dashboard/organizations"
          stats={[]}
        >
          <div className="rounded-[28px] border border-white/70 bg-white/78 p-10 text-center shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-sm text-slate-500">Tashkilot ma'lumotlari yuklanmoqda...</p>
          </div>
        </DashboardDetailFrame>
      </>
    )
  }

  if (!organization) {
    return (
      <>
        <Header title="Tashkilot ma'lumotlari" />
        <DashboardDetailFrame
          eyebrow="Tashkilot"
          title="Tashkilot topilmadi"
          description="So'ralgan tashkilot mavjud emas yoki o'chirilgan."
          backHref="/dashboard/organizations"
          stats={[]}
        >
          <div className="rounded-[28px] border border-white/70 bg-white/78 p-6 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
            <PremiumEmptyState
              icon={Building2}
              title="Tashkilot topilmadi"
              description="Boshqa tashkilotni tanlang yoki ro'yxatga qayting."
              tone="from-slate-100 to-cyan-100 text-slate-600"
            />
          </div>
        </DashboardDetailFrame>
      </>
    )
  }

  return (
    <>
      <Header title="Tashkilot ma'lumotlari" />
      <DashboardDetailFrame
        eyebrow="Tashkilot kartasi"
        title={organization.name}
        description="Tashkilot holati, xodimlar tarkibi va topshiriqlar oqimi bir sahifada."
        backHref="/dashboard/organizations"
        stats={organizationStats}
        badges={
          <Badge
            variant="outline"
            className={cn(
              "border-white/20 bg-white/12 text-white",
              organization.is_active || organization.isActive ? "text-white" : "text-white/80",
            )}
          >
            {organization.is_active || organization.isActive ? "Faol tashkilot" : "Nofaol tashkilot"}
          </Badge>
        }
        actions={
          <>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="border-white/20 bg-white/10 text-white shadow-none hover:bg-white/18">
                  <Edit className="mr-2 h-4 w-4" />
                  Tahrirlash
                </Button>
              </DialogTrigger>
              <DialogContent className="overflow-hidden border-white/70 bg-white/88 shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)] backdrop-blur-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-slate-900">Tashkilotni tahrirlash</DialogTitle>
                  <DialogDescription>Tashkilot nomi va faol holatini yagona standartda yangilang.</DialogDescription>
                </DialogHeader>
                <PremiumFormLayout>
                  <PremiumFieldGroup label="Tashkilot nomi">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-11 rounded-2xl border-slate-200 bg-white" />
                  </PremiumFieldGroup>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-800">Faol holat</Label>
                      <p className="text-sm text-slate-500">Nofaol tashkilotga yangi topshiriq biriktirilmaydi.</p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </PremiumFormLayout>
                <DialogFooter className="border-t border-slate-100 pt-4">
                  <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving} className="rounded-2xl border-slate-200 bg-white">
                    Bekor qilish
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving} className="rounded-2xl">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Saqlash
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" className="border-red-200 bg-red-50 text-red-700 shadow-none hover:bg-red-100" disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  O'chirish
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="overflow-hidden border-white/70 bg-white/88 shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)] backdrop-blur-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Tashkilotni o'chirish</AlertDialogTitle>
                  <AlertDialogDescription>
                    {organization.name} ni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="border-t border-slate-100 pt-4">
                  <AlertDialogCancel className="rounded-2xl border-slate-200 bg-white">Bekor qilish</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="rounded-2xl">O'chirish</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.6fr]">
          <div className="space-y-6">
            <PremiumTableShell
              icon={Building2}
              title="Asosiy ko'rsatkichlar"
              countLabel="Tashkilot holati"
              accentClassName="bg-gradient-to-r from-cyan-50 via-white to-cyan-50/30"
            >
              <div className="space-y-6 p-6">
                <div className="rounded-[26px] border border-white/70 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-cyan-100 text-cyan-700">
                      <Building2 className="h-8 w-8" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-semibold tracking-tight text-slate-900">{organization.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Reyting: <span className="font-medium text-slate-700">{organization.rating || 0}%</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 p-4 text-center">
                    <p className="text-2xl font-semibold text-emerald-700">{completedTasks}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-emerald-600">Bajarilgan</p>
                  </div>
                  <div className="rounded-[22px] border border-amber-100 bg-amber-50 p-4 text-center">
                    <p className="text-2xl font-semibold text-amber-700">{pendingTasks}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-amber-600">Jarayonda</p>
                  </div>
                  <div className="rounded-[22px] border border-rose-100 bg-rose-50 p-4 text-center">
                    <p className="text-2xl font-semibold text-rose-700">{overdueTasks}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-rose-600">Kechikkan</p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/80 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Ijro darajasi</span>
                    <span className="font-medium text-slate-800">{completedTasks}/{orgTasks.length}</span>
                  </div>
                  <Progress value={completionRate} className="h-2.5" />
                </div>
              </div>
            </PremiumTableShell>
          </div>

          <PremiumTableShell
            icon={Users}
            title="Tarkib va topshiriqlar"
            countLabel="Jamoa va yuklama"
            accentClassName="bg-gradient-to-r from-emerald-50 via-white to-emerald-50/30"
          >
            <Tabs defaultValue="users" className="w-full">
              <div className="border-b border-slate-100 px-6 pt-6">
                <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100 p-1">
                  <TabsTrigger value="users" className="gap-2 rounded-xl">
                    <Users className="h-4 w-4" />
                    Xodimlar ({orgUsers.length})
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-2 rounded-xl">
                    <ClipboardList className="h-4 w-4" />
                    Topshiriqlar ({orgTasks.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="users" className="m-0">
                <CardContent className="p-0">
                  {orgUsers.length === 0 ? (
                    <PremiumEmptyState
                      icon={Users}
                      title="Xodimlar hali biriktirilmagan"
                      description="Ushbu tashkilotga xodim qo'shilsa, ro'yxat shu yerda ko'rinadi."
                      tone="from-cyan-100 to-cyan-50 text-cyan-700"
                    />
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {orgUsers.map((user) => (
                        <Link
                          key={user.id}
                          href={`/dashboard/users/${user.id}`}
                          className="flex items-center justify-between gap-3 p-5 transition-colors hover:bg-slate-50/80"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar
                              firstName={user.first_name || user.firstName}
                              lastName={user.last_name || user.lastName}
                              avatarUrl={user.avatar_url}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-800">
                                {user.last_name || user.lastName} {user.first_name || user.firstName}
                              </p>
                              <p className="truncate text-sm text-slate-500">{user.position || "Lavozim belgilanmagan"}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="rounded-full border border-slate-200 bg-white text-slate-600">
                              {(roleLabels as Record<string, string>)[user.role] || user.role || "-"}
                            </Badge>
                            {user.is_active !== undefined ? (
                              <Badge
                                variant="outline"
                                className={user.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}
                              >
                                {user.is_active ? "Faol" : "Nofaol"}
                              </Badge>
                            ) : (
                              <UserStatusBadge status={user.status} />
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </TabsContent>

              <TabsContent value="tasks" className="m-0">
                <CardContent className="p-0">
                  {orgTasks.length === 0 ? (
                    <PremiumEmptyState
                      icon={ClipboardList}
                      title="Topshiriqlar mavjud emas"
                      description="Yangi topshiriqlar biriktirilganda ular shu bo'limda ko'rinadi."
                      tone="from-amber-100 to-amber-50 text-amber-700"
                    />
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {orgTasks.map((task) => (
                        <Link
                          key={task.id}
                          href={`/dashboard/tasks/${task.id}`}
                          className="flex items-center justify-between gap-3 p-5 transition-colors hover:bg-slate-50/80"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{task.title}</p>
                            <p className="text-sm text-slate-500">Muddat: {formatDate(task.deadline)}</p>
                          </div>
                          <TaskStatusBadge status={task.status} />
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>

            {orgUsers.length === 0 && (
              <div className="border-t border-slate-100 p-6">
                <Button asChild variant="outline" className="rounded-2xl">
                  <Link href="/dashboard/users">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Xodim qo'shish sahifasiga o'tish
                  </Link>
                </Button>
              </div>
            )}
          </PremiumTableShell>
        </div>
      </DashboardDetailFrame>
    </>
  )
}
