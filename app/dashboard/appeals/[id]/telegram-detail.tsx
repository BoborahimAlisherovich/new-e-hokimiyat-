"use client"

import { DashboardDetailFrame } from "@/components/layout/dashboard-detail-frame"
import { PremiumActionButton, PremiumActivityCard, PremiumAttachmentItem, PremiumCallout, PremiumChoiceItem, PremiumFieldGroup, PremiumFieldSurface, PremiumFormLayout, PremiumImagePreview, PremiumInfoCard, PremiumInfoItem, PremiumInsightMetric, PremiumMessageBubble, PremiumSideCard, PremiumTimelineItem } from "@/components/dashboard/premium-activity"
import { Header } from "@/components/layout/header"
import { LoadingSpinner } from "@/components/ui/loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  getAppealById, 
  getAppealMessages, 
  getAppealHistory, 
  sendAppealMessage, 
  closeAppeal,
  reviewAppeal,
  createTaskFromAppeal,
  getOrganizations
} from "@/lib/api"
import { 
  ArrowLeft, 
  Send, 
  Calendar, 
  User, 
  Phone, 
  MapPin,
  MessageSquare,
  History,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bot,
  Clock,
  Loader2,
  ClipboardList,
  X,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Trash2
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Appeal } from "@/types"

const FILE_TYPE_LABELS: Record<string, string> = {
  photo: "Rasm",
  video: "Video",
  audio: "Audio",
  voice: "Ovozli xabar",
  document: "Hujjat",
  video_note: "Video xabar",
}

