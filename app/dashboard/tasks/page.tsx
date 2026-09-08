"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Plus, ShieldCheck, Sparkles } from "lucide-react"

import { Header } from "@/components/layout/header"
import { TaskFilters } from "@/components/dashboard/tasks/task-filters"
import { TaskStats } from "@/components/dashboard/tasks/task-stats"
import { TaskTable } from "@/components/dashboard/tasks/task-table"
import { TaskDetailDialog } from "@/components/dashboard/tasks/task-detail-dialog"
import { PremiumTableSkeleton, PremiumStatsSkeleton } from "@/components/dashboard/premium-dashboard-ui"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/context"
import { getCurrentUser } from "@/lib/api/auth.api"
import { getOrganizations } from "@/lib/api/organizations.api"
import { getSectors, type Sector } from "@/lib/api/sectors.api"
import { deleteTask, getTaskStats, getTasksPage } from "@/lib/api/tasks.api"
import type { Task } from "@/types"

/**
 * TOPSHIRIQLAR RO'YXATI
 *
 * Tuzatilgan nuqsonlar:
 *  - Har harf bosilganda BESH parallel so'rov ketardi (users, organizations,
 *    tasks, stats, currentUser) — holbuki faqat ikkitasi qidiruvga bog'liq.
 *    Endi ma'lumotnoma (tashkilot, soha, foydalanuvchi) bir marta yuklanadi.
 *  - `setLoading(true)` butun sahifani unmount qilardi: har harfda jadval,
 *    filtrlar va animatsiya qaytadan qurilardi. Endi faqat jadval joyida
 *    skelet ko'rsatiladi.
 *  - Debounce yo'q edi. Endi 400 ms (filtr komponentida).
 *  - Javoblar tartibsiz kelib bir-birini bosib ketishi mumkin edi
 *    (AbortController yo'q). Endi so'rov navbati raqami bilan tekshiriladi.
 *  - Sahifada TO'RT qatlam sarlavha bor edi (Header h1 + DashboardPageFrame
 *    h2 + filtr h3 + jadval h2) va YETTI ta ko'rsatkich plitasi. Endi bitta
 *    sarlavha va bitta KPI qatori.
 *  - Ikkita dekorativ "hujjat" chipi UI matni sifatida chiqarilardi.
 *  - `onEdit`/`onDelete` jadvalga uzatilardi, lekin jadval ularni
 *    e'tiborsiz qoldirardi — endi ishlaydi.
 *  - O'chirishdan keyin `totalCount` va statistika yangilanmasdi.
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

export default function TasksPage() {
  const t = useTranslation()

  /* --------------------------------------------------------- Ma'lumotnoma */
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [refLoaded, setRefLoaded] = useState(false)
  const [refError, setRefError] = useState<string | null>(null)

  /* ------------------------------------------------------------- Ro'yxat */
  const [tasks, setTasks] = useState<Task[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState<StatsShape>(EMPTY_STATS)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  /* ------------------------------------------------------------- Filtrlar */
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [sectorFilter, setSectorFilter] = useState("all")
  const [organizationFilter, setOrganizationFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const reqIdRef = useRef(0)

  /* --------------------------------------- Ma'lumotnomani BIR MARTA yuklash */
  useEffect(() => {
    let alive = true

    Promise.all([
      getCurrentUser().catch(() => null),
      getOrganizations().catch(() => []),
      getSectors().catch(() => [] as Sector[]),
    ])
      .then(([me, orgs, secs]) => {
        if (!alive) return
        setCurrentUser(me)
        setOrganizations(orgs || [])
        setSectors((secs as Sector[]).filter((s) => s.is_active !== false))
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
  const canApprove = role === "HOKIM"
  const canEdit = role === "HOKIM" || role === "HOKIM_YORDAMCHISI" || role === "ADMIN"
  const canDelete = role === "HOKIM" || role === "ADMIN"
  const isDistrictGovernor = role === "HOKIM"

  const visibleOrganizations = useMemo(() => {
    if (!currentUser) return organizations
    const idOf = (v: unknown): string => {
      if (!v) return ""
      if (typeof v === "string" || typeof v === "number") return String(v)
      if (typeof v === "object" && v && "id" in (v as any)) return String((v as any).id ?? "")
      return ""
    }

    if (role === "TASHKILOT_RAHBARI" || role === "TASHKILOT_MASUL") {
      const own = idOf(currentUser.organization) || idOf(currentUser.organization_id)
      return organizations.filter((o) => String(o.id) === own)
    }
    if (role === "HOKIM_YORDAMCHISI" || role === "HOKIMLIK_MASUL") {
      const own = idOf(currentUser.sector) || idOf(currentUser.sector_id)
      if (!own) return organizations
      return organizations.filter((o) => (idOf(o.sector) || idOf(o.sector_id)) === own)
    }
    return organizations
  }, [organizations, currentUser, role])

  /* ------------------------------------------------------ Ro'yxatni yuklash */
  const filters = useMemo(() => {
    const f: Record<string, string> = {}
    if (searchQuery.trim()) f.search = searchQuery.trim()
    if (statusFilter !== "all") f.status = statusFilter
    if (priorityFilter !== "all") f.priority = priorityFilter
    if (sectorFilter !== "all") f.sector = sectorFilter
    if (organizationFilter !== "all") f.organization = organizationFilter
    return f
  }, [searchQuery, statusFilter, priorityFilter, sectorFilter, organizationFilter])

  const loadList = useCallback(async () => {
    const id = ++reqIdRef.current
    setListLoading(true)
    setListError(null)

    try {
      const [tasksPage, statsData] = await Promise.all([
        getTasksPage(filters, page, pageSize, "-created_at"),
        getTaskStats(filters),
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
  }, [filters, page, pageSize])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, priorityFilter, sectorFilter, organizationFilter])

  /* ----------------------------------------------------------- Harakatlar */
  const handleDelete = useCallback(
    async (taskId: number | string) => {
      if (!window.confirm(t.pages?.tasks?.deleteConfirm ?? "Topshiriq o‘chirilsinmi?")) return
      try {
        await deleteTask(taskId)
        // Ilgari faqat satr filtrlanardi, hisoblar esa eskirib qolardi
        await loadList()
      } catch {
        setListError("O‘chirib bo‘lmadi. Huquqingiz yetarli ekanini tekshirib ko‘ring.")
      }
    },
    [loadList, t],
  )

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

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
                className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Yangi topshiriq
              </Link>
              <Link
                href="/dashboard/tasks/new/ai"
                className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
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
          <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground">
            {refError}
          </p>
        )}

        {/* Hokim uchun tasdiqlash navbatiga tezkor kirish */}
        {canApprove && stats.awaiting_approval > 0 && (
          <Link
            href="/dashboard/tasks/pending-approval"
            className="surface surface-interactive flex items-center gap-3 p-3.5"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info-soft-foreground">
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
          </Link>
        )}

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
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          sectorFilter={sectorFilter}
          organizationFilter={organizationFilter}
          sectors={sectors}
          organizations={visibleOrganizations}
          showSectorFilter={isDistrictGovernor || role === "ADMIN"}
          showCreateButton={false}
          resultCount={totalCount}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
          onSectorChange={setSectorFilter}
          onOrganizationChange={setOrganizationFilter}
          onClear={() => {
            setSearchQuery("")
            setStatusFilter("all")
            setPriorityFilter("all")
            setSectorFilter("all")
            setOrganizationFilter("all")
          }}
        />

        {/* Jadval — faqat shu joy yuklanish holatiga o'tadi */}
        {listError ? (
          <div role="alert" className="surface p-6 text-center">
            <p className="text-md font-semibold text-foreground">Yuklab bo‘lmadi</p>
            <p className="mt-1 text-sm text-muted-foreground">{listError}</p>
            <button
              type="button"
              onClick={() => void loadList()}
              className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
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
            onView={(task) => setSelectedTask(task)}
            onEdit={canEdit ? (task) => setSelectedTask(task) : undefined}
            onDelete={canDelete ? handleDelete : undefined}
            canEdit={canEdit}
            canDelete={canDelete}
            emptyAction={
              canCreateTask ? (
                <Link
                  href="/dashboard/tasks/new"
                  className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
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
              <span className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium tabular-nums text-foreground">
                {page} / {totalPages}
              </span>
              <PageBtn
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                Keyingi
              </PageBtn>
            </div>
          </div>
        )}
      </div>

      <TaskDetailDialog task={selectedTask} onClose={() => setSelectedTask(null)} />

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
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-lg"
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
        "inline-flex h-11 items-center rounded-md border border-border px-3 text-sm font-semibold text-foreground",
        disabled ? "opacity-40" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  )
}
