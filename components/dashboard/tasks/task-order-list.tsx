"use client"

import type React from "react"
import { memo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Eye,
  ListFilter,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  PRIORITIES,
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  PRIORITY_SHORT,
  TASK_STATUSES,
  TASK_STATUS_CLASS,
  TASK_STATUS_HINT,
  TASK_STATUS_LABEL,
  TASK_STATUS_SHORT,
  TASK_STATUS_TERMINAL,
  formatDateShort,
} from "@/lib/status-styles"
import type { Task } from "@/types"

/**
 * TOPSHIRIQLAR — «ORDER LIST» KO'RINISHI
 * =====================================
 *
 * Dizayn manbasi: DashStack admin UI kit (foydalanuvchi tasdiqlagan Figma).
 * Bitta oq plita ichida uch qavat:
 *
 *   1. FILTR QATORI   — [⧩] │ Filtrlash │ Muddat ▾ │ Muhimlik ▾ │ Holat ▾ │ ↺ Tozalash
 *   2. JADVAL         — ID · MAVZU · TASHKILOT · MUDDAT · MUHIMLIK · HOLAT
 *   3. SAHIFALASH     — «78 tadan 1–9» + ikkita doira tugma
 *
 * NEGA CHEGARA BOR
 * ----------------
 * Loyiha standarti «qattiq chegara yo'q» deydi va bu to'g'ri: bezak uchun
 * chegara ishlatilmaydi. Bu yerda chegara BEZAK EMAS — jadval yacheykalari
 * orasidagi hisob to'ri (grid), ya'ni ma'noni tashiydigan chiziq. Shuning
 * uchun u `border` utility bilan emas, loyiha inputlarida allaqachon
 * ishlatiladigan `shadow-[inset_0_0_0_1px_var(--border)]` va `divide-border`
 * orqali chiziladi — rang tokendan keladi, qorong'i tema o'zi ishlaydi.
 *
 * NEGA ID USTUNI QISQA KOD
 * ------------------------
 * Bazada birlamchi kalit — UUID (`core.models.UUIDModel`). Uni to'liq
 * ko'rsatish mumkin emas (36 belgi), `task.number` esa frontend tipida
 * e'lon qilingan, lekin backend modelida ham, serializerda ham YO'Q —
 * ya'ni doim `undefined`. Shuning uchun UUID'dan barqaror olti belgili
 * kod yasaladi: bir xil topshiriq har doim bir xil kod oladi va uni
 * telefonda aytib berish mumkin.
 */

/* ----------------------------------------------------------------- TURLAR */

export type TaskSortKey = "title" | "deadline" | "created_at" | "status" | "priority"

export type OrderListFilters = {
  search: string
  status: string
  priority: string
  deadlineFrom: string
  deadlineTo: string
  sector: string
  organization: string
  deputy: string
  author: string
}

/* ------------------------------------------------------------ YORDAMCHILAR */

/** UUID yoki sonli id'dan barqaror, o'qiladigan kod. */
export function taskCode(id: unknown): string {
  const raw = String(id ?? "")
  if (!raw) return "—"
  if (/^\d+$/.test(raw)) return `№${raw.padStart(5, "0")}`
  const hex = raw.replace(/[^0-9a-fA-F]/g, "")
  return hex ? `T-${hex.slice(0, 6).toUpperCase()}` : raw.slice(0, 8)
}

export function isTaskOverdue(task: Task): boolean {
  const deadline = task.deadline || task.due_date
  if (!deadline) return false
  if (TASK_STATUS_TERMINAL.has(task.status) || task.status === "BAJARILDI") return false
  const d = new Date(deadline)
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now()
}

export function taskOrganizationsText(task: Task): string {
  const list = (task.assigned_organizations || task.organizations || []) as any[]
  return list
    .map((org) =>
      typeof org === "object" && org !== null
        ? org.organization?.name || org.organization_name || org.name
        : org,
    )
    .filter(Boolean)
    .join(", ")
}

/** Muddatgacha qolgan kunlar (butun kun, bugundan). Kechikkanda manfiy. */
export function daysUntil(value?: string | null): number | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  return Math.round((startOf(d) - startOf(new Date())) / 86_400_000)
}

/* ======================================================== FILTR QATORI ==== */

