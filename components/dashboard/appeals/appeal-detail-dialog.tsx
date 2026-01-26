import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Appeal } from "@/types"
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "./appeal-constants"

interface AppealDetailDialogProps {
  appeal: Appeal | null
  onClose: () => void
}

export function AppealDetailDialog({ appeal, onClose }: AppealDetailDialogProps) {
  return (
    <Dialog open={!!appeal} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Мурожаат тафсилотлари</DialogTitle>
          <DialogDescription>Мурожаат ҳақида тўлиқ маълумотлар</DialogDescription>
        </DialogHeader>
        {appeal && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Фуқаро</label>
                <p className="font-medium">{appeal.citizenName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Телефон</label>
                <p className="font-medium">{appeal.citizenPhone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-medium">{appeal.citizenEmail}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ҳудуд</label>
                <p className="font-medium">{appeal.district}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Мавзу</label>
              <p className="font-medium">{appeal.subject}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Тафсилотлар</label>
              <p className="text-muted-foreground whitespace-pre-wrap">{appeal.description}</p>
            </div>

            <div className="flex gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ҳолат</label>
                <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[appeal.status])}>
                  {STATUS_LABELS[appeal.status]}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Муҳимлик</label>
                <Badge className={cn("px-2 py-1 text-xs font-medium", PRIORITY_COLORS[appeal.priority])}>
                  {PRIORITY_LABELS[appeal.priority]}
                </Badge>
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
