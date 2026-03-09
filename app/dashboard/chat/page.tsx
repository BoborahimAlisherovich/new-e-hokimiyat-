"use client"

import { Header } from "@/components/layout/header"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Send, 
  Paperclip, 
  Search, 
  Mic,
  Trash2,
  FileText,
  Users,
  MessageSquare,
  MapPin,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Video,
  Music,
  X,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { getChatConversations, getChatMessages, getCurrentUser, getChatUsers, sendChatMessage, deleteChatMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { useAudioAlert } from "@/hooks/use-audio-alert"
import { toast } from "sonner"

// Maksimal fayl hajmi (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024

// Ruxsat etilgan fayl turlari
const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
  // Videos
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  // Audio
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a',
  // Documents
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]

// Role labels
const ROLE_LABELS: Record<string, string> = {
  HOKIM: "Hokim",
  HOKIMLIK_MASUL: "Hokimlik mas'uli",
  TASHKILOT_RAHBAR: "Tashkilot rahbari",
  TASHKILOT_RAHBARI: "Tashkilot rahbari",
  TASHKILOT_MASUL: "Tashkilot mas'uli",
  ADMIN: "Admin",
}

type AttachmentType = "IMAGE" | "VIDEO" | "AUDIO" | "FILE"

type MessageAttachment = {
  name: string
  url: string
  type: AttachmentType
  size?: string
}

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  attachment?: MessageAttachment
  timestamp: string
  is_read: boolean
}

interface ChatUser {
  id: string
  first_name: string
  last_name: string
  email?: string
  position?: string
  role?: string
  organization?: { name: string }
  is_online?: boolean
  avatar_url?: string | null
}

interface Conversation {
  user: ChatUser
  messages: Message[]
  unreadCount?: number
}

