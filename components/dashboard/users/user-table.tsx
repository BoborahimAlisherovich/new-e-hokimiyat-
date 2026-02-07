"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { User } from "@/types"
import { useRouter } from "next/navigation"
import { ROLE_COLORS, ROLE_LABELS, STATUS_COLORS, STATUS_LABELS, getUserStatusKey } from "./user-constants"
import { maskPnfl } from "./user-helpers"
import { UserX, ChevronRight, Users } from "lucide-react"

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
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 p-5 mb-5 shadow-inner">
            <UserX className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Foydalanuvchilar topilmadi</h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            Hozircha bu filtrlar bo'yicha foydalanuvchilar mavjud emas. Yangi foydalanuvchi qo'shing yoki filtrlarni o'zgartiring.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      {/* Table header with gradient */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/30 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          <span className="font-medium text-slate-800">Foydalanuvchilar ro'yxati</span>
        </div>
        <span className="text-sm text-slate-500">{users.length} ta foydalanuvchi</span>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
            <TableHead className="font-semibold text-slate-600 py-3.5 text-xs uppercase tracking-wide">FIO</TableHead>
            <TableHead className="font-semibold text-slate-600 py-3.5 text-xs uppercase tracking-wide">PNFL</TableHead>
            <TableHead className="font-semibold text-slate-600 py-3.5 text-xs uppercase tracking-wide">Lavozim</TableHead>
            <TableHead className="font-semibold text-slate-600 py-3.5 text-xs uppercase tracking-wide">Tashkilot</TableHead>
            <TableHead className="font-semibold text-slate-600 py-3.5 text-xs uppercase tracking-wide">Rol</TableHead>
            <TableHead className="font-semibold text-slate-600 py-3.5 text-xs uppercase tracking-wide">Holat</TableHead>
            <TableHead className="font-semibold text-slate-600 py-3.5 text-xs uppercase tracking-wide">Sana</TableHead>
            <TableHead className="font-semibold text-slate-600 py-3.5 text-xs uppercase tracking-wide w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, index) => (
            <TableRow 
              key={user.id} 
              className="border-b border-slate-100/80 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 cursor-pointer group"
              onClick={() => handleRowClick(user)}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <TableCell className="py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold">
                      {user.first_name?.charAt(0)}
                      {user.last_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-slate-800">
                      {user.last_name} {user.first_name} {user.middle_name}
                    </div>
                    <div className="text-xs text-slate-500">{user.email || user.phone}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-3.5">
                <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">
                  {(user as any).masked_pnfl || maskPnfl(user.pnfl || '')}
                </code>
              </TableCell>
              <TableCell className="py-3.5 text-slate-600 text-sm">{user.position || "—"}</TableCell>
              <TableCell className="py-3.5 text-slate-600 text-sm max-w-[200px] truncate">{user.organization?.name || user.organization_name || "Belgilanmagan"}</TableCell>
              <TableCell className="py-3.5">
                <Badge variant="outline" className={cn("px-2.5 py-1 text-xs font-medium border rounded-lg", ROLE_COLORS[user.role] || "bg-gray-50 text-gray-700 border-gray-200")}>
                  {ROLE_LABELS[user.role] || user.role || "Noma'lum"}
                </Badge>
              </TableCell>
              <TableCell className="py-3.5">
                <Badge variant="outline" className={cn("px-2.5 py-1 text-xs font-medium border rounded-lg", STATUS_COLORS[getUserStatusKey(user)] || "bg-gray-50 text-gray-700 border-gray-200")}>
                  {STATUS_LABELS[getUserStatusKey(user)] || "Noma'lum"}
                </Badge>
              </TableCell>
              <TableCell className="py-3.5 text-slate-500 text-sm">{new Date(user.created_at).toLocaleDateString("uz-UZ")}</TableCell>
              <TableCell className="py-3.5">
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
