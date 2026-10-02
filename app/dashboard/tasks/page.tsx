"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Plus, ShieldCheck, Sparkles } from "lucide-react"

import { Header } from "@/components/layout/header"
import {
  EMPTY_TASK_FILTERS,
  TaskViewTabs,
  viewToParams,
  type PersonOption,
  type TaskFilterState,
  type TaskView,
  type TaskViewCounts,
} from "@/components/dashboard/tasks/task-filters"
import { TaskStats } from "@/components/dashboard/tasks/task-stats"
import {
  TaskOrderFilterBar,
  TaskOrderList,
  TaskSearchField,
  type TaskSortKey,
} from "@/components/dashboard/tasks/task-order-list"
import { TaskAdvancedFilters } from "@/components/dashboard/tasks/task-advanced-filters"
import { PremiumStatsSkeleton, PremiumTableSkeleton } from "@/components/dashboard/premium-dashboard-ui"
import { useI18n, useTranslation } from "@/lib/i18n/context"
import { getCurrentUser } from "@/lib/api/auth.api"
import { getAssignableOrganizations, type AssignableOrganization } from "@/lib/api/organizations.api"
import { getSectors, type Sector } from "@/lib/api/sectors.api"
import { getUsers } from "@/lib/api/users.api"
import { deleteTask, getTaskStats, getTasksPage } from "@/lib/api/tasks.api"
import type { Task } from "@/types"

