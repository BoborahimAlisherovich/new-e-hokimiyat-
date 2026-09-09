import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Bell, Check, Trash2 } from "lucide-react"
import Link from "next/link"
import { type Notification } from "@/types"
import { notificationColors, notificationIcons } from "./notification-constants"
import { formatNotificationDate } from "./notification-helpers"
import { useTranslation } from "@/lib/i18n/context"

interface NotificationListProps {
  notifications: Notification[]
  onMarkAsRead: (id: number | string) => void
  onDelete: (id: number | string) => void
}

export function NotificationList({ notifications, onMarkAsRead, onDelete }: NotificationListProps) {
  const t = useTranslation()
  if (notifications.length === 0) {
    return (
      <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl">
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="bg-primary-soft rounded-full p-5 mb-4">
              <Bell className="h-10 w-10 text-primary" />
            </div>
            <p className="text-lg font-medium">{t.notifications.emptyTitle}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl overflow-hidden">
      <CardContent className="p-0 divide-y divide-border">
        {notifications.map((notification, idx) => {
          const Icon = notificationIcons[notification.type] || Bell
          return (
            <div
              key={notification.id}
              className={cn(
                "hover:bg-primary-soft flex items-start gap-4 p-5 transition-all duration-200",
                !notification.is_read && "bg-primary-soft",
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md",
                  notificationColors[notification.type] || "bg-background text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "font-semibold text-foreground",
                      notification.type === "TASK_OVERDUE" && "text-destructive",
                    )}
                  >
                    {notification.title}
                  </p>
                  {!notification.is_read && <span className="bg-primary h-2.5 w-2.5 rounded-full shrink-0 animate-pulse" />}
                </div>
                <p className="text-sm text-muted-foreground mt-1 font-medium">{notification.message}</p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  {formatNotificationDate(notification.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notification.related_task_id && (
                  <Link href={`/dashboard/tasks/${notification.related_task_id}`}>
                    <Button variant="ghost" size="sm" className="font-medium text-primary-soft-foreground hover:text-primary-soft-foreground hover:bg-primary-soft">
                      {t.notifications.view}
                    </Button>
                  </Link>
                )}
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-success-soft-foreground hover:bg-success-soft hover:text-success-soft-foreground"
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive-soft-foreground hover:bg-destructive-soft"
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
