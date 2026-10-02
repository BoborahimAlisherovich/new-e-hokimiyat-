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
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
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
  assignAppeal,
  createTaskFromAppeal,
  getOrganizations,
  getAppealCategories,
  getCurrentUser
} from "@/lib/api"
import {
  ArrowLeft, 
  Send, 
  Calendar, 
  User, 
  Phone, 
  MapPin,
  Navigation,
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
import Image from "next/image"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Appeal, AppealAttachment } from "@/types"
import { FileViewer, useFileViewer } from "@/components/dashboard/file-viewer"
import { toViewerFile, type ViewerFile } from "@/lib/file-preview"

const FILE_TYPE_LABELS: Record<string, string> = {
  photo: "Rasm",
  video: "Video",
  audio: "Audio",
  voice: "Ovozli xabar",
  document: "Hujjat",
  video_note: "Video xabar",
}

const PRIORITY_BANNER_STYLES: Record<string, string> = {
  LOW: "border-border bg-success-soft text-success-soft-foreground",
  MEDIUM: "border-border bg-warning-soft text-warning-soft-foreground",
  HIGH: "border-border bg-warning-soft text-warning-soft-foreground",
  low: "border-border bg-success-soft text-success-soft-foreground",
  medium: "border-border bg-warning-soft text-warning-soft-foreground",
  high: "border-border bg-warning-soft text-warning-soft-foreground",
  urgent: "border-border bg-destructive-soft text-destructive-soft-foreground",
}