type FilterBarProps = {
  value: OrderListFilters
  onChange: (patch: Partial<OrderListFilters>) => void
  onClear: () => void
  /** Filtrlardan birortasi qo'yilganmi */
  dirty: boolean
}

/**
 * Segmentli filtr qatori. Telefonda gorizontal siljiydi — beshta segment
 * 360px ga sig'maydi, `grid-cols-N` esa matnni ezib qo'yadi.
 */
export const TaskOrderFilterBar = memo(function TaskOrderFilterBar({
  value,
  onChange,
  onClear,
  dirty,
}: FilterBarProps) {
  return (
    <div className="scroll-x flex items-stretch">
      {/* Ikonka — segmentlar boshlanishini bildiradi */}
      <div className="flex h-[60px] w-14 shrink-0 items-center justify-center text-muted-foreground">
        <ListFilter className="h-[18px] w-[18px]" aria-hidden />
      </div>

      <Divider />

      <div className="flex h-[60px] shrink-0 items-center px-4 text-sm font-semibold text-foreground">
        Filtrlash
      </div>

      <Divider />

      <FilterSelect
        id="ol-deadline"
        label="Muddat"
        value={deadlinePresetOf(value)}
        onChange={(v) => onChange(deadlinePreset(v))}
        options={[
          { value: "all", label: "Muddat" },
          { value: "today", label: "Bugun" },
          { value: "week", label: "Shu hafta" },
          { value: "month", label: "Shu oy" },
          { value: "overdue", label: "Muddati o'tgan" },
        ]}
      />

      <Divider />

      <FilterSelect
        id="ol-priority"
        label="Muhimlik"
        value={value.priority}
        onChange={(v) => onChange({ priority: v })}
        options={[
          { value: "all", label: "Muhimlik" },
          ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] })),
        ]}
      />

      <Divider />

      <FilterSelect
        id="ol-status"
        label="Holat"
        value={value.status}
        onChange={(v) => onChange({ status: v })}
        options={[
          { value: "all", label: "Holat" },
          ...TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] })),
        ]}
      />

      <Divider />

      <button
        type="button"
        onClick={onClear}
        disabled={!dirty}
        className={cn(
          "inline-flex h-[60px] shrink-0 items-center gap-2 px-4 text-sm font-semibold whitespace-nowrap transition-colors",
          dirty
            ? "text-destructive hover:bg-destructive-soft"
            : "cursor-default text-muted-foreground opacity-50",
        )}
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Filtrni tozalash
      </button>
    </div>
  )
})

