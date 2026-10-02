"use client"

import type React from "react"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ClipboardList,
  Eye,
  FileX,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TaskStatusBadge, PriorityBadge } from "@/components/ui/status-badge"
import { PremiumEmptyState, PremiumTableShell } from "@/components/dashboard/premium-dashboard-ui"
import { cn } from "@/lib/utils"
import { useI18n, useTranslation } from "@/lib/i18n/context"
import { TASK_STATUS_TERMINAL } from "@/lib/status-styles"
import type { Task } from "@/types"

/**
 * Tuzatilgan nuqsonlar:
 *  - Satrlar klaviatura bilan ochilmasdi (onClick bor, tabIndex/onKeyDown yo'q)
 *    → endi role="link" + tabIndex + Enter/Space.
 *  - onView/onEdit/onDelete proplari e'lon qilingan, lekin destructuring'da
 *    tashlab ketilgan edi → hech qanday satr amali ishlamasdi. Endi ulangan.
 *  - Desktop jadvalda MUHIMLIK ustuni yo'q edi (mobil kartada bor) — ijro
 *    nazoratida bu ikkinchi eng muhim maydon. Qo'shildi.
 *  - min-w-[980px] + table-fixed + qattiq colgroup: 768–979px da yarim satr
 *    ko'rinardi, 1440px+ da bo'sh joy qolardi → moslashuvchan ustunlar,
 *    kamroq muhim ustunlar kichik ekranda yashiriladi.
 *  - "Bajarilmadi" va "Nazoratdan yechildi" bir xil ko'rinardi → status
 *    ranglari lib/status-styles.ts dan, uzuq chegara bilan ajratilgan.
 *  - toLocaleDateString("uz-UZ") tanlangan tildan qat'i nazar qotib qolgan edi.
 */

type SortKey = "title" | "deadline" | "created_at" | "status" | "priority"

type TaskTableProps = {
  tasks: Task[]
  onView?: (task: Task) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: number | string) => void
  /** Server tomonida saralash — berilmasa sarlavhalar bosilmaydi */
  sortKey?: SortKey
  sortDir?: "asc" | "desc"
  onSortChange?: (key: SortKey) => void
  /** Bo'sh holatda ko'rsatiladigan harakat tugmasi */
  emptyAction?: React.ReactNode
  canEdit?: boolean
  canDelete?: boolean
}

