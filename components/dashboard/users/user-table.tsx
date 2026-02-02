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
import { UserX } from "lucide-react"

interface UserTableProps {
  users: User[]
}

export function UserTable({ users }: UserTableProps) {
  const router = useRouter()

  const handleRowClick = (user: User) => {
    router.push(`/dashboard/users/${user.id}`)
  }

  if (users.length === 0) {
    return (
      <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-slate-100 p-4 mb-4">
            <UserX className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">Foydalanuvchilar topilmadi</h3>
          <p className="text-sm text-slate-600 text-center max-w-sm">
            Hozircha bu filtrlar bo'yicha foydalanuvchilar mavjud emas. Yangi foydalanuvchi qo'shing yoki filtrlarni o'zgartiring.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-slate-700">FIO</TableHead>
              <TableHead className="text-slate-700">PNFL</TableHead>
              <TableHead className="text-slate-700">Lavozim</TableHead>
              <TableHead className="text-slate-700">Tashkilot</TableHead>
              <TableHead className="text-slate-700">Rol</TableHead>
              <TableHead className="text-slate-700">Holat</TableHead>
              <TableHead className="text-slate-700">Ro'yxatdan o'tgan</TableHead>
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
                      <div className="font-medium text-slate-900">
                        {user.last_name} {user.first_name} {user.middle_name}
                      </div>
                      <div className="text-sm text-slate-600">{user.position}</div>
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
