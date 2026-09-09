"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { getNotificationById, markNotificationRead } from "@/lib/api"
import { ArrowLeft, Calendar, Check, Bell } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { type Notification } from "@/types"
import { useToast } from "@/hooks/use-toast"
import { notificationColors, notificationIcons } from "@/components/dashboard/notifications/notification-constants"

export default function NotificationDetailPage() {
  const { toast } = useToast()
  const params = useParams()
  const id = params.id as string

  const [notification, setNotification] = useState<Notification | null>(null)
  const [isMarkingRead, setIsMarkingRead] = useState(false)

  useEffect(() => {
    let mounted = true
    getNotificationById(id)
      .then((data) => {
        if (!mounted) return
        setNotification(data)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [id])

  const handleMarkAsRead = async () => {
    if (!notification || notification.is_read) return
    setIsMarkingRead(true)
    try {
      const updated = await markNotificationRead(notification.id)
      setNotification(updated)
    } catch (err) {
      console.error("Bildirishnomani o'qilgan deb belgilashda xatolik:", err)
      toast({
        title: "Xatolik",
        description: "Bildirishnomani o'qilgan deb belgilab bo'lmadi",
        variant: "destructive",
      })
    } finally {
      setIsMarkingRead(false)
    }
  }

  if (!notification) {
    return (
      <>
        <Header title="Билдиришнома" description="Билдиришнома тafsilotи" />
        <div className="min-h-dvh bg-background pt-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">Билдиришнома юкланмоқда...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const Icon = notificationIcons[notification.type] || Bell

  return (
    <>
      <Header title="Билдиришнома тafsilotи" description={notification.title} />
      <div className="min-h-dvh bg-background pt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8 py-8">
            {/* Back Button */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between w-full">
                <Link href="/dashboard/notifications">
                  <Button variant="outline" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Оркага қайтиш
                  </Button>
                </Link>
              </div>
            </div>

            {/* Notification Details */}
            <Card className="bg-card/80 border border-border/50 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">Билдиришнома тafsilotи</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Header */}
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-full",
                    notificationColors[notification.type] || "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{notification.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(notification.created_at).toLocaleDateString('uz-UZ', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}</span>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <Button 
                      onClick={handleMarkAsRead} 
                      disabled={isMarkingRead}
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      {isMarkingRead ? "Белгиланмоқда..." : "Ўқилди деб белгилаш"}
                    </Button>
                  )}
                </div>

                {/* Notification Content */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-foreground">Билдиришнома матни</Label>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-foreground leading-relaxed">{notification.message}</p>
                  </div>
                </div>

                {/* Additional Info */}
                {notification.related_task_id && (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-foreground">Боғлиқ вазифа</Label>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary-soft text-primary-soft-foreground">
                        #{notification.related_task_id}
                      </Badge>
                      <Link href={`/dashboard/tasks/${notification.related_task_id}`}>
                        <Button variant="outline" size="sm">
                          Вазифага отиш
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {notification.user_id ? (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-foreground">Фойдаланувчи</Label>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {String(notification.user_id).charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground">Фойдаланувчи #{notification.user_id}</span>
                    </div>
                  </div>
                ) : null}

                {/* Status */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-foreground">Ҳолати</Label>
                  <div className="flex items-center gap-3">
                    <Badge className={cn(
                      "px-4 py-2 text-sm font-medium",
                      notification.is_read ? "bg-muted text-foreground" : "bg-primary-soft text-primary-soft-foreground"
                    )}>
                      {notification.is_read ? "Ўқилган" : "Ўқилмаган"}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString('uz-UZ', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
