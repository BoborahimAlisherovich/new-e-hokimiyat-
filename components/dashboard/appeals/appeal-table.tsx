import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Appeal } from "@/types"
import { Archive, Eye, MoreHorizontal, MessageSquare, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_LABELS } from "./appeal-constants"
import { useI18n } from "@/lib/i18n/context"
import { PremiumEmptyState, PremiumTableShell } from "@/components/dashboard/premium-dashboard-ui"

interface AppealTableProps {
  appeals: Appeal[]
  onView: (appeal: Appeal) => void
  onArchive: (appealId: string) => void
}

export function AppealTable({ appeals, onView, onArchive }: AppealTableProps) {
  const router = useRouter()
  const { language } = useI18n()
  const tr = {
    uz: {
      emptyTitle: "Murojaatlar topilmadi",
      emptyDesc: "Hozircha bu filtrlar bo'yicha murojaatlar mavjud emas.",
      citizen: "Murojaatchi",
      district: "Mahalla",
      type: "Turi",
      date: "Sana",
      status: "Holati",
      details: "Batafsil",
      archive: "Arxivlash",
    },
    "uz-cyrl": {
      emptyTitle: "Мурожаатлар топилмади",
      emptyDesc: "Ҳозирча бу фильтрлар бўйича мурожаатлар мавжуд эмас.",
      citizen: "Мурожаатчи",
      district: "Маҳалла",
      type: "Тури",
      date: "Сана",
      status: "Ҳолати",
      details: "Батафсил",
      archive: "Архивлаш",
    },
    ru: {
      emptyTitle: "Обращения не найдены",
      emptyDesc: "По текущим фильтрам обращений нет.",
      citizen: "Заявитель",
      district: "Махалля",
      type: "Тип",
      date: "Дата",
      status: "Статус",
      details: "Подробнее",
      archive: "В архив",
    },
    en: {
      emptyTitle: "No appeals found",
      emptyDesc: "No appeals match current filters.",
      citizen: "Citizen",
      district: "District",
      type: "Type",
      date: "Date",
      status: "Status",
      details: "Details",
      archive: "Archive",
    },
  }[language]

  const handleRowClick = (appeal: Appeal) => {
    onView(appeal)
    const id = appeal.id.startsWith('tg-') ? appeal.id.replace('tg-', '') : appeal.id
    router.push(`/dashboard/appeals/${id}`)
  }

  if (appeals.length === 0) {
    return (
      <PremiumEmptyState icon={MessageSquare} title={tr.emptyTitle} description={tr.emptyDesc} tone="from-cyan-50 to-teal-100 text-success" />
    )
  }

  return (
    <PremiumTableShell
      icon={MessageSquare}
      title="Murojaatlar ro'yxati"
      countLabel={`${appeals.length} ta`}
      accentClassName="bg-primary-soft"
    >
    <div className="grid gap-3 p-4 md:hidden">
      {appeals.map((appeal) => (
        <article
          key={appeal.id}
          className="rounded-[22px] border border-border bg-card p-4 shadow-[0_14px_30px_-24px_rgba(14,165,233,0.32)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => handleRowClick(appeal)}
                className="text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <code className="bg-success-soft rounded-lg border border-border px-2.5 py-1 text-xs font-mono font-bold text-success shadow-sm">
                    {appeal.id}
                  </code>
                  {(appeal.newMessagesCount ?? 0) > 0 && (
                    <span className="bg-destructive inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      <MessageCircle className="h-3 w-3" />
                      {appeal.newMessagesCount}
                    </span>
                  )}
                </div>
                <p className="mt-3 break-words text-sm font-semibold text-foreground">{appeal.citizenName}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{appeal.category || "—"} • {appeal.district || "—"}</p>
              </button>
            </div>
            <Badge className={cn("border-0", PRIORITY_COLORS[appeal.priority] || "bg-muted text-secondary-foreground")}>
              {PRIORITY_LABELS[appeal.priority] || appeal.priority}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn(
              "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm",
              appeal.status === "PENDING" && "bg-primary-soft text-primary-soft-foreground",
              appeal.status === "IN_PROGRESS" && "bg-success-soft text-success-soft-foreground",
              appeal.status === "RESOLVED" && "bg-success-soft text-success-soft-foreground",
              appeal.status === "REJECTED" && "bg-destructive-soft text-destructive-soft-foreground",
              (appeal.status === "OVERDUE" || appeal.status === "overdue") && "bg-destructive-soft text-destructive-soft-foreground"
            )}>
              {STATUS_LABELS[appeal.status] || appeal.status}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(appeal.createdAt).toLocaleDateString(language === "uz-cyrl" ? "uz-Cyrl-UZ" : language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "uz-UZ", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
              })}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => handleRowClick(appeal)} className="flex-1">
              <Eye className="mr-2 h-4 w-4" />
              {tr.details}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onArchive(appeal.id)} className="flex-1">
              <Archive className="mr-2 h-4 w-4" />
              {tr.archive}
            </Button>
          </div>
        </article>
      ))}
    </div>
    <div className="hidden overflow-x-auto md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary-soft border-b-2 border-border">
            <TableHead className="font-bold text-foreground py-4 px-6 text-sm">ID</TableHead>
            <TableHead className="font-bold text-foreground py-4 px-6 text-sm">{tr.citizen}</TableHead>
            <TableHead className="font-bold text-foreground py-4 px-6 text-sm">{tr.district}</TableHead>
            <TableHead className="font-bold text-foreground py-4 px-6 text-sm">{tr.type}</TableHead>
            <TableHead className="font-bold text-foreground py-4 px-6 text-sm">{tr.date}</TableHead>
            <TableHead className="font-bold text-foreground py-4 px-6 text-sm">{tr.status}</TableHead>
            <TableHead className="font-bold text-foreground py-4 px-6 text-sm w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appeals.map((appeal) => (
            <TableRow 
              key={appeal.id} 
              className="hover:bg-success-soft cursor-pointer border-b border-border transition-all duration-200"
              onClick={() => handleRowClick(appeal)}
            >
              <TableCell className="py-4 px-6">
                <code className="bg-success-soft rounded-lg border border-border px-3 py-1.5 text-sm font-mono font-bold text-success shadow-sm">
                  {appeal.id}
                </code>
              </TableCell>
              <TableCell className="py-4 px-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground break-words">{appeal.citizenName}</span>
                  {(appeal.newMessagesCount ?? 0) > 0 && (
                    <span className="bg-destructive inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
                      <MessageCircle className="h-3 w-3" />
                      {appeal.newMessagesCount}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className="text-sm text-secondary-foreground font-medium break-words">{appeal.district || "—"}</span>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className="text-sm text-secondary-foreground font-medium break-words">{appeal.category || "—"}</span>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className="text-sm text-muted-foreground font-medium">
                  {new Date(appeal.createdAt).toLocaleDateString(language === "uz-cyrl" ? "uz-Cyrl-UZ" : language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "uz-UZ", {
                    day: "2-digit",
                    month: "2-digit", 
                    year: "numeric"
                  })}
                </span>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className={cn(
                  "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold min-w-[90px] shadow-sm",
                  appeal.status === "PENDING" && "bg-primary-soft text-primary-soft-foreground",
                  appeal.status === "IN_PROGRESS" && "bg-success-soft text-success-soft-foreground",
                  appeal.status === "RESOLVED" && "bg-success-soft text-success-soft-foreground",
                  appeal.status === "REJECTED" && "bg-destructive-soft text-destructive-soft-foreground",
                  (appeal.status === "OVERDUE" || appeal.status === "overdue") && "bg-destructive-soft text-destructive-soft-foreground"
                )}>
                  {STATUS_LABELS[appeal.status] || appeal.status}
                </span>
              </TableCell>
              <TableCell className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary-soft">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[150px]">
                    <DropdownMenuItem onClick={() => handleRowClick(appeal)} className="cursor-pointer">
                      <Eye className="mr-2 h-4 w-4" />
                      {tr.details}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onArchive(appeal.id)} className="cursor-pointer">
                      <Archive className="mr-2 h-4 w-4" />
                      {tr.archive}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </PremiumTableShell>
  )
}
