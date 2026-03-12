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
import { useI18n } from "@/lib/i18n/context"
import { PremiumEmptyState, PremiumTableShell } from "@/components/dashboard/premium-dashboard-ui"

interface UserTableProps {
  users: User[]
}

export function UserTable({ users }: UserTableProps) {
  const router = useRouter()
  const { language } = useI18n()
  const tr = {
    uz: {
      emptyTitle: "Foydalanuvchilar topilmadi",
      emptyDesc: "Hozircha bu filtrlar bo'yicha foydalanuvchilar mavjud emas. Yangi foydalanuvchi qo'shing yoki filtrlarni o'zgartiring.",
      listTitle: "Foydalanuvchilar ro'yxati",
      usersCount: "ta foydalanuvchi",
      fio: "FIO",
      login: "Login",
      position: "Lavozim",
      org: "Tashkilot",
      role: "Rol",
      status: "Holat",
      date: "Sana",
      pnfl: "PNFL",
      notSet: "Belgilanmagan",
      unknown: "Noma'lum",
    },
    "uz-cyrl": {
      emptyTitle: "Фойдаланувчилар топилмади",
      emptyDesc: "Ҳозирча бу фильтрлар бўйича фойдаланувчилар мавжуд эмас. Янги фойдаланувчи қўшинг ёки фильтрларни ўзгартиринг.",
      listTitle: "Фойдаланувчилар рўйхати",
      usersCount: "та фойдаланувчи",
      fio: "ФИШ",
      login: "Логин",
      position: "Лавозим",
      org: "Ташкилот",
      role: "Рол",
      status: "Ҳолат",
      date: "Сана",
      pnfl: "ПНФЛ",
      notSet: "Белгиланмаган",
      unknown: "Номаълум",
    },
    ru: {
      emptyTitle: "Пользователи не найдены",
      emptyDesc: "По текущим фильтрам пользователей нет. Добавьте пользователя или измените фильтры.",
      listTitle: "Список пользователей",
      usersCount: "пользователей",
      fio: "ФИО",
      login: "Логин",
      position: "Должность",
      org: "Организация",
      role: "Роль",
      status: "Статус",
      date: "Дата",
      pnfl: "ПНФЛ",
      notSet: "Не указано",
      unknown: "Неизвестно",
    },
    en: {
      emptyTitle: "No users found",
      emptyDesc: "No users match current filters. Add a user or change filters.",
      listTitle: "Users list",
      usersCount: "users",
      fio: "Full name",
      login: "Login",
      position: "Position",
      org: "Organization",
      role: "Role",
      status: "Status",
      date: "Date",
      pnfl: "PNFL",
      notSet: "Not set",
      unknown: "Unknown",
    },
  }[language]

  const handleRowClick = (user: User) => {
    router.push(`/dashboard/users/${user.id}`)
  }

  if (users.length === 0) {
    return (
      <PremiumEmptyState icon={UserX} title={tr.emptyTitle} description={tr.emptyDesc} />
    )
  }

  return (
    <PremiumTableShell
      icon={Users}
      title={tr.listTitle}
      countLabel={`${users.length} ${tr.usersCount}`}
      accentClassName="bg-gradient-to-r from-blue-50/55 via-white/30 to-indigo-50/40"
    >
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-cyan-100/50 bg-gradient-to-r from-cyan-50/60 to-cyan-50/20">
            <TableHead className="font-bold text-slate-800 py-4 text-sm">{tr.fio}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm">{tr.login}</TableHead>
            <TableHead className="hidden font-bold text-slate-800 py-4 text-sm lg:table-cell">{tr.position}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm">{tr.org}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm">{tr.role}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm">{tr.status}</TableHead>
            <TableHead className="hidden font-bold text-slate-800 py-4 text-sm xl:table-cell">{tr.date}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 text-sm w-8"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, index) => (
            <TableRow 
              key={user.id} 
              className="group cursor-pointer border-b border-cyan-50/70 transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/35"
              onClick={() => handleRowClick(user)}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <TableCell className="py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    firstName={user.first_name}
                    lastName={user.last_name}
                    avatarUrl={user.avatar_url}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 text-base whitespace-normal leading-snug">
                      {user.last_name} {user.first_name} {user.middle_name}
                    </div>
                    <div className="text-sm text-slate-500 truncate">{user.email || user.phone}</div>
                    <div className="mt-1 text-xs text-slate-500 lg:hidden">
                      {(user.position || "—") + " | " + new Date(user.created_at).toLocaleDateString(
                        language === "uz-cyrl" ? "uz-Cyrl-UZ" : language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "uz-UZ"
                      )}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <div className="space-y-1">
                  <code className="rounded-lg bg-gradient-to-r from-indigo-50/30 to-indigo-50/20 border border-indigo-100/40 px-3 py-1.5 text-sm font-mono font-medium text-slate-700 inline-block">
                    {user.login || "—"}
                  </code>
                  <div className="text-xs text-slate-500">
                    {tr.pnfl}: {user.masked_pnfl || maskPnfl(user.pnfl || '')}
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden py-4 text-slate-700 text-sm font-medium lg:table-cell">{user.position || "—"}</TableCell>
              <TableCell className="py-4 text-slate-700 text-sm font-medium max-w-[200px] whitespace-normal leading-snug">
                {user.organization?.name || user.organization_name || tr.notSet}
              </TableCell>
              <TableCell className="py-4">
                <Badge variant="outline" className={cn("px-3 py-1.5 text-xs font-semibold border rounded-lg shadow-sm", ROLE_COLORS[user.role] || "bg-gray-50 text-gray-700 border-gray-200")}>
                  {ROLE_LABELS[user.role] || user.role || tr.unknown}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <Badge variant="outline" className={cn("px-3 py-1.5 text-xs font-semibold border rounded-lg shadow-sm", STATUS_COLORS[getUserStatusKey(user)] || "bg-gray-50 text-gray-700 border-gray-200")}>
                  {STATUS_LABELS[getUserStatusKey(user)] || tr.unknown}
                </Badge>
              </TableCell>
              <TableCell className="hidden py-4 text-slate-600 text-sm font-medium xl:table-cell">
                {new Date(user.created_at).toLocaleDateString(
                  language === "uz-cyrl" ? "uz-Cyrl-UZ" : language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "uz-UZ"
                )}
              </TableCell>
              <TableCell className="py-4">
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-200" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PremiumTableShell>
  )
}
