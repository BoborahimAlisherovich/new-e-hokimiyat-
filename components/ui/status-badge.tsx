"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { TaskStatus, UserStatus, TaskPriority } from "@/lib/constants"
import { useTranslation } from "@/lib/i18n/context"

const taskStatusStyles: Record<TaskStatus, string> = {
  YANGI: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IJRODA: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BAJARILDI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MUDDATI_KECH: "bg-red-500/20 text-red-400 border-red-500/30",
  NAZORATDAN_YECHILDI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  QAYTA_IJROGA_YUBORILDI: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  BAJARILMADI: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

const userStatusStyles: Record<UserStatus, string> = {
  DRAFT: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  KUTILMOQDA: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  FAOL: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  BLOKLANGAN: "bg-red-500/20 text-red-400 border-red-500/30",
  ARXIV: "bg-gray-600/20 text-gray-500 border-gray-600/30",
}

const priorityStyles: Record<string, string> = {
  FAVQULODDA: "bg-red-500/20 text-red-400 border-red-500/30",
  YUQORI: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  ODDIY: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PAST: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const t = useTranslation()
  const statusLabelsMap: Record<TaskStatus, string> = {
    YANGI: t.task.statuses.NEW,
    IJRODA: t.task.statuses.IN_PROGRESS,
    BAJARILDI: t.task.statuses.COMPLETED,
    MUDDATI_KECH: t.task.statuses.OVERDUE,
    QAYTA_IJROGA_YUBORILDI: t.task.statuses.REASSIGNED,
    BAJARILMADI: t.task.statuses.FAILED,
    NAZORATDAN_YECHILDI: t.task.statuses.RESOLVED,
  }
  return (
    <Badge variant="outline" className={cn("font-medium", taskStatusStyles[status])}>
      {statusLabelsMap[status]}
    </Badge>
  )
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const t = useTranslation()
  const statusLabelsMap: Record<UserStatus, string> = {
    DRAFT: t.user.statuses.DRAFT,
    KUTILMOQDA: t.user.statuses.PENDING,
    FAOL: t.user.statuses.ACTIVE,
    BLOKLANGAN: t.user.statuses.BLOCKED,
    ARXIV: t.user.statuses.ARCHIVED,
  }
  if (!status || !userStatusStyles[status]) {
    return (
      <Badge variant="outline" className="font-medium bg-gray-500/20 text-gray-400 border-gray-500/30">
        {t.common.unknown}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={cn("font-medium", userStatusStyles[status])}>
      {statusLabelsMap[status]}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  const t = useTranslation()
  const priorityLabelsMap: Record<string, string> = {
    FAVQULODDA: t.task.priorities.FAVQULODDA,
    YUQORI: t.task.priorities.YUQORI,
    ODDIY: t.task.priorities.ODDIY,
    PAST: t.task.priorities.PAST,
  }
  if (!priority || !priorityStyles[priority]) {
    return (
      <Badge variant="outline" className="font-medium bg-gray-500/20 text-gray-400 border-gray-500/30">
        {priority || t.common.unknown}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={cn("font-medium", priorityStyles[priority])}>
      {priorityLabelsMap[priority] || priority}
    </Badge>
  )
}