const formatFileSize = (size?: number) => {
  if (!size || Number.isNaN(size)) return ""
  if (size < 1024) return `${size} B`
  const kb = size / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

interface AppealMessage {
  id: number
  text: string
  is_from_admin: boolean
  admin_name: string | null
  sender_name: string | null
  sender_avatar_url: string | null
  created_at: string
}

interface AppealHistoryItem {
  type: 'ai_analysis' | 'admin_review' | 'message'
  title: string
  description?: string
  text?: string
  score?: number
  priority?: string
  is_valid?: boolean
  rejection_reason?: string
  admin?: string | null
  status?: string
  response?: string
  created_at: string
}

interface TelegramAppealDetailProps {
  appealId: string
}

export default function TelegramAppealDetail({ appealId }: TelegramAppealDetailProps) {
  const [appeal, setAppeal] = useState<Appeal | null>(null)
  const [messages, setMessages] = useState<AppealMessage[]>([])
  const [history, setHistory] = useState<AppealHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closeResponse, setCloseResponse] = useState("")
  const [closingAppeal, setClosingAppeal] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [rejecting, setRejecting] = useState(false)
  
  // Task creation state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDeadline, setTaskDeadline] = useState("")
  const [taskPriority, setTaskPriority] = useState("ODDIY")
  const [selectedOrganizations, setSelectedOrganizations] = useState<number[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [creatingTask, setCreatingTask] = useState(false)
  
  // File/Audio/Location state
  const [chatFile, setChatFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [appealData, messagesData, historyData] = await Promise.all([
        getAppealById(appealId),
        getAppealMessages(appealId),
        getAppealHistory(appealId)
      ])
      setAppeal(appealData)
      setMessages(messagesData || [])
      setHistory(historyData || [])
    } catch (error) {
      console.error('Error loading appeal data:', error)
    } finally {
      setLoading(false)
    }
  }, [appealId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    const hasText = messageText.trim()
    const hasFile = chatFile instanceof File
    
    if (!hasText && !hasFile) return
    if (sendingMessage) return

    try {
      setSendingMessage(true)
      await sendAppealMessage(appealId, hasText ? messageText : undefined, hasFile ? chatFile : undefined)
      setMessageText("")
      setChatFile(null)
      // Reload messages
      const newMessages = await getAppealMessages(appealId)
      setMessages(newMessages || [])
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  const handleCloseAppeal = async () => {
    if (closingAppeal) return

    try {
      setClosingAppeal(true)
      await closeAppeal(appealId, closeResponse)
      setCloseDialogOpen(false)
      setCloseResponse("")
      // Reload data
      await loadData()
    } catch (error) {
      console.error('Error closing appeal:', error)
    } finally {
      setClosingAppeal(false)
    }
  }

  const handleRejectAppeal = async () => {
    if (rejecting) return

    try {
      setRejecting(true)
      await reviewAppeal(appealId, {
        action: 'reject',
        response: rejectReason
      })
      setRejectDialogOpen(false)
      setRejectReason("")
      await loadData()
    } catch (error) {
      console.error('Error rejecting appeal:', error)
    } finally {
      setRejecting(false)
    }
  }

  const handleApprove = async () => {
    try {
      await reviewAppeal(appealId, { action: 'approve' })
      await loadData()
    } catch (error) {
      console.error('Error approving appeal:', error)
    }
  }

  const openTaskDialog = async () => {
    // Load organizations
    try {
      const orgs = await getOrganizations()
      setOrganizations(Array.isArray(orgs) ? orgs : (orgs as any)?.results || [])
    } catch (error) {
      console.error('Error loading organizations:', error)
      setOrganizations([])
    }
    
    // Set default title from appeal
    if (appeal) {
      const appealData = appeal as any
      const appealNum = appealData.appealNumber || appeal.id?.replace('tg-', '')
      setTaskTitle(`Murojaat #${appealNum}: ${appeal.subject}`)
    }
    
    // Set default deadline to 7 days from now
    const defaultDeadline = new Date()
    defaultDeadline.setDate(defaultDeadline.getDate() + 7)
    setTaskDeadline(defaultDeadline.toISOString().split('T')[0])
    
    setTaskDialogOpen(true)
  }

  const handleCreateTask = async () => {
    if (creatingTask || !taskTitle || !taskDeadline || selectedOrganizations.length === 0) return

    try {
      setCreatingTask(true)
      await createTaskFromAppeal(appealId, {
        title: taskTitle,
        deadline: taskDeadline,
        priority: taskPriority,
        organization_ids: selectedOrganizations
      })
      setTaskDialogOpen(false)
      setTaskTitle("")
      setTaskDeadline("")
      setTaskPriority("ODDIY")
      setSelectedOrganizations([])
      await loadData()
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setCreatingTask(false)
    }
  }

  const toggleOrganization = (orgId: number) => {
    setSelectedOrganizations(prev => 
      prev.includes(orgId) 
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    )
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
      setSendingMessage(true)
      await sendAppealMessage(appealId, '🎤 Ovozli xabar', audioFile)
      setAudioBlob(null)
      const newMessages = await getAppealMessages(appealId)
      setMessages(newMessages || [])
    } catch (error) {
      console.error('Audio yuborishda xatolik:', error)
    } finally {
      setSendingMessage(false)
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
      
      await sendAppealMessage(appealId, locationMessage)
      const newMessages = await getAppealMessages(appealId)
      setMessages(newMessages || [])
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: string; icon: React.ReactNode }> = {
      'pending_ai': { label: 'AI tekshiruvida', variant: 'bg-blue-100 text-blue-700', icon: <Bot className="h-3 w-3" /> },
      'pending_review': { label: 'Ko\'rib chiqilmoqda', variant: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
      'approved': { label: 'Tasdiqlangan', variant: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
      'rejected': { label: 'Rad etilgan', variant: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
      'responded': { label: 'Javob berilgan', variant: 'bg-purple-100 text-purple-700', icon: <MessageSquare className="h-3 w-3" /> },
      'resolved': { label: 'Hal qilingan', variant: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
      'PENDING': { label: 'Kutilmoqda', variant: 'bg-yellow-100 text-yellow-700', icon: <Clock className="h-3 w-3" /> },
      'IN_PROGRESS': { label: 'Jarayonda', variant: 'bg-blue-100 text-blue-700', icon: <Clock className="h-3 w-3" /> },
      'RESOLVED': { label: 'Hal qilingan', variant: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
    }
    
    const info = statusMap[status] || { label: status, variant: 'bg-gray-100 text-gray-700', icon: null }
    
    return (
      <Badge className={cn("flex items-center gap-1", info.variant)}>
        {info.icon}
        {info.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; variant: string }> = {
      'low': { label: 'Past', variant: 'bg-gray-100 text-gray-700' },
      'medium': { label: 'O\'rta', variant: 'bg-yellow-100 text-yellow-700' },
      'high': { label: 'Yuqori', variant: 'bg-orange-100 text-orange-700' },
      'urgent': { label: 'Shoshilinch', variant: 'bg-red-100 text-red-700' },
    }
    
    const info = priorityMap[priority] || { label: priority, variant: 'bg-gray-100 text-gray-700' }
    
    return <Badge className={info.variant}>{info.label}</Badge>
  }

  if (loading) {
    return (
      <>
        <Header title="Murojaat" description="Murojaat tafsilotlari" />
        <DashboardDetailFrame
          eyebrow="Murojaat"
          title="Ma'lumotlar tayyorlanmoqda"
          description="Murojaat tafsilotlari, muloqot va ko'rib chiqish tarixi yuklanmoqda."
          backHref="/dashboard/appeals"
          stats={[]}
        >
          <div className="rounded-[28px] border border-white/70 bg-white/78 p-10 text-center shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-sm text-slate-500">Murojaat ma'lumotlari yuklanmoqda...</p>
          </div>
        </DashboardDetailFrame>
      </>
    )
  }

  if (!appeal) {
    return (
      <>
        <Header title="Murojaat" description="Murojaat topilmadi" />
        <DashboardDetailFrame
          eyebrow="Murojaat"
          title="Murojaat topilmadi"
          description="Ushbu murojaat mavjud emas yoki o'chirilgan."
          backHref="/dashboard/appeals"
          stats={[]}
        >
          <Card className="rounded-[28px] border-white/70 bg-white/78 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
            <CardContent className="py-12 text-center">
              <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
              <h2 className="mb-2 text-xl font-semibold">Murojaat topilmadi</h2>
              <p className="mb-4 text-muted-foreground">Ro'yxatga qayting yoki boshqa murojaatni tanlang.</p>
              <Button asChild>
                <Link href="/dashboard/appeals">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Orqaga
                </Link>
              </Button>
            </CardContent>
          </Card>
        </DashboardDetailFrame>
      </>
    )
  }

  return (
    <>
      <Header title={`Murojaat #${appeal.id?.replace('tg-', '')}`} description={appeal.citizenName} />
      <DashboardDetailFrame
        eyebrow="Murojaat kartasi"
        title={`Murojaat #${appeal.id?.replace("tg-", "")}`}
        description={appeal.citizenName || "Fuqaro murojaati tafsilotlari, tarix va muloqot bir joyda."}
        backHref="/dashboard/appeals"
        stats={[
          {
            label: "Holat",
            value: appeal.status || "Noma'lum",
            icon: CheckCircle,
            tone: "from-cyan-50 via-white to-cyan-100/70",
          },
          {
            label: "Xabarlar",
            value: messages.length,
            icon: MessageSquare,
            tone: "from-emerald-50 via-white to-emerald-100/70",
          },
          {
            label: "Sana",
            value: formatDate(appeal.createdAt),
            icon: Calendar,
            tone: "from-amber-50 via-white to-amber-100/70",
          },
        ]}
        badges={
          <>
            {getStatusBadge(appeal.status)}
            {appeal.priority && getPriorityBadge(appeal.priority)}
          </>
        }
        actions={
          <>
            {appeal.status !== "resolved" && appeal.status !== "rejected" && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleApprove}
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 shadow-none hover:bg-emerald-100"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Tasdiqlash
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRejectDialogOpen(true)}
                  className="border-red-200 bg-red-50 text-red-700 shadow-none hover:bg-red-100"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rad etish
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openTaskDialog}
                  className="border-cyan-200 bg-cyan-50 text-cyan-700 shadow-none hover:bg-cyan-100"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Topshiriq yaratish
                </Button>
                <Button size="sm" onClick={() => setCloseDialogOpen(true)} className="bg-white text-cyan-700 hover:bg-cyan-50">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Yopish va javob berish
                </Button>
              </>
            )}
          </>
        }
      >

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Appeal Info */}
            <div className="lg:col-span-2 space-y-6">
              <PremiumInfoCard
                icon={FileText}
                title="Murojaat ma'lumotlari"
                subtitle="Fuqaro, hudud, kategoriya va murojaat matni."
                accent="from-cyan-50 via-white to-emerald-50/35"
                headerExtra={
                  <div className="flex items-center gap-2">
                    {getStatusBadge(appeal.status)}
                    {appeal.priority && getPriorityBadge(appeal.priority)}
                  </div>
                }
              >
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <PremiumInfoItem icon={User} label="Fuqaro" value={appeal.citizenName} />
                    <PremiumInfoItem icon={Phone} label="Telefon" value={appeal.citizenPhone || "-"} />
                    <PremiumInfoItem icon={MapPin} label="Hudud" value={appeal.district || "-"} />
                    <PremiumInfoItem icon={Calendar} label="Sana" value={formatDate(appeal.createdAt)} />
                  </div>

                  <Separator />

                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Murojaat kategoriyasi</p>
                    <Badge variant="secondary">{appeal.category || "Belgilanmagan"}</Badge>
                  </div>

                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Murojaat matni</p>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50/75 p-4 overflow-hidden">
                      <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{appeal.description}</p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Murojaat fayllari</p>
                    {appeal.attachments && appeal.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {appeal.attachments.map((attachment) => {
                          const fileHref = attachment.file_url || attachment.file || ""
                          const fileLabel = FILE_TYPE_LABELS[attachment.file_type] || "Fayl"
                          const fileName = attachment.file_name || fileHref.split("/").pop() || "Fayl"
                          const fileSize = formatFileSize(attachment.file_size)
                          const isImage = attachment.file_type === "photo"
                          return (
                            <PremiumAttachmentItem
                              key={attachment.id}
                              href={fileHref || undefined}
                              icon={isImage ? ImageIcon : Paperclip}
                              title={fileName}
                              meta={`${fileLabel}${fileSize ? ` • ${fileSize}` : ""}`}
                              actionLabel={fileHref ? "Ochish" : "Link yo'q"}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Fayl biriktirilmagan</p>
                    )}
                  </div>

                  {appeal.status === "resolved" && (
                    <PremiumCallout
                      title="Murojaat yopilgan"
                      description={appeal.closed_at ? new Date(appeal.closed_at).toLocaleString("uz-UZ") : undefined}
                    >
                      <div className="flex items-center justify-between gap-4">
                        {appeal.rating ? (
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{"⭐".repeat(appeal.rating)}</span>
                            <span className="text-sm font-medium text-emerald-700">{appeal.rating}/5</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="border-yellow-400 text-yellow-600">
                            Baholanmagan
                          </Badge>
                        )}
                      </div>
                      {appeal.rating_comment && (
                        <p className="mt-3 text-sm italic text-emerald-700">"{appeal.rating_comment}"</p>
                      )}
                    </PremiumCallout>
                  )}
                </div>
              </PremiumInfoCard>

              {/* Tabs for Chat and History */}
              <PremiumActivityCard>
                <Tabs defaultValue="chat" className="w-full">
                  <CardHeader className="border-b border-cyan-100/70 bg-gradient-to-r from-cyan-50 via-white to-emerald-50/40">
                    <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100/90 p-1">
                      <TabsTrigger value="chat" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Muloqot
                      </TabsTrigger>
                      <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Tarix
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>

                  <CardContent className="pt-4">
                    <TabsContent value="chat" className="mt-0">
                      <div className="space-y-4">
                        <ScrollArea className="h-[400px] pr-4">
                          <div className="space-y-4">
                            {messages.length === 0 ? (
                              <div className="rounded-[24px] border border-dashed border-cyan-200 bg-cyan-50/60 px-4 py-10 text-center text-sm text-slate-500">
                                Hali xabarlar yo'q
                              </div>
                            ) : (
                              messages.map((msg) => {
                                const senderDisplayName = msg.is_from_admin
                                  ? msg.sender_name || msg.admin_name || "Admin"
                                  : appeal.citizenName || "Fuqaro"
                                const nameParts = senderDisplayName.split(" ")

                                return (
                                  <div
                                    key={msg.id}
                                    className={cn("flex gap-3", msg.is_from_admin ? "flex-row-reverse" : "")}
                                  >
                                    <UserAvatar
                                      firstName={nameParts[1] || nameParts[0] || ""}
                                      lastName={nameParts[0] || ""}
                                      avatarUrl={msg.is_from_admin ? msg.sender_avatar_url : undefined}
                                      size="sm"
                                    />
                                    <PremiumMessageBubble
                                      align={msg.is_from_admin ? "right" : "left"}
                                      title={senderDisplayName}
                                      meta={formatDate(msg.created_at)}
                                    >
                                      <p className="text-sm leading-6">{msg.text}</p>
                                    </PremiumMessageBubble>
                                  </div>
                                )
                              })
                            )}
                            <div ref={messagesEndRef} />
                          </div>
                        </ScrollArea>

                        <div className="flex flex-col gap-2">
                          {isRecording && (
                            <div className="flex items-center gap-2 rounded-[22px] border border-red-200 bg-red-50 p-2.5">
                              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-sm font-medium text-red-600">Yozib olinmoqda...</span>
                              <div className="flex-1" />
                              <Button variant="outline" size="sm" onClick={stopRecording} className="border-emerald-300 text-emerald-600">
                                Tugatish
                              </Button>
                              <Button variant="outline" size="sm" onClick={cancelRecording} className="border-red-300 text-red-600">
                                Bekor qilish
                              </Button>
                            </div>
                          )}

                          {audioBlob && !isRecording && (
                            <div className="flex items-center gap-2 rounded-[22px] border border-blue-200 bg-blue-50 p-2.5">
                              <Mic className="h-4 w-4 text-blue-600" />
                              <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 flex-1" />
                              <Button size="sm" onClick={sendAudio} className="bg-blue-600 hover:bg-blue-700" disabled={sendingMessage}>
                                {sendingMessage ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="mr-1 h-3 w-3" /> Yuborish</>}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setAudioBlob(null)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          <div className="flex gap-2 rounded-[24px] border border-slate-200 bg-slate-50/70 p-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                              onChange={(e) => {
                                setChatFile(e.target.files?.[0] || null)
                                e.target.value = ""
                              }}
                            />

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
                              placeholder="Xabar yozing... (Ctrl+V - rasm)"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSendMessage()
                                }
                              }}
                              onPaste={handlePaste}
                              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                            />
                            <Button
                              onClick={handleSendMessage}
                              disabled={sendingMessage || (!messageText.trim() && !chatFile)}
                              className="rounded-2xl"
                            >
                              {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                          </div>

                          {chatFile && (
                            <div className="flex items-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 p-2.5">
                              {chatFile.type.startsWith("image/") ? (
                                <>
                                  <ImageIcon className="h-4 w-4 text-blue-500" />
                                  <PremiumImagePreview src={URL.createObjectURL(chatFile)} alt="Tanlangan rasm" className="h-12 w-12" />
                                </>
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                              <span className="flex-1 truncate text-xs text-muted-foreground">{chatFile.name}</span>
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
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                          {history.length === 0 ? (
                            <div className="rounded-[24px] border border-dashed border-amber-200 bg-amber-50/60 px-4 py-10 text-center text-sm text-slate-500">
                              Hali tarix yo'q
                            </div>
                          ) : (
                            history.map((item, index) => {
                              const TimelineIcon = item.type === "ai_analysis" ? Bot : item.type === "admin_review" ? CheckCircle : MessageSquare
                              const tone = item.type === "ai_analysis"
                                ? "bg-cyan-100 text-cyan-700"
                                : item.type === "admin_review"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-700"

                              return (
                                <PremiumTimelineItem
                                  key={index}
                                  icon={TimelineIcon}
                                  title={item.title}
                                  tone={tone}
                                  description={
                                    <>
                                      {item.type === "ai_analysis" && (
                                        <div className="mt-2 rounded-2xl bg-cyan-50 p-3 text-sm">
                                          <p className="text-muted-foreground">{item.description}</p>
                                          <div className="mt-2 flex flex-wrap gap-4">
                                            <span>Ball: <strong>{item.score || 0}</strong></span>
                                            <span>Muhimlik: <strong>{item.priority || "-"}</strong></span>
                                            <span>To'g'ri: <strong>{item.is_valid ? "Ha" : "Yo'q"}</strong></span>
                                          </div>
                                          {item.rejection_reason && (
                                            <p className="mt-2 text-red-600">
                                              <AlertTriangle className="mr-1 inline h-4 w-4" />
                                              {item.rejection_reason}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      {item.type === "admin_review" && (
                                        <div className="mt-2 rounded-2xl bg-emerald-50 p-3 text-sm">
                                          {item.admin && <p>Admin: {item.admin}</p>}
                                          {item.status && <p>Holat: {item.status}</p>}
                                          {item.response && <p className="mt-1">{item.response}</p>}
                                        </div>
                                      )}
                                      {item.type === "message" && item.text && <p className="mt-1">{item.text}</p>}
                                    </>
                                  }
                                  meta={formatDate(item.created_at)}
                                />
                              )
                            })
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </PremiumActivityCard>
            </div>

            {/* Right Column - Quick Actions */}
            <div className="space-y-6">
              <PremiumSideCard icon={Clock} title="Tezkor harakatlar" accent="from-cyan-50 via-white to-emerald-50/30">
                <div className="space-y-3">
                  <PremiumActionButton
                    icon={CheckCircle}
                    onClick={() => setCloseDialogOpen(true)}
                    disabled={appeal.status === "resolved" || appeal.status === "rejected"}
                    className="text-cyan-700"
                  >
                    Murojaatni yopish
                  </PremiumActionButton>
                  <PremiumActionButton
                    icon={ClipboardList}
                    onClick={openTaskDialog}
                    disabled={appeal.status === "resolved" || appeal.status === "rejected"}
                  >
                    Topshiriq yaratish
                  </PremiumActionButton>
                  <PremiumActionButton
                    icon={XCircle}
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={appeal.status === "resolved" || appeal.status === "rejected"}
                    className="text-red-700"
                  >
                    Rad etish
                  </PremiumActionButton>
                </div>
              </PremiumSideCard>

              {/* AI Analysis Card */}
              {history.some(h => h.type === 'ai_analysis') && (
                <PremiumSideCard icon={Bot} title="AI tahlili" accent="from-cyan-50 via-white to-blue-50/40">
                  <div className="space-y-3">
                    {history
                      .filter(h => h.type === 'ai_analysis')
                      .map((item, i) => (
                        <div key={i} className="space-y-2 rounded-[22px] border border-cyan-100 bg-cyan-50/50 p-4 text-sm">
                          <PremiumInsightMetric
                            label="Ball"
                            value={`${item.score || 0}/100`}
                            valueClassName={
                              (item.score || 0) >= 70
                                ? "text-emerald-600"
                                : (item.score || 0) >= 40
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }
                          />
                          <PremiumInsightMetric label="Muhimlik" value={item.priority || "-"} />
                          <PremiumInsightMetric
                            label="To'g'rilik"
                            value={item.is_valid ? "Ha" : "Yo'q"}
                            valueClassName={item.is_valid ? "text-emerald-600" : "text-red-600"}
                          />
                          {item.rejection_reason && (
                            <div className="mt-2 border-t border-cyan-100 pt-2">
                              <p className="text-red-600 text-xs">
                                <AlertTriangle className="h-3 w-3 inline mr-1" />
                                {item.rejection_reason}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </PremiumSideCard>
              )}
            </div>
          </div>
      </DashboardDetailFrame>

      {/* Close Appeal Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="overflow-hidden border-white/70 bg-white/88 shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)] backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">Murojaatni yopish</DialogTitle>
            <DialogDescription>
              Foydalanuvchiga javob yozing. Javob yuborilgandan so'ng foydalanuvchidan qoniqish so'raladi.
            </DialogDescription>
          </DialogHeader>
          <PremiumFormLayout>
            <PremiumFieldGroup label="Javob matni" hint="Yakuniy javob fuqaro uchun tushunarli va aniq bo'lsin.">
              <Textarea
                id="closeResponse"
                placeholder="Javobingizni yozing..."
                value={closeResponse}
                onChange={(e) => setCloseResponse(e.target.value)}
                className="min-h-[140px] rounded-2xl border-slate-200 bg-white"
              />
            </PremiumFieldGroup>
          </PremiumFormLayout>
          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)} className="rounded-2xl border-slate-200 bg-white">
              Bekor qilish
            </Button>
            <Button onClick={handleCloseAppeal} disabled={closingAppeal} className="rounded-2xl">
              {closingAppeal ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Yuborilmoqda...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Javob yuborish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent className="overflow-hidden border-white/70 bg-white/88 shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)] backdrop-blur-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Murojaatni rad etish</AlertDialogTitle>
            <AlertDialogDescription>
              Rad etish sababini kiriting
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Rad etish sababi..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[120px] rounded-2xl border-slate-200 bg-white"
            />
          </div>
          <AlertDialogFooter className="border-t border-slate-100 pt-4">
            <AlertDialogCancel className="rounded-2xl border-slate-200 bg-white">Bekor qilish</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRejectAppeal}
              disabled={rejecting}
              className="rounded-2xl bg-red-600 hover:bg-red-700"
            >
              {rejecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Yuklanmoqda...
                </>
              ) : (
                'Rad etish'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Creation Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-2xl overflow-hidden border-white/70 bg-white/88 shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)] backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Topshiriq yaratish
            </DialogTitle>
            <DialogDescription>
              Murojaatni topshiriq sifatida tashkilotlarga yo'naltiring
            </DialogDescription>
          </DialogHeader>
          <PremiumFormLayout className="py-4">
            <PremiumFieldGroup label="Sarlavha *" hint="Yaratiladigan topshiriq nomini kiriting.">
              <Input
                id="taskTitle"
                placeholder="Topshiriq sarlavhasi..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="h-11 rounded-2xl border-slate-200 bg-white"
              />
            </PremiumFieldGroup>

            <div className="grid gap-4 sm:grid-cols-2">
              <PremiumFieldGroup label="Bajarilish muddati *">
              <Input
                id="taskDeadline"
                type="date"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                className="h-11 rounded-2xl border-slate-200 bg-white"
              />
              </PremiumFieldGroup>

              <PremiumFieldGroup label="Muhimlik darajasi">
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-white">
                  <SelectValue placeholder="Muhimlikni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAST">Past</SelectItem>
                  <SelectItem value="ODDIY">O'rta</SelectItem>
                  <SelectItem value="YUQORI">Yuqori</SelectItem>
                  <SelectItem value="SHOSHILINCH">Shoshilinch</SelectItem>
                </SelectContent>
              </Select>
              </PremiumFieldGroup>
            </div>

            <PremiumFieldGroup label="Mas'ul tashkilotlar *" hint="Bir yoki bir nechta tashkilotni belgilang.">
              <PremiumFieldSurface className="max-h-48 space-y-2 overflow-y-auto">
                {organizations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Tashkilotlar yuklanmoqda...
                  </p>
                ) : (
                  organizations.map((org: any) => (
                    <PremiumChoiceItem
                      key={org.id}
                      onClick={() => toggleOrganization(org.id)}
                      selected={selectedOrganizations.includes(org.id)}
                    >
                      <span className="text-sm">{org.name}</span>
                    </PremiumChoiceItem>
                  ))
                )}
              </PremiumFieldSurface>
              {selectedOrganizations.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedOrganizations.length} ta tashkilot tanlandi
                </p>
              )}
            </PremiumFieldGroup>
          </PremiumFormLayout>
          <DialogFooter className="border-t border-slate-100 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setTaskDialogOpen(false)}
              disabled={creatingTask}
              className="rounded-2xl border-slate-200 bg-white"
            >
              Bekor qilish
            </Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={creatingTask || !taskTitle || !taskDeadline || selectedOrganizations.length === 0}
              className="rounded-2xl bg-blue-600 hover:bg-blue-700"
            >
              {creatingTask ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Yaratilmoqda...
                </>
              ) : (
                <>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Topshiriq yaratish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
