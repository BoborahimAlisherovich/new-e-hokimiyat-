"use client"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { Task } from "@/types"
import { PRIORITY_COLORS, STATUS_COLORS } from "@/components/dashboard/tasks/task-constants"
import { FileX, AlertTriangle } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

type TaskTableProps = {
  tasks: Task[]
  onView?: (task: Task) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: number) => void
}

export function TaskTable({ tasks, onView, onEdit, onDelete }: TaskTableProps) {
  const router = useRouter()
  const t = useTranslation()

  const statusLabels: Record<string, string> = {
    YANGI: t.task.statuses.NEW,
    IJRODA: t.task.statuses.IN_PROGRESS,
    BAJARILDI: t.task.statuses.COMPLETED,
    QAYTA_IJROGA_YUBORILDI: t.task.statuses.REASSIGNED,
    MUDDATI_KECH: t.task.statuses.OVERDUE,
    BAJARILMADI: t.task.statuses.FAILED,
    NAZORATDAN_YECHILDI: t.task.statuses.RESOLVED,
  }

  const priorityLabels: Record<string, string> = {
    PAST: t.task.priorities.PAST,
    ODDIY: t.task.priorities.ODDIY,
    YUQORI: t.task.priorities.YUQORI,
    FAVQULODDA: t.task.priorities.FAVQULODDA,
    MUHIM: t.task.priorities.MUHIM,
    SHOSHILINCH: t.task.priorities.SHOSHILINCH,
    MUHIM_SHOSHILINCH: t.task.priorities.MUHIM_SHOSHILINCH,
  }

  const categoryLabels: Record<string, string> = {
    IJTIMOIY: t.task.categories.IJTIMOIY,
    IQTISODIY: t.task.categories.IQTISODIY,
    HUQUQIY: t.task.categories.HUQUQIY,
    INFRASTRUKTURA: t.task.categories.INFRASTRUKTURA,
    TA_LIM: t.task.categories.TA_LIM,
    SOG_LIQNI_SAQLASH: t.task.categories.SOG_LIQNI_SAQLASH,
    BOSHQA: t.task.categories.BOSHQA,
  }
  
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-slate-100 p-5 mb-4">
          <FileX className="h-10 w-10 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">{t.tasks.emptyTitle}</h3>
        <p className="text-sm text-slate-500 max-w-sm">{t.tasks.emptyDescription}</p>
      </div>
    )
  }
  
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 hover:bg-slate-100 border-b-2 border-slate-200">
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">{t.tasks.titleLabel}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">{t.tasks.categoryLabel}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">{t.tasks.organizationsLabel}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">{t.tasks.deadlineLabel}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">{t.tasks.statusLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task, index) => {
            const isOverdue = task.deadline && new Date(task.deadline) < new Date() && 
              !["BAJARILDI", "NAZORATDAN_YECHILDI"].includes(task.status)
            
            return (
              <TableRow 
                key={task.id} 
                className={cn(
                  "cursor-pointer transition-all duration-200 border-b border-slate-100 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/50",
                  isOverdue && "bg-red-50/50 hover:bg-red-50"
                )}
                onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
              >
                <TableCell className="py-4 px-6">
                  <div className="max-w-[280px] truncate text-sm font-semibold text-slate-900" title={task.title}>
                    {task.title || '—'}
                  </div>
                </TableCell>
                <TableCell className="py-4 px-6">
                  <span className="text-sm text-slate-700 font-medium">
                    {categoryLabels[task.category] || task.category || '—'}
                  </span>
                </TableCell>
                <TableCell className="py-4 px-6">
                  <div className="max-w-[200px] truncate text-sm text-slate-700 font-medium">
                    {(task.assigned_organizations || []).map((org: any) => 
                      typeof org === 'object' ? (org.organization?.name || org.name) : org
                    ).filter(Boolean).join(", ") || '—'}
                  </div>
                </TableCell>
                <TableCell className="py-4 px-6">
                  <div className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    isOverdue ? "text-red-600 font-semibold" : "text-slate-600"
                  )}>
                    {isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
                    {(task.deadline || task.due_date) 
                      ? new Date(task.deadline || task.due_date).toLocaleDateString("uz-UZ", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        }) 
                      : '—'}
                  </div>
                </TableCell>
                <TableCell className="py-4 px-6">
                  <span className={cn(
                    "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold min-w-[90px] shadow-sm",
                    task.status === "YANGI" && "bg-blue-100 text-blue-700",
                    task.status === "IJRODA" && "bg-emerald-100 text-emerald-700",
                    task.status === "BAJARILDI" && "bg-teal-100 text-teal-700",
                    task.status === "QAYTA_IJROGA_YUBORILDI" && "bg-amber-100 text-amber-700",
                    task.status === "MUDDATI_KECH" && "bg-red-100 text-red-700",
                    task.status === "BAJARILMADI" && "bg-slate-100 text-slate-700",
                    task.status === "NAZORATDAN_YECHILDI" && "bg-slate-100 text-slate-700"
                  )}>
                    {statusLabels[task.status] || task.status}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
