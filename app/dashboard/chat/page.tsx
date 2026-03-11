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
  Radio,
  Activity,
} from "lucide-react"
import { getChatConversations, getChatMessages, getCurrentUser, getChatUsers, sendChatMessage, deleteChatMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { useAudioAlert } from "@/hooks/use-audio-alert"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n/context"

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

const ROLE_LABELS: Record<string, Record<string, string>> = {
  uz: {
    HOKIM: "Hokim",
    HOKIMLIK_MASUL: "Hokimlik mas'uli",
    TASHKILOT_RAHBAR: "Tashkilot rahbari",
    TASHKILOT_RAHBARI: "Tashkilot rahbari",
    TASHKILOT_MASUL: "Tashkilot mas'uli",
    ADMIN: "Admin",
  },
  "uz-cyrl": {
    HOKIM: "Ҳоким",
    HOKIMLIK_MASUL: "Ҳокимлик масъули",
    TASHKILOT_RAHBAR: "Ташкилот раҳбари",
    TASHKILOT_RAHBARI: "Ташкилот раҳбари",
    TASHKILOT_MASUL: "Ташкилот масъули",
    ADMIN: "Админ",
  },
  ru: {
    HOKIM: "Хоким",
    HOKIMLIK_MASUL: "Ответственный хокимията",
    TASHKILOT_RAHBAR: "Руководитель организации",
    TASHKILOT_RAHBARI: "Руководитель организации",
    TASHKILOT_MASUL: "Ответственный организации",
    ADMIN: "Админ",
  },
  en: {
    HOKIM: "Mayor",
    HOKIMLIK_MASUL: "District officer",
    TASHKILOT_RAHBAR: "Organization head",
    TASHKILOT_RAHBARI: "Organization head",
    TASHKILOT_MASUL: "Organization officer",
    ADMIN: "Admin",
  },
}

const CHAT_TEXTS = {
  uz: {
    title: "Chat",
    loading: "Yuklanmoqda...",
    users: "Foydalanuvchilar",
    search: "Qidiruv...",
    defaultUser: "Foydalanuvchi",
    usersList: "Foydalanuvchilar ro'yxati",
    online: "Onlayn",
    offline: "Oflayn",
    deletingMessage: "Xabarni o'chirish",
    file: "Fayl",
    dropFile: "Faylni shu yerga tashlang",
    recording: "Yozib olinmoqda...",
    finish: "Tugatish",
    cancel: "Bekor qilish",
    send: "Yuborish",
    attachFile: "Fayl biriktirish",
    stopRecording: "Yozishni to'xtatish",
    startRecording: "Ovozli xabar yozish",
    sendLocation: "Joylashuvni yuborish",
    messagePlaceholder: "Xabar yozing yoki rasm joylashtiring (Ctrl+V)...",
    selectConversation: "Suhbatni tanlang",
    selectConversationDesc: "Ro'yxatdan foydalanuvchini tanlang va xabar yozishni boshlang",
    usersAvailable: "ta foydalanuvchi mavjud",
    openMap: "Xaritada ochish uchun bosing",
    location: "Joylashuv",
    imageAlt: "Katta rasm",
    fileAdded: "Fayl qo'shildi",
    imagePasted: "Rasm clipboard dan qo'shildi",
    loadingError: "Chat ma'lumotlarini yuklashda xatolik:",
    historyError: "Chat tarixini yuklashda xatolik:",
    fileTooBig: "Fayl hajmi 50MB dan oshmasligi kerak.",
    fileTypeError: "Ruxsat etilmagan fayl turi:",
    unknown: "noma'lum",
    micDenied: "Mikrofondan foydalanish uchun ruxsat berilmagan",
    micNotFound: "Mikrofon qurilmasi topilmadi",
    micBusy: "Mikrofon band yoki boshqa ilova ishlatyapti",
    recordingStarted: "Ovozli xabar yozilmoqda...",
    audioSent: "Ovozli xabar yuborildi",
    audioError: "Ovozli xabar yuborishda xatolik",
    locationSent: "Joylashuv yuborildi",
    locationDenied: "Joylashuvga ruxsat berilmadi. Brauzer sozlamasidan ruxsat bering.",
    locationUnavailable: "Joylashuvni aniqlab bo'lmadi. Qurilma joylashuvini yoqing.",
    locationTimeout: "Joylashuvni olish muddati tugadi. Qayta urinib ko'ring.",
    locationError: "Joylashuvni olishda xatolik. Iltimos, ruxsatni tekshiring.",
    messageSent: "Xabar yuborildi",
    messageSendError: "Xabar yuborishda xatolik yuz berdi",
    messageDeleted: "Xabar o'chirildi",
    messageDeleteError: "Xabarni o'chirishda xatolik yuz berdi",
  },
  "uz-cyrl": {
    title: "Чат",
    loading: "Юкланмоқда...",
    users: "Фойдаланувчилар",
    search: "Қидирув...",
    defaultUser: "Фойдаланувчи",
    usersList: "Фойдаланувчилар рўйхати",
    online: "Онлайн",
    offline: "Офлайн",
    deletingMessage: "Хабарни ўчириш",
    file: "Файл",
    dropFile: "Файлни шу ерга ташланг",
    recording: "Ёзиб олинмоқда...",
    finish: "Тугатиш",
    cancel: "Бекор қилиш",
    send: "Юбориш",
    attachFile: "Файл бириктириш",
    stopRecording: "Ёзишни тўхтатиш",
    startRecording: "Овозли хабар ёзиш",
    sendLocation: "Жойлашувни юбориш",
    messagePlaceholder: "Хабар ёзинг ёки расм жойлаштиринг (Ctrl+V)...",
    selectConversation: "Суҳбатни танланг",
    selectConversationDesc: "Рўйхатдан фойдаланувчини танланг ва хабар ёзишни бошланг",
    usersAvailable: "та фойдаланувчи мавжуд",
    openMap: "Харитада очиш учун босинг",
    location: "Жойлашув",
    imageAlt: "Катта расм",
    fileAdded: "Файл қўшилди",
    imagePasted: "Расм clipboard дан қўшилди",
    loadingError: "Чат маълумотларини юклашда хатолик:",
    historyError: "Чат тарихини юклашда хатолик:",
    fileTooBig: "Файл ҳажми 50MB дан ошмаслиги керак.",
    fileTypeError: "Рухсат этилмаган файл тури:",
    unknown: "номаълум",
    micDenied: "Микрофондан фойдаланиш учун рухсат берилмаган",
    micNotFound: "Микрофон қурилмаси топилмади",
    micBusy: "Микрофон банд ёки бошқа иловада ишламоқда",
    recordingStarted: "Овозли хабар ёзилмоқда...",
    audioSent: "Овозли хабар юборилди",
    audioError: "Овозли хабар юборишда хатолик",
    locationSent: "Жойлашув юборилди",
    locationDenied: "Жойлашувга рухсат берилмади. Браузер созламасидан рухсат беринг.",
    locationUnavailable: "Жойлашувни аниқлаб бўлмади. Қурилма жойлашувини ёқинг.",
    locationTimeout: "Жойлашувни олиш муддати тугади. Қайта уриниб кўринг.",
    locationError: "Жойлашувни олишда хатолик. Илтимос, рухсатни текширинг.",
    messageSent: "Хабар юборилди",
    messageSendError: "Хабар юборишда хатолик юз берди",
    messageDeleted: "Хабар ўчирилди",
    messageDeleteError: "Хабарни ўчиришда хатолик юз берди",
  },
  ru: {
    title: "Чат",
    loading: "Загрузка...",
    users: "Пользователи",
    search: "Поиск...",
    defaultUser: "Пользователь",
    usersList: "Список пользователей",
    online: "Онлайн",
    offline: "Офлайн",
    deletingMessage: "Удалить сообщение",
    file: "Файл",
    dropFile: "Перетащите файл сюда",
    recording: "Идёт запись...",
    finish: "Завершить",
    cancel: "Отмена",
    send: "Отправить",
    attachFile: "Прикрепить файл",
    stopRecording: "Остановить запись",
    startRecording: "Записать голосовое",
    sendLocation: "Отправить геопозицию",
    messagePlaceholder: "Введите сообщение или вставьте изображение (Ctrl+V)...",
    selectConversation: "Выберите чат",
    selectConversationDesc: "Выберите пользователя в списке и начните переписку",
    usersAvailable: "пользователей доступно",
    openMap: "Нажмите, чтобы открыть карту",
    location: "Геопозиция",
    imageAlt: "Большое изображение",
    fileAdded: "Файл добавлен",
    imagePasted: "Изображение вставлено из буфера",
    loadingError: "Ошибка загрузки данных чата:",
    historyError: "Ошибка загрузки истории чата:",
    fileTooBig: "Размер файла не должен превышать 50MB.",
    fileTypeError: "Недопустимый тип файла:",
    unknown: "неизвестно",
    micDenied: "Нет доступа к микрофону",
    micNotFound: "Устройство микрофона не найдено",
    micBusy: "Микрофон занят другим приложением",
    recordingStarted: "Запись голосового сообщения...",
    audioSent: "Голосовое сообщение отправлено",
    audioError: "Ошибка отправки голосового сообщения",
    locationSent: "Геопозиция отправлена",
    locationDenied: "Доступ к геопозиции запрещён. Разрешите его в браузере.",
    locationUnavailable: "Не удалось определить геопозицию. Включите геолокацию на устройстве.",
    locationTimeout: "Время получения геопозиции истекло. Попробуйте снова.",
    locationError: "Ошибка получения геопозиции. Проверьте разрешение.",
    messageSent: "Сообщение отправлено",
    messageSendError: "Ошибка при отправке сообщения",
    messageDeleted: "Сообщение удалено",
    messageDeleteError: "Ошибка при удалении сообщения",
  },
  en: {
    title: "Chat",
    loading: "Loading...",
    users: "Users",
    search: "Search...",
    defaultUser: "User",
    usersList: "Users list",
    online: "Online",
    offline: "Offline",
    deletingMessage: "Delete message",
    file: "File",
    dropFile: "Drop file here",
    recording: "Recording...",
    finish: "Finish",
    cancel: "Cancel",
    send: "Send",
    attachFile: "Attach file",
    stopRecording: "Stop recording",
    startRecording: "Record voice",
    sendLocation: "Send location",
    messagePlaceholder: "Type a message or paste an image (Ctrl+V)...",
    selectConversation: "Select a conversation",
    selectConversationDesc: "Pick a user from the list and start messaging",
    usersAvailable: "users available",
    openMap: "Click to open map",
    location: "Location",
    imageAlt: "Large image",
    fileAdded: "File added",
    imagePasted: "Image pasted from clipboard",
    loadingError: "Error loading chat data:",
    historyError: "Error loading chat history:",
    fileTooBig: "File size must be less than 50MB.",
    fileTypeError: "Unsupported file type:",
    unknown: "unknown",
    micDenied: "Microphone permission denied",
    micNotFound: "No microphone device found",
    micBusy: "Microphone is busy in another app",
    recordingStarted: "Recording voice message...",
    audioSent: "Voice message sent",
    audioError: "Error sending voice message",
    locationSent: "Location sent",
    locationDenied: "Location permission denied. Please enable it in your browser.",
    locationUnavailable: "Could not determine location. Turn on location on your device.",
    locationTimeout: "Location request timed out. Please try again.",
    locationError: "Error getting location. Please check permission.",
    messageSent: "Message sent",
    messageSendError: "Error sending message",
    messageDeleted: "Message deleted",
    messageDeleteError: "Error deleting message",
  },
} as const

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
  const { language } = useI18n()
  const tr = CHAT_TEXTS[language]
  const roleLabels = ROLE_LABELS[language]
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
      toast.error(`${tr.fileTooBig} ${((file.size / (1024*1024)).toFixed(1))}MB`)
      return false
    }
    
    // Fayl turi tekshiruvi
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error(`${tr.fileTypeError} ${file.type || tr.unknown}`)
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
  }, [filePreview, tr.fileTooBig, tr.fileTypeError, tr.unknown])

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
            toast.success(tr.imagePasted)
          }
        }
        return
      }
    }
  }, [setFileWithPreview, tr.imagePasted])

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
        toast.success(`${tr.fileAdded}: ${file.name}`)
      }
    }
  }, [setFileWithPreview, tr.fileAdded])

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

  const mapUserToChatUser = useCallback((user: any): ChatUser => ({
    ...user,
    id: String(user?.id ?? ""),
  }), [])

  const loadData = useCallback(async () => {
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
        const lastMsg = conv.last_message
          ? {
              id: String(conv.last_message.id),
              senderId: String(conv.last_message.sender?.id || conv.last_message.sender_id || ""),
              senderName: conv.last_message.sender_name || conv.last_message.sender?.full_name || "",
              content: conv.last_message.content || "",
              attachment: conv.last_message.attachment
                ? {
                    name: getAttachmentName(conv.last_message.attachment),
                    url: conv.last_message.attachment,
                    type: inferAttachmentType(conv.last_message.attachment),
                  }
                : undefined,
              timestamp: conv.last_message.created_at || new Date().toISOString(),
              is_read: conv.last_message.is_read ?? false,
            }
          : null
        convMap.set(otherId, {
          user,
          messages: lastMsg ? [lastMsg] : [],
          unreadCount: conv.unread_count || 0,
        })
      })
      setConversations(convMap)
    } catch (error) {
      console.error("Chat load error:", error)
    } finally {
      setLoading(false)
    }
  }, [mapUserToChatUser])

  useEffect(() => {
    loadData()
  }, [loadData])

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
      toast.info(tr.recordingStarted)
    } catch (error) {
      const errName = (error as DOMException | undefined)?.name
      console.error(tr.micDenied, error)
      if (errName === "NotFoundError") {
        toast.error(tr.micNotFound)
      } else if (errName === "NotReadableError") {
        toast.error(tr.micBusy)
      } else {
        toast.error(tr.micDenied)
      }
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
      toast.success(tr.audioSent)
    } catch (error: any) {
      console.error("Audio yuborishda xatolik:", error)
      toast.error(error?.message || tr.audioError)
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
      toast.success(tr.locationSent)
    } catch (error: any) {
      console.error("Location error:", error)
      if (error?.code === 1) {
        toast.error(tr.locationDenied)
      } else if (error?.code === 2) {
        toast.error(tr.locationUnavailable)
      } else if (error?.code === 3) {
        toast.error(tr.locationTimeout)
      } else {
        toast.error(tr.locationError)
      }
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
      toast.success(tr.messageSent)
    } catch (error: any) {
      console.error("Xabar yuborishda xatolik:", error)
      toast.error(error?.message || tr.messageSendError)
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
          newMap.set(selectedUserId, {
            ...conv,
            messages: conv.messages.filter((m) => m.id !== messageId),
          })
        }
        return newMap
      })
      
      toast.success(tr.messageDeleted)
    } catch (error: any) {
      console.error("Xabarni o'chirishda xatolik:", error)
      toast.error(error?.message || tr.messageDeleteError)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const formatDateTime = (dateStr: string) => {
    const locale = language === "uz-cyrl" ? "uz-Cyrl-UZ" : language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "uz-UZ"
    return new Date(dateStr).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatTime = (dateStr: string) => {
    const locale = language === "uz-cyrl" ? "uz-Cyrl-UZ" : language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "uz-UZ"
    return new Date(dateStr).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
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
            <span className="text-sm font-medium">📍 {tr.location}</span>
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
            {tr.openMap}
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
      text: lastMsg.attachment ? `📎 ${lastMsg.attachment.name?.split('/').pop() || tr.file}` : (parseLocation(lastMsg.content) ? `📍 ${tr.location}` : lastMsg.content.substring(0, 30)),
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

  const onlineUsersCount = useMemo(
    () => users.filter((user) => user.is_online).length,
    [users]
  )

  const totalUnreadCount = useMemo(
    () => Array.from(conversations.values()).reduce((sum, conv) => sum + (conv.unreadCount || 0), 0),
    [conversations]
  )

  const activeConversationCount = useMemo(
    () => Array.from(conversations.values()).filter((conv) => conv.messages.length > 0).length,
    [conversations]
  )

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
      console.error(tr.historyError, error)
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
        <Header title={tr.title} />
        <div className="p-6">
          <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
              <p className="mt-4 text-slate-500">{tr.loading}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={tr.title} />
      <div ref={pageRef} className="p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-200/30 to-transparent blur-3xl" />
          <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-gradient-to-bl from-emerald-200/22 to-transparent blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-gradient-to-tr from-amber-200/20 to-transparent blur-3xl" />
          <div className="absolute right-1/4 top-12 h-40 w-40 rotate-12 rounded-[32px] border border-white/50 bg-white/25 backdrop-blur-xl" />
        </div>
        
        <div className="relative z-10 p-3 sm:p-4 lg:p-6">
        <section data-gsap-section className="mb-4">
          <div className="grid gap-3 xl:grid-cols-[1.45fr_1fr]">
            <div
              data-gsap-card
              className="relative overflow-hidden rounded-[24px] border border-white/70 bg-[linear-gradient(135deg,rgba(8,145,178,0.96),rgba(15,118,110,0.90))] p-4 text-white shadow-[0_22px_60px_-30px_rgba(15,118,110,0.60)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_32%)]" />
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full border border-white/20" />
              <div className="relative flex h-full flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div className="max-w-2xl">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-cyan-50/90">
                  <Radio className="h-3.5 w-3.5" />
                  Tezkor aloqa
                </div>
                <h2 className="max-w-2xl text-xl font-semibold tracking-tight sm:text-2xl">
                  Xabarlar, fayllar va joylashuv bitta oynada boshqariladi.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-cyan-50/82">
                  Muhim suhbatlar ajralib turadi, yangi xabarlar esa darhol ko‘rinadi.
                </p>
              </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-cyan-50/90 backdrop-blur-md">
                  Yozishma, biriktirma va tezkor amallar shu joyning o‘zida boshqariladi.
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              {[
                { label: "Faol chatlar", value: activeConversationCount, icon: MessageSquare, tone: "from-cyan-500/20 to-cyan-100/60 text-cyan-900" },
                { label: "Onlayn foydalanuvchilar", value: onlineUsersCount, icon: Activity, tone: "from-emerald-500/20 to-emerald-100/60 text-emerald-900" },
                { label: "O‘qilmagan xabarlar", value: totalUnreadCount, icon: AlertCircle, tone: "from-amber-400/25 to-amber-100/70 text-amber-900" },
              ].map((item) => (
                <div
                  key={item.label}
                  data-gsap-card
                  className={cn(
                    "rounded-[20px] border border-white/70 bg-gradient-to-br p-3.5 shadow-[0_16px_45px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl",
                    item.tone
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-600">{item.label}</p>
                      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{item.value}</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 p-2.5 shadow-sm">
                      <item.icon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div data-gsap-section className="flex h-[calc(100vh-190px)] min-h-0 flex-col gap-4 lg:flex-row lg:gap-6">
          {/* Users List */}
          <Card
            data-gsap-card
            className={cn(
              "w-full min-h-0 overflow-hidden rounded-[28px] border border-white/75 bg-white/78 shadow-[0_28px_70px_-34px_rgba(14,165,233,0.30)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_80px_-32px_rgba(14,165,233,0.34)] lg:w-80 xl:w-96 flex flex-col",
              !showUserList && "hidden lg:flex"
            )}
          >
            <CardHeader className="border-b border-cyan-100/60 bg-[linear-gradient(135deg,rgba(236,254,255,0.92),rgba(240,249,255,0.88),rgba(236,253,245,0.88))] pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  {tr.users}
                </CardTitle>
                <Badge variant="secondary" className="bg-white/80 text-cyan-800 font-semibold shadow-sm">{users.length}</Badge>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={tr.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border-cyan-100/60 bg-white/90 pl-9 shadow-inner focus:border-cyan-400 focus:ring-cyan-400/20"
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
                      data-gsap-action
                      className={cn(
                        "w-full overflow-hidden px-4 py-3.5 text-left transition-all duration-200 hover:bg-gradient-to-r hover:from-cyan-50/70 hover:to-emerald-50/60 flex items-center gap-3",
                        isSelected && "border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-50 to-emerald-50/60"
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
                          {lastMsg ? lastMsg.text : (user.role ? roleLabels[user.role] || user.role : tr.defaultUser)}
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
            data-gsap-card
            className={cn(
              "flex min-h-0 flex-1 overflow-hidden rounded-[30px] border border-white/75 bg-white/80 shadow-[0_28px_75px_-34px_rgba(15,118,110,0.26)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_85px_-32px_rgba(15,118,110,0.30)]",
              showUserList && "hidden lg:flex"
            )}
          >
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <CardHeader className="flex-shrink-0 border-b border-cyan-100/60 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(236,254,255,0.92),rgba(236,253,245,0.88))] py-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden hover:bg-white/80"
                      onClick={() => setShowUserList(true)}
                      title={tr.usersList}
                      data-gsap-action
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
                            {tr.online}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">{tr.offline}</span>
                        )}
                        {selectedUser.role && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0 font-medium bg-white/80 border-indigo-100/40">
                            {roleLabels[selectedUser.role] || selectedUser.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 min-h-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(236,254,255,0.40),rgba(255,251,235,0.36))] p-4">
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
                                  data-gsap-action
                                  className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  title={tr.deletingMessage}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <div
                              className={cn(
                                "rounded-[20px] border p-2.5 shadow-sm sm:p-3",
                                isCurrentUser
                                  ? "border-cyan-800/10 bg-[linear-gradient(135deg,#0f766e,#0891b2)] text-white shadow-[0_18px_35px_-18px_rgba(8,145,178,0.70)]"
                                  : "border-white/80 bg-white/88 shadow-[0_14px_32px_-22px_rgba(15,23,42,0.24)]",
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
                                          {msg.attachment.size || tr.file}
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
                        <p className="text-sm font-medium text-primary">{tr.dropFile}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {/* Audio Recording UI */}
                    {isRecording && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm text-red-600 dark:text-red-400 font-medium">{tr.recording}</span>
                        <div className="flex-1" />
                        <Button variant="outline" size="sm" onClick={stopRecording} className="text-emerald-600 border-emerald-300">
                          {tr.finish}
                        </Button>
                        <Button variant="outline" size="sm" onClick={cancelRecording} className="text-red-600 border-red-300">
                          {tr.cancel}
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
                          {tr.send}
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
                        className="h-9 w-9 shrink-0 rounded-xl bg-cyan-50/70 text-cyan-700 hover:bg-cyan-100 sm:h-10 sm:w-10" 
                        type="button" 
                        title={tr.attachFile}
                        onClick={() => fileInputRef.current?.click()}
                        data-gsap-action
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      
                      {/* Audio record */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("hidden h-9 w-9 shrink-0 rounded-xl bg-rose-50/70 text-rose-700 hover:bg-rose-100 sm:inline-flex sm:h-10 sm:w-10", isRecording && "bg-rose-100 text-rose-600")}
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isSending}
                        title={isRecording ? tr.stopRecording : tr.startRecording}
                        data-gsap-action
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                      
                      {/* Location */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="hidden h-9 w-9 shrink-0 rounded-xl bg-amber-50/80 text-amber-700 hover:bg-amber-100 sm:inline-flex sm:h-10 sm:w-10" 
                        type="button"
                        onClick={sendLocation}
                        disabled={isLocationLoading || isSending}
                        title={tr.sendLocation}
                        data-gsap-action
                      >
                        <MapPin className={cn("h-4 w-4", isLocationLoading && "animate-pulse")} />
                      </Button>
                      
                      <Input
                        ref={inputRef}
                        placeholder={tr.messagePlaceholder}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onPaste={handlePaste}
                        disabled={isSending}
                        className="rounded-xl border-cyan-100/60 bg-white/95 focus:border-cyan-400 focus:ring-cyan-400/20"
                      />
                      <Button 
                        onClick={sendMessage} 
                        className="shrink-0 rounded-xl bg-[linear-gradient(135deg,#0f766e,#0891b2)] shadow-lg shadow-cyan-600/25 hover:brightness-110"
                        disabled={isSending || (!newMessage.trim() && !chatFile)}
                        data-gsap-action
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
              <div className="flex flex-1 flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_36%),linear-gradient(180deg,rgba(248,250,252,0.95),rgba(236,254,255,0.88),rgba(255,251,235,0.76))] p-4 text-center sm:p-8">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f766e,#0891b2)] shadow-xl shadow-cyan-700/20 sm:mb-6 sm:h-24 sm:w-24 sm:rounded-3xl">
                  <MessageSquare className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">{tr.selectConversation}</h3>
                <p className="text-sm sm:text-base text-slate-500 max-w-sm px-4">
                  {tr.selectConversationDesc}
                </p>
                <div className="mt-6 sm:mt-8 flex items-center gap-2 text-xs sm:text-sm text-slate-500">
                  <div className="flex -space-x-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-cyan-400 to-cyan-600 text-[10px] text-white sm:h-8 sm:w-8 sm:text-xs">A</div>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-emerald-400 to-emerald-600 text-[10px] text-white sm:h-8 sm:w-8 sm:text-xs">B</div>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-amber-400 to-orange-500 text-[10px] text-white sm:h-8 sm:w-8 sm:text-xs">C</div>
                  </div>
                  <span>{users.length} {tr.usersAvailable}</span>
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
                  alt={tr.imageAlt}
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
