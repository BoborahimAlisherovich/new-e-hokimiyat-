"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getUsers, type ChatMessage } from "@/lib/api"
import { Send, Paperclip, Mic, Image, File, MoreVertical, Reply, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskChatProps {
  messages?: ChatMessage[]
  currentUserId?: string
  onSendMessage?: (content: string, type: "text" | "file" | "audio", attachments?: string[]) => void
}

export function TaskChat({ messages = [], currentUserId = "1", onSendMessage }: TaskChatProps) {
  const [newMessage, setNewMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [usersMap, setUsersMap] = useState<Record<string, any>>({})

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    let mounted = true
    getUsers()
      .then((response) => {
        if (!mounted) return
        const map: Record<string, any> = {}
        const users = Array.isArray(response) ? response : (response as any).results || []
        users.forEach((u: any) => (map[u.id] = u))
        setUsersMap(map)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const sendMessage = () => {
    if (!newMessage.trim()) return
    onSendMessage?.(newMessage, "text")
    setNewMessage("")
    setReplyTo(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = new Date(message.created_at).toLocaleDateString("uz-UZ")
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
      return groups
    },
    {} as Record<string, ChatMessage[]>,
  )

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6">
          {Object.entries(groupedMessages).map(([date, dayMessages]) => (
            <div key={date} className="space-y-4">
              {/* Date separator */}
              <div className="flex items-center justify-center">
                <div className="bg-muted px-3 py-1 rounded-full">
                  <span className="text-xs text-muted-foreground">{date}</span>
                </div>
              </div>

              {/* Messages */}
              {dayMessages.map((msg) => {
                const senderId = typeof msg.sender === 'object' ? msg.sender.id : (msg as any).senderId
                const sender = usersMap[senderId]
                const isSystem = (msg as any).type === "system"
                const isCurrentUser = senderId === currentUserId

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <Badge variant="secondary" className="text-xs font-normal px-3 py-1">
                        {msg.content}
                      </Badge>
                    </div>
                  )
                }

                return (
                  <div key={msg.id} className={cn("flex gap-3 group", isCurrentUser && "flex-row-reverse")}>
                    <UserAvatar
                      firstName={sender?.first_name}
                      lastName={sender?.last_name}
                      avatarUrl={sender?.avatar_url}
                      size="sm"
                    />
                    <div className={cn("max-w-[70%] space-y-1", isCurrentUser && "items-end")}>
                      <div className={cn("flex items-center gap-2", isCurrentUser && "flex-row-reverse")}>
                        <span className="text-sm font-medium text-foreground">
                          {sender?.last_name} {sender?.first_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString("uz-UZ", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isCurrentUser ? "start" : "end"}>
                            <DropdownMenuItem onClick={() => setReplyTo(msg)}>
                              <Reply className="mr-2 h-4 w-4" />
                              Жавоб бериш
                            </DropdownMenuItem>
                            {isCurrentUser && (
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                {"Ўчириш"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2",
                          isCurrentUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm",
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.attachment && (
                          <div className="mt-2 space-y-1">
                            <div
                              className={cn(
                                "flex items-center gap-2 text-xs p-2 rounded-lg",
                                isCurrentUser ? "bg-primary-foreground/10" : "bg-background",
                              )}
                            >
                              <File className="h-4 w-4" />
                              <span className="truncate">{msg.attachment}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 border-t border-border bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Javob: {usersMap[typeof replyTo.sender === 'object' ? replyTo.sender.id : (replyTo as any).senderId]?.firstName}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-foreground truncate">{replyTo.content}</p>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <Image className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 relative">
            <Input
              placeholder="Xabar yozing..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-secondary pr-10"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0 transition-colors",
              isRecording && "bg-destructive text-destructive-foreground",
            )}
            onClick={() => setIsRecording(!isRecording)}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button onClick={sendMessage} className="shrink-0" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
