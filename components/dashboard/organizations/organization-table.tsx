import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Eye, Lock, MoreHorizontal, Building2, Trash2, Unlock, ChevronRight } from "lucide-react"
import Link from "next/link"
import { formatOrgId } from "./organization-helpers"
import { useI18n } from "@/lib/i18n/context"
import { PremiumEmptyState, PremiumTableShell } from "@/components/dashboard/premium-dashboard-ui"

interface OrganizationTableProps {
  organizations: any[]
  users?: any[]
  onDelete?: (id: number) => void
  onToggleStatus?: (id: number, currentStatus: boolean) => void
}

const getResponsibleUser = (org: any, users: any[]) => {
  // Find TASHKILOT_RAHBARI or TASHKILOT_MASUL assigned to this organization
  const responsibleUser = users.find(u => 
    (u.organization === org.id || u.organization_id === org.id) && 
    (u.role === 'TASHKILOT_RAHBARI' || u.role === 'TASHKILOT_MASUL')
  )
  if (responsibleUser) {
    return responsibleUser.full_name || `${responsibleUser.first_name || ''} ${responsibleUser.last_name || ''}`.trim() || responsibleUser.username
  }
  return null
}

export function OrganizationTable({ organizations, users = [], onDelete, onToggleStatus }: OrganizationTableProps) {
  const { language } = useI18n()
  const tr = {
    uz: {
      emptyTitle: "Tashkilotlar topilmadi",
      emptyDesc: "Hozircha bu filtrlar bo'yicha tashkilotlar mavjud emas. Yangi tashkilot qo'shing yoki filtrlarni o'zgartiring.",
      list: "Tashkilotlar ro'yxati",
      count: "ta tashkilot",
      name: "Tashkilot nomi",
      leader: "Rahbar",
      phone: "Telefon",
      status: "Holat",
      actions: "Amallar",
      active: "Faol",
      inactive: "Nofaol",
      details: "Batafsil ko'rish",
      edit: "Tahrirlash",
      deactivate: "Nofaollashtirish",
      activate: "Faollashtirish",
      delete: "O'chirish",
    },
    "uz-cyrl": {
      emptyTitle: "Ташкилотлар топилмади",
      emptyDesc: "Ҳозирча бу фильтрлар бўйича ташкилотлар мавжуд эмас. Янги ташкилот қўшинг ёки фильтрларни ўзгартиринг.",
      list: "Ташкилотлар рўйхати",
      count: "та ташкилот",
      name: "Ташкилот номи",
      leader: "Раҳбар",
      phone: "Телефон",
      status: "Ҳолат",
      actions: "Амаллар",
      active: "Фаол",
      inactive: "Нофаол",
      details: "Батафсил кўриш",
      edit: "Таҳрирлаш",
      deactivate: "Нофаоллаштириш",
      activate: "Фаоллаштириш",
      delete: "Ўчириш",
    },
    ru: {
      emptyTitle: "Организации не найдены",
      emptyDesc: "По текущим фильтрам организаций нет. Добавьте организацию или измените фильтры.",
      list: "Список организаций",
      count: "организаций",
      name: "Название",
      leader: "Руководитель",
      phone: "Телефон",
      status: "Статус",
      actions: "Действия",
      active: "Активна",
      inactive: "Неактивна",
      details: "Подробнее",
      edit: "Редактировать",
      deactivate: "Деактивировать",
      activate: "Активировать",
      delete: "Удалить",
    },
    en: {
      emptyTitle: "No organizations found",
      emptyDesc: "No organizations match current filters. Add a new organization or change filters.",
      list: "Organizations list",
      count: "organizations",
      name: "Organization name",
      leader: "Leader",
      phone: "Phone",
      status: "Status",
      actions: "Actions",
      active: "Active",
      inactive: "Inactive",
      details: "View details",
      edit: "Edit",
      deactivate: "Deactivate",
      activate: "Activate",
      delete: "Delete",
    },
  }[language]

  if (organizations.length === 0) {
    return (
      <PremiumEmptyState icon={Building2} title={tr.emptyTitle} description={tr.emptyDesc} tone="from-violet-100 to-purple-200 text-violet-600" />
    )
  }

  return (
    <PremiumTableShell
      icon={Building2}
      title={tr.list}
      countLabel={`${organizations.length} ${tr.count}`}
      accentClassName="bg-gradient-to-r from-violet-50/55 via-white/30 to-purple-50/40"
    >
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-cyan-100/50 bg-gradient-to-r from-cyan-50/50 to-violet-50/25">
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm">ID</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm">{tr.name}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm">{tr.leader}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm">{tr.phone}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm">{tr.status}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm w-[70px]">{tr.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org, index) => (
            <TableRow 
              key={org.id} 
              className="group border-b border-cyan-50/70 transition-all duration-200 hover:bg-gradient-to-r hover:from-violet-50/45 hover:to-cyan-50/35"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <TableCell className="py-4 px-4">
                <code className="rounded-lg bg-gradient-to-r from-violet-100 to-purple-100 border border-violet-200 px-3 py-1.5 text-sm font-mono font-bold text-violet-700 shadow-sm">
                  {formatOrgId(String(org.id))}
                </code>
              </TableCell>
              <TableCell className="py-4 px-4">
                <div>
                  <p className="font-semibold text-slate-900 text-base">
                    {org.name}
                  </p>
                  {org.sector_name && (
                    <p className="text-sm text-slate-500 mt-0.5 font-medium">{org.sector_name}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-4 px-4">
                <span className="text-sm text-slate-700 font-medium">
                  {org.director_name || org.head || getResponsibleUser(org, users) || "—"}
                </span>
              </TableCell>
              <TableCell className="py-4 px-4">
                <span className="text-sm text-slate-700 font-medium">{org.phone || "—"}</span>
              </TableCell>
              <TableCell className="py-3.5 px-4">
                <Badge
                  variant="outline"
                  className={`font-medium text-xs border rounded-lg ${
                    org.is_active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-indigo-50/30 text-slate-600 border-indigo-100/40"
                  }`}
                >
                  {org.is_active ? tr.active : tr.inactive}
                </Badge>
              </TableCell>
              <TableCell className="py-3.5 px-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-violet-50 group-hover:bg-violet-100/50 transition-colors">
                      <MoreHorizontal className="h-4 w-4 text-slate-500 group-hover:text-violet-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <Link href={`/dashboard/organizations/${org.id}`}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Eye className="mr-2 h-4 w-4 text-slate-500" />
                        {tr.details}
                      </DropdownMenuItem>
                    </Link>
                    <Link href={`/dashboard/organizations/${org.id}`}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Edit className="mr-2 h-4 w-4 text-slate-500" />
                        {tr.edit}
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onToggleStatus?.(org.id, org.is_active)}
                      className="cursor-pointer"
                    >
                      {org.is_active ? (
                        <><Lock className="mr-2 h-4 w-4 text-amber-500" /> {tr.deactivate}</>
                      ) : (
                        <><Unlock className="mr-2 h-4 w-4 text-emerald-500" /> {tr.activate}</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(org.id)}
                      className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {tr.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PremiumTableShell>
  )
}
