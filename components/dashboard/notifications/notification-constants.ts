import { Bell, CheckCircle2, ClipboardList, AlertTriangle, UserPlus, Settings } from "lucide-react"
import { type NotificationType } from "@/types"

export const notificationIcons: Record<NotificationType, typeof Bell> = {
  TASK_ASSIGNED: ClipboardList,
  TASK_UPDATED: AlertTriangle,
  TASK_COMPLETED: CheckCircle2,
  TASK_OVERDUE: AlertTriangle,
  MESSAGE: UserPlus,
  SYSTEM: Settings,
}

export const notificationColors: Record<NotificationType, string> = {
  TASK_ASSIGNED: "bg-primary-soft text-primary-soft-foreground",
  TASK_UPDATED: "bg-warning-soft text-warning-soft-foreground",
  TASK_COMPLETED: "bg-success-soft text-success-soft-foreground",
  TASK_OVERDUE: "bg-destructive-soft text-destructive-soft-foreground",
  MESSAGE: "bg-info-soft text-info-soft-foreground",
  SYSTEM: "bg-muted text-muted-foreground",
}
