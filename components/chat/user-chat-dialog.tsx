"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Send, 
  Paperclip, 
  Search, 
  MessageSquare,
  Smile,
  Check,
  CheckCheck,
  Users,
  Pin,
  FileText,
  X,
  Maximize2,
  Trash2,
} from "lucide-react"
import { getCurrentUser, getUsers, deleteChatMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

// Role labels
const ROLE_LABELS: Record<string, string> = {
  HOKIM: "Ҳоким",
  HOKIMLIK_MASUL: "Ҳокимлик масъули",
  TASHKILOT_RAHBAR: "Ташкилот раҳбари",
  TASHKILOT_MASUL: "Ташкилот масъули",
  ADMIN: "Админ",
}

interface Message {
  id: string
  senderId: number
  senderName: string
  content: string
  attachment?: {
    name: string
    url: string
    type: "image" | "file"
    size?: string
  }
  timestamp: string
  status: "sending" | "sent" | "delivered" | "read"
}

interface ChatUser {
  id: number
  first_name: string
  last_name: string
  email?: string
  position?: string
  role?: string
  is_online?: boolean
  last_seen?: string
  avatar?: string
}

interface Conversation {
  user: ChatUser
  messages: Message[]
  isPinned?: boolean
}

interface UserChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserChatDialog({ open, onOpenChange }: UserChatDialogProps) {
  const router = useRouter()
  const [users, setUsers] = useState<ChatUser[]>([])
  const [conversations, setConversations] = useState<Map<number, Conversation>>(new Map())
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [currentUser, setCurrentUser] = useState<ChatUser | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [conversations, selectedUserId, scrollToBottom])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      setLoading(true)
      const [me, usersData] = await Promise.all([getCurrentUser(), getUsers()])
      setCurrentUser(me)
      
      const processedUsers = (usersData || [])
        .filter((u: any) => u.id !== me?.id)
        .map((user: any, index: number) => ({
          ...user,
          is_online: index % 3 === 0,
          last_seen: index % 3 !== 0 ? new Date(Date.now() - (index + 1) * 3600000).toISOString() : undefined,
        }))
      
      setUsers(processedUsers)
      
      // Demo conversations
      const demoConversations = new Map<number, Conversation>()
      if (processedUsers.length > 0) {
        const firstUser = processedUsers[0]
        demoConversations.set(firstUser.id, {
          user: firstUser,
          messages: [
            {
              id: "demo-1",
              senderId: firstUser.id,
              senderName: `${firstUser.first_name} ${firstUser.last_name}`,
              content: "Ассалому алайкум!",
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              status: "read",
            },
          ],
          isPinned: true,
        })
      }
      setConversations(demoConversations)
    } catch (error) {
      console.error("Chat ma'lumotlarini yuklashda xatolik:", error)
    } finally {
      setLoading(false)
    }
  }

  const selectedConversation = selectedUserId ? conversations.get(selectedUserId) : null
  const selectedUser = selectedConversation?.user || users.find(u => u.id === selectedUserId)

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachedFile) || !selectedUserId || !currentUser) return

    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      senderId: currentUser.id,
      senderName: `${currentUser.first_name} ${currentUser.last_name}`,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      status: "sending",
    }

    if (attachedFile) {
      message.attachment = {
        name: attachedFile.name,
        url: URL.createObjectURL(attachedFile),
        type: attachedFile.type.startsWith("image/") ? "image" : "file",
        size: formatFileSize(attachedFile.size),
      }
    }

    setConversations(prev => {
      const newMap = new Map(prev)
      const conv = newMap.get(selectedUserId)
      if (conv) {
        conv.messages = [...conv.messages, message]
      } else {
        const user = users.find(u => u.id === selectedUserId)!
        newMap.set(selectedUserId, {
          user,
          messages: [message],
        })
      }
      return newMap
    })

    setNewMessage("")
    setAttachedFile(null)
    inputRef.current?.focus()

    // Simulate status updates
    setTimeout(() => updateMessageStatus(selectedUserId, message.id, "sent"), 500)
    setTimeout(() => updateMessageStatus(selectedUserId, message.id, "delivered"), 1500)
    setTimeout(() => updateMessageStatus(selectedUserId, message.id, "read"), 3000)
  }

  const updateMessageStatus = (userId: number, msgId: string, status: Message["status"]) => {
    setConversations(prev => {
      const newMap = new Map(prev)
      const conv = newMap.get(userId)
      if (conv) {
        conv.messages = conv.messages.map(m => 
          m.id === msgId ? { ...m, status } : m
        )
      }
      return newMap
    })
  }

  // Xabarni o'chirish
  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedUserId) return
    
    try {
      // Demo xabarlar uchun faqat local o'chirish
      if (!messageId.startsWith("demo-") && !messageId.startsWith("msg-")) {
        await deleteChatMessage(messageId)
      }
      
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
      toast.error("Xabarni o'chirishda xatolik yuz berdi")
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
  }

  const getLastMessage = (userId: number): { text: string; time: string } | null => {
    const conv = conversations.get(userId)
    if (!conv || conv.messages.length === 0) return null
    const lastMsg = conv.messages[conv.messages.length - 1]
    return {
      text: lastMsg.attachment ? "📎 Файл" : lastMsg.content.substring(0, 30),
      time: formatTime(lastMsg.timestamp),
    }
  }

  const filteredUsers = users.filter(user =>
    user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const convA = conversations.get(a.id)
    const convB = conversations.get(b.id)
    if (convA?.isPinned && !convB?.isPinned) return -1
    if (!convA?.isPinned && convB?.isPinned) return 1
    if (convA && !convB) return -1
    if (!convA && convB) return 1
    return 0
  })

  const handleSelectUser = (userId: number) => {
    setSelectedUserId(userId)
    if (!conversations.has(userId)) {
      const user = users.find(u => u.id === userId)!
      setConversations(prev => {
        const newMap = new Map(prev)
        newMap.set(userId, { user, messages: [] })
        return newMap
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setAttachedFile(file)
  }

  const getMessageStatus = (status: Message["status"]) => {
    switch (status) {
      case "sending":
        return <div className="w-3 h-3 rounded-full border-2 border-white/50 border-t-transparent animate-spin" />
      case "sent":
        return <Check className="w-3.5 h-3.5 text-white/70" />
      case "delivered":
        return <CheckCheck className="w-3.5 h-3.5 text-white/70" />
      case "read":
        return <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
    }
  }

  const openFullChat = () => {
    onOpenChange(false)
    router.push("/dashboard/chat")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] p-0 gap-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Хабарлар</DialogTitle>
        </VisuallyHidden>
        <div className="flex h-full">
          {/* Users List */}
          <div className="w-72 border-r flex flex-col bg-gray-50 dark:bg-gray-800/50">
            {/* Header */}
            <div className="p-3 border-b bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Хабарлар</h2>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {users.length}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openFullChat}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Қидирув..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-sm bg-gray-100 dark:bg-gray-700 border-0"
                />
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : sortedUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <MessageSquare className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-muted-foreground">Топилмади</p>
                </div>
              ) : (
                <div className="divide-y">
                  {sortedUsers.map((user) => {
                    const lastMsg = getLastMessage(user.id)
                    const conv = conversations.get(user.id)
                    const isSelected = selectedUserId === user.id
                    
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left",
                          isSelected && "bg-primary/5 dark:bg-primary/10 border-l-3 border-l-primary"
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                              {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {user.is_online && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-medium text-sm truncate">
                              {user.first_name} {user.last_name}
                            </span>
                            {lastMsg && (
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {lastMsg.time}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground truncate">
                              {lastMsg?.text || ROLE_LABELS[user.role || ""] || user.email}
                            </span>
                            {conv?.isPinned && <Pin className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-blue-50/50 via-white to-purple-50/30">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b bg-white/80 backdrop-blur-sm flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                        {selectedUser.first_name?.charAt(0)}{selectedUser.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {selectedUser.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.is_online ? (
                        <span className="text-green-600">онлайн</span>
                      ) : (
                        ROLE_LABELS[selectedUser.role || ""]
                      )}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedConversation?.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                        <MessageSquare className="w-8 h-8 text-primary/60" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Сухбатни бошланг
                      </p>
                    </div>
                  ) : (
                    selectedConversation?.messages.map((message) => {
                      const isOwn = message.senderId === currentUser?.id
                      
                      return (
                        <div
                          key={message.id}
                          className={cn("flex group", isOwn ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-3 py-2 shadow-sm relative",
                              isOwn
                                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md"
                                : "bg-white rounded-bl-md"
                            )}
                          >
                            {/* Delete button for own messages */}
                            {isOwn && (
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md"
                                title="Xabarni o'chirish"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                            
                            {message.attachment && (
                              <div className="mb-1.5">
                                {message.attachment.type === "image" ? (
                                  <img
                                    src={message.attachment.url}
                                    alt={message.attachment.name}
                                    className="max-w-full rounded-lg"
                                  />
                                ) : (
                                  <div className={cn(
                                    "flex items-center gap-2 p-2 rounded-lg",
                                    isOwn ? "bg-white/10" : "bg-gray-100"
                                  )}>
                                    <FileText className="w-6 h-6" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{message.attachment.name}</p>
                                      <p className="text-[10px] opacity-70">{message.attachment.size}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {message.content && (
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            )}
                            
                            <div className={cn(
                              "flex items-center gap-1 mt-1",
                              isOwn ? "justify-end" : "justify-start"
                            )}>
                              <span className={cn(
                                "text-[10px]",
                                isOwn ? "text-white/70" : "text-muted-foreground"
                              )}>
                                {formatTime(message.timestamp)}
                              </span>
                              {isOwn && getMessageStatus(message.status)}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attached File Preview */}
                {attachedFile && (
                  <div className="mx-3 mb-2 p-2 bg-gray-100 rounded-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm flex-1 truncate">{attachedFile.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachedFile(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Message Input */}
                <div className="p-3 border-t bg-white/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-9 w-9 flex-shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        placeholder="Хабар ёзинг..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="pr-9 rounded-full bg-gray-100 border-0 h-9 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
                      >
                        <Smile className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    
                    <Button
                      size="icon"
                      className="rounded-full h-9 w-9 flex-shrink-0"
                      onClick={sendMessage}
                      disabled={!newMessage.trim() && !attachedFile}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-primary/60" />
                </div>
                <h3 className="font-semibold mb-1">Хабарлар</h3>
                <p className="text-sm text-muted-foreground">
                  Фойдаланувчини танланг
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