export default function ChatPage() {
  const pageRef = useGSAPPageEntrance()
  const [users, setUsers] = useState<ChatUser[]>([])
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map())
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [chatFile, setChatFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showUserList, setShowUserList] = useState(true)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const lastMessageIdsRef = useRef<Record<string, string | undefined>>({})
  const playChatAlert = useAudioAlert()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Faylni sozlash (umumiy funksiya)
  const setFileWithPreview = useCallback((file: File) => {
    // Fayl hajmi tekshiruvi
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Fayl hajmi 50MB dan oshmasligi kerak. Hozirgi: ${(file.size / (1024*1024)).toFixed(1)}MB`)
      return false
    }
    
    // Fayl turi tekshiruvi
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error(`Ruxsat etilmagan fayl turi: ${file.type || "noma'lum"}`)
      return false
    }
    
    // Oldingi preview ni tozalash
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
    }
    
    setChatFile(file)
    
    // Preview yaratish (rasm/video uchun)
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file)
      setFilePreview(url)
    } else {
      setFilePreview(null)
    }
    
    return true
  }, [filePreview])

  // Fayl tanlanganda preview yaratish
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileWithPreview(file)
  }, [setFileWithPreview])

  // Clipboard dan paste qilish (Telegram singari)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // Rasm yoki fayl tekshirish
      if (item.type.startsWith('image/') || item.type.startsWith('video/') || item.type.startsWith('audio/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          // Fayl nomini yaratish
          const extension = item.type.split('/')[1] || 'png'
          const timestamp = Date.now()
          const newFile = new File([file], `pasted_${timestamp}.${extension}`, { type: item.type })
          
          if (setFileWithPreview(newFile)) {
            toast.success("Rasm clipboard dan qo'shildi")
          }
        }
        return
      }
    }
  }, [setFileWithPreview])

  // Fayl olib tashlanganda preview ni tozalash
  const clearFile = useCallback(() => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview)
    }
    setChatFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [filePreview])

  // Drag & Drop state
  const [isDragging, setIsDragging] = useState(false)

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (setFileWithPreview(file)) {
        toast.success(`Fayl qo'shildi: ${file.name}`)
      }
    }
  }, [setFileWithPreview])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!currentUser) return

    let shouldPlay = false
    const updatedIds: Record<string, string | undefined> = { ...lastMessageIdsRef.current }

    conversations.forEach((conv, userId) => {
      const lastMessage = conv.messages[conv.messages.length - 1]
      if (!lastMessage?.id) return

      const previousId = lastMessageIdsRef.current[userId]
      if (
        previousId &&
        previousId !== lastMessage.id &&
        lastMessage.senderId &&
        lastMessage.senderId !== currentUser.id
      ) {
        shouldPlay = true
      }

      updatedIds[userId] = lastMessage.id
    })

    lastMessageIdsRef.current = updatedIds

    if (shouldPlay) {
      playChatAlert(640, 0.18)
    }
  }, [conversations, currentUser, playChatAlert])

  // Scroll to bottom when user is selected or messages change
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedUserId])

  useEffect(() => {
    if (!selectedUserId) setShowUserList(true)
  }, [selectedUserId])

  // Also scroll when conversation messages length changes
  const messagesLength = selectedUserId ? conversations.get(selectedUserId)?.messages.length : 0
  useEffect(() => {
    if (selectedUserId && messagesLength) {
      scrollToBottom()
    }
  }, [messagesLength, selectedUserId])

  const mapUserToChatUser = (user: any): ChatUser => ({
    ...user,
    id: String(user?.id ?? ""),
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [meResult, usersResult, convsResult] = await Promise.allSettled([
        getCurrentUser(),
        getChatUsers(),
        getChatConversations(),
      ])

      const me = meResult.status === "fulfilled" ? meResult.value : null
      const usersData = usersResult.status === "fulfilled" ? usersResult.value : []
      const convs = convsResult.status === "fulfilled" ? convsResult.value : []

      if (me) setCurrentUser(mapUserToChatUser(me))

      const processedUsers = (usersData || [])
        .filter((u: any) => u.id !== me?.id)
        .map((user: any) => mapUserToChatUser(user))

      setUsers(processedUsers)

      const convMap = new Map<string, Conversation>()
      ;(convs || []).forEach((conv: any) => {
        const other = conv.other_participant
        if (!other?.id) return
        const otherId = String(other.id)
        const user = processedUsers.find((u: ChatUser) => u.id === otherId) || mapUserToChatUser(other)
        const lastMsg = conv.last_message ? mapApiMessage(conv.last_message) : null
        convMap.set(otherId, {
          user,
          messages: lastMsg ? [lastMsg] : [],
          unreadCount: conv.unread_count || 0,
        })
      })
      setConversations(convMap)
    } catch (error) {
      console.error("Chat ma'lumotlarini yuklashda xatolik:", error)
    } finally {
      setLoading(false)
    }
  }

  const getAttachmentName = (url: string) => {
    try {
      const pathname = new URL(url, window.location.origin).pathname
      return decodeURIComponent(pathname.split("/").pop() || "file")
    } catch {
      const parts = url.split("/")
      return decodeURIComponent(parts[parts.length - 1] || "file")
    }
  }

  const inferAttachmentType = (url: string): AttachmentType => {
    const ext = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase()
    if (!ext) return "FILE"
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "IMAGE"
    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "VIDEO"
    if (["mp3", "wav", "ogg", "m4a", "webm"].includes(ext)) return "AUDIO"
    return "FILE"
  }

  const mapApiMessage = (msg: any): Message => {
    const attachmentUrl = msg.attachment || undefined
    const attachment = attachmentUrl
      ? {
          name: getAttachmentName(attachmentUrl),
          url: attachmentUrl,
          type: inferAttachmentType(attachmentUrl),
        }
      : undefined

    return {
      id: String(msg.id),
      senderId: String(msg.sender?.id || msg.sender_id || ""),
      senderName: msg.sender_name || msg.sender?.full_name || "",
      content: msg.content || "",
      attachment,
      timestamp: msg.created_at || new Date().toISOString(),
      is_read: msg.is_read ?? false,
    }
  }

  const selectedConversation = selectedUserId ? conversations.get(selectedUserId) : null
  const selectedUser = selectedConversation?.user || users.find(u => u.id === selectedUserId)

  // Audio recording
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
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      toast.info("Ovozli xabar yozilmoqda...")
    } catch (error) {
      console.error('Mikrofondan foydalanish uchun ruxsat berilmagan:', error)
      toast.error('Mikrofondan foydalanish uchun ruxsat berilmagan')
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
    if (!audioBlob || !selectedUserId || !currentUser || isSending) return

    setIsSending(true)
    try {
      const file = new File([audioBlob], `audio_${Date.now()}.webm`, {
        type: audioBlob.type || "audio/webm",
      })

      const saved = await sendChatMessage(selectedUserId, {
        content: "🎤 Ovozli xabar",
        attachment: file,
      })

      addMessageToConversation(mapApiMessage(saved), selectedUserId)
      setAudioBlob(null)
      toast.success("Ovozli xabar yuborildi")
    } catch (error: any) {
      console.error("Audio yuborishda xatolik:", error)
      toast.error(error?.message || "Ovozli xabar yuborishda xatolik")
    } finally {
      setIsSending(false)
    }
  }

  const sendLocation = async () => {
    if (!selectedUserId || !currentUser) return
    
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

      const saved = await sendChatMessage(selectedUserId, {
        content: locationMessage,
      })

      addMessageToConversation(mapApiMessage(saved), selectedUserId)
      toast.success("Joylashuv yuborildi")
    } catch (error) {
      console.error('Location error:', error)
      toast.error('Joylashuvni olishda xatolik. Iltimos, joylashuv ruxsatini tekshiring.')
    } finally {
      setIsLocationLoading(false)
    }
  }

  const addMessageToConversation = (message: Message, userId?: string) => {
    const targetUserId = userId || selectedUserId
    if (!targetUserId) return

    setConversations(prev => {
      const newMap = new Map(prev)
      const conv = newMap.get(targetUserId)
      if (conv) {
        // Create new conversation object to avoid mutation
        newMap.set(targetUserId, {
          ...conv,
          messages: [...conv.messages, message],
        })
      } else {
        const user = users.find(u => u.id === targetUserId)
        if (user) {
          newMap.set(targetUserId, {
            user,
            messages: [message],
          })
        }
      }
      return newMap
    })

    // Scroll to bottom after adding message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  const sendMessage = async () => {
    const hasContent = newMessage && newMessage.trim()
    const hasFile = chatFile instanceof File
    
    if ((!hasContent && !hasFile) || !selectedUserId || !currentUser || isSending) return

    setIsSending(true)
    try {
      const saved = await sendChatMessage(selectedUserId, {
        content: hasContent ? newMessage.trim() : (hasFile ? "📎 Fayl" : ""),
        attachment: hasFile ? chatFile : null,
      })

      addMessageToConversation(mapApiMessage(saved), selectedUserId)
      setNewMessage("")
      clearFile()
      toast.success("Xabar yuborildi")
    } catch (error: any) {
      console.error("Xabar yuborishda xatolik:", error)
      toast.error(error?.message || "Xabar yuborishda xatolik yuz berdi")
    } finally {
      setIsSending(false)
    }
  }

  // Xabarni o'chirish
  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedUserId) return
    
    try {
      await deleteChatMessage(messageId)
      
      // Xabarni local state dan o'chirish
      setConversations(prev => {
        const newMap = new Map(prev)
        const conv = newMap.get(selectedUserId)
        if (conv) {
          conv.messages = conv.messages.filter(m => m.id !== messageId)
        }
        return newMap
      })
      
      toast.success("Xabar o'chirildi")
    } catch (error: any) {
      console.error("Xabarni o'chirishda xatolik:", error)
      toast.error(error?.message || "Xabarni o'chirishda xatolik yuz berdi")
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
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

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
  }

  // Parse location from message content
  const parseLocation = (content: string): { lat: number; lng: number } | null => {
    const match = content.match(/maps\.google\.com\/maps\?q=([\d.-]+),([\d.-]+)/)
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) }
    }
    return null
  }

  // Render message content with location preview or clean text
  const renderMessageContent = (content: string, isCurrentUser: boolean) => {
    const location = parseLocation(content)
    if (location) {
      const mapUrl = `https://maps.google.com/maps?q=${location.lat},${location.lng}`
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=15&size=300x150&maptype=roadmap&markers=color:red%7C${location.lat},${location.lng}&key=`
      return (
        <a href={mapUrl} target="_blank" rel="noreferrer" className="block">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">📍 Joylashuv</span>
          </div>
          <div className="rounded-lg overflow-hidden border border-border/40">
            <iframe
              width="250"
              height="120"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.005}%2C${location.lat - 0.003}%2C${location.lng + 0.005}%2C${location.lat + 0.003}&layer=mapnik&marker=${location.lat}%2C${location.lng}`}
            />
          </div>
          <p className={cn(
            "text-xs mt-1",
            isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            Xaritada ochish uchun bosing
          </p>
        </a>
      )
    }
    return <p className="text-sm leading-relaxed">{content}</p>
  }

  const getLastMessage = (userId: string): { text: string; time: string } | null => {
    const conv = conversations.get(userId)
    if (!conv || conv.messages.length === 0) return null
    const lastMsg = conv.messages[conv.messages.length - 1]
    return {
      text: lastMsg.attachment ? `📎 ${lastMsg.attachment.name?.split('/').pop() || 'Fayl'}` : (parseLocation(lastMsg.content) ? "📍 Joylashuv" : lastMsg.content.substring(0, 30)),
      time: formatTime(lastMsg.timestamp),
    }
  }

  const filteredUsers = users
    .map((user, index) => {
      const conv = conversations.get(user.id)
      const lastMsg = conv?.messages?.[conv.messages.length - 1]
      return {
        user,
        index,
        lastTimestamp: lastMsg ? new Date(lastMsg.timestamp).getTime() : null,
      }
    })
    .filter(({ user }) =>
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.lastTimestamp && b.lastTimestamp) return b.lastTimestamp - a.lastTimestamp
      if (a.lastTimestamp && !b.lastTimestamp) return -1
      if (!a.lastTimestamp && b.lastTimestamp) return 1
      return a.index - b.index
    })
    .map(({ user }) => user)

  const loadConversation = async (userId: string) => {
    try {
      const messages = await getChatMessages(userId)
      const mapped = (messages || []).map(mapApiMessage).reverse()
      setConversations(prev => {
        const newMap = new Map(prev)
        const conv = newMap.get(userId)
        if (conv) {
          // Messages are now read, set unreadCount to 0
          newMap.set(userId, { ...conv, messages: mapped, unreadCount: 0 })
        } else {
          const user = users.find(u => u.id === userId)
          if (user) newMap.set(userId, { user, messages: mapped, unreadCount: 0 })
        }
        return newMap
      })
      
      // Dispatch event to update sidebar unread count
      window.dispatchEvent(new Event('chatRead'))
    } catch (error) {
      console.error("Chat tarixini yuklashda xatolik:", error)
    }
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
    if (typeof window !== "undefined") {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches
      if (!isDesktop) setShowUserList(false)
    }
    if (!conversations.has(userId)) {
      const user = users.find(u => u.id === userId)!
      setConversations(prev => {
        const newMap = new Map(prev)
        newMap.set(userId, { user, messages: [] })
        return newMap
      })
    }
    loadConversation(userId)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Chat" />
        <div className="p-6">
          <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
              <p className="mt-4 text-slate-500">Yuklanmoqda...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Chat" />
      <div ref={pageRef} className="p-6">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-200/15 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-purple-200/10 to-transparent rounded-full blur-xl" />
        </div>
        
        <div className="relative z-10 p-3 sm:p-4 lg:p-6">
        <div data-gsap-section className="flex h-[calc(100vh-160px)] min-h-0 flex-col gap-4 lg:flex-row lg:gap-6">
          {/* Users List */}
          <Card
            className={cn(
              "bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl w-full lg:w-80 xl:w-96 flex flex-col min-h-0 overflow-hidden hover:shadow-xl transition-all duration-300",
              !showUserList && "hidden lg:flex"
            )}
          >
            <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  Foydalanuvchilar
                </CardTitle>
                <Badge variant="secondary" className="bg-white/80 text-indigo-700 font-semibold shadow-sm">{users.length}</Badge>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Qidiruv..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/90 border-indigo-100/40 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-xl shadow-inner"
                />
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 min-h-0">
              <div className="divide-y divide-border/60">
                {filteredUsers.map((user) => {
                  const lastMsg = getLastMessage(user.id)
                  const isSelected = selectedUserId === user.id
                  const conv = conversations.get(user.id)
                  const unreadCount = conv?.unreadCount || 0
                  
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3.5 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 text-left overflow-hidden",
                        isSelected && "bg-gradient-to-r from-indigo-50 to-blue-50 border-l-3 border-l-indigo-500"
                      )}
                    >
                      <div className="relative">
                        <UserAvatar
                          firstName={user.first_name}
                          lastName={user.last_name}
                          avatarUrl={user.avatar_url}
                          size="lg"
                          showOnline={true}
                          isOnline={user.is_online}
                        />
                        {/* Unread message badge */}
                        {unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-[10px] font-bold text-white shadow-md">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <p className={cn("font-semibold text-sm text-slate-800 truncate", unreadCount > 0 && "text-slate-900")}>
                            {user.first_name} {user.last_name}
                          </p>
                          {lastMsg && (
                            <span className="text-xs text-slate-500 shrink-0 font-medium">{lastMsg.time}</span>
                          )}
                        </div>
                        <p className={cn("text-xs text-slate-500 truncate mt-0.5", unreadCount > 0 && "font-semibold text-slate-700")}>
                          {lastMsg ? lastMsg.text : (user.role ? ROLE_LABELS[user.role] || user.role : "Foydalanuvchi")}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card
            className={cn(
              "bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden hover:shadow-xl transition-all duration-300",
              showUserList && "hidden lg:flex"
            )}
          >
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <CardHeader className="py-3 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/30">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden hover:bg-white/80"
                      onClick={() => setShowUserList(true)}
                      title="Foydalanuvchilar ro'yxati"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <UserAvatar
                      firstName={selectedUser.first_name}
                      lastName={selectedUser.last_name}
                      avatarUrl={selectedUser.avatar_url}
                      size="lg"
                      showOnline={true}
                      isOnline={selectedUser.is_online}
                    />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{selectedUser.first_name} {selectedUser.last_name}</p>
                      <div className="flex items-center gap-2">
                        {selectedUser.is_online ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Onlayn
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">Oflayn</span>
                        )}
                        {selectedUser.role && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0 font-medium bg-white/80 border-indigo-100/40">
                            {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 min-h-0 p-4 bg-gradient-to-b from-transparent to-muted/30">
                  <div className="space-y-4">
                    {selectedConversation?.messages.map((msg) => {
                      const isCurrentUser = Boolean(currentUser && msg.senderId === currentUser.id)

                      return (
                        <div key={msg.id} className={cn("flex gap-2 sm:gap-3 group", isCurrentUser && "flex-row-reverse")}>
                          <UserAvatar
                            firstName={isCurrentUser ? currentUser?.first_name : selectedUser?.first_name}
                            lastName={isCurrentUser ? currentUser?.last_name : selectedUser?.last_name}
                            avatarUrl={isCurrentUser ? (currentUser as any)?.avatar_url : selectedUser?.avatar_url}
                            size="sm"
                          />
                          <div className={cn("max-w-[85%] sm:max-w-[78%] lg:max-w-[65%] space-y-1", isCurrentUser && "items-end")}>
                            <div className={cn("flex flex-wrap items-center gap-1 sm:gap-2", isCurrentUser && "flex-row-reverse")}>
                              <span className="text-xs sm:text-sm font-medium text-foreground">{msg.senderName}</span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">{formatDateTime(msg.timestamp)}</span>
                              {/* Read status checkmarks - only show for current user's messages */}
                              {isCurrentUser && (
                                <span className={cn(
                                  "flex items-center",
                                  msg.is_read ? "text-blue-500" : "text-muted-foreground"
                                )}>
                                  {msg.is_read ? (
                                    <CheckCheck className="h-4 w-4" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </span>
                              )}
                              {/* Delete button - only for own messages */}
                              {isCurrentUser && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  title="Xabarni o'chirish"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <div
                              className={cn(
                                "rounded-xl p-2.5 sm:p-3 shadow-sm border",
                                isCurrentUser ? "bg-primary text-primary-foreground border-primary/20" : "bg-white/80 border-border/60",
                              )}
                            >
                              {msg.content && renderMessageContent(msg.content, isCurrentUser)}
                              {msg.attachment && (
                                <div className="mt-2 space-y-2">
                                  {msg.attachment.type === 'IMAGE' && (
                                    <img
                                      src={msg.attachment.url}
                                      alt={msg.attachment.name}
                                      className="max-h-48 rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => setLightboxImage(msg.attachment!.url)}
                                    />
                                  )}
                                  {msg.attachment.type === 'VIDEO' && (
                                    <video src={msg.attachment.url} controls className="max-h-48 rounded-md border w-full" />
                                  )}
                                  {msg.attachment.type === 'AUDIO' && (
                                    <audio src={msg.attachment.url} controls className="w-full" />
                                  )}
                                  {msg.attachment.type === 'FILE' && (
                                    <a
                                      href={msg.attachment.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02]",
                                        isCurrentUser 
                                          ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" 
                                          : "bg-muted/60 hover:bg-muted",
                                      )}
                                    >
                                      <div className={cn(
                                        "p-2 rounded-lg",
                                        isCurrentUser ? "bg-primary-foreground/20" : "bg-primary/10"
                                      )}>
                                        <FileText className={cn(
                                          "h-5 w-5",
                                          isCurrentUser ? "text-primary-foreground" : "text-primary"
                                        )} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={cn(
                                          "text-sm font-medium truncate",
                                          isCurrentUser ? "text-primary-foreground" : "text-foreground"
                                        )}>
                                          {msg.attachment.name}
                                        </p>
                                        <p className={cn(
                                          "text-xs",
                                          isCurrentUser ? "text-primary-foreground/60" : "text-muted-foreground"
                                        )}>
                                          {msg.attachment.size || "Fayl"}
                                        </p>
                                      </div>
                                      <Download className={cn(
                                        "h-4 w-4 shrink-0",
                                        isCurrentUser ? "text-primary-foreground/60" : "text-muted-foreground"
                                      )} />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div 
                  className={cn(
                    "border-t border-border p-4 flex-shrink-0 bg-muted/20 relative transition-colors duration-200",
                    isDragging && "bg-primary/10 border-primary border-2 border-dashed"
                  )}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {/* Drag & Drop Overlay */}
                  {isDragging && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 backdrop-blur-sm pointer-events-none">
                      <div className="text-center">
                        <ImageIcon className="h-10 w-10 mx-auto text-primary mb-2" />
                        <p className="text-sm font-medium text-primary">Faylni shu yerga tashlang</p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {/* Audio Recording UI */}
                    {isRecording && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm text-red-600 dark:text-red-400 font-medium">Yozib olinmoqda...</span>
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
                      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-200 dark:border-blue-800">
                        <Mic className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 flex-1" />
                        <Button 
                          size="sm" 
                          onClick={sendAudio} 
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={isSending}
                        >
                          {isSending ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Send className="h-3 w-3 mr-1" />
                          )}
                          Yuborish
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setAudioBlob(null)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {/* File Preview */}
                      {chatFile && (
                        <div
                          className="p-3 bg-muted/60 rounded-xl border border-border/60 animate-in fade-in slide-in-from-bottom-2 duration-200"
                        >
                          <div className="flex items-start gap-3">
                            {/* Preview rasm yoki video */}
                            {filePreview && chatFile.type.startsWith('image/') && (
                              <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                                <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                            )}
                            {filePreview && chatFile.type.startsWith('video/') && (
                              <div className="relative w-32 h-20 rounded-lg overflow-hidden border">
                                <video src={filePreview} className="w-full h-full object-cover" muted />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Video className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            )}
                            {chatFile.type.startsWith('audio/') && (
                              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900">
                                <Music className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                              </div>
                            )}
                            {!chatFile.type.startsWith('image/') && !chatFile.type.startsWith('video/') && !chatFile.type.startsWith('audio/') && (
                              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-50/50 dark:bg-slate-800">
                                <FileText className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                              </div>
                            )}
                            
                            {/* Fayl ma'lumotlari */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{chatFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(chatFile.size)} • {chatFile.type.split('/')[0]}
                              </p>
                            </div>
                            
                            {/* O'chirish tugmasi */}
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearFile}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    
                    <div className="flex gap-1.5 sm:gap-2 items-end">
                      {/* File attach */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        onChange={handleFileSelect}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="shrink-0 h-9 w-9 sm:h-10 sm:w-10" 
                        type="button" 
                        title="Fayl biriktirish"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      
                      {/* Audio record */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("shrink-0 h-9 w-9 sm:h-10 sm:w-10 hidden sm:inline-flex", isRecording && "text-red-500")}
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isSending}
                        title={isRecording ? "Yozishni to'xtatish" : "Ovozli xabar yozish"}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                      
                      {/* Location */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 hidden sm:inline-flex" 
                        type="button"
                        onClick={sendLocation}
                        disabled={isLocationLoading || isSending}
                        title="Joylashuvni yuborish"
                      >
                        <MapPin className={cn("h-4 w-4", isLocationLoading && "animate-pulse")} />
                      </Button>
                      
                      <Input
                        ref={inputRef}
                        placeholder="Xabar yozing yoki rasm joylashtiring (Ctrl+V)..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onPaste={handlePaste}
                        disabled={isSending}
                        className="bg-white/90 border-indigo-100/40 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-xl"
                      />
                      <Button 
                        onClick={sendMessage} 
                        className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 rounded-xl"
                        disabled={isSending || (!newMessage.trim() && !chatFile)}
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
                <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 sm:mb-6 shadow-xl shadow-blue-500/25">
                  <MessageSquare className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">Suhbatni tanlang</h3>
                <p className="text-sm sm:text-base text-slate-500 max-w-sm px-4">
                  Ro&apos;yxatdan foydalanuvchini tanlang va xabar yozishni boshlang
                </p>
                <div className="mt-6 sm:mt-8 flex items-center gap-2 text-xs sm:text-sm text-slate-500">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] sm:text-xs border-2 border-white">A</div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-[10px] sm:text-xs border-2 border-white">B</div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white text-[10px] sm:text-xs border-2 border-white">C</div>
                  </div>
                  <span>{users.length} ta foydalanuvchi mavjud</span>
                </div>
              </div>
            )}
          </Card>
        </div>
        </div>

        {/* Image Lightbox Modal */}
          {lightboxImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setLightboxImage(null)}
            >
              <div
                className="relative max-w-[90vw] max-h-[90vh] animate-in zoom-in-90 fade-in duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={lightboxImage}
                  alt="Katta rasm"
                  className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <a
                    href={lightboxImage}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-5 w-5 text-white" />
                  </a>
                  <button
                    onClick={() => setLightboxImage(null)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </>
  )
}
