"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-slate-100 p-4 mb-4">
            <UserX className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-1">Foydalanuvchilar topilmadi</h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            Hozircha bu filtrlar bo'yicha foydalanuvchilar mavjud emas. Yangi foydalanuvchi qo'shing yoki filtrlarni o'zgartiring.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b border-slate-200">
              <TableHead className="font-semibold text-slate-700 py-3.5">FIO</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5">PNFL</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5">Lavozim</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5">Tashkilot</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5">Rol</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5">Holat</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5">Ro'yxatdan o'tgan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow 
                key={user.id} 
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => handleRowClick(user)}
              >
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-semibold">
                        {user.first_name?.charAt(0)}
                        {user.last_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-slate-800">
                        {user.last_name} {user.first_name} {user.middle_name}
                      </div>
                      <div className="text-sm text-slate-500">{user.position}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3 font-mono text-sm text-slate-600">{(user as any).masked_pnfl || maskPnfl(user.pnfl || '')}</TableCell>
                <TableCell className="py-3 text-slate-600">{user.position || "—"}</TableCell>
                <TableCell className="py-3 text-slate-600">{user.organization?.name || user.organization_name || "Belgilanmagan"}</TableCell>
                <TableCell className="py-3">
                  <Badge variant="outline" className={cn("px-2 py-1 text-xs font-medium border", ROLE_COLORS[user.role] || "bg-gray-50 text-gray-700 border-gray-200")}>
                    {ROLE_LABELS[user.role] || user.role || "Noma'lum"}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant="outline" className={cn("px-2 py-1 text-xs font-medium border", STATUS_COLORS[getUserStatusKey(user)] || "bg-gray-50 text-gray-700 border-gray-200")}>
                    {STATUS_LABELS[getUserStatusKey(user)] || "Noma'lum"}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-slate-600">{new Date(user.created_at).toLocaleDateString("uz-UZ")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  )
}
