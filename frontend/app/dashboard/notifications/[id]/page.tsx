"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getNotificationById, getUsers } from "@/lib/api"
import { ArrowLeft, Send, Calendar, User, Bell, Check, X } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"

export default function NotificationDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [notification, setNotification] = useState<any | null>(null)
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
    setIsMarkingRead(true)
    // Mock API call
    setTimeout(() => {
      setNotification({
        ...notification,
        read: true
      })
      setIsMarkingRead(false)
    }, 500)
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "task_new": return <Calendar className="h-4 w-4" />
      case "task_deadline": return <Bell className="h-4 w-4" />
      case "task_completed": return <Check className="h-4 w-4" />
      case "user_added": return <User className="h-4 w-4" />
      case "system": return <Bell className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "task_new": return "bg-blue-100 text-blue-800"
      case "task_deadline": return "bg-orange-100 text-orange-800"
      case "task_completed": return "bg-green-100 text-green-800"
      case "user_added": return "bg-purple-100 text-purple-800"
      case "system": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case "task_new": return "Янги вазифа"
      case "task_deadline": return "Муддат яқинлаш"
      case "task_completed": return "Вазифа якунланди"
      case "user_added": return "Янги фойдаланувчи"
      case "system": return "Тизим хабари"
      default: return "Билдиришнома"
    }
  }

  if (!notification) {
    return (
      <>
        <Header title="Билдиришнома" description="Билдиришнома тafsilotи" />
        <div className="min-h-screen bg-background pt-24">
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

  return (
    <>
      <Header title="Билдиришнома тafsilotи" description={notification.title} />
      <div className="min-h-screen bg-background pt-24">
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
            <Card className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">Билдиришнома тafsilotи</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Header */}
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-full",
                    getTypeColor(notification.type)
                  )}>
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{notification.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                  </div>
                  {!notification.read && (
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
                    <p className="text-foreground leading-relaxed">{notification.description}</p>
                  </div>
                </div>

                {/* Additional Info */}
                {notification.taskId && (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-foreground">Боғлиқ вазифа</Label>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/10 text-primary">
                        #{notification.taskId}
                      </Badge>
                      <Link href={`/dashboard/tasks/${notification.taskId}`}>
                        <Button variant="outline" size="sm">
                          Вазифага отиш
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {notification.userId && (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-foreground">Фойдаланувчи</Label>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {notification.userId?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground">Фойдаланувчи #{notification.userId}</span>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-foreground">Ҳолати</Label>
                  <div className="flex items-center gap-3">
                    <Badge className={cn(
                      "px-4 py-2 text-sm font-medium",
                      notification.read ? "bg-gray-100 text-gray-800" : "bg-blue-100 text-blue-800"
                    )}>
                      {notification.read ? "Ўқилган" : "Ўқилмаган"}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(notification.createdAt)}
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
