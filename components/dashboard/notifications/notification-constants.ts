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
  TASK_ASSIGNED: "bg-primary/10 text-primary",
  TASK_UPDATED: "bg-warning/10 text-warning",
  TASK_COMPLETED: "bg-accent/10 text-accent",
  TASK_OVERDUE: "bg-destructive/10 text-destructive",
  MESSAGE: "bg-primary text-primary",
  SYSTEM: "bg-muted text-muted-foreground",
}
