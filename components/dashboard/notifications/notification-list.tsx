import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Bell, Check, Trash2 } from "lucide-react"
import Link from "next/link"
import { type Notification } from "@/types"
import { notificationColors, notificationIcons } from "./notification-constants"
import { formatNotificationDate } from "./notification-helpers"

interface NotificationListProps {
  notifications: Notification[]
  onMarkAsRead: (id: number) => void
  onDelete: (id: number) => void
}

export function NotificationList({ notifications, onMarkAsRead, onDelete }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-0 divide-y divide-border">
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mb-4 opacity-20" />
            <p>Bildirishnomalar yo'q</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0 divide-y divide-border">
        {notifications.map((notification) => {
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
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNotificationDate(notification.created_at)}
                </p>
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
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(notification.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
