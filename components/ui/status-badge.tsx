import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { TaskStatus, UserStatus, TaskPriority } from "@/lib/constants"
import { taskStatusLabels, statusLabels, priorityLabels } from "@/lib/constants"

const taskStatusStyles: Record<TaskStatus, string> = {
  YANGI: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IJRODA: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BAJARILDI: "bg-green-500/20 text-green-400 border-green-500/30",
  MUDDATI_KECH: "bg-red-500/20 text-red-400 border-red-500/30",
  NAZORATDAN_YECHILDI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  QAYTA_IJROGA_YUBORILDI: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  BAJARILMADI: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

const userStatusStyles: Record<UserStatus, string> = {
  DRAFT: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  KUTILMOQDA: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  FAOL: "bg-green-500/20 text-green-400 border-green-500/30",
  BLOKLANGAN: "bg-red-500/20 text-red-400 border-red-500/30",
  ARXIV: "bg-gray-600/20 text-gray-500 border-gray-600/30",
}

const priorityStyles: Record<string, string> = {
  FAVQULODDA: "bg-red-500/20 text-red-400 border-red-500/30",
  YUQORI: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  ODDIY: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PAST: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

const priorityLabelsMap: Record<string, string> = {
  FAVQULODDA: "Favqulodda",
  YUQORI: "Yuqori",
  ODDIY: "Oddiy",
  PAST: "Past",
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", taskStatusStyles[status])}>
      {taskStatusLabels[status]}
    </Badge>
  )
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  if (!status || !userStatusStyles[status]) {
    return (
      <Badge variant="outline" className="font-medium bg-gray-500/20 text-gray-400 border-gray-500/30">
        Noma'lum
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={cn("font-medium", userStatusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  if (!priority || !priorityStyles[priority]) {
    return (
      <Badge variant="outline" className="font-medium bg-gray-500/20 text-gray-400 border-gray-500/30">
        {priority || "Noma'lum"}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={cn("font-medium", priorityStyles[priority])}>
      {priorityLabelsMap[priority] || priority}
    </Badge>
  )
}
