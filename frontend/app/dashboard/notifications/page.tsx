"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { type Notification, type NotificationType } from "@/types"
import { getNotifications } from "@/lib/api"
import { Bell, CheckCircle2, ClipboardList, AlertTriangle, UserPlus, Settings, Check, Trash2 } from "lucide-react"
import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

const notificationIcons: Record<NotificationType, typeof Bell> = {
  TASK_ASSIGNED: ClipboardList,
  TASK_UPDATED: AlertTriangle,
  TASK_COMPLETED: CheckCircle2,
  TASK_OVERDUE: AlertTriangle,
  MESSAGE: UserPlus,
  SYSTEM: Settings,
}

const notificationColors: Record<NotificationType, string> = {
  TASK_ASSIGNED: "bg-primary/10 text-primary",
  TASK_UPDATED: "bg-warning/10 text-warning",
  TASK_COMPLETED: "bg-accent/10 text-accent",
  TASK_OVERDUE: "bg-destructive/10 text-destructive",
  MESSAGE: "bg-blue-500/10 text-blue-500",
  SYSTEM: "bg-muted text-muted-foreground",
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<"all" | "unread">("all")

  React.useEffect(() => {
    let mounted = true
    getNotifications()
      .then((list) => mounted && setNotifications(list))
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const filteredNotifications = filter === "all" ? notifications : notifications.filter((n) => !n.is_read)

  const markAsRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} daqiqa oldin`
    if (diffHours < 24) return `${diffHours} soat oldin`
    if (diffDays < 7) return `${diffDays} kun oldin`
    return date.toLocaleDateString("uz-UZ")
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <>
      <Header title="Bildirishnomalar" description="Barcha xabarlar va ogohlantirishlar" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-200/15 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-purple-200/10 to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/3 left-1/2 w-48 h-48 bg-gradient-to-br from-cyan-200/8 to-transparent rounded-full blur-lg" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        </div>
        
        <div className="relative z-10 p-6 space-y-6">
          {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
            <TabsList>
              <TabsTrigger value="all">
                Barchasi
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="unread">
                O'qilmagan
                {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Barchasini o'qilgan deb belgilash
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <Card className="bg-card border-border">
          <CardContent className="p-0 divide-y divide-border">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mb-4 opacity-20" />
                <p>Bildirishnomalar yo'q</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Bell
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-4 p-4 transition-colors hover:bg-muted/50",
                      !notification.is_read && "bg-primary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        notificationColors[notification.type] || "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "font-medium text-foreground",
                            notification.type === "TASK_OVERDUE" && "text-destructive",
                          )}
                        >
                          {notification.title}
                        </p>
                        {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(notification.created_at)}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {notification.related_task_id && (
                        <Link href={`/dashboard/tasks/${notification.related_task_id}`}>
                          <Button variant="ghost" size="sm">
                            Ko'rish
                          </Button>
                        </Link>
                      )}
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  )
}
