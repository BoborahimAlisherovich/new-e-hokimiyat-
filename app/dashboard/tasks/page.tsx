"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpDown, Plus, ShieldCheck, Sparkles } from "lucide-react"

import { Header } from "@/components/layout/header"
import {
  EMPTY_TASK_FILTERS,
  TaskFilters,
  TaskViewTabs,
  viewToParams,
  type PersonOption,
  type TaskFilterState,
  type TaskView,
  type TaskViewCounts,
} from "@/components/dashboard/tasks/task-filters"
import { TaskStats } from "@/components/dashboard/tasks/task-stats"
import { TaskTable } from "@/components/dashboard/tasks/task-table"
import { PremiumTableSkeleton, PremiumStatsSkeleton } from "@/components/dashboard/premium-dashboard-ui"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/context"
import { getCurrentUser } from "@/lib/api/auth.api"
import { getAssignableOrganizations, type AssignableOrganization } from "@/lib/api/organizations.api"
import { getSectors, type Sector } from "@/lib/api/sectors.api"
import { getUsers } from "@/lib/api/users.api"
import { deleteTask, getTaskStats, getTasksPage } from "@/lib/api/tasks.api"
import type { Task } from "@/types"

/**
 * TOPSHIRIQLAR RO'YXATI
 *
 * Bu qadamda tuzatilgani:
 *  1. Satrni bosganda modal ochilardi (`TaskDetailDialog`) — mazmun,
 *     isbotlar, chat va tarix telefon ekranida sig'masdi. Endi har bir
 *     topshiriq O'Z SAHIFASIDA ochiladi: /dashboard/tasks/[id].
 *  2. «Tahrirlash» ham shu modalni ochardi (ya'ni tahrirlamasdi). Endi
 *     topshiriq sahifasiga o'tadi — tahrirlash oynasi shu yerda va
 *     huquq backend bayrog'i (can_edit) bilan tekshiriladi.
 *  3. Filtrlar: tezkor ko'rinish tablari (Menga tegishli, Tasdiqlashda,
 *     Kechikkan…), mas'ul yordamchi, muallif va muddat oralig'i qo'shildi.
 *  4. Tashkilot ro'yxati endi `/organizations/assignable/` dan keladi —
 *     hokim yordamchisi faqat O'ZIGA biriktirilgan tashkilotlarni
 *     ko'radi, ilgari esa hamma tashkilot chiqardi.
 *  5. Jadval sarlavhalari bo'yicha saralash ishlaydi (ilgari `sortKey`
 *     uzatilmagani uchun sarlavhalar bosilmasdi).
 *  6. Telefon uchun: tab qatori gorizontal siljiydi, KPI plitalari
 *     ikki ustun, asosiy harakat pastda qadalgan.
 */

type StatsShape = {
  total: number
  pending: number
  in_progress: number
  completed: number
  awaiting_approval: number
  returned: number
  overdue: number
}

const EMPTY_STATS: StatsShape = {
  total: 0,
  pending: 0,
  in_progress: 0,
  completed: 0,
  awaiting_approval: 0,
  returned: 0,
  overdue: 0,
}

type SortKey = "title" | "deadline" | "created_at" | "status" | "priority"

const SORT_FIELD: Record<SortKey, string> = {
  title: "title",
  deadline: "deadline",
  created_at: "created_at",
  status: "status",
  priority: "priority",
}

const SCOPE_NOTE: Record<string, string> = {
  curated: "Sizga biriktirilgan tashkilotlar",
  sector: "Sohangizdagi tashkilotlar",
  own: "O‘z tashkilotingiz",
  all: "",
  none: "",
}