/**
 * TOPSHIRIQLAR RO'YXATI — DashStack «Order List» ko'rinishida
 *
 * Sahifa tuzilishi:
 *   Sarlavha
 *   Asosiy harakatlar + qidiruv
 *   Tezkor ko'rinish tablari (Barchasi / Menga tegishli / Tasdiqlashda …)
 *   Ko'rsatkichlar
 *   ORDER LIST PLITASI: filtr qatori → jadval → sahifalash
 *
 * Muhim: ro'yxat SERVER tomonida saralanadi va sahifalanadi. Barcha
 * topshiriqni brauzerga tortib, keyin filtrlash tuman miqyosida ham
 * sekinlashadi — shuning uchun har bir filtr `query` ga tushadi va
 * `reqIdRef` kechikkan javobni bekor qiladi.
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

const SORT_FIELD: Record<TaskSortKey, string> = {
  title: "title",
  deadline: "deadline",
  created_at: "created_at",
  status: "status",
  priority: "priority",
}

const SCOPE_NOTE: Record<string, string> = {
  curated: "Sizga biriktirilgan tashkilotlar",
  sector: "Sohangizdagi tashkilotlar",
  own: "O'z tashkilotingiz",
  all: "",
  none: "",
}

export default function TasksPage() {
  const t = useTranslation()
  const { language } = useI18n()
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
  const [searchDraft, setSearchDraft] = useState("")
  const [sortKey, setSortKey] = useState<TaskSortKey>("deadline")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

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

        const role = String((me as any)?.role ?? "")
        if (role === "HOKIM" || role === "ADMIN") {
          void getUsers({ role: "HOKIM_YORDAMCHISI" } as any, 1, 200)
            .then((list) => {
              if (!alive) return
              setDeputies(
                (list || []).map((u: any) => ({
                  id: u.id,
                  name:
                    u.full_name ||
                    [u.last_name, u.first_name].filter(Boolean).join(" ") ||
                    u.username,
                })),
              )
            })
            .catch(() => undefined)
        }
      })
      .catch(() => {
        if (alive) setRefError("Ma'lumotnomani yuklab bo'lmadi.")
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
    const apply = () => setPageSize(media?.matches ? 12 : 20)
    apply()
    media?.addEventListener?.("change", apply)
    return () => media?.removeEventListener?.("change", apply)
  }, [])

  /* --------------------------------------------------- Qidiruvni debounce */
  // Maydonga yozilgani 400 ms dan keyin filtrga tushadi — har harfda
  // so'rov ketmasligi uchun.
  useEffect(() => {
    if (searchDraft === filters.search) return
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchDraft }))
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft])

  /**
   * Teskari yo'nalish: filtr TASHQARIDAN o'zgarsa (chipdagi ✕ bosildi
   * yoki «Filtrni tozalash») maydon ham tozalanishi kerak.
   *
   * Busiz shunday bo'lardi: foydalanuvchi «maktab» deb qidiradi, keyin
   * chipdagi ✕ ni bosadi — ro'yxat to'liq qaytadi, lekin maydonda hali
   * ham «maktab» yozuvi turadi. Ya'ni ekran yolg'on gapiradi.
   */
  useEffect(() => {
    setSearchDraft((draft) => (draft === filters.search ? draft : filters.search))
  }, [filters.search])

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
          "Topshiriqlarni yuklab bo'lmadi. Ulanishni tekshirib, qayta urinib ko'ring.",
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
      all: stats.total,
      awaiting: stats.awaiting_approval,
      overdue: stats.overdue,
      active: stats.in_progress,
      closed: stats.completed,
    }),
    [stats],
  )

  /* ----------------------------------------------------------- Harakatlar */
  const handleDelete = useCallback(
    async (taskId: number | string) => {
      if (!window.confirm(t.pages?.tasks?.deleteConfirm ?? "Topshiriq o'chirilsinmi?")) return
      try {
        await deleteTask(taskId)
        await loadList()
      } catch {
        setListError("O'chirib bo'lmadi. Huquqingiz yetarli ekanini tekshirib ko'ring.")
      }
    },
    [loadList, t],
  )

  const handleSort = useCallback((key: TaskSortKey) => {
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

  const clearFilters = useCallback(() => {
    setSearchDraft("")
    setFilters(EMPTY_TASK_FILTERS)
  }, [])

  const filtersDirty = useMemo(
    () =>
      (Object.keys(EMPTY_TASK_FILTERS) as (keyof TaskFilterState)[]).some(
        (k) => filters[k] !== EMPTY_TASK_FILTERS[k],
      ),
    [filters],
  )

  const scopeNote = SCOPE_NOTE[orgScope] || undefined

  /* ------------------------------------------------------------------ RENDER */
  return (
    <>
      <Header
        title={t.pages?.tasks?.title ?? "Topshiriqlar"}
        description={t.pages?.tasks?.description ?? "Ijro intizomi va nazorat"}
      />

      <div className="space-y-4 p-4 pb-20 sm:p-6 sm:pb-6">
        {refError && (
          <p
            role="alert"
            className="rounded-xl bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground"
          >
            {refError}
          </p>
        )}

        {/* ------------------------------- Asosiy harakatlar + qidiruv */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {canCreateTask && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/dashboard/tasks/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-[0_1px_2px_rgb(51_102_255_/_0.28),0_10px_24px_-10px_rgb(51_102_255_/_0.55)] transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Plus className="h-5 w-5" aria-hidden />
                Yangi topshiriq
              </Link>
              <Link
                href="/dashboard/tasks/new/ai"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary-soft px-5 text-[15px] font-semibold text-primary-soft-foreground transition-colors hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Sparkles className="h-5 w-5" aria-hidden />
                AI orqali yaratish
              </Link>
            </div>
          )}

          <TaskSearchField value={searchDraft} onChange={setSearchDraft} />

          <Link
            href="/dashboard/calendar"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-card px-4 text-sm font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <CalendarDays className="h-4.5 w-4.5" aria-hidden />
            Kalendar
          </Link>
        </div>

        {/* --------------------------------------- Tasdiqlash chaqiruvi */}
        {canApprove && stats.awaiting_approval > 0 && view !== "awaiting" && (
          <button
            type="button"
            onClick={() => setView("awaiting")}
            className="flex w-full items-center gap-2.5 rounded-xl bg-warning-soft px-3.5 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-warning-soft-foreground" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-warning-soft-foreground">
              {stats.awaiting_approval} ta topshiriq tasdig'ingizni kutmoqda
            </span>
            <span className="shrink-0 text-sm font-semibold text-warning-soft-foreground">
              Ko'rish →
            </span>
          </button>
        )}

        {/* --------------------------------------- Tezkor ko'rinishlar */}
        <TaskViewTabs value={view} counts={viewCounts} canApprove={canApprove} onChange={setView} />

        {/* --------------------------------------------- Ko'rsatkichlar */}
        {!refLoaded && listLoading ? (
          <PremiumStatsSkeleton count={4} />
        ) : (
          <TaskStats
            total={stats.total}
            pending={stats.pending}
            completed={stats.completed}
            awaitingApproval={stats.awaiting_approval}
            canApprove={canApprove}
          />
        )}

        {/* ------------------- Qo'shimcha filtrlar (soha, tashkilot, mas'ul) */}
        <TaskAdvancedFilters
          value={filters}
          onChange={patchFilters}
          sectors={sectors}
          organizations={organizations}
          deputies={isWideScope ? deputies : []}
          showSectorFilter={isWideScope}
          scopeNote={scopeNote}
        />

        {/* --------------------------------------------- ORDER LIST plitasi */}
        {listError ? (
          <div
            role="alert"
            className="rounded-[14px] bg-card p-6 text-center shadow-[inset_0_0_0_1px_var(--border)]"
          >
            <p className="text-md font-semibold text-foreground">Yuklab bo'lmadi</p>
            <p className="mt-1 text-sm text-muted-foreground">{listError}</p>
            <button
              type="button"
              onClick={() => void loadList()}
              className="mt-4 inline-flex h-11 items-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Qayta urinish
            </button>
          </div>
        ) : listLoading ? (
          <div className="overflow-hidden rounded-[14px] bg-card shadow-[inset_0_0_0_1px_var(--border)]">
            <PremiumTableSkeleton rows={8} columns={6} />
          </div>
        ) : (
          <TaskOrderList
            tasks={tasks}
            locale={language}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPage}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={handleSort}
            onEdit={
              canCreateTask ? (task) => router.push(`/dashboard/tasks/${task.id}?tahrir=1`) : undefined
            }
            onDelete={canDelete ? handleDelete : undefined}
            filterBar={
              <TaskOrderFilterBar
                value={filters}
                onChange={patchFilters}
                onClear={clearFilters}
                dirty={filtersDirty}
              />
            }
            emptyAction={
              canCreateTask ? (
                <Link
                  href="/dashboard/tasks/new"
                  className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Birinchi topshiriqni yaratish
                </Link>
              ) : undefined
            }
          />
        )}
      </div>
    </>
  )
}
