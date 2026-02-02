"use client"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { Task } from "@/types"
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/components/dashboard/tasks/task-constants"

const CATEGORY_LABELS: Record<string, string> = {
  IJTIMOIY: "Ijtimoiy",
  IQTISODIY: "Iqtisodiy",
  HUQUQIY: "Huquqiy",
  INFRASTRUKTURA: "Infrastruktura",
  TA_LIM: "Ta'lim",
  SOG_LIQNI_SAQLASH: "Sog'liqni saqlash",
  BOSHQA: "Boshqa",
}

type TaskTableProps = {
  tasks: Task[]
  onView?: (task: Task) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: number) => void
}

export function TaskTable({ tasks }: TaskTableProps) {
  const router = useRouter()
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sarlavha</TableHead>
          <TableHead>Soha</TableHead>
          <TableHead>Muhimlik</TableHead>
          <TableHead>Tashkilotlar</TableHead>
          <TableHead>Muddat</TableHead>
          <TableHead>Holat</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow 
            key={task.id} 
            className="hover:bg-muted/50 transition-colors cursor-pointer" 
            onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
          >
            <TableCell>
              <div className="max-w-xs truncate font-medium" title={task.title}>
                {task.title || '—'}
              </div>
            </TableCell>
            <TableCell>
              {CATEGORY_LABELS[task.category] || task.category || '—'}
            </TableCell>
            <TableCell>
              <Badge className={cn("px-2 py-1 text-xs font-medium", PRIORITY_COLORS[task.priority])}>
                {PRIORITY_LABELS[task.priority] || task.priority}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="max-w-[200px] truncate">
                {(task.assigned_organizations || []).map((org: any) => 
                  typeof org === 'object' ? (org.organization?.name || org.name) : org
                ).filter(Boolean).join(", ") || '—'}
              </div>
            </TableCell>
            <TableCell>
              {(task.deadline || task.due_date) ? new Date(task.deadline || task.due_date).toLocaleDateString("uz-UZ") : '—'}
            </TableCell>
            <TableCell>
              <Badge className={cn("px-2 py-1 text-xs font-medium", (STATUS_COLORS as any)[task.status])}>
                {(STATUS_LABELS as any)[task.status] || task.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