function Divider() {
  return <div aria-hidden className="my-3.5 w-px shrink-0 bg-border" />
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const active = value !== "all"
  return (
    <div className="relative flex h-[60px] shrink-0 items-center">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-[60px] cursor-pointer appearance-none bg-transparent pl-4 pr-8 text-sm font-semibold outline-none",
          "focus-visible:bg-muted",
          active ? "text-primary" : "text-foreground",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 12 8"
        className={cn(
          "pointer-events-none absolute right-3 h-2 w-3",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  )
}

/* Muddat presetlari — bitta select ikkita sanani boshqaradi */

function pad(n: number) {
  return String(n).padStart(2, "0")
}
function iso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function deadlinePreset(preset: string): Partial<OrderListFilters> {
  const now = new Date()
  switch (preset) {
    case "today":
      return { deadlineFrom: iso(now), deadlineTo: iso(now), status: "all" }
    case "week": {
      // Dushanbadan yakshanbagacha
      const day = (now.getDay() + 6) % 7
      const from = new Date(now)
      from.setDate(now.getDate() - day)
      const to = new Date(from)
      to.setDate(from.getDate() + 6)
      return { deadlineFrom: iso(from), deadlineTo: iso(to) }
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { deadlineFrom: iso(from), deadlineTo: iso(to) }
    }
    case "overdue":
      return { deadlineFrom: "", deadlineTo: "", status: "MUDDATI_KECH" }
    default:
      return { deadlineFrom: "", deadlineTo: "" }
  }
}

function deadlinePresetOf(f: OrderListFilters): string {
  if (f.status === "MUDDATI_KECH" && !f.deadlineFrom && !f.deadlineTo) return "overdue"
  if (!f.deadlineFrom && !f.deadlineTo) return "all"
  const now = new Date()
  if (f.deadlineFrom === iso(now) && f.deadlineTo === iso(now)) return "today"
  const m = deadlinePreset("month")
  if (f.deadlineFrom === m.deadlineFrom && f.deadlineTo === m.deadlineTo) return "month"
  const w = deadlinePreset("week")
  if (f.deadlineFrom === w.deadlineFrom && f.deadlineTo === w.deadlineTo) return "week"
  return "all"
}

/* ============================================================ QIDIRUV ==== */

export function TaskSearchField({
  value,
  onChange,
  placeholder = "Topshiriq nomi, mazmuni yoki kodi bo'yicha qidirish…",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <label htmlFor="task-search" className="sr-only">
        Topshiriqlar orasidan qidirish
      </label>
      <input
        id="task-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-[10px] bg-card pl-10 pr-3 text-sm text-foreground shadow-[inset_0_0_0_1px_var(--border)] placeholder:text-muted-foreground focus:shadow-[inset_0_0_0_1.5px_var(--primary)] focus:outline-none"
      />
    </div>
  )
}

/* ============================================================== JADVAL ==== */

type TaskOrderListProps = {
  tasks: Task[]
  /** Hozircha ishlatilmaydi: sanalar o'zbekcha qat'iy formatda chiziladi */
  locale?: string
  /** 1 dan boshlanuvchi sahifa raqami */
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  sortKey?: TaskSortKey
  sortDir?: "asc" | "desc"
  onSortChange?: (key: TaskSortKey) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: number | string) => void
  emptyAction?: React.ReactNode
  /** Filtr qatori — plita ichiga, jadval tepasiga joylashadi */
  filterBar?: React.ReactNode
}

export function TaskOrderList({
  tasks,
  page,
  pageSize,
  totalCount,
  onPageChange,
  sortKey,
  sortDir = "asc",
  onSortChange,
  onEdit,
  onDelete,
  emptyAction,
  filterBar,
}: TaskOrderListProps) {
  const router = useRouter()

  const open = useCallback(
    (task: Task) => {
      router.push(`/dashboard/tasks/${task.id}`)
    },
    [router],
  )

  const rowKeyDown = useCallback(
    (e: React.KeyboardEvent, task: Task) => {
      if (e.key !== "Enter" && e.key !== " ") return
      if ((e.target as HTMLElement).closest("[data-row-action]")) return
      e.preventDefault()
      open(task)
    },
    [open],
  )

  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <section className="overflow-hidden rounded-[14px] bg-card shadow-[inset_0_0_0_1px_var(--border),0_1px_2px_rgb(13_21_36_/_0.04)]">
      {filterBar && (
        <>
          {filterBar}
          <div aria-hidden className="h-px bg-border" />
        </>
      )}

      {tasks.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-md font-semibold text-foreground">Topshiriq topilmadi</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Tanlangan filtrlarga mos topshiriq yo'q. Filtrni tozalab ko'ring yoki yangi topshiriq
            yarating.
          </p>
          {emptyAction && <div className="mt-5 flex justify-center">{emptyAction}</div>}
        </div>
      ) : (
        <>
          {/* ------------------------------------------------------ DESKTOP */}
          <div className="scroll-x hidden md:block">
            <table className="w-full min-w-[1000px] table-fixed border-collapse text-sm">
              {/*
                Ustun kengliklari QAT'IY (`table-fixed` + colgroup).
                Avtomatik kenglikda uzun tashkilot nomi butun jadvalni
                cho'zib yuborar, nishonlar esa siqilib matni ikki qatorga
                bo'linardi — ekrandagi «ustma-ust tushgan yozuvlar» aynan
                shundan edi.
              */}
              <colgroup>
                <col className="w-[108px]" />
                <col />
                <col className="hidden w-[26%] lg:table-column" />
                <col className="w-[152px]" />
                <col className="w-[136px]" />
                <col className="w-[160px]" />
                <col className="w-[56px]" />
              </colgroup>
              <thead>
                <tr className="[&>th]:h-[52px] [&>th]:px-5 [&>th]:text-left [&>th]:align-middle">
                  <Th>ID</Th>
                  <Th sortable="title" {...{ sortKey, sortDir, onSortChange }}>
                    Mavzu
                  </Th>
                  <Th className="hidden lg:table-cell">Tashkilot</Th>
                  <Th sortable="deadline" {...{ sortKey, sortDir, onSortChange }}>
                    Muddat
                  </Th>
                  <Th sortable="priority" {...{ sortKey, sortDir, onSortChange }}>
                    Muhimlik
                  </Th>
                  <Th sortable="status" {...{ sortKey, sortDir, onSortChange }}>
                    Holat
                  </Th>
                  <th className="px-2">
                    <span className="sr-only">Amallar</span>
                  </th>
                </tr>
              </thead>

              <tbody className="contain-list">
                {tasks.map((task) => {
                  const overdue = isTaskOverdue(task)
                  const orgs = taskOrganizationsText(task)
                  const deadline = task.deadline || task.due_date
                  const left = daysUntil(deadline)

                  return (
                    <tr
                      key={String(task.id)}
                      role="link"
                      tabIndex={0}
                      aria-label={task.title || undefined}
                      onClick={() => open(task)}
                      onKeyDown={(e) => rowKeyDown(e, task)}
                      className="row-link h-[64px] cursor-pointer border-t border-border align-middle transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <td className="px-5 align-middle">
                        <span className="whitespace-nowrap font-medium tabular-nums text-muted-foreground">
                          {taskCode(task.id)}
                        </span>
                      </td>

                      <td className="max-w-0 px-5 align-middle">
                        <p className="truncate font-semibold text-foreground" title={task.title || "—"}>
                          {task.title || "—"}
                        </p>
                        <p
                          className="truncate text-xs text-muted-foreground lg:hidden"
                          title={orgs || undefined}
                        >
                          {orgs || "Tashkilot biriktirilmagan"}
                        </p>
                      </td>

                      <td className="hidden max-w-0 px-5 align-middle lg:table-cell">
                        <p className="truncate text-muted-foreground" title={orgs || undefined}>
                          {orgs || "—"}
                        </p>
                      </td>

                      <td className="px-5 align-middle">
                        <span
                          className={cn(
                            "flex items-center gap-1.5 whitespace-nowrap tabular-nums",
                            overdue ? "font-semibold text-destructive" : "text-foreground",
                          )}
                        >
                          {overdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                          {formatDateShort(deadline)}
                        </span>
                        {!overdue && left !== null && left >= 0 && left <= 3 && (
                          <span className="mt-0.5 block whitespace-nowrap text-2xs font-semibold text-warning-soft-foreground">
                            {left === 0 ? "Bugun tugaydi" : `${left} kun qoldi`}
                          </span>
                        )}
                      </td>

                      <td className="px-5 align-middle">
                        <Pill
                          tone={PRIORITY_CLASS[task.priority]}
                          label={PRIORITY_SHORT[task.priority] ?? task.priority}
                          title={PRIORITY_LABEL[task.priority]}
                        />
                      </td>

                      <td className="px-5 align-middle">
                        <Pill
                          tone={TASK_STATUS_CLASS[task.status]}
                          label={TASK_STATUS_SHORT[task.status] ?? task.status}
                          title={`${TASK_STATUS_LABEL[task.status] ?? task.status} — ${TASK_STATUS_HINT[task.status] ?? ""}`}
                        />
                      </td>

                      <td className="px-2 text-right align-middle">
                        <RowActions
                          task={task}
                          onOpen={() => open(task)}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* -------------------------------------------------------- MOBIL */}
          <ul className="contain-list divide-y divide-border md:hidden">
            {tasks.map((task) => {
              const overdue = isTaskOverdue(task)
              const orgs = taskOrganizationsText(task)
              const deadline = task.deadline || task.due_date
              const left = daysUntil(deadline)

              return (
                <li key={String(task.id)}>
                  <div
                    role="link"
                    tabIndex={0}
                    onClick={() => open(task)}
                    onKeyDown={(e) => rowKeyDown(e, task)}
                    className="row-link block w-full px-4 py-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-2xs font-semibold tabular-nums text-muted-foreground">
                        {taskCode(task.id)}
                      </span>
                      <RowActions
                        task={task}
                        onOpen={() => open(task)}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </div>

                    <p className="mt-0.5 break-words text-md font-semibold text-foreground">
                      {task.title || "—"}
                    </p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {orgs || "Tashkilot biriktirilmagan"}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Pill
                        tone={TASK_STATUS_CLASS[task.status]}
                        label={TASK_STATUS_SHORT[task.status] ?? task.status}
                        title={TASK_STATUS_LABEL[task.status]}
                      />
                      <Pill
                        tone={PRIORITY_CLASS[task.priority]}
                        label={PRIORITY_SHORT[task.priority] ?? task.priority}
                        title={PRIORITY_LABEL[task.priority]}
                      />
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 tabular-nums",
                          overdue ? "font-semibold text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {overdue && <AlertTriangle className="h-3.5 w-3.5" aria-hidden />}
                        Muddat: {formatDateShort(deadline)}
                      </span>
                      {!overdue && left !== null && left >= 0 && left <= 3 && (
                        <span className="font-semibold text-warning-soft-foreground">
                          {left === 0 ? "Bugun tugaydi" : `${left} kun qoldi`}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {/* --------------------------------------------------------- SAHIFALASH */}
      {totalCount > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3.5 sm:flex-row sm:px-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">
              {from}–{to}
            </span>{" "}
            ko'rsatilmoqda, jami{" "}
            <span className="font-semibold tabular-nums text-foreground">{totalCount}</span>
          </p>

          {totalPages > 1 && (
            <nav aria-label="Sahifalar" className="flex items-center gap-2">
              <PageCircle
                label="Oldingi sahifa"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </PageCircle>
              <span className="min-w-[68px] text-center text-sm font-semibold tabular-nums text-foreground">
                {page} / {totalPages}
              </span>
              <PageCircle
                label="Keyingi sahifa"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </PageCircle>
            </nav>
          )}
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------ BO'LAKLAR */

function Th({
  children,
  className,
  sortable,
  sortKey,
  sortDir,
  onSortChange,
}: {
  children: React.ReactNode
  className?: string
  sortable?: TaskSortKey
  sortKey?: TaskSortKey
  sortDir?: "asc" | "desc"
  onSortChange?: (key: TaskSortKey) => void
}) {
  const base = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
  if (!sortable || !onSortChange) {
    return <th className={cn(base, className)}>{children}</th>
  }
  const active = sortKey === sortable
  // Matn belgilari (▲ ▼) shriftga qarab turlicha chiziladi va sarlavha
  // bilan bir xil chiziqda turmaydi — ikonkalar barqarorroq.
  const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ArrowUp : ArrowDown
  return (
    <th
      className={cn(base, className)}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSortChange(sortable)}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap rounded-xs uppercase tracking-wider transition-colors",
          "hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          active && "text-foreground",
        )}
      >
        {children}
        <Icon
          aria-hidden
          className={cn("h-3 w-3 shrink-0", active ? "opacity-100" : "opacity-35")}
        />
      </button>
    </th>
  )
}

/**
 * DashStack nishoni: to'rtburchak, yumshoq fon, o'z rangidagi chegara,
 * qat'iy minimal kenglik — ustun bo'ylab hammasi bir xil enlikda turadi.
 */
function Pill({ tone, label, title }: { tone?: string; label: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        // `whitespace-nowrap` — MAJBURIY. Busiz «Muddati kechikkan» ikki
        // qatorga bo'linib, qat'iy balandlikdagi qutidan toshib chiqar va
        // pastdagi qator bilan ustma-ust tushardi.
        "inline-flex min-h-7 min-w-[104px] items-center justify-center whitespace-nowrap",
        "rounded-[6px] border px-2.5 py-1 text-xs font-semibold leading-5",
        tone || "st-bajarilmadi",
      )}
    >
      {label}
    </span>
  )
}

function PageCircle({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors",
        disabled ? "opacity-35" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}

function RowActions({
  task,
  onOpen,
  onEdit,
  onDelete,
}: {
  task: Task
  onOpen: () => void
  onEdit?: (task: Task) => void
  onDelete?: (id: number | string) => void
}) {
  return (
    <div data-row-action onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
              Tahrirlash
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem
              onSelect={() => onDelete(task.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              O'chirish
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

