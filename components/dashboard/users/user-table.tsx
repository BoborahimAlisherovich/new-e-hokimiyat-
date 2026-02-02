"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { User } from "@/types"
import { useRouter } from "next/navigation"
import { ROLE_COLORS, ROLE_LABELS, STATUS_COLORS, STATUS_LABELS, getUserStatusKey } from "./user-constants"
import { maskPnfl } from "./user-helpers"

interface UserTableProps {
  users: User[]
}

export function UserTable({ users }: UserTableProps) {
  const router = useRouter()

  const handleRowClick = (user: User) => {
    router.push(`/dashboard/users/${user.id}`)
  }

  return (
    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>FIO</TableHead>
              <TableHead>PNFL</TableHead>
              <TableHead>Lavozim</TableHead>
              <TableHead>Tashkilot</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead>Ro'yxatdan o'tgan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow 
                key={user.id} 
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleRowClick(user)}
              >
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
                <TableCell className="font-mono text-sm">{(user as any).masked_pnfl || maskPnfl(user.pnfl || '')}</TableCell>
                <TableCell>{user.position || "—"}</TableCell>
                <TableCell>{user.organization?.name || user.organization_name || "Belgilanmagan"}</TableCell>
                <TableCell>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", ROLE_COLORS[user.role] || "bg-gray-100 text-gray-800")}>
                    {ROLE_LABELS[user.role] || user.role || "Noma'lum"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[getUserStatusKey(user)] || "bg-gray-100 text-gray-800")}>
                    {STATUS_LABELS[getUserStatusKey(user)] || "Noma'lum"}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString("uz-UZ")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
