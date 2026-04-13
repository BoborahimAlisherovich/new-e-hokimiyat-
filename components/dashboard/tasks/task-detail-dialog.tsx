"use client"

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { Task } from "@/types"
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/components/dashboard/tasks/task-constants"
import { sectorLabels } from "@/lib/constants"

type TaskDetailDialogProps = {
  task: Task | null
  onClose: () => void
}

export function TaskDetailDialog({ task, onClose }: TaskDetailDialogProps) {
  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-2xl rounded-2xl border-white/60 shadow-[0_25px_70px_-15px_rgba(99,102,241,0.15)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">Topshiriq tafsilotlari</DialogTitle>
        </DialogHeader>
        {task && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Sarlavha</Label>
                <p className="font-medium">{task.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Soha</Label>
                <p className="font-medium">{(sectorLabels as Record<string, string>)[task.category] || task.category || '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Muhimlik</Label>
                <Badge className={cn("px-2 py-1 text-xs font-medium", PRIORITY_COLORS[task.priority])}>
                  {PRIORITY_LABELS[task.priority]}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Muddat</Label>
                <p className="font-medium">{(task.deadline || task.due_date) ? new Date(task.deadline || task.due_date || '').toLocaleDateString("uz-UZ") : '—'}</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Tafsilotlar</Label>
              <p className="text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Holat</Label>
                <Badge className={cn("px-2 py-1 text-xs font-medium", (STATUS_COLORS as any)[task.status])}>
                  {(STATUS_LABELS as any)[task.status]}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Yaratuvchi</Label>
                <p className="font-medium">{task.created_by?.first_name} {task.created_by?.last_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Hokim o'rinbosari</Label>
                <p className="font-medium">
                  {(task.assigned_deputies || [])
                    .map((deputy: any) => deputy?.full_name || [deputy?.last_name, deputy?.first_name].filter(Boolean).join(" "))
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Tashkilotlar</Label>
                <p className="font-medium">
                  {(task.assigned_organizations || []).map((org: any) => 
                    typeof org === 'object' ? (org.organization?.name || org.name) : org
                  ).filter(Boolean).join(", ") || '—'}
                </p>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
