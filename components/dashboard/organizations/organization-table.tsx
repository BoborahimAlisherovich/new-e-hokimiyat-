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
      <PremiumEmptyState icon={Building2} title={tr.emptyTitle} description={tr.emptyDesc} tone="from-violet-100 to-purple-200 text-[var(--st-tekshiruvda-fg)]" />
    )
  }

  return (
    <PremiumTableShell
      icon={Building2}
      title={tr.list}
      countLabel={`${organizations.length} ${tr.count}`}
      accentClassName="bg-[var(--st-tekshiruvda-bg)]"
    >
      <div className="grid gap-3 p-3 md:hidden">
        {organizations.map((org, index) => {
          const leader = org.director_name || org.head || getResponsibleUser(org, users) || "—"

          return (
            <div
              key={org.id}
              className="rounded-[22px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,255,0.92))] p-4 shadow-[0_16px_34px_-28px_rgba(139,92,246,0.28)]"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <code className="bg-[var(--st-tekshiruvda-bg)] rounded-lg border border-border px-2.5 py-1 text-xs font-mono font-bold text-[var(--st-tekshiruvda-fg)] shadow-sm">
                    {formatOrgId(String(org.id))}
                  </code>
                  <p className="mt-3 text-sm font-semibold leading-snug text-foreground">{org.name}</p>
                  {org.sector_name && (
                    <p className="mt-1 text-xs text-muted-foreground">{org.sector_name}</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 font-medium text-[11px] border rounded-lg ${
                    org.is_active
                      ? "bg-success-soft text-success-soft-foreground border-border"
                      : "bg-primary-soft text-muted-foreground border-border"
                  }`}
                >
                  {org.is_active ? tr.active : tr.inactive}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                <div className="rounded-xl bg-background px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{tr.leader}</p>
                  <p className="mt-1 truncate text-secondary-foreground">{leader}</p>
                </div>
                <div className="rounded-xl bg-background px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{tr.phone}</p>
                  <p className="mt-1 truncate text-secondary-foreground">{org.phone || "—"}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/dashboard/organizations/${org.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    {tr.details}
                  </Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 hover:bg-[var(--st-tekshiruvda-bg)]">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <Link href={`/dashboard/organizations/${org.id}`}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                        {tr.edit}
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onToggleStatus?.(org.id, org.is_active)}
                      className="cursor-pointer"
                    >
                      {org.is_active ? (
                        <><Lock className="mr-2 h-4 w-4 text-warning" /> {tr.deactivate}</>
                      ) : (
                        <><Unlock className="mr-2 h-4 w-4 text-success" /> {tr.activate}</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(org.id)}
                      className="text-destructive-soft-foreground cursor-pointer focus:text-destructive-soft-foreground focus:bg-destructive-soft"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {tr.delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary-soft border-b-2 border-border">
              <TableHead className="font-bold text-foreground py-4 px-4 text-sm">ID</TableHead>
              <TableHead className="font-bold text-foreground py-4 px-4 text-sm">{tr.name}</TableHead>
              <TableHead className="font-bold text-foreground py-4 px-4 text-sm">{tr.leader}</TableHead>
              <TableHead className="hidden font-bold text-foreground py-4 px-4 text-sm lg:table-cell">{tr.phone}</TableHead>
              <TableHead className="font-bold text-foreground py-4 px-4 text-sm">{tr.status}</TableHead>
              <TableHead className="font-bold text-foreground py-4 px-4 text-sm w-[70px]">{tr.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org, index) => {
              const leader = org.director_name || org.head || getResponsibleUser(org, users) || "—"

              return (
                <TableRow
                  key={org.id}
                  className="hover:bg-[var(--st-tekshiruvda-bg)] group border-b border-border transition-all duration-200"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell className="py-4 px-4">
                    <code className="bg-[var(--st-tekshiruvda-bg)] rounded-lg border border-border px-3 py-1.5 text-sm font-mono font-bold text-[var(--st-tekshiruvda-fg)] shadow-sm">
                      {formatOrgId(String(org.id))}
                    </code>
                  </TableCell>
                  <TableCell className="py-4 px-4 whitespace-normal">
                    <div>
                      <p className="font-semibold text-foreground text-base leading-snug">
                        {org.name}
                      </p>
                      {org.sector_name && (
                        <p className="text-sm text-muted-foreground mt-0.5 font-medium">{org.sector_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-sm text-secondary-foreground font-medium max-w-[220px] whitespace-normal">
                    <div className="line-clamp-2 leading-snug">{leader}</div>
                  </TableCell>
                  <TableCell className="hidden py-4 px-4 text-sm text-secondary-foreground font-medium lg:table-cell">
                    {org.phone || "—"}
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <Badge
                      variant="outline"
                      className={`font-medium text-xs border rounded-lg ${
                        org.is_active
                          ? "bg-success-soft text-success-soft-foreground border-border"
                          : "bg-primary-soft text-muted-foreground border-border"
                      }`}
                    >
                      {org.is_active ? tr.active : tr.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[var(--st-tekshiruvda-bg)] group-hover:bg-[var(--st-tekshiruvda-bg)] transition-colors">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-[var(--st-tekshiruvda-fg)]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <Link href={`/dashboard/organizations/${org.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                            {tr.details}
                          </DropdownMenuItem>
                        </Link>
                        <Link href={`/dashboard/organizations/${org.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                            {tr.edit}
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onToggleStatus?.(org.id, org.is_active)}
                          className="cursor-pointer"
                        >
                          {org.is_active ? (
                            <><Lock className="mr-2 h-4 w-4 text-warning" /> {tr.deactivate}</>
                          ) : (
                            <><Unlock className="mr-2 h-4 w-4 text-success" /> {tr.activate}</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete?.(org.id)}
                          className="text-destructive-soft-foreground cursor-pointer focus:text-destructive-soft-foreground focus:bg-destructive-soft"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tr.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </PremiumTableShell>
  )
}
