"use client"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { Task } from "@/types"
import { PRIORITY_COLORS } from "@/components/dashboard/tasks/task-constants"
import { FileX, AlertTriangle } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { PremiumEmptyState, PremiumTableShell } from "@/components/dashboard/premium-dashboard-ui"

type TaskTableProps = {
  tasks: Task[]
  onView?: (task: Task) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: number) => void
}

export function TaskTable({ tasks }: TaskTableProps) {
  const router = useRouter()
  const t = useTranslation()

  const statusLabels: Record<string, string> = {
    YANGI: t.task.statuses.NEW,
    IJRODA: t.task.statuses.IN_PROGRESS,
    BAJARILDI: t.task.statuses.COMPLETED,
    QAYTA_IJROGA_YUBORILDI: t.task.statuses.REASSIGNED,
    MUDDATI_KECH: t.task.statuses.OVERDUE,
    BAJARILMADI: t.task.statuses.FAILED,
    NAZORATDAN_YECHILDI: t.task.statuses.RESOLVED,
  }

  const priorityLabels: Record<string, string> = {
    PAST: t.task.priorities.PAST,
    ODDIY: t.task.priorities.ODDIY,
    YUQORI: t.task.priorities.YUQORI,
    FAVQULODDA: t.task.priorities.FAVQULODDA,
    MUHIM: t.task.priorities.MUHIM,
    SHOSHILINCH: t.task.priorities.SHOSHILINCH,
    MUHIM_SHOSHILINCH: t.task.priorities.MUHIM_SHOSHILINCH,
  }

  const categoryLabels: Record<string, string> = {
    IJTIMOIY: t.task.categories.IJTIMOIY,
    IQTISODIY: t.task.categories.IQTISODIY,
    HUQUQIY: t.task.categories.HUQUQIY,
    INFRASTRUKTURA: t.task.categories.INFRASTRUKTURA,
    TA_LIM: t.task.categories.TA_LIM,
    SOG_LIQNI_SAQLASH: t.task.categories.SOG_LIQNI_SAQLASH,
    BOSHQA: t.task.categories.BOSHQA,
  }
  
  if (tasks.length === 0) {
    return (
      <PremiumEmptyState
        icon={FileX}
        title={t.tasks.emptyTitle}
        description={t.tasks.emptyDescription}
        tone="from-cyan-50 to-slate-100 text-slate-500"
      />
    )
  }

  return (
    <PremiumTableShell
      icon={ClipboardListIcon}
      title="Topshiriqlar ro'yxati"
      countLabel={`${tasks.length} ta topshiriq`}
      accentClassName="bg-gradient-to-r from-cyan-50/55 via-white/30 to-amber-50/35"
    >
      <div className="grid gap-3 p-4 md:hidden">
        {tasks.map((task) => {
          const isOverdue = task.deadline && new Date(task.deadline) < new Date() &&
            !["BAJARILDI", "NAZORATDAN_YECHILDI"].includes(task.status)
          const organizationsText = getOrganizationsText(task)

          return (
            <article
              key={task.id}
              className={cn(
                "rounded-[22px] border bg-white/90 p-4 shadow-[0_14px_30px_-24px_rgba(14,165,233,0.32)]",
                isOverdue ? "border-red-200" : "border-cyan-100/70",
              )}
            >
              <button type="button" onClick={() => router.push(`/dashboard/tasks/${task.id}`)} className="w-full text-left">
                <p className="break-words text-sm font-semibold text-slate-900">{task.title || "—"}</p>
                <p className="mt-2 text-sm text-slate-600">{categoryLabels[task.category] || task.category || "—"}</p>
                <p className="mt-1 break-words text-sm leading-6 text-slate-500">{organizationsText || "Tashkilot biriktirilmagan"}</p>
              </button>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge className={cn(
                  "border-0",
                  task.status === "YANGI" && "bg-blue-100 text-blue-700",
                  task.status === "IJRODA" && "bg-emerald-100 text-emerald-700",
                  task.status === "BAJARILDI" && "bg-teal-100 text-teal-700",
                  task.status === "QAYTA_IJROGA_YUBORILDI" && "bg-amber-100 text-amber-700",
                  task.status === "MUDDATI_KECH" && "bg-red-100 text-red-700",
                  task.status === "BAJARILMADI" && "bg-indigo-50/50 text-slate-700",
                  task.status === "NAZORATDAN_YECHILDI" && "bg-indigo-50/50 text-slate-700"
                )}>
                  {statusLabels[task.status] || task.status}
                </Badge>
                <Badge className={cn("border-0", PRIORITY_COLORS[task.priority] || "bg-slate-100 text-slate-700")}>
                  {priorityLabels[task.priority] || task.priority}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">
                <span className={cn("flex items-center gap-1", isOverdue && "font-semibold text-red-600")}>
                  {isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
                  Muddat: {formatTaskDate(task.deadline || task.due_date)}
                </span>
                <span>
                  Yaratilgan: {formatTaskDate(task.created_at)}
                </span>
              </div>
            </article>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[980px] table-fixed">
          <colgroup>
            <col className="w-[300px]" />
            <col className="w-[160px]" />
            <col className="w-[220px]" />
            <col className="w-[140px]" />
            <col className="w-[140px]" />
            <col className="w-[160px]" />
          </colgroup>
          <TableHeader>
            <TableRow className="border-b border-cyan-100/60 bg-gradient-to-r from-cyan-50/70 via-white to-slate-50/80 hover:bg-gradient-to-r">
              <TableHead className="h-12 px-4 py-3 text-sm font-semibold text-slate-800">{t.tasks.titleLabel}</TableHead>
              <TableHead className="h-12 px-4 py-3 text-sm font-semibold text-slate-800">{t.tasks.categoryLabel}</TableHead>
              <TableHead className="h-12 px-4 py-3 text-sm font-semibold text-slate-800">{t.tasks.organizationsLabel}</TableHead>
              <TableHead className="h-12 px-4 py-3 text-sm font-semibold text-slate-800">{t.tasks.deadlineLabel}</TableHead>
              <TableHead className="h-12 px-4 py-3 text-sm font-semibold text-slate-800">Yaratilgan sana</TableHead>
              <TableHead className="h-12 px-4 py-3 text-sm font-semibold text-slate-800">{t.tasks.statusLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const isOverdue = task.deadline && new Date(task.deadline) < new Date() &&
                !["BAJARILDI", "NAZORATDAN_YECHILDI"].includes(task.status)
              const organizationsText = getOrganizationsText(task)

              return (
                <TableRow
                  key={task.id}
                  className={cn(
                    "h-[72px] cursor-pointer align-middle border-b border-slate-200/80 odd:bg-white even:bg-slate-50/70 hover:bg-cyan-50/70",
                    isOverdue && "odd:bg-red-50/80 even:bg-red-50/70 hover:bg-red-50"
                  )}
                  onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                >
                  <TableCell className="px-4 py-3 align-middle">
                    <TruncatedCellText className="text-sm font-semibold text-slate-900" title={task.title || "—"}>
                      {task.title || "—"}
                    </TruncatedCellText>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle">
                    <TruncatedCellText className="text-sm font-medium text-slate-700" title={categoryLabels[task.category] || task.category || "—"}>
                      {categoryLabels[task.category] || task.category || "—"}
                    </TruncatedCellText>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle">
                    <TruncatedCellText className="text-sm text-slate-700" title={organizationsText || "—"}>
                      {organizationsText || "—"}
                    </TruncatedCellText>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm font-medium text-ellipsis",
                        isOverdue ? "text-red-600" : "text-slate-600"
                      )}
                      title={formatTaskDate(task.deadline || task.due_date)}
                    >
                      {isOverdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {formatTaskDate(task.deadline || task.due_date)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle">
                    <TruncatedCellText className="text-sm font-medium text-slate-600" title={formatTaskDate(task.created_at)}>
                      {formatTaskDate(task.created_at)}
                    </TruncatedCellText>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-middle">
                    <span
                      className={cn(
                        "inline-flex min-h-9 min-w-[112px] max-w-full items-center justify-center overflow-hidden rounded-full px-3 py-1.5 text-center text-xs font-semibold shadow-sm",
                        task.status === "YANGI" && "bg-blue-100 text-blue-700",
                        task.status === "IJRODA" && "bg-emerald-100 text-emerald-700",
                        task.status === "BAJARILDI" && "bg-teal-100 text-teal-700",
                        task.status === "QAYTA_IJROGA_YUBORILDI" && "bg-amber-100 text-amber-700",
                        task.status === "MUDDATI_KECH" && "bg-red-100 text-red-700",
                        task.status === "BAJARILMADI" && "bg-indigo-50/50 text-slate-700",
                        task.status === "NAZORATDAN_YECHILDI" && "bg-indigo-50/50 text-slate-700"
                      )}
                      title={statusLabels[task.status] || task.status}
                    >
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                        {statusLabels[task.status] || task.status}
                      </span>
                    </span>
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

function ClipboardListIcon(props: React.ComponentProps<typeof AlertTriangle>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M9 2h6"/><path d="M10 5h4"/><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 10h6"/><path d="M9 14h6"/><path d="M9 18h4"/></svg>
}

function getOrganizationsText(task: Task) {
  return (task.assigned_organizations || [])
    .map((org: any) => (typeof org === "object" ? (org.organization?.name || org.name) : org))
    .filter(Boolean)
    .join(", ")
}

function formatTaskDate(value?: string | null) {
  if (!value) return "—"

  return new Date(value).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function TruncatedCellText({
  children,
  className,
  title,
}: {
  children: React.ReactNode
  className?: string
  title: string
}) {
  return (
    <div
      className={cn("overflow-hidden whitespace-nowrap text-ellipsis", className)}
      title={title}
    >
      {children}
    </div>
  )
}
