import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { User } from "@/types"
import { Archive, Edit, Eye, Lock, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { ROLE_COLORS, ROLE_LABELS, STATUS_COLORS, STATUS_LABELS } from "./user-constants"
import { maskPnfl, roleCabinet } from "./user-helpers"

interface UserTableProps {
  users: User[]
  onView: (user: User) => void
  onEdit: (user: User) => void
  onDelete: (userId: number) => void
}

export function UserTable({ users, onView, onEdit, onDelete }: UserTableProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ФИО</TableHead>
              <TableHead>ПНФЛ</TableHead>
              <TableHead>Лавозим</TableHead>
              <TableHead>Ташкилот</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Ҳолат</TableHead>
              <TableHead>Рўйхат</TableHead>
              <TableHead>Амаллар</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {user.first_name?.charAt(0)}
                        {user.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {user.last_name} {user.first_name} {user.middle_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.position}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{maskPnfl(user.pnfl)}</TableCell>
                <TableCell>{user.position}</TableCell>
                <TableCell>{user.organization?.name || "Ташкилот белгиланмаган"}</TableCell>
                <TableCell>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", ROLE_COLORS[user.role])}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[user.status])}>
                    {STATUS_LABELS[user.status]}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString("uz-UZ")}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(user)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Батафсил
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Таҳрирлаш
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(user.id)}>
                        <Archive className="mr-2 h-4 w-4" />
                        Ўчириш
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={roleCabinet(user.role)} className="flex items-center">
                          <Lock className="mr-2 h-4 w-4" />
                          Кабинетга ўтиш
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
