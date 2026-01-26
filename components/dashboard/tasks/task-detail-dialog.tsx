"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { Task } from "@/types"
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/components/dashboard/tasks/task-constants"

type TaskDetailDialogProps = {
  task: Task | null
  onClose: () => void
}

export function TaskDetailDialog({ task, onClose }: TaskDetailDialogProps) {
  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>Топшириқ тафсилотлари</DialogTitle>
        </DialogHeader>
        {task && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Сарлавҳа</Label>
                <p className="font-medium">{task.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Категория</Label>
                <p className="font-medium">{task.category}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Муҳимлик</Label>
                <Badge className={cn("px-2 py-1 text-xs font-medium", PRIORITY_COLORS[task.priority])}>
                  {PRIORITY_LABELS[task.priority]}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Муддат</Label>
                <p className="font-medium">{new Date(task.due_date).toLocaleDateString("uz-UZ")}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Тафсилотлар</Label>
              <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            </div>

            <div className="flex gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Ҳолат</Label>
                <Badge className={cn("px-2 py-1 text-xs font-medium", (STATUS_COLORS as any)[task.status])}>
                  {(STATUS_LABELS as any)[task.status]}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Яратувчи</Label>
                <p className="font-medium">{task.created_by?.first_name} {task.created_by?.last_name}</p>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Ёпиш
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
