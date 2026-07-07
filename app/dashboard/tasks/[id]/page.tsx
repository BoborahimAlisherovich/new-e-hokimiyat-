"use client"

import { DashboardDetailFrame } from "@/components/layout/dashboard-detail-frame"
import { PremiumActionButton, PremiumActivityCard, PremiumAttachmentItem, PremiumFieldGroup, PremiumFieldSurface, PremiumFormLayout, PremiumImagePreview, PremiumInfoCard, PremiumInfoItem, PremiumMessageBubble, PremiumSideCard, PremiumSystemNote, PremiumTimelineItem } from "@/components/dashboard/premium-activity"
import { Header } from "@/components/layout/header"
import { LoadingSpinner } from "@/components/ui/loading"
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
import { getTaskById, getTaskChat, getUsers, getOrganizations, sendTaskMessage, getAccessToken, WS_BASE, getCurrentUser, updateTaskMessage, deleteTaskMessage, updateTask, approveTask, rejectTask, requestDeadlineExtension, markTaskComplete } from "@/lib/api"
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
  File as FileIcon,
  Image as ImageIcon,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
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

  const normalizeExecution = useCallback((item: any) => {
    if (item?.type !== "execution") return null
    return {
      id: item.id,
      actionType: item.action_type || item.actionType || "ACTION",
      comment: item.content || item.comment || "",
      executedByName: item.user_name || item.executed_by_name || item.executedByName || "Tizim",
      executedByRole: item.user_role || item.executed_by_role || item.executedByRole || "SYSTEM",
      createdAt: item.timestamp || item.created_at || item.createdAt,
    }
  }, [])

  const normalizeChatMessage = useCallback((msg: any) => {
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
  }, [])

  const normalizeChatMessages = useCallback((list: any[]) => {
    const normalized = (list || []).map(normalizeChatMessage).filter(Boolean)
    const seen = new Set<number | string>()
    return normalized.filter((msg) => {
      if (!msg || seen.has(msg.id)) return false
      seen.add(msg.id)
      return true
    })
  }, [normalizeChatMessage])

  const applyTimelineData = useCallback((timeline: any[]) => {
    const normalizedMessages = normalizeChatMessages(timeline || [])
    const normalizedExecutions = (timeline || [])
      .map(normalizeExecution)
      .filter(Boolean)

    setChatMessages(normalizedMessages)
    setTaskExecutions(normalizedExecutions)
  }, [normalizeChatMessages, normalizeExecution])

  useEffect(() => {
    let mounted = true
    Promise.all([getTaskById(id), getTaskChat(id), getUsers(), getOrganizations(), getCurrentUser()])
      .then(([t, chat, users, orgs, me]) => {
        if (!mounted) return
        setTask(t)
        applyTimelineData(chat || [])
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
	          const wsUrl = `${WS_BASE}/ws/tasks/${id}/chat/?token=${token}`
	          const ws = new WebSocket(wsUrl)
	          wsRef.current = ws
	          ws.onmessage = (ev) => {
            try {
              const payload = JSON.parse(ev.data)
              if (payload.type === 'history') {
                applyTimelineData(payload.messages || [])
              } else if (payload.type === 'message') {
                // On new message, refresh chat from REST to keep shape consistent
                getTaskChat(id).then((data) => applyTimelineData(data || [])).catch(() => {})
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
  }, [id, applyTimelineData])
  
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
        <DashboardDetailFrame
          eyebrow="Topshiriq"
          title="Ma'lumotlar tayyorlanmoqda"
          description="Topshiriq tafsilotlari, ijro holati va muloqot ma'lumotlari yuklanmoqda."
          backHref="/dashboard/tasks"
          stats={[]}
        >
          <div className="rounded-[28px] border border-white/70 bg-white/78 p-10 text-center shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-sm text-slate-500">Topshiriq ma'lumotlari yuklanmoqda...</p>
          </div>
        </DashboardDetailFrame>
      </>
    )
  }

  const CLOSED_STATUSES = ["BAJARILDI", "NAZORATDAN_YECHILDI", "BAJARILMADI"]
  const isClosed = CLOSED_STATUSES.includes(task.status)
  
  // Rolga qarab tahrirlash imkoniyatlarini cheklash
  const isAdmin = currentUser?.role && ['HOKIM', 'HOKIM_YORDAMCHISI', 'ADMIN'].includes(currentUser.role)
  const isOrgUser = currentUser?.role && ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'].includes(currentUser.role)
  
  // Faqat HOKIM, HOKIM_YORDAMCHISI, ADMIN tahrirlashi mumkin
  const canEdit = !isClosed && isAdmin
  const canChat = !isClosed
  // Faqat HOKIM tasdiqlashi/qayta ijroga yuborishi mumkin
  const canClose = task.status === "BAJARILDI" && currentUser?.role === 'HOKIM'
  const canReassign = task.status === "BAJARILDI" && currentUser?.role === 'HOKIM'
  // Tashkilot xodimlari "Bajarildi" deb belgilashi mumkin, lekin muddatni uzaytira olmaydi
  const canMarkComplete = ["IJRODA", "TEKSHIRUVDA"].includes(task.status) && isOrgUser
  // Muddat uzaytirish faqat adminlar uchun
  const canExtend = (["IJRODA", "TEKSHIRUVDA", "MUDDATI_KECH"].includes(task.status)) && isAdmin
  
  // Handle save task edits
  const handleSaveTask = async () => {
    if (!editTitle.trim()) {
      alert("Sarlavha majburiy")
      return
    }
    
    setIsSaving(true)
    try {
      const deadlineIso = editDeadline ? toIsoDateTime(editDeadline, task.deadline) : ""
      const updatedTask = await updateTask(id, {
        title: editTitle,
        description: editDescription,
        priority: editPriority as any,
        deadline: deadlineIso || undefined,
        category: editCategory as any,
      } as any)
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
      const requestedIso = toIsoDateTime(extendDeadline, task.deadline)
      const updatedTask = await requestDeadlineExtension(id, {
        requested_deadline: requestedIso,
        reason: extendReason,
      })
      setTask(updatedTask)
      refreshTimeline()
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
      refreshTimeline()
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
      refreshTimeline()
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
      refreshTimeline()
    } catch (error) {
      console.error("Reject task error:", error)
      alert("Topshiriqni qayta ijroga yuborishda xatolik yuz berdi")
    } finally {
      setIsSaving(false)
    }
  }

  const refreshTimeline = () => {
    getTaskChat(id)
      .then((data) => applyTimelineData(data || []))
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
      refreshTimeline()
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
      refreshTimeline()
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
        refreshTimeline()
        return
      } catch {
        return
      }
    }

    try {
      await sendTaskMessage(id, { content: hasContent ? newMessage.trim() : undefined, attachment: hasFile ? chatFile : undefined })
      setNewMessage("")
      setChatFile(null)
      refreshTimeline()
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
      refreshTimeline()
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

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const toIsoDateTime = (value: string, fallbackIso?: string) => {
    if (!value) return ""
    if (value.includes("T")) return value

    const fallbackTime = fallbackIso?.includes("T") ? fallbackIso.split("T")[1] : ""
    const timePart = (fallbackTime || "23:59:59").replace("Z", "").split(".")[0] || "23:59:59"
    const localDateTime = `${value}T${timePart}`
    const parsed = new Date(localDateTime)
    if (!Number.isFinite(parsed.getTime())) {
      const fallback = new Date(`${value}T23:59:59`)
      return Number.isFinite(fallback.getTime()) ? fallback.toISOString() : value
    }
    return parsed.toISOString()
  }

  const isOverdue = new Date(task.deadline) < new Date() && !["BAJARILDI", "NAZORATDAN_YECHILDI"].includes(task.status)

  return (
    <>
      <Header title="Topshiriq tafsilotlari" description={task.title} />
      <DashboardDetailFrame
        eyebrow="Topshiriq kartasi"
        title={task.title}
        description={task.description || "Topshiriq tafsilotlari, ijro holati va ichki muloqot bir oynada."}
        backHref="/dashboard/tasks"
        stats={[
          {
            label: "Holat",
            value: task.status?.replaceAll("_", " ") || "Noma'lum",
            icon: CheckCircle2,
            tone: "from-cyan-50 via-white to-cyan-100/70",
          },
          {
            label: "Murojaatlar",
            value: chatMessages.length,
            icon: MessageSquare,
            tone: "from-emerald-50 via-white to-emerald-100/70",
          },
          {
            label: "Muddat",
            value: task.deadline ? formatDate(task.deadline) : "Belgilanmagan",
            icon: Calendar,
            tone: "from-amber-50 via-white to-amber-100/70",
          },
        ]}
        badges={
          <>
            {task.category && (
              <Badge variant="outline" className="font-normal">
                {CATEGORY_LABELS[task.category] || task.category}
              </Badge>
            )}
            <PriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
          </>
        }
        actions={
          <>
            {canMarkComplete && (
              <Button
                variant="secondary"
                className="border-white/20 bg-emerald-500/20 text-white shadow-none hover:bg-emerald-500/30"
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
                  <Button variant="secondary" className="border-white/20 bg-white/10 text-white shadow-none hover:bg-white/18">
                    <Clock className="mr-2 h-4 w-4" />
                    Muddat uzaytirish
                  </Button>
                </DialogTrigger>
                <DialogContent className="overflow-hidden border-white/70 bg-white/88 shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)] backdrop-blur-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">Muddat uzaytirish so'rovi</DialogTitle>
                    <DialogDescription className="text-slate-500">Yangi muddat va sababni aniq kiriting.</DialogDescription>
                  </DialogHeader>
                  <PremiumFormLayout>
                    <PremiumFieldGroup label="Yangi muddat" hint="Joriy muddatdan keyingi sanani tanlang.">
                      <Input 
                        type="date" 
                        value={extendDeadline ? extendDeadline.split('T')[0] : ''} 
                        onChange={(e) => setExtendDeadline(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="h-11 rounded-2xl border-slate-200 bg-white" 
                      />
                    </PremiumFieldGroup>
                    <PremiumFieldGroup label="Sabab" hint="Uzatirish zaruratini qisqa va ravshan yozing.">
                      <Textarea 
                        placeholder="Sababni kiriting..." 
                        value={extendReason}
                        onChange={(e) => setExtendReason(e.target.value)}
                        className="min-h-[120px] rounded-2xl border-slate-200 bg-white" 
                      />
                    </PremiumFieldGroup>
                  </PremiumFormLayout>
                  <DialogFooter className="border-t border-slate-100 pt-4">
                    <Button variant="outline" onClick={() => setIsExtendOpen(false)} className="rounded-2xl border-slate-200 bg-white">
                      Bekor qilish
                    </Button>
                    <Button onClick={handleExtendDeadline} disabled={isSaving} className="rounded-2xl">
                      {isSaving ? "Saqlanmoqda..." : "So'rov yuborish"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {canEdit && (
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="border-white/20 bg-white/10 text-white shadow-none hover:bg-white/18">
                    <Edit className="mr-2 h-4 w-4" />
                    Tahrirlash
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[640px] overflow-hidden border-white/70 bg-white/88 shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)] backdrop-blur-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">Topshiriqni tahrirlash</DialogTitle>
                    <DialogDescription className="text-slate-500">Asosiy maydonlarni yangilang va topshiriqni bir xil standartda saqlang.</DialogDescription>
                  </DialogHeader>
                  <PremiumFormLayout>
                    <PremiumFieldGroup label="Sarlavha">
                      <Input 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-11 rounded-2xl border-slate-200 bg-white" 
                      />
                    </PremiumFieldGroup>
                    <PremiumFieldGroup label="Tavsif">
                      <Textarea 
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="min-h-[120px] rounded-2xl border-slate-200 bg-white"
                      />
                    </PremiumFieldGroup>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <PremiumFieldGroup label="Ustuvorlik">
                        <Select value={editPriority} onValueChange={setEditPriority}>
                          <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
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
                      </PremiumFieldGroup>
                      <PremiumFieldGroup label="Muddat">
                        <Input 
                          type="date" 
                          value={editDeadline ? editDeadline.split('T')[0] : ''} 
                          onChange={(e) => setEditDeadline(e.target.value)}
                          className="h-11 rounded-2xl border-slate-200 bg-white"
                        />
                      </PremiumFieldGroup>
                    </div>
                    <PremiumFieldGroup label="Soha">
                      <Select value={editCategory} onValueChange={setEditCategory}>
                        <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
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
                    </PremiumFieldGroup>
                  </PremiumFormLayout>
                  <DialogFooter className="border-t border-slate-100 pt-4">
                    <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-2xl border-slate-200 bg-white">
                      Bekor qilish
                    </Button>
                    <Button onClick={handleSaveTask} disabled={isSaving} className="rounded-2xl">
                      {isSaving ? "Saqlanmoqda..." : "Saqlash"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {canReassign && (
              <Button
                variant="secondary"
                className="border-orange-200 bg-orange-50 text-orange-700 shadow-none hover:bg-orange-100"
                onClick={handleRejectTask}
                disabled={isSaving}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {isSaving ? "Yuborilmoqda..." : "Qayta ijroga"}
              </Button>
            )}

            {canClose && (
              <Button 
                className="bg-white text-emerald-700 hover:bg-emerald-50"
                onClick={handleApproveTask}
                disabled={isSaving}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isSaving ? "Yopilmoqda..." : "Nazoratdan yechish"}
              </Button>
            )}
          </>
        }
      >

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - Task Details and Chat */}
          <div className="lg:col-span-2 space-y-6">
            <PremiumInfoCard
              icon={Layers}
              title="Topshiriq ma'lumotlari"
              subtitle="Asosiy tafsilotlar, muddat va biriktirilgan tashkilotlar."
              accent="from-cyan-50 via-white to-emerald-50/35"
              headerExtra={
                <div className="flex flex-wrap gap-2">
                  {task.category && (
                    <Badge variant="outline" className="font-normal">
                      {CATEGORY_LABELS[task.category] || task.category}
                    </Badge>
                  )}
                  <PriorityBadge priority={task.priority} />
                  <TaskStatusBadge status={task.status} />
                </div>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <PremiumInfoItem
                  icon={Calendar}
                  label="Muddat"
                  value={
                    <>
                      {formatDate(task.deadline)}
                      {isOverdue && " (kechiktirilgan)"}
                    </>
                  }
                  valueClassName={isOverdue ? "text-red-600" : undefined}
                />
                <PremiumInfoItem
                  icon={User}
                  label="Yaratuvchi"
                  value={creator?.full_name || `${creator?.last_name || ""} ${creator?.first_name || ""}`.trim() || "—"}
                />
                <PremiumInfoItem
                  icon={Layers}
                  label="Soha"
                  value={CATEGORY_LABELS[task.category] || task.category || "—"}
                />
                <PremiumInfoItem
                  icon={Building2}
                  label="Tashkilotlar"
                  value={
                    (task.assigned_organizations || task.organizations || [])
                      .map((org: any) => (typeof org === "object" ? org.organization?.name || org.name : orgsMap[org]?.name))
                      .filter(Boolean)
                      .join(", ") || "-"
                  }
                />
                <PremiumInfoItem
                  icon={Clock}
                  label="Yaratilgan"
                  value={formatDate(task.createdAt || task.created_at)}
                />
                {task.location && (
                  <PremiumInfoItem
                    icon={MapPin}
                    label="Joylashuv"
                    value={`${task.location.lat.toFixed(4)}, ${task.location.lng.toFixed(4)}`}
                  />
                )}
              </div>
            </PremiumInfoCard>

            {/* Task Content - Full Description */}
            {task.description && (
              <PremiumInfoCard
                icon={FileText}
                title="Topshiriq mazmuni"
                subtitle="Batafsil tavsif va ijro uchun asosiy matn."
                accent="from-amber-50 via-white to-cyan-50/30"
              >
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {task.description}
                    </p>
                  </div>
              </PremiumInfoCard>
            )}

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <PremiumSideCard icon={Paperclip} title={`Biriktirilgan fayllar (${task.attachments.length})`} accent="from-cyan-50 via-white to-amber-50/40">
                <div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {task.attachments.map((attachment: any) => {
                      const fileName = attachment.file_name || attachment.fileName || attachment.file?.split('/').pop() || 'Fayl'
                      const fileUrl = attachment.file || attachment.url
                      const fileSize = attachment.file_size || attachment.fileSize
                      const isImage = fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                      
                      return (
                        <PremiumAttachmentItem
                          key={attachment.id}
                          href={fileUrl}
                          icon={isImage ? ImageIcon : FileIcon}
                          title={fileName}
                          meta={fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : undefined}
                          actionLabel="Yuklash"
                        />
                      )
                    })}
                  </div>
                </div>
              </PremiumSideCard>
            )}

            {/* Chat / Timeline */}
            <PremiumActivityCard>
              <Tabs defaultValue="chat" className="w-full">
                <CardHeader className="border-b border-cyan-100/70 bg-gradient-to-r from-cyan-50 via-white to-emerald-50/40">
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100/90 p-1">
                    <TabsTrigger value="chat" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Muloqot
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
                      {chatMessages.length === 0 && (
                        <div className="rounded-[24px] border border-dashed border-cyan-200 bg-cyan-50/60 px-4 py-10 text-center text-sm text-slate-500">
                          Hozircha muloqot boshlanmagan
                        </div>
                      )}
                      {chatMessages.map((msg) => {
                        const sender = usersMap[msg.senderId] || null
                        const isSystem = msg.messageType === "SYSTEM" || msg.senderRole === "SYSTEM"
                        const isCurrentUser = currentUser && String(msg.senderId) === String(currentUser.id)
                        const attachment = msg.attachment

                        if (isSystem) {
                          return (
                            <PremiumSystemNote key={msg.id}>
                                {msg.content} - {formatDateTime(msg.createdAt)}
                            </PremiumSystemNote>
                          )
                        }

                        return (
                          <div key={msg.id} className={cn("flex gap-3", isCurrentUser && "flex-row-reverse")}>
                            <UserAvatar
                              firstName={sender?.first_name}
                              lastName={sender?.last_name}
                              avatarUrl={sender?.avatar_url}
                              size="sm"
                            />
                            <PremiumMessageBubble
                              align={isCurrentUser ? "right" : "left"}
                              title={
                                isCurrentUser && currentUser
                                  ? `${currentUser.last_name || ''} ${currentUser.first_name || ''}`.trim()
                                  : sender
                                    ? `${sender.last_name || ''} ${sender.first_name || ''}`.trim()
                                    : msg.senderName || "-"
                              }
                              meta={formatDateTime(msg.createdAt)}
                              footer={
                                isCurrentUser && !isSystem ? (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-full"
                                      onClick={() => handleEditMessage(msg)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-full"
                                      onClick={() => handleDeleteMessage(msg)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : null
                              }
                            >
                              <div className="space-y-2">
                                {msg.content && <p className="text-sm leading-6">{msg.content}</p>}
                                {attachment && (
                                  <div className="space-y-2">
                                    {attachment.file_type === "IMAGE" && (
                                      <PremiumImagePreview
                                        src={attachment.file}
                                        alt={attachment.file_name || "Biriktirilgan rasm"}
                                        className="h-48 w-full max-w-xs"
                                      />
                                    )}
                                    {attachment.file_type === "VIDEO" && (
                                      <video src={attachment.file} controls className="max-h-48 w-full rounded-2xl border border-white/60" />
                                    )}
                                    {attachment.file_type === "AUDIO" && (
                                      <audio src={attachment.file} controls className="w-full" />
                                    )}
                                    {attachment.file_type !== "IMAGE" && attachment.file_type !== "VIDEO" && attachment.file_type !== "AUDIO" && (
                                      <a
                                        href={attachment.file}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={cn(
                                          "flex items-center gap-2 text-xs underline",
                                          isCurrentUser ? "text-white/80" : "text-slate-500",
                                        )}
                                      >
                                        <FileText className="h-3 w-3" />
                                        {attachment.file_name || "Fayl"}
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                            </PremiumMessageBubble>
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
                      
                      <div className="flex gap-2 rounded-[24px] border border-slate-200 bg-slate-50/70 p-2">
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
                          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                        />
                        <Button onClick={sendMessage} className="shrink-0 rounded-2xl">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      {chatFile && (
                        <div className="flex items-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 p-2.5">
                          {chatFile.type.startsWith('image/') ? (
                            <>
                              <ImageIcon className="h-4 w-4 text-blue-500" />
                              <PremiumImagePreview src={URL.createObjectURL(chatFile)} alt="Tanlangan rasm" className="h-12 w-12" />
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
                        <div className="rounded-[24px] border border-dashed border-amber-200 bg-amber-50/60 px-4 py-10 text-center text-sm text-slate-500">
                          Hozircha tarix yo'q
                        </div>
                      ) : (
                        taskExecutions.map((exec) => {
                          return (
                            <PremiumTimelineItem
                              key={exec.id}
                              icon={History}
                              title={(exec.actionType || "ACTION").replace(/_/g, " ")}
                              description={exec.comment || "Izoh yo'q"}
                              meta={`${exec.executedByName || "Tizim"} • ${formatDateTime(exec.createdAt)}`}
                              tone="bg-amber-100 text-amber-700"
                            />
                          )
                        })
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </PremiumActivityCard>
          </div>

          {/* Sidebar - Organizations Status */}
          <div className="space-y-6">
            <PremiumSideCard icon={Building2} title="Tashkilotlar holati" accent="from-emerald-50 via-white to-cyan-50/30">
              <div className="space-y-3">
                {(task.organizations || []).map((orgId: string) => {
                  const org = orgsMap[orgId]
                  return (
                    <div key={orgId} className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50/70 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                          <Building2 className="h-4 w-4 text-cyan-700" />
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
              </div>
            </PremiumSideCard>

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <PremiumSideCard icon={Download} title="Tezkor fayllar" accent="from-amber-50 via-white to-cyan-50/30">
                <div className="space-y-2">
                  {task.attachments.map((file: any, i: number) => {
                    const fileName = typeof file === 'string' ? file : (file.file_name || file.fileName || file.file?.split('/').pop() || 'Fayl')
                    const fileUrl = typeof file === 'string' ? file : (file.file || file.url)
                    return (
                      <PremiumAttachmentItem
                        key={file?.id || i}
                        href={fileUrl}
                        icon={FileText}
                        title={fileName}
                        actionLabel="Ochish"
                      />
                    )
                  })}
                </div>
              </PremiumSideCard>
            )}

            <PremiumSideCard icon={Clock} title="Tezkor harakatlar" accent="from-cyan-50 via-white to-emerald-50/30">
              <div className="space-y-3">
                {canMarkComplete && (
                  <PremiumActionButton icon={CheckCircle2} onClick={handleMarkComplete} disabled={isSaving} className="text-emerald-700">
                    {isSaving ? "Saqlanmoqda..." : "Bajarildi deb belgilash"}
                  </PremiumActionButton>
                )}
                {canExtend && (
                  <PremiumActionButton icon={Clock} onClick={() => setIsExtendOpen(true)}>
                    Muddat uzaytirish
                  </PremiumActionButton>
                )}
                {canEdit && (
                  <PremiumActionButton icon={Edit} onClick={() => setIsEditOpen(true)}>
                    Topshiriqni tahrirlash
                  </PremiumActionButton>
                )}
                {canReassign && (
                  <PremiumActionButton icon={RotateCcw} onClick={handleRejectTask} disabled={isSaving} className="text-amber-700">
                    Qayta ijroga yuborish
                  </PremiumActionButton>
                )}
                {canClose && (
                  <PremiumActionButton icon={CheckCircle2} onClick={handleApproveTask} disabled={isSaving} className="text-cyan-700">
                    Nazoratdan yechish
                  </PremiumActionButton>
                )}
              </div>
            </PremiumSideCard>
          </div>
        </div>
      </DashboardDetailFrame>
    </>
  )
}
