"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MoreHorizontal, Eye, Edit, Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { Task } from "@/types"
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/components/dashboard/tasks/task-constants"

type TaskTableProps = {
  tasks: Task[]
  onView: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (taskId: number) => void
}

export function TaskTable({ tasks, onView, onEdit, onDelete }: TaskTableProps) {
  const router = useRouter()
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Сарлавҳа</TableHead>
          <TableHead>Топшириқ</TableHead>
          <TableHead>Категория</TableHead>
          <TableHead>Муҳимлик</TableHead>
          <TableHead>Жавобгар</TableHead>
          <TableHead>Муддат</TableHead>
          <TableHead>Ҳолат</TableHead>
          <TableHead>Амаллар</TableHead>
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
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {task.assigned_to?.first_name?.charAt(0)}{task.assigned_to?.last_name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{task.assigned_to?.first_name} {task.assigned_to?.last_name}</div>
                  <div className="text-sm text-muted-foreground">{task.assigned_to?.position}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="max-w-xs truncate" title={task.title}>
                {task.title}
              </div>
            </TableCell>
            <TableCell>{task.category}</TableCell>
            <TableCell>
              <Badge className={cn("px-2 py-1 text-xs font-medium", PRIORITY_COLORS[task.priority])}>
                {PRIORITY_LABELS[task.priority]}
              </Badge>
            </TableCell>
            <TableCell>{task.created_by?.first_name} {task.created_by?.last_name}</TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>{new Date(task.due_date).toLocaleDateString("uz-UZ")}</TableCell>
            <TableCell>
              <Badge className={cn("px-2 py-1 text-xs font-medium", (STATUS_COLORS as any)[task.status])}>
                {(STATUS_LABELS as any)[task.status]}
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(task)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Батафсил
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Таҳрирлаш
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(task.id)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Ўчириш
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
