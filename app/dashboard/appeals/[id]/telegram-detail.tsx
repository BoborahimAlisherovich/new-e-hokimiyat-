"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Image,
  Trash2
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Appeal } from "@/types"

interface AppealMessage {
  id: number
  text: string
  is_from_admin: boolean
  admin_name: string | null
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

  const loadData = async () => {
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
  }

  useEffect(() => {
    loadData()
  }, [appealId])

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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50 pt-20">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="mt-4 text-muted-foreground">Yuklanmoqda...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!appeal) {
    return (
      <>
        <Header title="Murojaat" description="Murojaat topilmadi" />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50 pt-20">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <Card>
              <CardContent className="py-12 text-center">
                <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Murojaat topilmadi</h2>
                <p className="text-muted-foreground mb-4">Ushbu murojaat mavjud emas yoki o'chirilgan</p>
                <Link href="/dashboard/appeals">
                  <Button>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Orqaga
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={`Murojaat #${appeal.id?.replace('tg-', '')}`} description={appeal.citizenName} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/dashboard/appeals">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Orqaga
              </Button>
            </Link>
            
            <div className="flex items-center gap-2">
              {appeal.status !== 'resolved' && appeal.status !== 'rejected' && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleApprove}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Tasdiqlash
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setRejectDialogOpen(true)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rad etish
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={openTaskDialog}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Topshiriq yaratish
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setCloseDialogOpen(true)}
                    className="bg-primary"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Yopish va javob berish
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Appeal Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Appeal Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Murojaat ma'lumotlari</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(appeal.status)}
                      {appeal.priority && getPriorityBadge(appeal.priority)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Fuqaro</p>
                        <p className="font-medium">{appeal.citizenName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Telefon</p>
                        <p className="font-medium">{appeal.citizenPhone || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Hudud</p>
                        <p className="font-medium">{appeal.district || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Sana</p>
                        <p className="font-medium">{formatDate(appeal.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Murojaat kategoriyasi</p>
                    <Badge variant="secondary">{appeal.category || 'Belgilanmagan'}</Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Murojaat matni</p>
                    <div className="p-4 bg-muted/30 rounded-lg overflow-hidden">
                      <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{appeal.description}</p>
                    </div>
                  </div>
                  
                  {/* Baholash ko'rsatish */}
                  {appeal.status === 'resolved' && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">Murojaat yopilgan</p>
                          {appeal.closed_at && (
                            <p className="text-xs text-green-600 dark:text-green-500">
                              {new Date(appeal.closed_at).toLocaleString('uz-UZ')}
                            </p>
                          )}
                        </div>
                        {appeal.rating ? (
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{'⭐'.repeat(appeal.rating)}</span>
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              {appeal.rating}/5
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-400">
                            Baholanmagan
                          </Badge>
                        )}
                      </div>
                      {appeal.rating_comment && (
                        <p className="mt-2 text-sm text-green-600 dark:text-green-500 italic">
                          "{appeal.rating_comment}"
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabs for Chat and History */}
              <Card>
                <Tabs defaultValue="chat" className="w-full">
                  <CardHeader className="pb-0">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="chat" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Chat
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
                              <div className="text-center text-muted-foreground py-12">
                                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>Hali xabarlar yo'q</p>
                              </div>
                            ) : (
                              messages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={cn(
                                    "flex gap-3",
                                    msg.is_from_admin ? "flex-row-reverse" : ""
                                  )}
                                >
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarFallback className={msg.is_from_admin ? "bg-primary text-primary-foreground" : "bg-muted"}>
                                      {msg.is_from_admin ? "A" : appeal.citizenName?.charAt(0) || "F"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className={cn(
                                    "max-w-[70%] rounded-lg p-3",
                                    msg.is_from_admin 
                                      ? "bg-primary text-primary-foreground" 
                                      : "bg-muted"
                                  )}>
                                    <p className="text-sm">{msg.text}</p>
                                    <p className={cn(
                                      "text-xs mt-1",
                                      msg.is_from_admin ? "text-primary-foreground/70" : "text-muted-foreground"
                                    )}>
                                      {formatDate(msg.created_at)}
                                      {msg.admin_name && ` • ${msg.admin_name}`}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                            <div ref={messagesEndRef} />
                          </div>
                        </ScrollArea>
                        
                        {/* Message Input */}
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
                              <Button size="sm" onClick={sendAudio} className="bg-blue-600 hover:bg-blue-700" disabled={sendingMessage}>
                                {sendingMessage ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="h-3 w-3 mr-1" /> Yuborish</>}
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
                                e.target.value = ''
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
                              placeholder="Xabar yozing... (Ctrl+V - rasm)"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSendMessage()
                                }
                              }}
                              onPaste={handlePaste}
                            />
                            <Button 
                              onClick={handleSendMessage} 
                              disabled={sendingMessage || (!messageText.trim() && !chatFile)}
                            >
                              {sendingMessage ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          
                          {/* File preview */}
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
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="history" className="mt-0">
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                          {history.length === 0 ? (
                            <div className="text-center text-muted-foreground py-12">
                              <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                              <p>Hali tarix yo'q</p>
                            </div>
                          ) : (
                            history.map((item, index) => (
                              <div key={index} className="flex gap-3">
                                <div className={cn(
                                  "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                                  item.type === 'ai_analysis' ? "bg-blue-100 text-blue-600" :
                                  item.type === 'admin_review' ? "bg-green-100 text-green-600" :
                                  "bg-gray-100 text-gray-600"
                                )}>
                                  {item.type === 'ai_analysis' ? <Bot className="h-4 w-4" /> :
                                   item.type === 'admin_review' ? <CheckCircle className="h-4 w-4" /> :
                                   <MessageSquare className="h-4 w-4" />}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{item.title}</p>
                                  
                                  {/* AI Analysis Details */}
                                  {item.type === 'ai_analysis' && (
                                    <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                                      <p className="text-muted-foreground">{item.description}</p>
                                      <div className="flex gap-4 mt-2">
                                        <span>Ball: <strong>{item.score || 0}</strong></span>
                                        <span>Muhimlik: <strong>{item.priority || '-'}</strong></span>
                                        <span>To'g'ri: <strong>{item.is_valid ? 'Ha' : 'Yo\'q'}</strong></span>
                                      </div>
                                      {item.rejection_reason && (
                                        <p className="mt-2 text-red-600">
                                          <AlertTriangle className="h-4 w-4 inline mr-1" />
                                          {item.rejection_reason}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Admin Review Details */}
                                  {item.type === 'admin_review' && (
                                    <div className="mt-2 p-3 bg-green-50 rounded-lg text-sm">
                                      {item.admin && <p>Admin: {item.admin}</p>}
                                      {item.status && <p>Holat: {item.status}</p>}
                                      {item.response && <p className="mt-1">{item.response}</p>}
                                    </div>
                                  )}
                                  
                                  {/* Message */}
                                  {item.type === 'message' && item.text && (
                                    <p className="mt-1 text-muted-foreground">{item.text}</p>
                                  )}
                                  
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(item.created_at)}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </div>

            {/* Right Column - Quick Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tezkor harakatlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setCloseDialogOpen(true)}
                    disabled={appeal.status === 'resolved' || appeal.status === 'rejected'}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Murojaatni yopish
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Topshiriq yaratish
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={appeal.status === 'resolved' || appeal.status === 'rejected'}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rad etish
                  </Button>
                </CardContent>
              </Card>

              {/* AI Analysis Card */}
              {history.some(h => h.type === 'ai_analysis') && (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bot className="h-5 w-5 text-blue-600" />
                      AI Tahlili
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {history
                      .filter(h => h.type === 'ai_analysis')
                      .map((item, i) => (
                        <div key={i} className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ball:</span>
                            <span className={cn(
                              "font-bold",
                              (item.score || 0) >= 70 ? "text-green-600" :
                              (item.score || 0) >= 40 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {item.score || 0}/100
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Muhimlik:</span>
                            <span className="font-medium">{item.priority || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">To'g'rilik:</span>
                            <span className={item.is_valid ? "text-green-600" : "text-red-600"}>
                              {item.is_valid ? 'Ha ✓' : 'Yo\'q ✗'}
                            </span>
                          </div>
                          {item.rejection_reason && (
                            <div className="pt-2 border-t mt-2">
                              <p className="text-red-600 text-xs">
                                <AlertTriangle className="h-3 w-3 inline mr-1" />
                                {item.rejection_reason}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Close Appeal Dialog */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Murojaatni yopish</DialogTitle>
            <DialogDescription>
              Foydalanuvchiga javob yozing. Javob yuborilgandan so'ng foydalanuvchidan qoniqish so'raladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="closeResponse">Javob matni</Label>
              <Textarea
                id="closeResponse"
                placeholder="Javobingizni yozing..."
                value={closeResponse}
                onChange={(e) => setCloseResponse(e.target.value)}
                className="min-h-[120px] mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleCloseAppeal} disabled={closingAppeal}>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Murojaatni rad etish</AlertDialogTitle>
            <AlertDialogDescription>
              Rad etish sababini kiriting
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Rad etish sababi..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRejectAppeal}
              disabled={rejecting}
              className="bg-red-600 hover:bg-red-700"
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Topshiriq yaratish
            </DialogTitle>
            <DialogDescription>
              Murojaatni topshiriq sifatida tashkilotlarga yo'naltiring
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="taskTitle">Sarlavha *</Label>
              <Input
                id="taskTitle"
                placeholder="Topshiriq sarlavhasi..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label htmlFor="taskDeadline">Bajarilish muddati *</Label>
              <Input
                id="taskDeadline"
                type="date"
                value={taskDeadline}
                onChange={(e) => setTaskDeadline(e.target.value)}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Muhimlik darajasi</Label>
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Muhimlikni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAST">Past</SelectItem>
                  <SelectItem value="ODDIY">O'rta</SelectItem>
                  <SelectItem value="YUQORI">Yuqori</SelectItem>
                  <SelectItem value="SHOSHILINCH">Shoshilinch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Organizations */}
            <div className="space-y-2">
              <Label>Mas'ul tashkilotlar *</Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {organizations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Tashkilotlar yuklanmoqda...
                  </p>
                ) : (
                  organizations.map((org: any) => (
                    <div
                      key={org.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                        selectedOrganizations.includes(org.id)
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-50 hover:bg-gray-100"
                      )}
                      onClick={() => toggleOrganization(org.id)}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center",
                        selectedOrganizations.includes(org.id)
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-300"
                      )}>
                        {selectedOrganizations.includes(org.id) && (
                          <CheckCircle className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm">{org.name}</span>
                    </div>
                  ))
                )}
              </div>
              {selectedOrganizations.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedOrganizations.length} ta tashkilot tanlandi
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setTaskDialogOpen(false)}
              disabled={creatingTask}
            >
              Bekor qilish
            </Button>
            <Button 
              onClick={handleCreateTask} 
              disabled={creatingTask || !taskTitle || !taskDeadline || selectedOrganizations.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
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
