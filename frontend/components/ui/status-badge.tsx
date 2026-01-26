import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { TaskStatus, UserStatus, TaskPriority } from "@/lib/mock-data"
import { taskStatusLabels, statusLabels, priorityLabels } from "@/lib/mock-data"

const taskStatusStyles: Record<TaskStatus, string> = {
  YANGI: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IJRODA: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  BAJARILDI: "bg-green-500/20 text-green-400 border-green-500/30",
  QAYTA_IJROGA_YUBORILDI: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MUDDATI_KECH: "bg-red-500/20 text-red-400 border-red-500/30",
  BAJARILMADI: "bg-red-600/20 text-red-500 border-red-600/30",
  NAZORATDAN_YECHILDI: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
}

const userStatusStyles: Record<UserStatus, string> = {
  DRAFT: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  KUTILMOQDA: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  FAOL: "bg-green-500/20 text-green-400 border-green-500/30",
  BLOKLANGAN: "bg-red-500/20 text-red-400 border-red-500/30",
  ARXIV: "bg-gray-600/20 text-gray-500 border-gray-600/30",
}

const priorityStyles: Record<TaskPriority, string> = {
  MUHIM_SHOSHILINCH: "bg-red-500/20 text-red-400 border-red-500/30",
  MUHIM: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  SHOSHILINCH_EMAS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ODDIY: "bg-blue-500/20 text-blue-400 border-blue-500/30",
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", taskStatusStyles[status])}>
      {taskStatusLabels[status]}
    </Badge>
  )
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", userStatusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={cn("font-medium", priorityStyles[priority])}>
      {priorityLabels[priority]}
    </Badge>
  )
}
