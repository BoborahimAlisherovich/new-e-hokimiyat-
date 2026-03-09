"use client"

import { UserAvatar } from "@/components/ui/user-avatar"
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
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-white/50 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] ring-1 ring-indigo-50/30 overflow-hidden">
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
    <div className="bg-white rounded-2xl border border-white/50 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] ring-1 ring-indigo-50/30 overflow-hidden">
      {/* Table header with gradient */}
      <div className="bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/30 px-4 py-3 border-b border-indigo-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          <span className="font-medium text-slate-800">Foydalanuvchilar ro'yxati</span>
        </div>
        <span className="text-sm text-slate-500">{users.length} ta foydalanuvchi</span>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-indigo-50/60 to-indigo-50/30 border-b-2 border-indigo-100/40">
            <TableHead className="font-bold text-slate-800 py-4 text-sm">FIO</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm">Login</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm">Lavozim</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm">Tashkilot</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm">Rol</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm">Holat</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm">Sana</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, index) => (
            <TableRow 
              key={user.id} 
              className="border-b border-indigo-50/60/80 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 cursor-pointer group"
              onClick={() => handleRowClick(user)}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    firstName={user.first_name}
                    lastName={user.last_name}
                    avatarUrl={user.avatar_url}
                    size="md"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 text-base">
                      {user.last_name} {user.first_name} {user.middle_name}
                    </div>
                    <div className="text-sm text-slate-500">{user.email || user.phone}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <div className="space-y-1">
                  <code className="rounded-lg bg-gradient-to-r from-indigo-50/30 to-indigo-50/20 border border-indigo-100/40 px-3 py-1.5 text-sm font-mono font-medium text-slate-700 inline-block">
                    {user.login || "—"}
                  </code>
                  <div className="text-xs text-slate-500">
                    PNFL: {user.masked_pnfl || maskPnfl(user.pnfl || '')}
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4 text-slate-700 text-sm font-medium">{user.position || "—"}</TableCell>
              <TableCell className="py-4 text-slate-700 text-sm font-medium max-w-[200px] truncate">{user.organization?.name || user.organization_name || "Belgilanmagan"}</TableCell>
              <TableCell className="py-4">
                <Badge variant="outline" className={cn("px-3 py-1.5 text-xs font-semibold border rounded-lg shadow-sm", ROLE_COLORS[user.role] || "bg-gray-50 text-gray-700 border-gray-200")}>
                  {ROLE_LABELS[user.role] || user.role || "Noma'lum"}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <Badge variant="outline" className={cn("px-3 py-1.5 text-xs font-semibold border rounded-lg shadow-sm", STATUS_COLORS[getUserStatusKey(user)] || "bg-gray-50 text-gray-700 border-gray-200")}>
                  {STATUS_LABELS[getUserStatusKey(user)] || "Noma'lum"}
                </Badge>
              </TableCell>
              <TableCell className="py-4 text-slate-600 text-sm font-medium">{new Date(user.created_at).toLocaleDateString("uz-UZ")}</TableCell>
              <TableCell className="py-4">
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-200" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
