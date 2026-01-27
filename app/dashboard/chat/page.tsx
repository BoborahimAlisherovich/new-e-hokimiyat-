"use client"

import { Header } from "@/components/layout/header"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
} from "lucide-react"
import { getChatConversations, getChatMessages, getCurrentUser, getUsers, sendChatMessage } from "@/lib/api"
import { cn } from "@/lib/utils"

// Role labels
const ROLE_LABELS: Record<string, string> = {
  HOKIM: "Ҳоким",
  HOKIMLIK_MASUL: "Ҳокимлик масъули",
  TASHKILOT_RAHBAR: "Ташкилот раҳбари",
  TASHKILOT_RAHBARI: "Ташкилот раҳбари",
  TASHKILOT_MASUL: "Ташкилот масъули",
  ADMIN: "Админ",
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
}

interface Conversation {
  user: ChatUser
  messages: Message[]
  unreadCount?: number
}

export default function ChatPage() {
  const [users, setUsers] = useState<ChatUser[]>([])
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map())
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [chatFile, setChatFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isLocationLoading, setIsLocationLoading] = useState(false)
  const [showUserList, setShowUserList] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    loadData()
  }, [])

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
      const [me, usersData, convs] = await Promise.all([
        getCurrentUser(),
        getUsers(),
        getChatConversations(),
      ])
      setCurrentUser(mapUserToChatUser(me))
      
      const processedUsers = (usersData || [])
        .filter((u: any) => u.id !== me?.id)
        .map((user: any, index: number) => ({
          ...mapUserToChatUser(user),
          is_online: index % 3 === 0,
        }))
      
      setUsers(processedUsers)

      const convMap = new Map<string, Conversation>()
      ;(convs || []).forEach((conv: any) => {
        const other = conv.other_participant
        if (!other?.id) return
        const otherId = String(other.id)
        const user = processedUsers.find((u: ChatUser) => u.id === otherId) || {
          ...mapUserToChatUser(other),
          is_online: false,
        }
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
    } catch (error) {
      console.error('Mikrofondan foydalanish uchun ruxsat berilmagan:', error)
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
    if (!audioBlob || !selectedUserId || !currentUser) return

    const file = new File([audioBlob], `audio_${Date.now()}.webm`, {
      type: audioBlob.type || "audio/webm",
    })

    const saved = await sendChatMessage(selectedUserId, {
      content: "🎤 Овозли хабар",
      attachment: file,
    })

    addMessageToConversation(mapApiMessage(saved), selectedUserId)
    setAudioBlob(null)
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
      const locationMessage = `📍 Жойлашув: https://maps.google.com/maps?q=${latitude},${longitude}`

      const saved = await sendChatMessage(selectedUserId, {
        content: locationMessage,
      })

      addMessageToConversation(mapApiMessage(saved), selectedUserId)
    } catch (error) {
      console.error('Location error:', error)
      alert('Жойлашувни олишда хатолик. Илтимос, жойлашув рухсатини текширинг.')
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
    
    if ((!hasContent && !hasFile) || !selectedUserId || !currentUser) return

    const saved = await sendChatMessage(selectedUserId, {
      content: hasContent ? newMessage.trim() : "",
      attachment: hasFile ? chatFile : null,
    })

    addMessageToConversation(mapApiMessage(saved), selectedUserId)
    setNewMessage("")
    setChatFile(null)
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

  const getLastMessage = (userId: string): { text: string; time: string } | null => {
    const conv = conversations.get(userId)
    if (!conv || conv.messages.length === 0) return null
    const lastMsg = conv.messages[conv.messages.length - 1]
    return {
      text: lastMsg.attachment ? "📎 Файл" : lastMsg.content.substring(0, 30),
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
        <Header title="Чат" />
        <div className="flex items-center justify-center h-[calc(100vh-120px)]">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Чат" />
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="flex h-[calc(100vh-160px)] min-h-0 flex-col gap-4 lg:flex-row lg:gap-6">
          {/* Users List */}
          <Card
            className={cn(
              "bg-card border-border w-full lg:w-80 xl:w-96 flex flex-col min-h-0 overflow-hidden",
              !showUserList && "hidden lg:flex"
            )}
          >
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Фойдаланувчилар
                </CardTitle>
                <Badge variant="secondary">{users.length}</Badge>
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Қидирув..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary/70 focus-visible:bg-white"
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
                        "w-full flex items-center gap-3 p-3 hover:bg-muted/60 transition-colors text-left overflow-hidden",
                        isSelected && "bg-primary/10 border-l-2 border-l-primary"
                      )}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {user.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                        )}
                        {/* Unread message badge */}
                        {unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <p className={cn("font-medium text-sm truncate", unreadCount > 0 && "font-bold")}>
                            {user.first_name} {user.last_name}
                          </p>
                          {lastMsg && (
                            <span className="text-xs text-muted-foreground shrink-0">{lastMsg.time}</span>
                          )}
                        </div>
                        <p className={cn("text-xs text-muted-foreground truncate", unreadCount > 0 && "font-semibold text-foreground")}>
                          {lastMsg ? lastMsg.text : (user.role ? ROLE_LABELS[user.role] || user.role : "Фойдаланувчи")}
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
              "bg-card border-border flex flex-col flex-1 min-h-0 overflow-hidden",
              showUserList && "hidden lg:flex"
            )}
          >
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <CardHeader className="py-3 border-b border-border flex-shrink-0 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => setShowUserList(true)}
                      title="Фойдаланувчилар рўйхати"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedUser.first_name?.charAt(0)}{selectedUser.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{selectedUser.first_name} {selectedUser.last_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedUser.is_online ? "Онлайн" : "Оффлайн"}
                        {selectedUser.role && ` • ${ROLE_LABELS[selectedUser.role] || selectedUser.role}`}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 min-h-0 p-4 bg-gradient-to-b from-transparent to-muted/30">
                  <div className="space-y-4">
                    {selectedConversation?.messages.map((msg) => {
                      const isCurrentUser = currentUser && msg.senderId === currentUser.id

                      return (
                        <div key={msg.id} className={cn("flex gap-3", isCurrentUser && "flex-row-reverse")}>
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {msg.senderName?.split(" ").map(n => n[0]).join("").substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn("max-w-[78%] space-y-1", isCurrentUser && "items-end")}>
                            <div className={cn("flex items-center gap-2", isCurrentUser && "flex-row-reverse")}>
                              <span className="text-sm font-medium text-foreground">{msg.senderName}</span>
                              <span className="text-xs text-muted-foreground">{formatDateTime(msg.timestamp)}</span>
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
                            </div>
                            <div
                              className={cn(
                                "rounded-xl p-3 shadow-sm border",
                                isCurrentUser ? "bg-primary text-primary-foreground border-primary/20" : "bg-white/80 border-border/60",
                              )}
                            >
                              {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                              {msg.attachment && (
                                <div className="mt-2 space-y-2">
                                  {msg.attachment.type === 'IMAGE' && (
                                    <img
                                      src={msg.attachment.url}
                                      alt={msg.attachment.name}
                                      className="max-h-48 rounded-md border"
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
                                        "flex items-center gap-2 text-xs underline",
                                        isCurrentUser ? "text-primary-foreground/80" : "text-muted-foreground",
                                      )}
                                    >
                                      <FileText className="h-3 w-3" />
                                      {msg.attachment.name} {msg.attachment.size && `(${msg.attachment.size})`}
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
                <div className="border-t border-border p-4 flex-shrink-0 bg-muted/20">
                  <div className="flex flex-col gap-2">
                    {/* Audio Recording UI */}
                    {isRecording && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded-xl border border-red-200 dark:border-red-800">
                        <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm text-red-600 dark:text-red-400 font-medium">Ёзиб олинмоқда...</span>
                        <div className="flex-1" />
                        <Button variant="outline" size="sm" onClick={stopRecording} className="text-green-600 border-green-300">
                          Тугатиш
                        </Button>
                        <Button variant="outline" size="sm" onClick={cancelRecording} className="text-red-600 border-red-300">
                          Бекор қилиш
                        </Button>
                      </div>
                    )}
                    
                    {/* Audio Preview */}
                    {audioBlob && !isRecording && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-200 dark:border-blue-800">
                        <Mic className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 flex-1" />
                        <Button size="sm" onClick={sendAudio} className="bg-blue-600 hover:bg-blue-700">
                          <Send className="h-3 w-3 mr-1" /> Юбориш
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setAudioBlob(null)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {/* File Preview */}
                    {chatFile && (
                      <div className="flex items-center gap-2 p-2 bg-muted/60 rounded-xl border border-border/60">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">{chatFile.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setChatFile(null)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex gap-2 items-end">
                      {/* File attach */}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          onChange={(e) => setChatFile(e.target.files?.[0] || null)}
                        />
                        <Button variant="ghost" size="icon" className="shrink-0" type="button" title="Файл бириктириш">
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </label>
                      
                      {/* Audio record */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("shrink-0", isRecording && "text-red-500")}
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        title={isRecording ? "Ёзишни тўхтатиш" : "Овозли хабар ёзиш"}
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
                        title="Жойлашувни юбориш"
                      >
                        <MapPin className={cn("h-4 w-4", isLocationLoading && "animate-pulse")} />
                      </Button>
                      
                      <Input
                        placeholder="Хабар ёзинг..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="bg-white/70"
                      />
                      <Button onClick={sendMessage} className="shrink-0">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/30">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Суҳбатни танланг</h3>
                <p className="text-muted-foreground max-w-sm">
                  Чап томондаги рўйхатдан фойдаланувчини танланг ва хабар ёзишни бошланг
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