export default function TasksPage() {
  const t = useTranslation()
  const router = useRouter()

  /* --------------------------------------------------------- Ma'lumotnoma */
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [organizations, setOrganizations] = useState<AssignableOrganization[]>([])
  const [orgScope, setOrgScope] = useState<string>("all")
  const [sectors, setSectors] = useState<Sector[]>([])
  const [deputies, setDeputies] = useState<PersonOption[]>([])
  const [refLoaded, setRefLoaded] = useState(false)
  const [refError, setRefError] = useState<string | null>(null)

  /* ------------------------------------------------------------- Ro'yxat */
  const [tasks, setTasks] = useState<Task[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState<StatsShape>(EMPTY_STATS)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  /* ------------------------------------------------------------- Filtrlar */
  const [view, setView] = useState<TaskView>("all")
  const [filters, setFilters] = useState<TaskFilterState>(EMPTY_TASK_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>("deadline")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const reqIdRef = useRef(0)

  /* --------------------------------------- Ma'lumotnomani BIR MARTA yuklash */
  useEffect(() => {
    let alive = true

    Promise.all([
      getCurrentUser().catch(() => null),
      getAssignableOrganizations().catch(() => null),
      getSectors().catch(() => [] as Sector[]),
    ])
      .then(([me, assignable, secs]) => {
        if (!alive) return
        setCurrentUser(me)
        setOrganizations(assignable?.organizations ?? [])
        setOrgScope(assignable?.scope ?? "all")
        setSectors((secs as Sector[]).filter((s) => s.is_active !== false))

        // Mas'ul yordamchi filtri faqat hokim va admin uchun kerak
        const role = String((me as any)?.role ?? "")
        if (role === "HOKIM" || role === "ADMIN") {
          void getUsers({ role: "HOKIM_YORDAMCHISI" } as any, 1, 200)
            .then((list) => {
              if (!alive) return
              setDeputies(
                (list || []).map((u: any) => ({
                  id: u.id,
                  name: u.full_name || [u.last_name, u.first_name].filter(Boolean).join(" ") || u.username,
                })),
              )
            })
            .catch(() => undefined)
        }
      })
      .catch(() => {
        if (alive) setRefError("Ma’lumotnomani yuklab bo‘lmadi.")
      })
      .finally(() => {
        if (alive) setRefLoaded(true)
      })

    return () => {
      alive = false
    }
  }, [])

  /* ---------------------------------------------------- Mobil sahifa hajmi */
  useEffect(() => {
    if (typeof window === "undefined") return
    const media = window.matchMedia?.("(max-width: 767px)")
    const apply = () => setPageSize(media?.matches ? 20 : 50)
    apply()
    media?.addEventListener?.("change", apply)
    return () => media?.removeEventListener?.("change", apply)
  }, [])

  /* ------------------------------------------------------------- Rollar */
  const role = String(currentUser?.role ?? "")
  const canCreateTask = Boolean(currentUser?.permissions?.can_create_tasks)
  const canApprove = role === "HOKIM" || role === "HOKIM_YORDAMCHISI" || role === "ADMIN"
  const canDelete = role === "HOKIM" || role === "ADMIN"
  const isWideScope = role === "HOKIM" || role === "ADMIN"

  /* ------------------------------------------------------ Ro'yxatni yuklash */
  const query = useMemo(() => {
    const f: Record<string, string> = { ...viewToParams(view) }
    if (filters.search.trim()) f.search = filters.search.trim()
    if (filters.status !== "all") f.status = filters.status
    if (filters.priority !== "all") f.priority = filters.priority
    if (filters.sector !== "all") f.sector = filters.sector
    if (filters.organization !== "all") f.organization = filters.organization
    if (filters.deputy !== "all") f.deputy = filters.deputy
    if (filters.author !== "all") f.author = filters.author
    if (filters.deadlineFrom) f.deadline_from = filters.deadlineFrom
    if (filters.deadlineTo) f.deadline_to = filters.deadlineTo
    return f
  }, [view, filters])

  const ordering = useMemo(
    () => `${sortDir === "desc" ? "-" : ""}${SORT_FIELD[sortKey]}`,
    [sortKey, sortDir],
  )

  const loadList = useCallback(async () => {
    const id = ++reqIdRef.current
    setListLoading(true)
    setListError(null)

    try {
      const [tasksPage, statsData] = await Promise.all([
        getTasksPage(query as any, page, pageSize, ordering),
        getTaskStats(query as any),
      ])

      // Kechikkan javob yangi natijani bosib ketmasligi uchun
      if (id !== reqIdRef.current) return

      setTasks(tasksPage?.results || [])
      setTotalCount(tasksPage?.count ?? 0)
      setStats({ ...EMPTY_STATS, ...(statsData as any) })
    } catch (err: any) {
      if (id !== reqIdRef.current) return
      setTasks([])
      setTotalCount(0)
      setStats(EMPTY_STATS)
      setListError(
        err?.message ||
          "Topshiriqlarni yuklab bo‘lmadi. Ulanishni tekshirib, qayta urinib ko‘ring.",
      )
    } finally {
      if (id === reqIdRef.current) setListLoading(false)
    }
  }, [query, page, pageSize, ordering])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    setPage(1)
  }, [view, filters])

  /* -------------------------------------------------- Tab yonidagi sanoqlar */
  const viewCounts: TaskViewCounts = useMemo(
    () => ({
      awaiting: stats.awaiting_approval,
      overdue: stats.overdue,
      active: stats.in_progress,
    }),
    [stats],
  )

  /* ----------------------------------------------------------- Harakatlar */
  const handleDelete = useCallback(
    async (taskId: number | string) => {
      if (!window.confirm(t.pages?.tasks?.deleteConfirm ?? "Topshiriq o‘chirilsinmi?")) return
      try {
        await deleteTask(taskId)
        await loadList()
      } catch {
        setListError("O‘chirib bo‘lmadi. Huquqingiz yetarli ekanini tekshirib ko‘ring.")
      }
    },
    [loadList, t],
  )

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        return prev
      }
      setSortDir(key === "created_at" || key === "priority" ? "desc" : "asc")
      return key
    })
  }, [])

  const patchFilters = useCallback((patch: Partial<TaskFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const scopeNote = SCOPE_NOTE[orgScope] || undefined

  /* ------------------------------------------------------------------ RENDER */
  return (
    <>
      <Header
        title={t.pages?.tasks?.title ?? "Topshiriqlar"}
        description={t.pages?.tasks?.description ?? "Ijro intizomi va nazorat"}
        actions={
          canCreateTask ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/dashboard/tasks/new"
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Yangi topshiriq
              </Link>
              <Link
                href="/dashboard/tasks/new/ai"
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-card px-4 text-sm font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-muted"
              >
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                AI orqali
              </Link>
            </div>
          ) : undefined
        }
      />

      <div className="space-y-4 p-4 pb-28 sm:p-6 sm:pb-6">
        {refError && (
          <p role="alert" className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
            {refError}
          </p>
        )}

        {/* Tasdiqlash navbatiga tezkor kirish */}
        {canApprove && stats.awaiting_approval > 0 && view !== "awaiting" && (
          <button
            type="button"
            onClick={() => setView("awaiting")}
            className="surface surface-interactive flex w-full items-center gap-3 p-3.5 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info-soft-foreground">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-md font-semibold text-foreground">
                {stats.awaiting_approval} ta topshiriq tasdig‘ingizni kutmoqda
              </span>
              <span className="block text-xs text-muted-foreground">
                Hisobot va isbotlar yuklangan — nazoratdan yechish yoki qayta ijroga yuborish
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-primary">Ko‘rish →</span>
          </button>
        )}

        {/* Tezkor ko'rinishlar */}
        <TaskViewTabs value={view} counts={viewCounts} canApprove={canApprove} onChange={setView} />

        {/* KPI */}
        {!refLoaded && listLoading ? (
          <PremiumStatsSkeleton count={6} />
        ) : (
          <TaskStats
            total={stats.total}
            pending={stats.pending}
            inProgress={stats.in_progress}
            awaitingApproval={stats.awaiting_approval}
            completed={stats.completed}
            overdue={stats.overdue}
            returned={stats.returned}
            canApprove={canApprove}
          />
        )}

        {/* Filtrlar */}
        <TaskFilters
          value={filters}
          onChange={patchFilters}
          onClear={() => setFilters(EMPTY_TASK_FILTERS)}
          sectors={sectors}
          organizations={organizations}
          deputies={isWideScope ? deputies : []}
          showSectorFilter={isWideScope}
          resultCount={totalCount}
          scopeNote={scopeNote}
        />

        {/* Saralash — telefonda jadval sarlavhalari ko'rinmaydi */}
        <div className="flex items-center gap-2 md:hidden">
          <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <label htmlFor="task-sort" className="sr-only">
            Saralash
          </label>
          <select
            id="task-sort"
            value={`${sortKey}:${sortDir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split(":")
              setSortKey(k as SortKey)
              setSortDir(d as "asc" | "desc")
            }}
            className="h-10 flex-1 rounded-xl bg-card px-3 text-sm text-foreground shadow-[inset_0_0_0_1px_var(--border)] focus:outline-none"
          >
            <option value="deadline:asc">Muddati yaqinlari birinchi</option>
            <option value="deadline:desc">Muddati uzoqlari birinchi</option>
            <option value="created_at:desc">Yangi yaratilganlar birinchi</option>
            <option value="created_at:asc">Eski yaratilganlar birinchi</option>
            <option value="priority:desc">Muhimligi bo‘yicha</option>
            <option value="title:asc">Nomi bo‘yicha (A–Z)</option>
          </select>
        </div>

        {/* Jadval — faqat shu joy yuklanish holatiga o'tadi */}
        {listError ? (
          <div role="alert" className="surface p-6 text-center">
            <p className="text-md font-semibold text-foreground">Yuklab bo‘lmadi</p>
            <p className="mt-1 text-sm text-muted-foreground">{listError}</p>
            <button
              type="button"
              onClick={() => void loadList()}
              className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Qayta urinish
            </button>
          </div>
        ) : listLoading ? (
          <div className="surface overflow-hidden">
            <PremiumTableSkeleton rows={8} columns={5} />
          </div>
        ) : (
          <TaskTable
            tasks={tasks}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSort}
            onEdit={canCreateTask ? (task) => router.push(`/dashboard/tasks/${task.id}?tahrir=1`) : undefined}
            onDelete={canDelete ? handleDelete : undefined}
            canEdit={canCreateTask}
            canDelete={canDelete}
            emptyAction={
              canCreateTask ? (
                <Link
                  href="/dashboard/tasks/new"
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Birinchi topshiriqni yaratish
                </Link>
              ) : undefined
            }
          />
        )}

        {/* Sahifalash */}
        {totalPages > 1 && (
          <div className="surface flex flex-col items-center justify-between gap-3 p-3 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Jami:{" "}
              <span className="font-semibold tabular-nums text-foreground">{totalCount}</span>
            </p>
            <div className="flex items-center gap-2">
              <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Oldingi
              </PageBtn>
              <span className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium tabular-nums text-foreground">
                {page} / {totalPages}
              </span>
              <PageBtn onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                Keyingi
              </PageBtn>
            </div>
          </div>
        )}
      </div>

      {/* Mobil: bitta asosiy harakat. Pastki navigatsiya ustida turadi. */}
      {canCreateTask && (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-safe sm:hidden">
          <div className="mx-auto flex max-w-md items-center gap-2">
            <Link
              href="/dashboard/tasks/new"
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Yangi topshiriq
            </Link>
            <Link
              href="/dashboard/tasks/new/ai"
              aria-label="AI orqali yaratish"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card shadow-[0_8px_24px_-8px_rgb(13_21_36_/_0.28),inset_0_0_0_1px_var(--border)]"
            >
              <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

function PageBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--border)]",
        disabled ? "opacity-40" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}