const formatFileSize = (size?: number) => {
  if (!size || Number.isNaN(size)) return ""
  if (size < 1024) return `${size} B`
  const kb = size / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

const getAttachmentUrl = (attachment?: AppealAttachment | null) => attachment?.file_url || attachment?.file || ""

interface AppealMessage {
  id: number
  text: string
  is_from_admin: boolean
  /** Tizim avtomatik yuborgan bildirish (holat o'zgarishi) */
  is_system?: boolean
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

  // Routing (category/org assignment) state
  const [routeDialogOpen, setRouteDialogOpen] = useState(false)
  const [routeCategoryId, setRouteCategoryId] = useState<string>("")
  const [routeSelectedOrganizations, setRouteSelectedOrganizations] = useState<string[]>([])
  const [appealCategories, setAppealCategories] = useState<any[]>([])
  const [routingAppeal, setRoutingAppeal] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  
  // Task creation state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDeadline, setTaskDeadline] = useState("")
  const [taskPriority, setTaskPriority] = useState("ODDIY")
  const [taskComment, setTaskComment] = useState("")
  const [selectedOrganizations, setSelectedOrganizations] = useState<string[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [creatingTask, setCreatingTask] = useState(false)
  const attachmentViewer = useFileViewer()
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)
  const [imageCarouselApi, setImageCarouselApi] = useState<CarouselApi | null>(null)
  
  // File/Audio/Location state
  const [chatFile, setChatFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const imageAttachments = useMemo(
    () => (appeal?.attachments || []).filter((attachment) => attachment.file_type === "photo" && Boolean(getAttachmentUrl(attachment))),
    [appeal?.attachments]
  )

  const otherAttachments = useMemo(
    () => (appeal?.attachments || []).filter((attachment) => attachment.file_type !== "photo"),
    [appeal?.attachments]
  )

  /** Rasm bo'lmagan ilovani sayt ichidagi ko'rgichda ochish. */
  const openAttachmentViewer = (attachment: AppealAttachment) => {
    const files = otherAttachments
      .map((item, index) => toViewerFile(item, index))
      .filter(Boolean) as ViewerFile[]
    const index = otherAttachments.findIndex((item) => item.id === attachment.id)
    if (files.length) attachmentViewer.open(files, Math.max(index, 0))
  }

  const locationUrl = useMemo(() => {
    const lat = appeal?.latitude
    const lon = appeal?.longitude
    if (typeof lat !== "number" || typeof lon !== "number") return null
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    return `https://maps.google.com/maps?q=${lat},${lon}`
  }, [appeal?.latitude, appeal?.longitude])

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
    getCurrentUser()
      .then((user: any) => setCurrentUserRole(String(user?.role || "")))
      .catch(() => setCurrentUserRole(""))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (activeImageIndex === null || !imageCarouselApi) return
    imageCarouselApi.scrollTo(activeImageIndex)
  }, [activeImageIndex, imageCarouselApi])

  useEffect(() => {
    if (!imageCarouselApi) return

    const syncActiveIndex = () => setActiveImageIndex(imageCarouselApi.selectedScrollSnap())
    syncActiveIndex()
    imageCarouselApi.on("select", syncActiveIndex)

    return () => {
      imageCarouselApi.off("select", syncActiveIndex)
    }
  }, [imageCarouselApi])

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

  const toggleRouteOrganization = (orgId: string) => {
    setRouteSelectedOrganizations(prev =>
      prev.includes(orgId)
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    )
  }

  const selectAllRouteOrganizations = () => {
    setRouteSelectedOrganizations(organizations.map((org: any) => String(org.id)))
  }

  const openRouteDialog = async () => {
    try {
      const [orgs, cats] = await Promise.all([
        getOrganizations(),
        getAppealCategories(),
      ])
      setOrganizations(Array.isArray(orgs) ? orgs : (orgs as any)?.results || [])
      setAppealCategories(Array.isArray(cats) ? cats : [])
    } catch (error) {
      console.error('Error loading routing data:', error)
    }
    setRouteCategoryId("")
    setRouteSelectedOrganizations([])
    setRouteDialogOpen(true)
  }

  const handleRouteAppeal = async () => {
    if (routingAppeal) return

    const payload: any = {}
    if (routeCategoryId) payload.category_id = Number(routeCategoryId)
    if (routeSelectedOrganizations.length > 0) payload.organization_ids = routeSelectedOrganizations

    if (!payload.category_id && !payload.organization_ids) return

    try {
      setRoutingAppeal(true)
      const updated = await assignAppeal(appealId, payload)
      setAppeal(updated)
      setRouteDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error("Error routing appeal:", error)
    } finally {
      setRoutingAppeal(false)
    }
  }

  const handleCreateTask = async () => {
    if (creatingTask || !taskTitle || !taskDeadline || selectedOrganizations.length === 0 || !taskComment.trim()) return

    try {
      setCreatingTask(true)
      await createTaskFromAppeal(appealId, {
        title: taskTitle,
        deadline: taskDeadline,
        priority: taskPriority,
        organization_ids: selectedOrganizations,
        comment: taskComment.trim() || undefined,
      })
      setTaskDialogOpen(false)
      setTaskTitle("")
      setTaskDeadline("")
      setTaskPriority("ODDIY")
      setTaskComment("")
      setSelectedOrganizations([])
      await loadData()
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setCreatingTask(false)
    }
  }

  const toggleOrganization = (orgId: string) => {
    setSelectedOrganizations(prev => 
      prev.includes(orgId) 
        ? prev.filter(id => id !== orgId)
        : [...prev, orgId]
    )
  }

  const selectAllOrganizations = () => {
    setSelectedOrganizations(organizations.map((org: any) => String(org.id)))
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
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const getStatusInfo = (status?: string) => {
    const key = (status || "").trim().toLowerCase()
    const statusMap: Record<string, { label: string; variant: string; icon: React.ReactNode | null }> = {
      pending_ai: { label: "AI tekshiruvida", variant: "bg-primary-soft text-primary-soft-foreground", icon: <Bot className="h-3 w-3" /> },
      pending_review: { label: "Ko'rib chiqilmoqda", variant: "bg-warning-soft text-warning-soft-foreground", icon: <Clock className="h-3 w-3" /> },
      approved: { label: "Tasdiqlangan", variant: "bg-success-soft text-success-soft-foreground", icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { label: "Rad etilgan", variant: "bg-destructive-soft text-destructive-soft-foreground", icon: <XCircle className="h-3 w-3" /> },
      responded: { label: "Javob berilgan", variant: "bg-[var(--st-tekshiruvda-bg)] text-[var(--st-tekshiruvda-fg)]", icon: <MessageSquare className="h-3 w-3" /> },
      resolved: { label: "Hal qilingan", variant: "bg-success-soft text-success-soft-foreground", icon: <CheckCircle className="h-3 w-3" /> },
      pending: { label: "Kutilmoqda", variant: "bg-warning-soft text-warning-soft-foreground", icon: <Clock className="h-3 w-3" /> },
      in_progress: { label: "Jarayonda", variant: "bg-primary-soft text-primary-soft-foreground", icon: <Clock className="h-3 w-3" /> },
    }

    return statusMap[key] || { label: status || "—", variant: "bg-muted text-secondary-foreground", icon: null }
  }

  const getStatusBadge = (status: string) => {
    const info = getStatusInfo(status)
    
    return (
      <Badge className={cn("flex items-center gap-1", info.variant)}>
        {info.icon}
        {info.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const key = (priority || "").trim().toLowerCase()
    const priorityMap: Record<string, { label: string; variant: string }> = {
      'low': { label: 'Past', variant: 'bg-muted text-secondary-foreground' },
      'medium': { label: 'O\'rta', variant: 'bg-warning-soft text-warning' },
      'high': { label: 'Yuqori', variant: 'bg-warning-soft text-warning' },
      'urgent': { label: 'Shoshilinch', variant: 'bg-destructive-soft text-destructive' },
    }
    
    const info = priorityMap[key] || { label: priority, variant: 'bg-muted text-secondary-foreground' }
    
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
          <div className="rounded-[28px] border border-border bg-card p-10 text-center shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)]">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-sm text-muted-foreground">Murojaat ma'lumotlari yuklanmoqda...</p>
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
          <Card className="rounded-[28px] border-border bg-card shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)]">
            <CardContent className="py-12 text-center">
              <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
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
            value: getStatusInfo(appeal.status).label,
            icon: CheckCircle,
            tone: "via-white bg-info",
          },
          {
            label: "Xabarlar",
            value: messages.length,
            icon: MessageSquare,
            tone: "via-white bg-success",
          },
          {
            label: "Sana",
            value: formatDate(appeal.createdAt),
            icon: Calendar,
            tone: "via-white bg-warning",
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
                  className="border-border bg-success-soft text-success-soft-foreground shadow-none hover:bg-success-soft"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Tasdiqlash
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRejectDialogOpen(true)}
                  className="border-border bg-destructive-soft text-destructive-soft-foreground shadow-none hover:bg-destructive-soft"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Rad etish
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openTaskDialog}
                  className="border-border bg-primary-soft text-primary-soft-foreground shadow-none hover:bg-primary-soft"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Topshiriq yaratish
                </Button>
                {["ADMIN", "HOKIM", "HOKIMLIK_MASUL", "HOKIM_YORDAMCHISI"].includes(currentUserRole) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openRouteDialog}
                    className="border-border bg-primary-soft text-primary-soft-foreground shadow-none hover:bg-primary-soft"
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    Yo'naltirish
                  </Button>
                )}
                <Button size="sm" onClick={() => setCloseDialogOpen(true)} className="bg-white text-primary-soft-foreground hover:bg-primary-soft">
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
                accent="via-white bg-info"
                headerExtra={
                  <div className="flex items-center gap-2">
                    {getStatusBadge(appeal.status)}
                    {appeal.priority && getPriorityBadge(appeal.priority)}
                  </div>
                }
              >
                <div className="space-y-5">
                  <div
                    className={cn(
                      "rounded-[22px] border px-4 py-3",
                      PRIORITY_BANNER_STYLES[appeal.priority] || "border-border bg-background text-secondary-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Muhimlik darajasi</p>
                        <p className="text-sm font-semibold">
                          {appeal.priority === "HIGH" || appeal.priority === "urgent"
                            ? "Yuqori nazorat talab qiladigan murojaat"
                            : appeal.priority === "MEDIUM" || appeal.priority === "medium"
                              ? "O'rta darajadagi murojaat"
                              : "Oddiy ustuvorlikdagi murojaat"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* MUROJAATCHI — kim yozgani. Ilgari faqat ism bor edi:
                      bir xil ismli ikki fuqaroni ajratishning imkoni yo'q
                      edi va operator kimga javob berayotganini bilmasdi. */}
                  <div className="rounded-2xl bg-background p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Murojaatchi
                    </p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <p className="text-md font-semibold text-foreground">
                        {appeal.citizenName || "Noma’lum"}
                      </p>
                      {appeal.citizenTelegramUsername ? (
                        <a
                          href={`https://t.me/${appeal.citizenTelegramUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          @{appeal.citizenTelegramUsername}
                        </a>
                      ) : appeal.citizenTelegramId ? (
                        <span className="text-sm text-muted-foreground">
                          Telegram ID: {appeal.citizenTelegramId}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-lg bg-card px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {appeal.source === "telegram"
                          ? "Telegram bot orqali"
                          : appeal.source === "manual"
                            ? "Qo‘lda kiritilgan"
                            : appeal.source === "web"
                              ? "Veb-sayt orqali"
                              : "Manbasi ko‘rsatilmagan"}
                      </span>
                      {appeal.appealNumber && (
                        <span className="rounded-lg bg-card px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                          №{appeal.appealNumber}
                        </span>
                      )}
                      {appeal.citizenLanguage && (
                        <span className="rounded-lg bg-card px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                          Til: {appeal.citizenLanguage === "ru" ? "Ruscha" : appeal.citizenLanguage === "en" ? "Inglizcha" : "O‘zbekcha"}
                        </span>
                      )}
                      {appeal.citizenRegistered === false && (
                        <span className="rounded-lg bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-soft-foreground">
                          Botda ro‘yxatdan o‘tmagan
                        </span>
                      )}
                    </div>
                    {appeal.citizenTelegramId && (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        Holat o‘zgarganda fuqaroga bot orqali avtomatik xabar
                        yuboriladi — muloqot oynasida «Fuqaroga yuborildi» deb
                        ko‘rinadi.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <PremiumInfoItem icon={User} label="Fuqaro" value={appeal.citizenName} />
                    <PremiumInfoItem icon={Phone} label="Telefon" value={appeal.citizenPhone || "-"} />
                    <PremiumInfoItem icon={MapPin} label="Hudud" value={appeal.district || "-"} />
                    <PremiumInfoItem icon={Calendar} label="Sana" value={formatDate(appeal.createdAt)} />
                    <PremiumInfoItem
                      icon={Navigation}
                      label="Lokatsiya"
                      value={
                        locationUrl ? (
                          <a
                            href={locationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline decoration-cyan-200 underline-offset-4"
                          >
                            {appeal.latitude}, {appeal.longitude}
                          </a>
                        ) : (
                          "-"
                        )
                      }
                    />
                  </div>

                  <Separator />

                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Murojaat kategoriyasi</p>
                    <Badge variant="secondary">{appeal.category || "Belgilanmagan"}</Badge>
                  </div>

                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Murojaat matni</p>
                    <div className="rounded-[22px] border border-border bg-background p-4 overflow-hidden">
                      <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{appeal.description}</p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm text-muted-foreground">Murojaat fayllari</p>
                    {appeal.attachments && appeal.attachments.length > 0 ? (
                      <div className="space-y-3">
                        {imageAttachments.length > 0 && (
                          <div className="rounded-[24px] border border-border bg-background p-3">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-secondary-foreground">Rasmlar</p>
                              <span className="text-xs text-muted-foreground">{imageAttachments.length} ta</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                              {imageAttachments.map((attachment, index) => {
                                const fileHref = getAttachmentUrl(attachment)
                                const fileName = attachment.file_name || fileHref.split("/").pop() || `Rasm ${index + 1}`
                                const fileSize = formatFileSize(attachment.file_size)

                                return (
                                  <button
                                    key={attachment.id}
                                    type="button"
                                    onClick={() => setActiveImageIndex(index)}
                                    className="group overflow-hidden rounded-[20px] border border-border bg-white text-left shadow-sm transition-all hover:border-border hover:shadow-md"
                                  >
                                    <div className="relative aspect-square w-full overflow-hidden bg-muted">
                                      <Image
                                        src={fileHref}
                                        alt={fileName}
                                        fill
                                        unoptimized
                                        className="object-cover transition duration-300 group-hover:scale-105"
                                      />
                                    </div>
                                    <div className="p-2.5">
                                      <p className="truncate text-xs font-medium text-foreground">{fileName}</p>
                                      {fileSize && <p className="mt-0.5 text-[11px] text-muted-foreground">{fileSize}</p>}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {otherAttachments.length > 0 && (
                          <div className="space-y-2">
                            {otherAttachments.map((attachment) => {
                              const fileHref = getAttachmentUrl(attachment)
                              const fileLabel = FILE_TYPE_LABELS[attachment.file_type] || "Fayl"
                              const fileName = attachment.file_name || fileHref.split("/").pop() || "Fayl"
                              const fileSize = formatFileSize(attachment.file_size)

                              return (
                                <PremiumAttachmentItem
                                  key={attachment.id}
                                  onClick={() => openAttachmentViewer(attachment)}
                                  icon={Paperclip}
                                  title={fileName}
                                  meta={`${fileLabel}${fileSize ? ` • ${fileSize}` : ""}`}
                                  actionLabel={fileHref ? "Ichida ochish" : "Link yo'q"}
                                />
                              )
                            })}
                          </div>
                        )}

                        {imageAttachments.length === 0 && otherAttachments.length === 0 && (
                          <p className="text-sm text-muted-foreground">Fayl biriktirilmagan</p>
                        )}
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
                            <span className="text-sm font-medium text-success">{appeal.rating}/5</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="border-warning text-warning">
                            Baholanmagan
                          </Badge>
                        )}
                      </div>
                      {appeal.rating_comment && (
                        <p className="mt-3 text-sm italic text-success">"{appeal.rating_comment}"</p>
                      )}
                    </PremiumCallout>
                  )}
                </div>
              </PremiumInfoCard>

              {/* Tabs for Chat and History */}
              <PremiumActivityCard>
                <Tabs defaultValue="chat" className="w-full">
                  <CardHeader className="bg-primary-soft border-b border-border">
                    <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted p-1">
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
                              <div className="rounded-[24px] border border-dashed border-border bg-primary-soft px-4 py-10 text-center text-sm text-muted-foreground">
                                Hali xabarlar yo'q
                              </div>
                            ) : (
                              messages.map((msg) => {
                                // Tizim bildirishi — odam yozgan xabar emas.
                                // Ilgari bunday matn «Admin» nomidan
                                // ko'rinardi va operator nima avtomatik,
                                // nima o'zi yozgani aralashib ketardi.
                                if (msg.is_system) {
                                  return (
                                    <div key={msg.id} className="flex justify-center">
                                      <div className="max-w-[85%] rounded-2xl bg-surface-sunken px-3.5 py-2.5 text-center">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                          Fuqaroga yuborildi · {formatDate(msg.created_at)}
                                        </p>
                                        <p className="mt-1 whitespace-pre-line text-xs leading-5 text-secondary-foreground">
                                          {msg.text}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                }

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
                            <div className="flex items-center gap-2 rounded-[22px] bg-destructive-soft p-2.5">
                              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                              <span className="text-sm font-medium text-destructive">Yozib olinmoqda...</span>
                              <div className="flex-1" />
                              <Button variant="outline" size="sm" onClick={stopRecording} className="border-success text-success">
                                Tugatish
                              </Button>
                              <Button variant="outline" size="sm" onClick={cancelRecording} className="border-destructive text-destructive">
                                Bekor qilish
                              </Button>
                            </div>
                          )}

                          {audioBlob && !isRecording && (
                            <div className="flex items-center gap-2 rounded-[22px] bg-primary-soft p-2.5">
                              <Mic className="h-4 w-4 text-primary" />
                              <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 flex-1" />
                              <Button size="sm" onClick={sendAudio} className="bg-primary hover:bg-primary-hover" disabled={sendingMessage}>
                                {sendingMessage ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="mr-1 h-3 w-3" /> Yuborish</>}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => setAudioBlob(null)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          <div className="flex gap-2 rounded-[24px] border border-border bg-background p-2">
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
                              className={cn("shrink-0", isRecording && "text-destructive")}
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

                            <Textarea
                              placeholder="Javob yozing... (Ctrl+V - rasm)"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSendMessage()
                                }
                              }}
                              onPaste={handlePaste}
                              className="min-h-[96px] border-0 bg-transparent shadow-none focus-visible:ring-0 resize-none"
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
                            <div className="flex items-center gap-2 rounded-[22px] border border-border bg-background p-2.5">
                              {chatFile.type.startsWith("image/") ? (
                                <>
                                  <ImageIcon className="h-4 w-4 text-primary" />
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
                            <div className="rounded-[24px] border border-dashed border-border bg-warning-soft px-4 py-10 text-center text-sm text-muted-foreground">
                              Hali tarix yo'q
                            </div>
                          ) : (
                            history.map((item, index) => {
                              const TimelineIcon = item.type === "ai_analysis" ? Bot : item.type === "admin_review" ? CheckCircle : MessageSquare
                              const tone = item.type === "ai_analysis"
                                ? "bg-primary-soft text-primary-soft-foreground"
                                : item.type === "admin_review"
                                  ? "bg-success-soft text-success-soft-foreground"
                                  : "bg-muted text-secondary-foreground"

                              return (
                                <PremiumTimelineItem
                                  key={index}
                                  icon={TimelineIcon}
                                  title={item.title}
                                  tone={tone}
                                  description={
                                    <>
                                      {item.type === "ai_analysis" && (
                                        <div className="mt-2 rounded-2xl bg-primary-soft p-3 text-sm">
                                          <p className="text-muted-foreground">{item.description}</p>
                                          <div className="mt-2 flex flex-wrap gap-4">
                                            <span>Ball: <strong>{item.score || 0}</strong></span>
                                            <span>Muhimlik: <strong>{item.priority || "-"}</strong></span>
                                            <span>To'g'ri: <strong>{item.is_valid ? "Ha" : "Yo'q"}</strong></span>
                                          </div>
                                          {item.rejection_reason && (
                                            <p className="mt-2 text-destructive">
                                              <AlertTriangle className="mr-1 inline h-4 w-4" />
                                              {item.rejection_reason}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                      {item.type === "admin_review" && (
                                        <div className="mt-2 rounded-2xl bg-success-soft p-3 text-sm">
                                          {item.admin && <p>Admin: {item.admin}</p>}
                                          {item.status && <p>Holat: {getStatusInfo(item.status).label}</p>}
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
              <PremiumSideCard icon={Clock} title="Tezkor harakatlar" accent="via-white bg-info">
                <div className="space-y-3">
                  <PremiumActionButton
                    icon={CheckCircle}
                    onClick={() => setCloseDialogOpen(true)}
                    disabled={appeal.status === "resolved" || appeal.status === "rejected"}
                    className="text-primary"
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
                    className="text-destructive"
                  >
                    Rad etish
                  </PremiumActionButton>
                </div>
              </PremiumSideCard>

              {/* AI Analysis Card */}
              {history.some(h => h.type === 'ai_analysis') && (
                <PremiumSideCard icon={Bot} title="AI tahlili" accent="via-white bg-info">
                  <div className="space-y-3">
                    {history
                      .filter(h => h.type === 'ai_analysis')
                      .map((item, i) => (
                        <div key={i} className="space-y-2 rounded-[22px] bg-primary-soft p-4 text-sm">
                          <PremiumInsightMetric
                            label="Ball"
                            value={`${item.score || 0}/100`}
                            valueClassName={
                              (item.score || 0) >= 70
                                ? "text-success"
                                : (item.score || 0) >= 40
                                  ? "text-warning"
                                  : "text-destructive"
                            }
                          />
                          <PremiumInsightMetric label="Muhimlik" value={item.priority || "-"} />
                          <PremiumInsightMetric
                            label="To'g'rilik"
                            value={item.is_valid ? "Ha" : "Yo'q"}
                            valueClassName={item.is_valid ? "text-success" : "text-destructive"}
                          />
                          {item.rejection_reason && (
                            <div className="mt-2 border-t border-border pt-2">
                              <p className="text-destructive text-xs">
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

      {/* Route Appeal Dialog */}
      <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
        <DialogContent className="overflow-hidden border-border bg-card shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Murojaatni yo'naltirish</DialogTitle>
            <DialogDescription>
              Soha va mas'ul tashkilotlarni belgilang. Tashkilot rahbarlari murojaatni shu biriktirish asosida ko'radi.
            </DialogDescription>
          </DialogHeader>
          <PremiumFormLayout>
            <PremiumFieldGroup label="Soha (ixtiyoriy)" hint="Agar fuqaro noto'g'ri sohani tanlagan bo'lsa, to'g'rilang.">
              <Select value={routeCategoryId} onValueChange={setRouteCategoryId}>
                <SelectTrigger className="h-11 rounded-2xl border-border bg-white">
                  <SelectValue placeholder="Sohani tanlang" />
                </SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  {appealCategories.length === 0 ? (
                    <SelectItem value="__loading" disabled>
                      Sohalar yuklanmoqda...
                    </SelectItem>
                  ) : (
                    appealCategories
                      .filter((c: any) => c?.is_active !== false)
                      .sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0))
                      .map((category: any) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.icon ? `${category.icon} ` : ""}{category.name_uz || category.code || `#${category.id}`}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </PremiumFieldGroup>

            <PremiumFieldGroup label="Mas'ul tashkilotlar (ixtiyoriy)" hint="Aniq tashkilotni qo'lda biriktirsangiz, shu tashkilotda darhol ko'rinadi.">
              <div className="mb-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllRouteOrganizations}
                  className="rounded-xl"
                >
                  Barcha faol tashkilotlar
                </Button>
                {routeSelectedOrganizations.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setRouteSelectedOrganizations([])}
                    className="rounded-xl"
                  >
                    Tozalash
                  </Button>
                )}
              </div>
              <PremiumFieldSurface className="max-h-48 space-y-2 overflow-y-auto">
                {organizations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Tashkilotlar yuklanmoqda...
                  </p>
                ) : (
                  organizations.map((org: any) => (
                    <PremiumChoiceItem
                      key={org.id}
                      onClick={() => toggleRouteOrganization(String(org.id))}
                      selected={routeSelectedOrganizations.includes(String(org.id))}
                    >
                      <span className="text-sm">
                        {org.short_name ? `${org.name} (${org.short_name})` : org.name}
                      </span>
                    </PremiumChoiceItem>
                  ))
                )}
              </PremiumFieldSurface>
              {routeSelectedOrganizations.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {routeSelectedOrganizations.length} ta tashkilot tanlandi
                </p>
              )}
            </PremiumFieldGroup>
          </PremiumFormLayout>
          <DialogFooter className="border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => setRouteDialogOpen(false)}
              disabled={routingAppeal}
              className="rounded-2xl border-border bg-white"
            >
              Bekor qilish
            </Button>
            <Button
              onClick={handleRouteAppeal}
              disabled={routingAppeal || (!routeCategoryId && routeSelectedOrganizations.length === 0)}
              className="rounded-2xl bg-primary hover:bg-primary-hover"
            >
              {routingAppeal ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  Yo'naltirish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Appeal Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="overflow-hidden border-border bg-card shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Murojaatni yopish</DialogTitle>
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
                className="min-h-[220px] rounded-2xl border-border bg-white text-sm leading-6"
              />
            </PremiumFieldGroup>
          </PremiumFormLayout>
          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)} className="rounded-2xl border-border bg-white">
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
        <AlertDialogContent className="overflow-hidden border-border bg-card shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)]">
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
              className="min-h-[120px] rounded-2xl border-border bg-white"
            />
          </div>
          <AlertDialogFooter className="border-t border-border pt-4">
            <AlertDialogCancel className="rounded-2xl border-border bg-white">Bekor qilish</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRejectAppeal}
              disabled={rejecting}
              className="rounded-2xl bg-destructive hover:bg-destructive"
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
        <DialogContent className="max-w-2xl overflow-hidden border-border bg-card shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <ClipboardList className="h-5 w-5 text-primary" />
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
                className="h-11 rounded-2xl border-border bg-white"
              />
            </PremiumFieldGroup>

            <div className="grid gap-4 sm:grid-cols-2">
              <PremiumFieldGroup label="Bajarilish muddati *">
              <Input
                id="taskDeadline"
                type="date"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
                className="h-11 rounded-2xl border-border bg-white"
              />
              </PremiumFieldGroup>

              <PremiumFieldGroup label="Muhimlik darajasi">
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger className="h-11 rounded-2xl border-border bg-white">
                  <SelectValue placeholder="Muhimlikni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAST">Past</SelectItem>
                  <SelectItem value="ODDIY">O'rta</SelectItem>
                  <SelectItem value="YUQORI">Yuqori</SelectItem>
                  <SelectItem value="FAVQULODDA">Favqulodda</SelectItem>
                </SelectContent>
              </Select>
              </PremiumFieldGroup>
            </div>

            <PremiumFieldGroup
              label="Hokim yoki AI izohi *"
              hint="Topshiriqqa qo'shimcha ko'rsatma, sabab yoki izoh yozing."
            >
              <Textarea
                placeholder="Masalan: bugunning o'zida joyiga chiqib o'rganilsin, natija bo'yicha alohida axborot kiritilsin..."
                value={taskComment}
                onChange={(e) => setTaskComment(e.target.value)}
                className="min-h-[110px] rounded-2xl border-border bg-white"
              />
            </PremiumFieldGroup>

            <PremiumFieldGroup label="Mas'ul tashkilotlar *" hint="Bir yoki bir nechta tashkilotni belgilang.">
              <div className="mb-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllOrganizations}
                  className="rounded-xl"
                >
                  Barcha faol tashkilotlar
                </Button>
                {selectedOrganizations.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedOrganizations([])}
                    className="rounded-xl"
                  >
                    Tozalash
                  </Button>
                )}
              </div>
              <PremiumFieldSurface className="max-h-48 space-y-2 overflow-y-auto">
                {organizations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Tashkilotlar yuklanmoqda...
                  </p>
                ) : (
                  organizations.map((org: any) => (
                    <PremiumChoiceItem
                      key={org.id}
                      onClick={() => toggleOrganization(String(org.id))}
                      selected={selectedOrganizations.includes(String(org.id))}
                    >
                      <span className="text-sm">
                        {org.short_name ? `${org.name} (${org.short_name})` : org.name}
                      </span>
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
          <DialogFooter className="border-t border-border pt-4">
            <Button 
              variant="outline" 
              onClick={() => setTaskDialogOpen(false)}
              disabled={creatingTask}
              className="rounded-2xl border-border bg-white"
            >
              Bekor qilish
            </Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={creatingTask || !taskTitle || !taskDeadline || selectedOrganizations.length === 0 || !taskComment.trim()}
              className="rounded-2xl bg-primary hover:bg-primary-hover"
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

      <Dialog open={activeImageIndex !== null} onOpenChange={(open) => !open && setActiveImageIndex(null)}>
        <DialogContent className="h-dvh w-screen max-w-none border-0 bg-black/95 p-0 text-white backdrop-blur-sm">
          <DialogHeader className="absolute left-0 right-0 top-0 z-20 flex-row items-center justify-between border-b border-white/10 bg-black/35 px-5 py-4 backdrop-blur-md">
            <div>
              <DialogTitle className="text-white">
                {activeImageIndex !== null ? imageAttachments[activeImageIndex]?.file_name || `Rasm ${activeImageIndex + 1}` : "Rasm"}
              </DialogTitle>
              <DialogDescription className="text-white/70">
                {activeImageIndex !== null ? `${activeImageIndex + 1} / ${imageAttachments.length}` : ""}
              </DialogDescription>
            </div>
          </DialogHeader>

          {imageAttachments.length > 0 ? (
            <div className="flex h-full flex-col justify-center px-4 pb-6 pt-24 sm:px-8">
              <Carousel
                setApi={setImageCarouselApi}
                opts={{ startIndex: activeImageIndex ?? 0 }}
                className="mx-auto w-full max-w-6xl"
              >
                <CarouselContent>
                  {imageAttachments.map((attachment, index) => {
                    const fileHref = getAttachmentUrl(attachment)
                    const fileName = attachment.file_name || `Rasm ${index + 1}`

                    return (
                      <CarouselItem key={attachment.id}>
                        <div className="flex h-[62vh] items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-black/40 sm:h-[70vh]">
                          <div className="relative h-full w-full">
                            <Image
                              src={fileHref}
                              alt={fileName}
                              fill
                              unoptimized
                              className="object-contain"
                            />
                          </div>
                        </div>
                      </CarouselItem>
                    )
                  })}
                </CarouselContent>
                {imageAttachments.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2 h-11 w-11 border-white/20 bg-black/45 text-white hover:bg-black/60 disabled:opacity-30 sm:left-4" />
                    <CarouselNext className="right-2 h-11 w-11 border-white/20 bg-black/45 text-white hover:bg-black/60 disabled:opacity-30 sm:right-4" />
                  </>
                )}
              </Carousel>

              {imageAttachments.length > 1 && (
                <div className="mx-auto mt-4 grid max-w-5xl grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                  {imageAttachments.map((attachment, index) => {
                    const fileHref = getAttachmentUrl(attachment)
                    const fileName = attachment.file_name || `Rasm ${index + 1}`
                    const isActive = index === activeImageIndex

                    return (
                      <button
                        key={attachment.id}
                        type="button"
                        onClick={() => {
                          setActiveImageIndex(index)
                          imageCarouselApi?.scrollTo(index)
                        }}
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-2xl border transition-all",
                          isActive ? "border-border-strong ring-2 ring-ring/50" : "border-border opacity-70 hover:opacity-100"
                        )}
                      >
                        <Image src={fileHref} alt={fileName} fill unoptimized className="object-cover" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Hujjatlar sayt ichida ochiladi: PDF, Word va Excel ham.
          Ilgari bu yerda `<iframe src={apiUrl}>` bor edi — backend
          `X-Frame-Options` yuborgani uchun u bo'sh oyna ko'rsatardi. */}
      <FileViewer {...attachmentViewer.props} />

    </>
  )
}
