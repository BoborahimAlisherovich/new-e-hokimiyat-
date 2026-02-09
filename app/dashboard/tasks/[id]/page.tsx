"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { UserAvatar } from "@/components/ui/user-avatar"
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
import { priorityLabels, sectorLabels, type TaskPriority } from "@/lib/constants"
import { getTaskById, getTaskChat, getUsers, getOrganizations, sendTaskMessage, getAccessToken, API_BASE, getCurrentUser, updateTaskMessage, deleteTaskMessage, updateTask, approveTask, rejectTask, requestDeadlineExtension, markTaskComplete } from "@/lib/api"
import { TaskStatusBadge, PriorityBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"
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
  Trash2,
  History,
  MessageSquare,
  Layers,
  Lock,
  Download,
  File,
  Image,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"

const CATEGORY_LABELS: Record<string, string> = {
  IJTIMOIY: "Ijtimoiy",
  IQTISODIY: "Iqtisodiy",
  HUQUQIY: "Huquqiy",
  INFRASTRUKTURA: "Infrastruktura",
  TA_LIM: "Ta'lim",
  SOG_LIQNI_SAQLASH: "Sog'liqni saqlash",
  BOSHQA: "Boshqa",
}

export default function TaskDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [newMessage, setNewMessage] = useState("")
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isExtendOpen, setIsExtendOpen] = useState(false)
  const [task, setTask] = useState<any | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [taskExecutions, setTaskExecutions] = useState<any[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, any>>({})
  const [orgsMap, setOrgsMap] = useState<Record<string, any>>({})
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [chatFile, setChatFile] = useState<File | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState<string>("")
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Edit form state
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPriority, setEditPriority] = useState("")
  const [editDeadline, setEditDeadline] = useState("")
  const [editCategory, setEditCategory] = useState("")
  
  // Extend form state
  const [extendDeadline, setExtendDeadline] = useState("")
  const [extendReason, setExtendReason] = useState("")
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const normalizeChatMessage = (msg: any) => {
    if (msg?.type === 'execution') return null
    const senderObj = msg.sender && typeof msg.sender === 'object' ? msg.sender : null
    const senderId = senderObj?.id || msg.sender || msg.sender_id || msg.senderId
    return {
      id: msg.id,
      senderId: String(senderId),
      senderName: senderObj?.name || msg.sender_name || msg.senderName || msg.user_name,
      senderRole: senderObj?.role || msg.sender_role || msg.senderRole || msg.user_role,
      messageType: msg.message_type || msg.messageType || msg.type,
      content: msg.content || msg.message || "",
      attachment: msg.attachment || (msg.attachments && msg.attachments[0]) || null,
      createdAt: msg.created_at || msg.createdAt || msg.timestamp,
    }
  }

  const normalizeChatMessages = (list: any[]) => {
    const normalized = (list || []).map(normalizeChatMessage).filter(Boolean)
    // Deduplicate by message ID
    const seen = new Set<number | string>()
    return normalized.filter((msg) => {
      if (!msg || seen.has(msg.id)) return false
      seen.add(msg.id)
      return true
    })
  }

  useEffect(() => {
    let mounted = true
    Promise.all([getTaskById(id), getTaskChat(id), getUsers(), getOrganizations(), getCurrentUser()])
      .then(([t, chat, users, orgs, me]) => {
        if (!mounted) return
        setTask(t)
        setChatMessages(normalizeChatMessages(chat || []))
        const uMap: Record<string, any> = {}
        users.forEach((u: any) => (uMap[u.id] = u))
        setUsersMap(uMap)
        const oMap: Record<string, any> = {}
        orgs.forEach((o: any) => (oMap[o.id] = o))
        setOrgsMap(oMap)
        setCurrentUser(me)

        // Setup WebSocket for real-time chat
        const token = getAccessToken()
        if (token) {
          const wsUrl = `${API_BASE.replace(/^http/, 'ws')}/ws/tasks/${id}/chat/?token=${token}`
          const ws = new WebSocket(wsUrl)
          wsRef.current = ws
          ws.onmessage = (ev) => {
            try {
              const payload = JSON.parse(ev.data)
              if (payload.type === 'history') {
                setChatMessages(normalizeChatMessages(payload.messages || []))
              } else if (payload.type === 'message') {
                // On new message, refresh chat from REST to keep shape consistent
                getTaskChat(id).then((data) => setChatMessages(normalizeChatMessages(data || []))).catch(() => {})
              }
            } catch {}
          }
          ws.onclose = () => { wsRef.current = null }
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    }
  }, [id])
  
  // Initialize edit form when task loads
  useEffect(() => {
    if (task) {
      setEditTitle(task.title || "")
      setEditDescription(task.description || "")
      setEditPriority(task.priority || "")
      setEditDeadline(task.deadline || "")
      setEditCategory(task.category || "")
      setExtendDeadline(task.deadline || "")
    }
  }, [task])

  // Backend created_by ni ob'ekt sifatida yuboradi
  const creator = task?.created_by || (task?.createdBy ? usersMap[task.createdBy] : undefined)

  if (!task) {
    return (
      <>
        <Header title="Topshiriq tafsilotlari" />
        <div className="p-6">Yuklanmoqda...</div>
      </>
    )
  }

  const CLOSED_STATUSES = ["BAJARILDI", "NAZORATDAN_YECHILDI", "BAJARILMADI"]
  const isClosed = CLOSED_STATUSES.includes(task.status)
  
  // Rolga qarab tahrirlash imkoniyatlarini cheklash
  const isAdmin = currentUser?.role && ['HOKIM', 'HOKIMLIK_MASUL', 'ADMIN'].includes(currentUser.role)
  const isOrgUser = currentUser?.role && ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'].includes(currentUser.role)
  
  // Faqat HOKIM, HOKIMLIK_MASUL, ADMIN tahrirlashi mumkin
  const canEdit = !isClosed && isAdmin
  const canChat = !isClosed
  // Faqat HOKIM tasdiqlashi/qayta ijroga yuborishi mumkin
  const canClose = task.status === "BAJARILDI" && currentUser?.role === 'HOKIM'
  const canReassign = task.status === "BAJARILDI" && currentUser?.role === 'HOKIM'
  // Tashkilot xodimlari "Bajarildi" deb belgilashi mumkin, lekin muddatni uzaytira olmaydi
  const canMarkComplete = task.status === "IJRODA" && isOrgUser
  // Muddat uzaytirish faqat adminlar uchun
  const canExtend = (task.status === "IJRODA" || task.status === "MUDDATI_KECH") && isAdmin
  
  // Handle save task edits
  const handleSaveTask = async () => {
    if (!editTitle.trim()) {
      alert("Sarlavha majburiy")
      return
    }
    
    setIsSaving(true)
    try {
      const updatedTask = await updateTask(id, {
        title: editTitle,
        description: editDescription,
        priority: editPriority as any,
        due_date: editDeadline,
        category: editCategory as any,
      })
      setTask(updatedTask)
      setIsEditOpen(false)
    } catch (error) {
      console.error("Task update error:", error)
      alert("Topshiriqni yangilashda xatolik yuz berdi")
    } finally {
      setIsSaving(false)
    }
  }
  
  // Handle extend deadline
  const handleExtendDeadline = async () => {
    if (!extendDeadline || !extendReason.trim()) {
      alert("Yangi muddat va sabab majburiy")
      return
    }
    
    setIsSaving(true)
    try {
      const updatedTask = await requestDeadlineExtension(id, {
        requested_deadline: extendDeadline,
        reason: extendReason,
      })
      setTask(updatedTask)
      setExtendReason("")
      setIsExtendOpen(false)
    } catch (error) {
      console.error("Deadline extend error:", error)
      alert("Muddatni uzaytirishda xatolik yuz berdi")
    } finally {
      setIsSaving(false)
    }
  }
  
  // Handle mark complete (tashkilot uchun)
  const handleMarkComplete = async () => {
    if (!confirm("Topshiriqni bajarildi deb belgilamoqchimisiz?")) return
    
    setIsSaving(true)
    try {
      const updatedTask = await markTaskComplete(id)
      setTask(updatedTask)
      alert("Topshiriq bajarildi deb belgilandi!")
    } catch (error) {
      console.error("Mark complete error:", error)
      alert("Topshiriqni bajarildi deb belgilashda xatolik yuz berdi")
    } finally {
      setIsSaving(false)
    }
  }
  
  // Handle approve/close task
  const handleApproveTask = async () => {
    if (!confirm("Topshiriqni nazoratdan yechmoqchimisiz?")) return
    
    setIsSaving(true)
    try {
      const updatedTask = await approveTask(id, { comment: "Topshiriq nazoratdan yechildi" })
      setTask(updatedTask)
    } catch (error) {
      console.error("Approve task error:", error)
      alert("Topshiriqni tasdiqlashda xatolik yuz berdi")
    } finally {
      setIsSaving(false)
    }
  }
  
  // Handle reject (reassign) task
  const handleRejectTask = async () => {
    const reason = prompt("Qayta ijroga yuborish sababini kiriting:")
    if (!reason?.trim()) return
    
    setIsSaving(true)
    try {
      const updatedTask = await rejectTask(id, { comment: reason })
      setTask(updatedTask)
    } catch (error) {
      console.error("Reject task error:", error)
      alert("Topshiriqni qayta ijroga yuborishda xatolik yuz berdi")
    } finally {
      setIsSaving(false)
    }
  }

  const refreshChat = () => {
    getTaskChat(id)
      .then((data) => setChatMessages(normalizeChatMessages(data || [])))
      .catch(() => {})
  }

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Microphone access denied:', error)
      alert('Mikrofondan foydalanish uchun ruxsat berilmagan')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    setAudioBlob(null)
  }

  const sendAudio = async () => {
    if (!audioBlob) return
    const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' })
    try {
      await sendTaskMessage(id, { content: '🎤 Ovozli xabar', attachment: audioFile })
      setAudioBlob(null)
      refreshChat()
    } catch (error) {
      console.error('Audio yuborishda xatolik:', error)
    }
  }

  // Location function
  const sendLocation = async () => {
    setIsLocationLoading(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })
      
      const { latitude, longitude } = position.coords
      const locationMessage = `📍 Joylashuv: https://maps.google.com/maps?q=${latitude},${longitude}`
      
      await sendTaskMessage(id, { content: locationMessage })
      refreshChat()
    } catch (error) {
      console.error('Location error:', error)
      alert('Joylashuvni olishda xatolik. Iltimos, joylashuv ruxsatini tekshiring.')
    } finally {
      setIsLocationLoading(false)
    }
  }

  // Handle paste for images
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          setChatFile(file)
        }
        break
      }
    }
  }

  // Trigger file input click
  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  const sendMessage = async () => {
    // Validate that there's something to send
    const messageContent = editingMessageId ? editingContent : newMessage
    const hasContent = messageContent && messageContent.trim()
    const hasFile = chatFile instanceof File
    
    if (!hasContent && !hasFile) {
      return
    }

    if (editingMessageId) {
      if (!hasContent) {
        return
      }
      try {
        await updateTaskMessage(id, editingMessageId, editingContent.trim())
        setEditingMessageId(null)
        setEditingContent("")
        setNewMessage("")
        refreshChat()
        return
      } catch {
        return
      }
    }

    try {
      await sendTaskMessage(id, { content: hasContent ? newMessage.trim() : undefined, attachment: hasFile ? chatFile : undefined })
      setNewMessage("")
      setChatFile(null)
      refreshChat()
    } catch {
      // fallback: if WS available, try send directly (text only)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && newMessage.trim()) {
        try { wsRef.current.send(JSON.stringify({ type: 'text', content: newMessage.trim() })) } catch {}
      }
      setNewMessage("")
      setChatFile(null)
    }
  }

  const handleEditMessage = (msg: any) => {
    setEditingMessageId(msg.id)
    setEditingContent(msg.content || "")
    setNewMessage(msg.content || "")
  }

  const handleDeleteMessage = async (msg: any) => {
    try {
      await deleteTaskMessage(id, msg.id)
      refreshChat()
    } catch {}
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
              {canMarkComplete && (
                <Button 
                  variant="default" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleMarkComplete}
                  disabled={isSaving}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {isSaving ? "Saqlanmoqda..." : "Bajarildi"}
                </Button>
              )}
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
                      <Input 
                        type="date" 
                        value={extendDeadline ? extendDeadline.split('T')[0] : ''} 
                        onChange={(e) => setExtendDeadline(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="bg-background/50 border-border/50 focus:bg-background focus:border-primary transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">Sabab</Label>
                      <Textarea 
                        placeholder="Sababni kiriting..." 
                        value={extendReason}
                        onChange={(e) => setExtendReason(e.target.value)}
                        className="bg-background/50 border-border/50 focus:bg-background focus:border-primary transition-all" 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsExtendOpen(false)} className="border-border/50 bg-background/50">
                      Bekor qilish
                    </Button>
                    <Button onClick={handleExtendDeadline} disabled={isSaving}>
                      {isSaving ? "Saqlanmoqda..." : "So'rov yuborish"}
                    </Button>
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
                      <Input 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="bg-background/50 border-border/50 focus:bg-background focus:border-primary transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tavsif</Label>
                      <Textarea 
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ustuvorlik</Label>
                        <Select value={editPriority} onValueChange={setEditPriority}>
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
                        <Input 
                          type="date" 
                          value={editDeadline ? editDeadline.split('T')[0] : ''} 
                          onChange={(e) => setEditDeadline(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Soha</Label>
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
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
                    <Button onClick={handleSaveTask} disabled={isSaving}>
                      {isSaving ? "Saqlanmoqda..." : "Saqlash"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {canReassign && (
              <Button
                variant="outline"
                className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10 bg-transparent"
                onClick={handleRejectTask}
                disabled={isSaving}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {isSaving ? "Yuborilmoqda..." : "Qayta ijroga"}
              </Button>
            )}

            {canClose && (
              <Button 
                className="bg-accent hover:bg-accent/90"
                onClick={handleApproveTask}
                disabled={isSaving}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isSaving ? "Yopilmoqda..." : "Nazoratdan yechish"}
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
                    {task.category && (
                      <Badge variant="outline" className="font-normal">
                        {CATEGORY_LABELS[task.category] || task.category}
                      </Badge>
                    )}
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
                        {creator?.full_name || `${creator?.last_name || creator?.lastName || ''} ${creator?.first_name || creator?.firstName || ''}`.trim() || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Soha</p>
                      <p className="font-medium">{CATEGORY_LABELS[task.category] || task.category || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tashkilotlar</p>
                      <p className="font-medium">
                        {(task.assigned_organizations || task.organizations || []).map((org: any) => 
                          typeof org === 'object' ? org.organization?.name || org.name : orgsMap[org]?.name
                        ).filter(Boolean).join(", ") || '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Yaratilgan</p>
                      <p className="font-medium">{(task.createdAt || task.created_at) ? new Date(task.createdAt || task.created_at).toLocaleDateString('uz-UZ') : '-'}</p>
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

            {/* Task Content - Full Description */}
            {task.description && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Topshiriq mazmuni
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-primary" />
                    Biriktirilgan fayllar ({task.attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {task.attachments.map((attachment: any) => {
                      const fileName = attachment.file_name || attachment.fileName || attachment.file?.split('/').pop() || 'Fayl'
                      const fileUrl = attachment.file || attachment.url
                      const fileSize = attachment.file_size || attachment.fileSize
                      const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                      
                      return (
                        <a
                          key={attachment.id}
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            {isImage ? (
                              <Image className="h-5 w-5 text-primary" />
                            ) : (
                              <File className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{fileName}</p>
                            {fileSize && (
                              <p className="text-xs text-muted-foreground">
                                {(fileSize / 1024).toFixed(1)} KB
                              </p>
                            )}
                          </div>
                          <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

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
                        const sender = usersMap[msg.senderId] || null
                        const isSystem = msg.messageType === "SYSTEM" || msg.senderRole === "SYSTEM"
                        const isCurrentUser = currentUser && String(msg.senderId) === String(currentUser.id)
                        const attachment = msg.attachment

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
                            <UserAvatar
                              firstName={sender?.firstName}
                              lastName={sender?.lastName}
                              avatarUrl={sender?.avatar_url}
                              size="sm"
                            />
                            <div className={cn("max-w-[70%] space-y-1", isCurrentUser && "items-end")}>
                              <div className={cn("flex items-center gap-2", isCurrentUser && "flex-row-reverse")}>
                                <span className="text-sm font-medium text-foreground">
                                  {isCurrentUser && currentUser 
                                    ? `${currentUser.last_name || ''} ${currentUser.first_name || ''}`.trim()
                                    : sender 
                                      ? `${sender.lastName || ''} ${sender.firstName || ''}`.trim()
                                      : msg.senderName || "-"
                                  }
                                </span>
                                <span className="text-xs text-muted-foreground">{formatDateTime(msg.createdAt)}</span>
                              </div>
                              <div
                                className={cn(
                                  "rounded-lg p-3",
                                  isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted",
                                )}
                              >
                                {msg.content && <p className="text-sm">{msg.content}</p>}
                                {attachment && (
                                  <div className="mt-2 space-y-2">
                                    {attachment.file_type === 'IMAGE' && (
                                      <img
                                        src={attachment.file}
                                        alt={attachment.file_name}
                                        className="max-h-48 rounded-md border"
                                      />
                                    )}
                                    {attachment.file_type === 'VIDEO' && (
                                      <video src={attachment.file} controls className="max-h-48 rounded-md border w-full" />
                                    )}
                                    {attachment.file_type === 'AUDIO' && (
                                      <audio src={attachment.file} controls className="w-full" />
                                    )}
                                    {attachment.file_type !== 'IMAGE' && attachment.file_type !== 'VIDEO' && attachment.file_type !== 'AUDIO' && (
                                      <a
                                        href={attachment.file}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={cn(
                                          "flex items-center gap-2 text-xs underline",
                                          isCurrentUser ? "text-primary-foreground/80" : "text-muted-foreground",
                                        )}
                                      >
                                        <FileText className="h-3 w-3" />
                                        {attachment.file_name || "Fayl"}
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                              {isCurrentUser && !isSystem && (
                                <div className={cn("flex gap-1", isCurrentUser && "justify-end")}> 
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleEditMessage(msg)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => handleDeleteMessage(msg)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                  <div className="border-t border-border p-4">
                    {!canChat ? (
                      <div className="text-center py-3 text-muted-foreground bg-muted rounded-lg">
                        <Lock className="h-4 w-4 inline-block mr-2" />
                        Bu topshiriq yopilgan, xabar yuborish mumkin emas
                      </div>
                    ) : (
                    <div className="flex flex-col gap-2">
                      {/* Audio Recording UI */}
                      {isRecording && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                          <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-sm text-red-600 font-medium">Yozib olinmoqda...</span>
                          <div className="flex-1" />
                          <Button variant="outline" size="sm" onClick={stopRecording} className="text-emerald-600 border-emerald-300">
                            Tugatish
                          </Button>
                          <Button variant="outline" size="sm" onClick={cancelRecording} className="text-red-600 border-red-300">
                            Bekor qilish
                          </Button>
                        </div>
                      )}
                      
                      {/* Audio Preview */}
                      {audioBlob && !isRecording && (
                        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <Mic className="h-4 w-4 text-blue-600" />
                          <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 flex-1" />
                          <Button size="sm" onClick={sendAudio} className="bg-blue-600 hover:bg-blue-700">
                            <Send className="h-3 w-3 mr-1" /> Yuborish
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setAudioBlob(null)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          onChange={(e) => {
                            setChatFile(e.target.files?.[0] || null)
                            e.target.value = '' // Reset for re-selection
                          }}
                        />
                        
                        {/* File attach button */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="shrink-0" 
                          type="button" 
                          title="Fayl biriktirish"
                          onClick={handleFileButtonClick}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        
                        {/* Audio record */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn("shrink-0", isRecording && "text-red-500")}
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          title={isRecording ? "Yozishni to'xtatish" : "Ovozli xabar yozish"}
                        >
                          <Mic className="h-4 w-4" />
                        </Button>
                        
                        {/* Location */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="shrink-0" 
                          type="button"
                          onClick={sendLocation}
                          disabled={isLocationLoading}
                          title="Joylashuvni yuborish"
                        >
                          <MapPin className={cn("h-4 w-4", isLocationLoading && "animate-pulse")} />
                        </Button>
                        
                        <Input
                          placeholder={editingMessageId ? "Xabarni tahrirlash..." : "Xabar yozing... (Ctrl+V - rasm)"}
                          value={editingMessageId ? editingContent : newMessage}
                          onChange={(e) => editingMessageId ? setEditingContent(e.target.value) : setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                          onPaste={handlePaste}
                          className="bg-secondary"
                        />
                        <Button onClick={sendMessage} className="shrink-0">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      {chatFile && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          {chatFile.type.startsWith('image/') ? (
                            <>
                              <Image className="h-4 w-4 text-blue-500" />
                              <img 
                                src={URL.createObjectURL(chatFile)} 
                                alt="Tanlangan rasm" 
                                className="h-12 w-12 object-cover rounded"
                              />
                            </>
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                          <span className="text-xs text-muted-foreground flex-1 truncate">{chatFile.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setChatFile(null)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {editingMessageId && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Tahrirlash rejimi</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingMessageId(null)
                              setEditingContent("")
                              setNewMessage("")
                            }}
                          >
                            Bekor qilish
                          </Button>
                        </div>
                      )}
                    </div>
                    )}
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
                {(task.organizations || []).map((orgId: string) => {
                  const org = orgsMap[orgId]
                  return (
                    <div key={orgId} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{org?.name}</span>
                          {org && <p className="text-xs text-muted-foreground">{(sectorLabels as Record<string, string>)[org.sector] || org.sector}</p>}
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
                  {task.attachments.map((file: string, i: number) => (
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