export function TaskTable({
  tasks,
  onView,
  onEdit,
  onDelete,
  sortKey,
  sortDir = "desc",
  onSortChange,
  emptyAction,
  canEdit = false,
  canDelete = false,
}: TaskTableProps) {
  const router = useRouter()
  const t = useTranslation()
  const { language: locale } = useI18n()

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(intlLocale(locale), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [locale],
  )

  const categoryLabels: Record<string, string> = {
    IJTIMOIY: t.task.categories.IJTIMOIY,
    IQTISODIY: t.task.categories.IQTISODIY,
    HUQUQIY: t.task.categories.HUQUQIY,
    INFRASTRUKTURA: t.task.categories.INFRASTRUKTURA,
    TA_LIM: t.task.categories.TA_LIM,
    SOG_LIQNI_SAQLASH: t.task.categories.SOG_LIQNI_SAQLASH,
    BOSHQA: t.task.categories.BOSHQA,
  }

  // Menyu doim ko'rsatiladi: «Ochish» bandi topshiriq sahifasiga olib
  // boradi (satrni bosish ham shuni qiladi, lekin klaviatura va sensorli
  // ekranda aniq band kerak).
  const hasActions = true

  if (tasks.length === 0) {
    return (
      <PremiumTableShell icon={ClipboardList} title={t.tasks.listTitle}>
        <PremiumEmptyState
          icon={FileX}
          title={t.tasks.emptyTitle}
          description={t.tasks.emptyDescription}
          action={emptyAction}
        />
      </PremiumTableShell>
    )
  }

  const open = (task: Task) => {
    if (onView) onView(task)
    else router.push(`/dashboard/tasks/${task.id}`)
  }

  const rowKeyDown = (e: React.KeyboardEvent, task: Task) => {
    if (e.key === "Enter" || e.key === " ") {
      // Satr ichidagi tugma/menyu bosilganda satr ochilmasligi kerak
      if ((e.target as HTMLElement).closest("[data-row-action]")) return
      e.preventDefault()
      open(task)
    }
  }

  return (
    <PremiumTableShell
      icon={ClipboardList}
      title={t.tasks.listTitle}
      countLabel={String(tasks.length)}
    >
      {/* ---------------------------------------------------------- MOBIL */}
      <ul className="contain-list divide-y divide-border md:hidden">
        {tasks.map((task) => {
          const overdue = isOverdue(task)
          const orgs = getOrganizationsText(task)

          return (
            <li key={task.id}>
              <div
                role="link"
                tabIndex={0}
                onClick={() => open(task)}
                onKeyDown={(e) => rowKeyDown(e, task)}
                className="row-link block w-full px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 break-words text-md font-semibold text-foreground">
                    {task.title || "—"}
                  </p>
                  {hasActions && (
                    <RowActions
                      task={task}
                      onOpen={() => open(task)}
                      onEdit={canEdit ? onEdit : undefined}
                      onDelete={canDelete ? onDelete : undefined}
                      labels={t}
                    />
                  )}
                </div>

                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {orgs || "Tashkilot biriktirilmagan"}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <TaskStatusBadge status={task.status} size="sm" showHint />
                  <PriorityBadge priority={task.priority} size="sm" />
                  {task.category && (
                    <span className="badge-status badge-status-plain st-bajarilmadi text-2xs">
                      {categoryLabels[task.category] || task.category}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      overdue && "font-semibold text-destructive",
                    )}
                  >
                    {overdue && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
                    {t.tasks.deadlineLabel}: {fmt(dateFmt, task.deadline || task.due_date)}
                  </span>
                  <span>Yaratilgan: {fmt(dateFmt, task.created_at)}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {/* -------------------------------------------------------- DESKTOP */}
      <div className="scroll-x hidden md:block">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead k="title" {...{ sortKey, sortDir, onSortChange }} className="w-[26%]">
                {t.tasks.titleLabel}
              </SortableHead>
              <TableHead className="hidden w-[18%] lg:table-cell">
                {t.tasks.organizationsLabel}
              </TableHead>
              <SortableHead k="priority" {...{ sortKey, sortDir, onSortChange }} className="w-[11%]">
                Muhimlik
              </SortableHead>
              <SortableHead k="deadline" {...{ sortKey, sortDir, onSortChange }} className="w-[13%]">
                {t.tasks.deadlineLabel}
              </SortableHead>
              <TableHead className="hidden w-[13%] xl:table-cell">Yaratilgan</TableHead>
              <SortableHead k="status" {...{ sortKey, sortDir, onSortChange }} className="w-[15%]">
                {t.tasks.statusLabel}
              </SortableHead>
              {hasActions && (
                <TableHead className="w-[56px] text-right">
                  <span className="sr-only">Amallar</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="contain-list">
            {tasks.map((task) => {
              const overdue = isOverdue(task)
              const orgs = getOrganizationsText(task)

              return (
                <TableRow
                  key={task.id}
                  role="link"
                  tabIndex={0}
                  aria-label={task.title || undefined}
                  onClick={() => open(task)}
                  onKeyDown={(e) => rowKeyDown(e, task)}
                  className={cn(
                    "row-link h-14",
                    overdue && "bg-destructive-soft/40 hover:bg-destructive-soft/70",
                  )}
                >
                  <TableCell className="max-w-0">
                    <p className="truncate font-semibold text-foreground" title={task.title || "—"}>
                      {task.title || "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground lg:hidden" title={orgs}>
                      {orgs || "—"}
                    </p>
                  </TableCell>

                  <TableCell className="hidden max-w-0 lg:table-cell">
                    <p className="truncate text-muted-foreground" title={orgs || "—"}>
                      {orgs || "—"}
                    </p>
                  </TableCell>

                  <TableCell>
                    <PriorityBadge priority={task.priority} size="sm" />
                  </TableCell>

                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 whitespace-nowrap font-medium tabular-nums",
                        overdue ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {overdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                      {fmt(dateFmt, task.deadline || task.due_date)}
                    </span>
                  </TableCell>

                  <TableCell className="hidden whitespace-nowrap tabular-nums text-muted-foreground xl:table-cell">
                    {fmt(dateFmt, task.created_at)}
                  </TableCell>

                  <TableCell>
                    <TaskStatusBadge status={task.status} showHint />
                  </TableCell>

                  {hasActions && (
                    <TableCell className="text-right">
                      <RowActions
                        task={task}
                        onOpen={() => open(task)}
                        onEdit={canEdit ? onEdit : undefined}
                        onDelete={canDelete ? onDelete : undefined}
                        labels={t}
                      />
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </PremiumTableShell>
  )
}

/* ------------------------------------------------------------- YORDAMCHILAR */

function SortableHead({
  k,
  sortKey,
  sortDir,
  onSortChange,
  className,
  children,
}: {
  k: SortKey
  sortKey?: SortKey
  sortDir?: "asc" | "desc"
  onSortChange?: (key: SortKey) => void
  className?: string
  children: React.ReactNode
}) {
  const active = sortKey === k
  if (!onSortChange) {
    return <TableHead className={className}>{children}</TableHead>
  }
  return (
    <TableHead
      className={className}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSortChange(k)}
        className="inline-flex items-center gap-1 rounded-xs font-semibold hover:text-foreground"
      >
        {children}
        <span aria-hidden className={cn("text-2xs", active ? "opacity-100" : "opacity-30")}>
          {active && sortDir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </TableHead>
  )
}

function RowActions({
  task,
  onOpen,
  onEdit,
  onDelete,
  labels,
}: {
  task: Task
  onOpen: () => void
  onEdit?: (task: Task) => void
  onDelete?: (id: number | string) => void
  labels: any
}) {
  return (
    <div data-row-action onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`${task.title ?? "Topshiriq"} — amallar`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={onOpen}>
            <Eye className="mr-2 h-4 w-4" aria-hidden />
            Ochish
          </DropdownMenuItem>
          {onEdit && (
            <DropdownMenuItem onSelect={() => onEdit(task)}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden />
              {labels.common?.edit ?? "Tahrirlash"}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem
              onSelect={() => onDelete(task.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              {labels.common?.delete ?? "O'chirish"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function isOverdue(task: Task) {
  if (!task.deadline) return false
  if (TASK_STATUS_TERMINAL.has(task.status) || task.status === "BAJARILDI") return false
  return new Date(task.deadline) < new Date()
}

function getOrganizationsText(task: Task) {
  return (task.assigned_organizations || [])
    .map((org: any) => (typeof org === "object" ? org.organization?.name || org.name : org))
    .filter(Boolean)
    .join(", ")
}

function fmt(f: Intl.DateTimeFormat, value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "—" : f.format(d)
}

function intlLocale(locale: string) {
  switch (locale) {
    case "ru":
      return "ru-RU"
    case "en":
      return "en-GB"
    case "uz-cyrl":
      return "uz-Cyrl-UZ"
    default:
      return "uz-Latn-UZ"
  }
}
