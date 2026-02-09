"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserAvatar } from "@/components/ui/user-avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Switch } from "@/components/ui/switch"
import { roleLabels } from "@/lib/constants"
import { getOrganizationById, getUsers, getTasks, updateOrganization, deleteOrganization } from "@/lib/api"
import { UserStatusBadge, TaskStatusBadge } from "@/components/ui/status-badge"
import { ArrowLeft, Building2, Users, ClipboardList, TrendingUp, Edit, Trash2, UserPlus, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

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
      const [org, users, tasks] = await Promise.all([
        getOrganizationById(id),
        getUsers(),
        getTasks()
      ])
      const usersList = Array.isArray(users) ? users : (users as any).results || []
      const tasksList = Array.isArray(tasks) ? tasks : (tasks as any).results || []
      
      setOrganization(org)
      setIsActive(Boolean(org?.is_active || org?.isActive))
      setEditName(org?.name || "")
      
      // Backend uses 'organization' field (UUID)
      setOrgUsers(usersList.filter((u: any) => String(u.organization) === String(id) || String(u.organization_id) === String(id)))
      // Tasks may have assigned_organizations array
      setOrgTasks(tasksList.filter((t: any) => {
        const orgs = t.assigned_organizations || t.organizations || []
        return orgs.some((org: any) => {
          const orgId = typeof org === 'object' ? (org.organization?.id || org.organization_id || org.id) : org
          return String(orgId) === String(id)
        })
      }))
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
        is_active: isActive
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB')
  }

  if (loading) {
    return (
      <>
        <Header title="Tashkilot ma'lumotlari" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Yuklanmoqda...</span>
        </div>
      </>
    )
  }

  if (!organization) {
    return (
      <>
        <Header title="Tashkilot ma'lumotlari" />
        <div className="p-6 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-4">Tashkilot topilmadi</p>
          <Link href="/dashboard/organizations">
            <Button variant="outline">Tashkilotlarga qaytish</Button>
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Tashkilot ma'lumotlari" />
      <div className="p-6 space-y-6">
        {/* Header with title and actions */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-2xl font-bold text-foreground">{organization.name}</h1>
            
            <div className="flex gap-2">
              <Link href="/dashboard/organizations">
                <Button variant="ghost" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Orqaga
                </Button>
              </Link>
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Tahrirlash
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">Tashkilotni tahrirlash</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Tashkilot ma'lumotlarini yangilang
                    </DialogDescription>
                  </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Tashkilot nomi</Label>
                    <Input 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-background/50 border-border/50 focus:bg-background focus:border-primary transition-all" 
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-foreground">Faol holat</Label>
                      <p className="text-sm text-muted-foreground">
                        Nofaol tashkilotlarga topshiriq biriktirib bo'lmaydi
                      </p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-border/50 bg-background/50" disabled={isSaving}>
                    Bekor qilish
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Saqlash
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 bg-transparent"
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    O'chirish
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold text-foreground">Tashkilotni o'chirish</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      {organization.name} ni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi. Tashkilotga
                      biriktirilgan barcha foydalanuvchilar va topshiriqlar ham o'chiriladi.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border/50 bg-background/50">Bekor qilish</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">O'chirish</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Organization Info Card */}
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{organization.name}</h2>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-3",
                    (organization.is_active || organization.isActive)
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {(organization.is_active || organization.isActive) ? "Faol" : "Nofaol"}
                </Badge>
              </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{orgUsers.length}</p>
                  <p className="text-xs text-muted-foreground">Xodimlar</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{orgTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Topshiriqlar</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      organization.rating >= 90
                        ? "text-accent"
                        : organization.rating >= 70
                          ? "text-warning"
                          : "text-destructive",
                    )}
                  >
                    {organization.rating || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Reyting</p>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ijro darajasi</span>
                    <span className="font-medium text-foreground">
                      {completedTasks}/{orgTasks.length}
                    </span>
                  </div>
                  <Progress value={(completedTasks / Math.max(orgTasks.length, 1)) * 100} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <p className="text-lg font-bold text-accent">{completedTasks}</p>
                    <p className="text-xs text-muted-foreground">Bajarilgan</p>
                  </div>
                  <div className="rounded-lg bg-yellow-500/10 p-2">
                    <p className="text-lg font-bold text-yellow-500">{pendingTasks}</p>
                    <p className="text-xs text-muted-foreground">Jarayonda</p>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-2">
                    <p className="text-lg font-bold text-destructive">{overdueTasks}</p>
                    <p className="text-xs text-muted-foreground">Kechikkan</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users and Tasks */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card border-border">
              <Tabs defaultValue="users" className="w-full">
                <CardHeader className="border-b border-border pb-0">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="users" className="gap-2">
                      <Users className="h-4 w-4" />
                      Xodimlar ({orgUsers.length})
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Topshiriqlar ({orgTasks.length})
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <TabsContent value="users" className="m-0">
                  <CardContent className="p-0">
                    {orgUsers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mb-4 opacity-20" />
                        <p>Xodimlar yo'q</p>
                        <Link href="/dashboard/users">
                          <Button variant="outline" className="mt-4 bg-transparent">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Xodim qo'shish
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {orgUsers.map((user) => (
                          <Link
                            key={user.id}
                            href={`/dashboard/users/${user.id}`}
                            className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                firstName={user.first_name || user.firstName}
                                lastName={user.last_name || user.lastName}
                                avatarUrl={user.avatar_url}
                                size="md"
                              />
                              <div>
                                <p className="font-medium text-foreground">
                                  {user.last_name || user.lastName} {user.first_name || user.firstName}
                                </p>
                                <p className="text-sm text-muted-foreground">{user.position || '-'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="font-normal">
                                {(roleLabels as Record<string, string>)[user.role] || user.role || '-'}
                              </Badge>
                              {user.is_active !== undefined ? (
                                <Badge variant="outline" className={user.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
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
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <ClipboardList className="h-12 w-12 mb-4 opacity-20" />
                        <p>Topshiriqlar yo'q</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {orgTasks.map((task) => (
                          <Link
                            key={task.id}
                            href={`/dashboard/tasks/${task.id}`}
                            className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <p className="font-medium text-foreground">{task.title}</p>
                              <p className="text-sm text-muted-foreground">Muddat: {formatDate(task.deadline)}</p>
                            </div>
                            <TaskStatusBadge status={task.status} />
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
