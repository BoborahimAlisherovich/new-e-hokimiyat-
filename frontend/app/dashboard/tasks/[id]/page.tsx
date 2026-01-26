"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { priorityLabels, sectorLabels, type TaskPriority, type Sector } from "@/lib/mock-data"
import { getTaskById, getTaskChat, getUsers, getOrganizations } from "@/lib/api"
import { TaskStatusBadge, PriorityBadge } from "@/components/ui/status-badge"
import {
  ArrowLeft,
  Send,
  Paperclip,
  Mic,
  Calendar,
  Building2,
  User,
  Clock,
  MapPin,
  FileText,
  CheckCircle2,
  RotateCcw,
  Edit,
  History,
  MessageSquare,
  Layers,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"

export default function TaskDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [newMessage, setNewMessage] = useState("")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isExtendOpen, setIsExtendOpen] = useState(false)
  const [selectedSector, setSelectedSector] = useState<string>("")
  const [task, setTask] = useState<any | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [taskExecutions, setTaskExecutions] = useState<any[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, any>>({})
  const [orgsMap, setOrgsMap] = useState<Record<string, any>>({})

  useEffect(() => {
    let mounted = true
    Promise.all([getTaskById(id), getTaskChat(id), getUsers(), getOrganizations()])
      .then(([t, chat, users, orgs]) => {
        if (!mounted) return
        setTask(t)
        setChatMessages(chat)
        // getTaskExecutions(t.id).then((execs) => setTaskExecutions(execs)).catch(() => setTaskExecutions([]))
        const uMap: Record<string, any> = {}
        users.forEach((u: any) => (uMap[u.id] = u))
        setUsersMap(uMap)
        const oMap: Record<string, any> = {}
        orgs.forEach((o: any) => (oMap[o.id] = o))
        setOrgsMap(oMap)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [id])

  const creator = task ? usersMap[task.createdBy] : undefined

  if (!task) {
    return (
      <>
        <Header title="Topshiriq tafsilotlari" />
        <div className="p-6">Yuklanmoqda...</div>
      </>
    )
  }

  const canEdit = task.status !== "NAZORATDAN_YECHILDI" && task.status !== "BAJARILMADI"
  const canClose = task.status === "BAJARILDI"
  const canReassign = task.status === "BAJARILDI"
  const canExtend = task.status === "IJRODA" || task.status === "MUDDATI_KECH"

  const sendMessage = () => {
    if (!newMessage.trim()) return
    setNewMessage("")
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isOverdue = new Date(task.deadline) < new Date() && !["BAJARILDI", "NAZORATDAN_YECHILDI"].includes(task.status)

  return (
    <>
      <Header title="Topshiriq tafsilotlari" />
      <div className="p-6 space-y-6">
        {/* Header with title and actions */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-2xl font-bold text-foreground">Topshiriq tafsilotlari</h1>
            
            <div className="flex gap-2">
              <Link href="/dashboard/tasks">
                <Button variant="ghost" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Orqaga
                </Button>
              </Link>
              {canExtend && (
                <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Clock className="mr-2 h-4 w-4" />
                      Muddat uzaytirish
                    </Button>
                  </DialogTrigger>
                <DialogContent className="bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">Muddat uzaytirish so'rovi</DialogTitle>
                    <DialogDescription className="text-muted-foreground">Yangi muddat va sabab kiriting</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Yangi muddat</Label>
                      <Input type="date" defaultValue={task.deadline} className="bg-background/50 border-border/50 focus:bg-background focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Sabab</Label>
                      <Textarea placeholder="Sababni kiriting..." className="bg-background/50 border-border/50 focus:bg-background focus:border-primary transition-all" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsExtendOpen(false)} className="border-border/50 bg-background/50">
                      Bekor qilish
                    </Button>
                    <Button onClick={() => setIsExtendOpen(false)}>So'rov yuborish</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {canEdit && (
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Tahrirlash
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">Topshiriqni tahrirlash</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Sarlavha</Label>
                      <Input defaultValue={task.title} className="bg-background/50 border-border/50 focus:bg-background focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tavsif</Label>
                      <Textarea defaultValue={task.description} rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ustuvorlik</Label>
                        <Select defaultValue={task.priority}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(priorityLabels) as TaskPriority[]).map((priority) => (
                              <SelectItem key={priority} value={priority}>
                                {priorityLabels[priority]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Muddat</Label>
                        <Input type="date" defaultValue={task.deadline} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Soha</Label>
                      <Select defaultValue={task.sector} onValueChange={setSelectedSector}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(sectorLabels) as Sector[]).map((sector) => (
                            <SelectItem key={sector} value={sector}>
                              {sectorLabels[sector]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                      Bekor qilish
                    </Button>
                    <Button onClick={() => setIsEditOpen(false)}>Saqlash</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {canReassign && (
              <Button
                variant="outline"
                className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10 bg-transparent"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Qayta ijroga
              </Button>
            )}

            {canClose && (
              <Button className="bg-accent hover:bg-accent/90">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Nazoratdan yechish
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - Task Details and Chat */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Info Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{task.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="font-normal">
                      {sectorLabels[task.sector]}
                    </Badge>
                    <PriorityBadge priority={task.priority} />
                    <TaskStatusBadge status={task.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Muddat</p>
                      <p className={cn("font-medium", isOverdue && "text-destructive")}>
                        {new Date(task.deadline).toLocaleDateString('en-GB')}
                        {isOverdue && " (kechiktirilgan)"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Yaratuvchi</p>
                      <p className="font-medium">
                        {creator?.lastName} {creator?.firstName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Soha</p>
                      <p className="font-medium">{sectorLabels[task.sector]}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tashkilotlar</p>
                      <p className="font-medium">{(task.organizations || []).map((orgId: string) => orgsMap[orgId]?.name).filter(Boolean).join(", ")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Yaratilgan</p>
                      <p className="font-medium">{new Date(task.createdAt).toLocaleDateString('en-GB')}</p>
                    </div>
                  </div>

                  {task.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-muted-foreground">Joylashuv</p>
                        <p className="font-medium">
                          {task.location.lat.toFixed(4)}, {task.location.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chat / Timeline */}
            <Card className="bg-card border-border">
              <Tabs defaultValue="chat" className="w-full">
                <CardHeader className="border-b border-border">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chat" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                      <History className="h-4 w-4" />
                      Tarix
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <TabsContent value="chat" className="m-0">
                  <ScrollArea className="h-[400px] p-4">
                    <div className="space-y-4">
                      {chatMessages.map((msg) => {
                        const sender = usersMap[msg.senderId] || { firstName: "-", lastName: "-" }
                        const isSystem = msg.type === "system"
                        const isCurrentUser = msg.senderId === "1"

                        if (isSystem) {
                          return (
                            <div key={msg.id} className="flex justify-center">
                              <Badge variant="secondary" className="text-xs font-normal">
                                {msg.content} - {formatDateTime(msg.createdAt)}
                              </Badge>
                            </div>
                          )
                        }

                        return (
                          <div key={msg.id} className={cn("flex gap-3", isCurrentUser && "flex-row-reverse")}>
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {sender?.firstName?.[0]}
                                {sender?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className={cn("max-w-[70%] space-y-1", isCurrentUser && "items-end")}>
                              <div className={cn("flex items-center gap-2", isCurrentUser && "flex-row-reverse")}>
                                <span className="text-sm font-medium text-foreground">
                                  {sender?.lastName} {sender?.firstName}
                                </span>
                                <span className="text-xs text-muted-foreground">{formatDateTime(msg.createdAt)}</span>
                              </div>
                              <div
                                className={cn(
                                  "rounded-lg p-3",
                                  isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted",
                                )}
                              >
                                <p className="text-sm">{msg.content}</p>
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {msg.attachments.map((file, i) => (
                                      <div
                                        key={i}
                                        className={cn(
                                          "flex items-center gap-2 text-xs",
                                          isCurrentUser ? "text-primary-foreground/80" : "text-muted-foreground",
                                        )}
                                      >
                                        <FileText className="h-3 w-3" />
                                        {file}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                  <div className="border-t border-border p-4">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <Mic className="h-4 w-4" />
                      </Button>
                      <Input
                        placeholder="Xabar yozing..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        className="bg-secondary"
                      />
                      <Button onClick={sendMessage} className="shrink-0">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="m-0">
                  <ScrollArea className="h-[450px] p-4">
                    <div className="space-y-4">
                      {taskExecutions.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">Hozircha tarix yo'q</div>
                      ) : (
                        taskExecutions.map((exec) => {
                          const executor = usersMap[exec.executedBy]
                          return (
                            <div key={exec.id} className="flex gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <History className="h-4 w-4 text-primary" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                  {exec.actionType.replace(/_/g, " ")}
                                </p>
                                <p className="text-sm text-muted-foreground">{exec.comment}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>
                                    {executor?.lastName} {executor?.firstName}
                                  </span>
                                  <span>•</span>
                                  <span>{formatDateTime(exec.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar - Organizations Status */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Tashkilotlar holati</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(task.organizations || []).map((orgId) => {
                  const org = orgsMap[orgId]
                  return (
                    <div key={orgId} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{org?.name}</span>
                          {org && <p className="text-xs text-muted-foreground">{sectorLabels[org.sector]}</p>}
                        </div>
                      </div>
                      <TaskStatusBadge status={task.status} />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-base">Fayllar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {task.attachments.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{file}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
          </div>
        </div>
      </div>
    </>
  )
}
