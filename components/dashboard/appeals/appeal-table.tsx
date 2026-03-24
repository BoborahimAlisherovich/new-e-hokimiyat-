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
      <PremiumEmptyState icon={MessageSquare} title={tr.emptyTitle} description={tr.emptyDesc} tone="from-cyan-50 to-teal-100 text-teal-600" />
    )
  }

  return (
    <PremiumTableShell
      icon={MessageSquare}
      title="Murojaatlar ro'yxati"
      countLabel={`${appeals.length} ta`}
      accentClassName="bg-gradient-to-r from-cyan-50/60 via-white/30 to-teal-50/45"
    >
    <div className="grid gap-3 p-4 md:hidden">
      {appeals.map((appeal) => (
        <article
          key={appeal.id}
          className="rounded-[22px] border border-cyan-100/70 bg-white/90 p-4 shadow-[0_14px_30px_-24px_rgba(14,165,233,0.32)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => handleRowClick(appeal)}
                className="text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-gradient-to-r from-teal-100 to-cyan-100 border border-teal-200 px-2.5 py-1 text-xs font-mono font-bold text-teal-700 shadow-sm">
                    {appeal.id}
                  </code>
                  {(appeal.newMessagesCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      <MessageCircle className="h-3 w-3" />
                      {appeal.newMessagesCount}
                    </span>
                  )}
                </div>
                <p className="mt-3 break-words text-sm font-semibold text-slate-900">{appeal.citizenName}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{appeal.category || "—"} • {appeal.district || "—"}</p>
              </button>
            </div>
            <Badge className={cn("border-0", PRIORITY_COLORS[appeal.priority] || "bg-slate-100 text-slate-700")}>
              {PRIORITY_LABELS[appeal.priority] || appeal.priority}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn(
              "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm",
              appeal.status === "PENDING" && "bg-blue-100 text-blue-700",
              appeal.status === "IN_PROGRESS" && "bg-emerald-100 text-emerald-700",
              appeal.status === "RESOLVED" && "bg-teal-100 text-teal-700",
              appeal.status === "REJECTED" && "bg-rose-100 text-rose-700",
              (appeal.status === "OVERDUE" || appeal.status === "overdue") && "bg-red-100 text-red-700"
            )}>
              {STATUS_LABELS[appeal.status] || appeal.status}
            </span>
            <span className="text-xs text-slate-500">
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
          <TableRow className="border-b-2 border-cyan-100/50 bg-gradient-to-r from-cyan-50/60 to-cyan-50/20">
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">ID</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">{tr.citizen}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">{tr.district}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">{tr.type}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">{tr.date}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">{tr.status}</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appeals.map((appeal) => (
            <TableRow 
              key={appeal.id} 
              className="cursor-pointer border-b border-cyan-50/70 transition-all duration-200 hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-cyan-50/50"
              onClick={() => handleRowClick(appeal)}
            >
              <TableCell className="py-4 px-6">
                <code className="rounded-lg bg-gradient-to-r from-teal-100 to-cyan-100 border border-teal-200 px-3 py-1.5 text-sm font-mono font-bold text-teal-700 shadow-sm">
                  {appeal.id}
                </code>
              </TableCell>
              <TableCell className="py-4 px-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 break-words">{appeal.citizenName}</span>
                  {(appeal.newMessagesCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse">
                      <MessageCircle className="h-3 w-3" />
                      {appeal.newMessagesCount}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className="text-sm text-slate-700 font-medium break-words">{appeal.district || "—"}</span>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className="text-sm text-slate-700 font-medium break-words">{appeal.category || "—"}</span>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className="text-sm text-slate-600 font-medium">
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
                  appeal.status === "PENDING" && "bg-blue-100 text-blue-700",
                  appeal.status === "IN_PROGRESS" && "bg-emerald-100 text-emerald-700",
                  appeal.status === "RESOLVED" && "bg-teal-100 text-teal-700",
                  appeal.status === "REJECTED" && "bg-rose-100 text-rose-700",
                  (appeal.status === "OVERDUE" || appeal.status === "overdue") && "bg-red-100 text-red-700"
                )}>
                  {STATUS_LABELS[appeal.status] || appeal.status}
                </span>
              </TableCell>
              <TableCell className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-cyan-50/60">
                      <MoreHorizontal className="h-4 w-4 text-slate-500" />
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
