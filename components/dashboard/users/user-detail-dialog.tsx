import { UserAvatar } from "@/components/ui/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { User } from "@/types"
import { Building, Mail, Phone } from "lucide-react"
import { ROLE_COLORS, ROLE_LABELS, STATUS_COLORS, STATUS_LABELS, getUserStatusKey } from "./user-constants"
import { maskPnfl } from "./user-helpers"

interface UserDetailDialogProps {
  user: User | null
  onClose: () => void
}

export function UserDetailDialog({ user, onClose }: UserDetailDialogProps) {
  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card rounded-2xl border-border">
        <DialogHeader>
          <DialogTitle>Фойдаланувчи маълумотлари</DialogTitle>
          <DialogDescription>Фойдаланувчи ҳақида тўлиқ маълумотлар</DialogDescription>
        </DialogHeader>
        {user && (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <UserAvatar
                firstName={user.first_name}
                lastName={user.last_name}
                avatarUrl={user.avatar_url}
                size="xl"
              />
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-semibold">
                  {user.last_name} {user.first_name} {user.middle_name}
                </h3>
                <p className="text-muted-foreground">{user.position}</p>
                <div className="flex gap-2">
                  <Badge className={cn("px-2 py-1 text-xs font-medium", ROLE_COLORS[user.role])}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                  {(() => {
                    const key = getUserStatusKey(user)
                    return (
                      <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[key])}>
                        {STATUS_LABELS[key]}
                      </Badge>
                    )
                  })()}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>ПНФЛ</Label>
                <p className="font-mono">{user.masked_pnfl || maskPnfl(user.pnfl || "")}</p>
              </div>
              <div className="space-y-2">
                <Label>Телефон</Label>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {user.phone}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Ташкилот</Label>
                <p className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {user.organization?.name || "Ташкилот белгиланмаган"}
                </p>
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
