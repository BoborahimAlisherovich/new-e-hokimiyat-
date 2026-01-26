"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { roleLabels } from "@/lib/mock-data"
import { getOrganizations, getUsers, getTasks } from "@/lib/api"
import { UserStatusBadge, TaskStatusBadge } from "@/components/ui/status-badge"
import { ArrowLeft, Building2, Users, ClipboardList, TrendingUp, Edit, Trash2, UserPlus } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"

export default function OrganizationDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [organization, setOrganization] = useState<any | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [orgUsers, setOrgUsers] = useState<any[]>([])
  const [orgTasks, setOrgTasks] = useState<any[]>([])

  useEffect(() => {
    let mounted = true
    Promise.all([getOrganizations(), getUsers(), getTasks()])
      .then(([orgs, users, tasks]) => {
        if (!mounted) return
        const org = orgs.results.find((o: any) => o.id === id) || null
        setOrganization(org)
        setIsActive(Boolean(org?.isActive))
        setOrgUsers(users.results.filter((u: any) => u.organizationId === id))
        setOrgTasks(tasks.results.filter((t: any) => (t.organizations || []).includes(id)))
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [id])

  const completedTasks = orgTasks.filter((t) => t.status === "BAJARILDI" || t.status === "NAZORATDAN_YECHILDI").length
  const pendingTasks = orgTasks.filter((t) => t.status === "YANGI" || t.status === "IJRODA").length
  const overdueTasks = orgTasks.filter((t) => t.status === "MUDDATI_KECH").length

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB')
  }

  if (!organization) {
    return (
      <>
        <Header title="Ташкилот маълумотлари" />
        <div className="p-6">Юкланмоқда...</div>
      </>
    )
  }

  return (
    <>
      <Header title="Ташкилот маълумотлари" />
      <div className="p-6 space-y-6">
        {/* Header with title and actions */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-2xl font-bold text-foreground">{organization.name}</h1>
            
            <div className="flex gap-2">
              <Link href="/dashboard/organizations">
                <Button variant="ghost" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Орқага
                </Button>
              </Link>
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Таҳрирлаш
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">Ташкилотни таҳрирлаш</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Ташкилот маълумотларини янгиланг
                    </DialogDescription>
                  </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Ташкилот номи</Label>
                    <Input defaultValue={organization.name} className="bg-background/50 border-border/50 focus:bg-background focus:border-primary transition-all" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-foreground">Фаол ҳолат</Label>
                      <p className="text-sm text-muted-foreground">
                        Нофаол ташкилотларга топшириқ бириктириб бўлмайди
                      </p>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditOpen(false)} className="border-border/50 bg-background/50">
                    Бекор қилиш
                  </Button>
                  <Button onClick={() => setIsEditOpen(false)}>Сақлаш</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 bg-transparent"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Ўчириш
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold text-foreground">Ташкилотни ўчириш</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      {organization.name} ни ўчирмоқчимисиз? Бу амални ортга қайтариб бўлмайди. Ташкилотга
                      бириктирилган барча фойдаланувчилар ва топшириқлар ҳам ўчирилади.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border/50 bg-background/50">Бекор қилиш</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90">Ўчириш</AlertDialogAction>
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
                    organization.isActive
                      ? "bg-accent/10 text-accent border-accent/30"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {organization.isActive ? "Фаол" : "Нофаол"}
                </Badge>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{orgUsers.length}</p>
                  <p className="text-xs text-muted-foreground">Ходимлар</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{orgTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Топшириқлар</p>
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
                    {organization.rating}%
                  </p>
                  <p className="text-xs text-muted-foreground">Рейтинг</p>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ижро даражаси</span>
                    <span className="font-medium text-foreground">
                      {completedTasks}/{orgTasks.length}
                    </span>
                  </div>
                  <Progress value={(completedTasks / Math.max(orgTasks.length, 1)) * 100} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-accent/10 p-2">
                    <p className="text-lg font-bold text-accent">{completedTasks}</p>
                    <p className="text-xs text-muted-foreground">Бажарилган</p>
                  </div>
                  <div className="rounded-lg bg-yellow-500/10 p-2">
                    <p className="text-lg font-bold text-yellow-500">{pendingTasks}</p>
                    <p className="text-xs text-muted-foreground">Жарайонда</p>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-2">
                    <p className="text-lg font-bold text-destructive">{overdueTasks}</p>
                    <p className="text-xs text-muted-foreground">Кечиккан</p>
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
                      Ходимлар ({orgUsers.length})
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Топшириқлар ({orgTasks.length})
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <TabsContent value="users" className="m-0">
                  <CardContent className="p-0">
                    {orgUsers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mb-4 opacity-20" />
                        <p>Ходимлар йўқ</p>
                        <Link href="/dashboard/users">
                          <Button variant="outline" className="mt-4 bg-transparent">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Ходим қўшиш
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
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {user.firstName[0]}
                                  {user.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground">
                                  {user.lastName} {user.firstName}
                                </p>
                                <p className="text-sm text-muted-foreground">{user.position}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="font-normal">
                                {roleLabels[user.role]}
                              </Badge>
                              <UserStatusBadge status={user.status} />
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
                        <p>Топшириқлар йўқ</p>
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
