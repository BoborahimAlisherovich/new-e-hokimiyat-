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
      <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl">
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 p-5 mb-4">
              <Bell className="h-10 w-10 text-blue-500" />
            </div>
            <p className="text-lg font-medium">{t.notifications.emptyTitle}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl overflow-hidden">
      <CardContent className="p-0 divide-y divide-slate-100">
        {notifications.map((notification, idx) => {
          const Icon = notificationIcons[notification.type] || Bell
          return (
            <div
              key={notification.id}
              className={cn(
                "flex items-start gap-4 p-5 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50",
                !notification.is_read && "bg-gradient-to-r from-blue-50/30 to-indigo-50/30",
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md",
                  notificationColors[notification.type] || "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "font-semibold text-slate-900",
                      notification.type === "TASK_OVERDUE" && "text-red-600",
                    )}
                  >
                    {notification.title}
                  </p>
                  {!notification.is_read && <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shrink-0 animate-pulse" />}
                </div>
                <p className="text-sm text-slate-600 mt-1 font-medium">{notification.message}</p>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  {formatNotificationDate(notification.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notification.related_task_id && (
                  <Link href={`/dashboard/tasks/${notification.related_task_id}`}>
                    <Button variant="ghost" size="sm" className="font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      {t.notifications.view}
                    </Button>
                  </Link>
                )}
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
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
