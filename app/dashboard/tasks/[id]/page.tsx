"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  History,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Upload,
  User as UserIcon,
  Users,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Header } from "@/components/layout/header"
import { DashboardDetailFrame } from "@/components/layout/dashboard-detail-frame"
import { TaskStatusBadge, PriorityBadge } from "@/components/ui/status-badge"
import { ReportDialog, ReturnReasonDialog } from "@/components/dashboard/tasks/task-action-dialogs"
import {
  getTaskById,
  getTaskChat,
  getTaskExecutions,
  sendTaskMessage,
  updateTask,
  getCurrentUser,
  getAccessToken,
  WS_BASE,
} from "@/lib/api"
import {
  acceptTaskExecution,
  approveTaskExecution,
  returnTaskForRework,
  requestExtension,
  formatFileSize,
} from "@/lib/api/approval.api"
import {
  TASK_STATUS_HINT,
  TASK_STATUS_LABEL,
  PRIORITY_LABEL,
  PRIORITIES,
  taskStatusClass,
} from "@/lib/status-styles"

/**
 * TOPSHIRIQ SAHIFASI — 2-tahrir
 *
 * Ilgari 1270 qatorli monolit: chat, ovoz yozish, geolokatsiya, tahrirlash
 * bir faylda; tugmalar `bg-white/10 text-white` — quyuq gradient sarlavha
 * uchun yozilgan, u olib tashlangach oq fonda KO'RINMAY qolgan edi;
 * huquqlar rol nomiga qarab taxmin qilinardi (`isAdmin`), `alert()` lar.
 *
 * Endi:
 *  · Ikki ustun: chapda «nima qilish kerak» (tafsilot, hujjatlar, ijrochi
 *    tashkilotlar, muhokama/tarix), o'ngda holat va harakat paneli.
 *    Telefonda bitta ustun + pastda qadalgan asosiy harakat tugmasi.
 *  · Harakatlar backend bayroqlari bo'yicha: `task.can_edit`,
 *    `task.can_approve` (qoidalar backend/tasks/access.py da).
 *    Ijrochi (tashkilot roli) uchun: Ijroga olish -> Hisobot va isbot ->
 *    Tasdiq kutilmoqda. Hokim/o'rinbosar uchun: Tasdiqlash / Qayta ijroga.
 *  · Holat banneri odam tilida: hozir kim nima qilishi kerak.
 *  · Chat: matn + fayl, WebSocket bilan jonli yangilanish. Ovozli xabar va
 *    geolokatsiya ataylab olib tashlandi — ular mikrofonni ochiq qoldirar
 *    va sahifani og'irlashtirar edi; kerak bo'lsa alohida komponent.
 */

/* ============================================================ Yordamchilar */

const ORG_ROLES = new Set(["TASHKILOT_RAHBARI", "TASHKILOT_MASUL"])
const REPORTABLE = new Set(["YANGI", "IJRODA", "TEKSHIRUVDA", "QAYTA_IJROGA_YUBORILDI", "MUDDATI_KECH"])
const EXTENDABLE = new Set(["IJRODA", "TEKSHIRUVDA", "QAYTA_IJROGA_YUBORILDI", "MUDDATI_KECH"])
const CLOSED = new Set(["NAZORATDAN_YECHILDI", "BAJARILMADI"])

const CARD =
  "rounded-3xl bg-card p-5 shadow-[0_1px_2px_rgba(13,21,36,0.04),0_14px_40px_-18px_rgba(13,21,36,0.14)] sm:p-6"
const FIELD =
  "h-11 w-full rounded-xl bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] outline-none transition-shadow focus:shadow-[inset_0_0_0_1.5px_var(--primary)] disabled:opacity-60"
const BTN =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[transform,background-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 disabled:pointer-events-none"
const BTN_PRIMARY = cn(BTN, "bg-primary text-primary-foreground hover:bg-primary-hover")
const BTN_SOFT = cn(BTN, "bg-background text-foreground hover:bg-muted")
const BTN_SUCCESS = cn(BTN, "bg-success text-success-foreground hover:opacity-90")
const BTN_WARN = cn(BTN, "bg-warning-soft text-warning-soft-foreground hover:opacity-90")

function fmtDate(v?: string | null, withTime = false) {
  if (!v) return "—"
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  })
}

function daysLeft(deadline?: string | null): number | null {
  if (!deadline) return null
  const end = new Date(deadline).getTime()
  if (Number.isNaN(end)) return null
  return Math.ceil((end - Date.now()) / 86_400_000)
}

function localDateInput(v?: string | null): string {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ""
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function personName(u: any): string {
  if (!u) return "—"
  if (typeof u === "string") return u
  return (
    u.full_name ||
    [u.last_name, u.first_name].filter(Boolean).join(" ") ||
    u.username ||
    u.login ||
    "—"
  )
}

function isImage(a: any): boolean {
  const t = String(a?.file_type ?? "").toUpperCase()
  if (t === "IMAGE") return true
  return /\.(png|jpe?g|webp|gif|heic)$/i.test(String(a?.file_name ?? a?.file ?? ""))
}

/* ================================================================== SAHIFA */

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>()
  const id = String(params?.id ?? "")
  const router = useRouter()

  const [task, setTask] = useState<any | null>(null)
  const [me, setMe] = useState<any | null>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [executions, setExecutions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [tab, setTab] = useState<"chat" | "history">("chat")
  const [dialog, setDialog] = useState<null | "edit" | "extend" | "report" | "return">(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)

  /* ------------------------------------------------------------ Yuklash */
  const reloadTimeline = useCallback(async () => {
    try {
      const [chat, execs] = await Promise.all([
        getTaskChat(id).catch(() => []),
        getTaskExecutions(id).catch(() => []),
      ])
      setTimeline(Array.isArray(chat) ? chat : [])
      setExecutions(Array.isArray(execs) ? execs : [])
    } catch {
      /* jim */
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    let alive = true
    setLoading(true)
    Promise.all([getTaskById(id), getCurrentUser().catch(() => null)])
      .then(([t, u]) => {
        if (!alive) return
        setTask(t)
        setMe(u)
      })
      .catch((e: any) => {
        if (alive) setLoadError(e?.message || "Topshiriq topilmadi yoki sizga ko‘rsatilmaydi")
      })
      .finally(() => alive && setLoading(false))
    void reloadTimeline()

    // Jonli muhokama — WebSocket. Ulanmasa ham sahifa ishlaydi.
    const token = getAccessToken()
    if (token) {
      try {
        const ws = new WebSocket(`${WS_BASE}/ws/tasks/${id}/chat/?token=${token}`)
        wsRef.current = ws
        ws.onmessage = () => void reloadTimeline()
        ws.onclose = () => {
          wsRef.current = null
        }
      } catch {
        /* WS ixtiyoriy */
      }
    }
    return () => {
      alive = false
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [id, reloadTimeline])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  /* ------------------------------------------------------- Huquq bayroqlari */
  const status: string = task?.status ?? ""
  const role: string = me?.role ?? ""
  const isOrgUser = ORG_ROLES.has(role)
  const isClosed = CLOSED.has(status)

  const myOrg = useMemo(() => {
    if (!task || !isOrgUser) return null
    const orgId = String(me?.organization?.id ?? me?.organization_id ?? me?.organization ?? "")
    return (task.assigned_organizations ?? []).find(
      (o: any) => String(o.organization?.id ?? o.organization_id) === orgId,
    )
  }, [task, me, isOrgUser])
  const myOrgStatus: string = myOrg?.status ?? status

  const canEdit = Boolean(task?.can_edit) && !isClosed

  /* Ro'yxatdan «Tahrirlash» bilan kelinganda (?tahrir=1) oynani ochamiz.
     `useSearchParams` o'rniga `window.location` — sahifa Suspense
     talab qilmasligi uchun. */
  const editIntentRef = useRef(false)
  useEffect(() => {
    if (editIntentRef.current || !canEdit || typeof window === "undefined") return
    if (new URLSearchParams(window.location.search).get("tahrir") !== "1") return
    editIntentRef.current = true
    setDialog("edit")
    window.history.replaceState(null, "", window.location.pathname)
  }, [canEdit])
  const canApprove = Boolean(task?.can_approve) && status === "BAJARILDI"
  const canAccept = isOrgUser && ["YANGI", "TEKSHIRUVDA"].includes(myOrgStatus)
  const canReport = isOrgUser && REPORTABLE.has(myOrgStatus)
  const canExtend = isOrgUser && EXTENDABLE.has(myOrgStatus)
  const awaiting = isOrgUser && myOrgStatus === "BAJARILDI"

  /* --------------------------------------------------------------- Amallar */
  const run = async (key: string, fn: () => Promise<any>, ok: string) => {
    setBusy(key)
    setActionError(null)
    try {
      const updated = await fn()
      if (updated && typeof updated === "object" && "id" in updated) setTask(updated)
      else setTask(await getTaskById(id))
      setToast(ok)
      void reloadTimeline()
    } catch (e: any) {
      setActionError(e?.data?.detail || e?.data?.error || e?.message || "Amal bajarilmadi")
    } finally {
      setBusy(null)
    }
  }

  /* ------------------------------------------------------------------ Render */
  if (loading) {
    return (
      <>
        <Header title="Topshiriq" />
        <div className="p-4 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <div className="h-40 animate-pulse rounded-3xl bg-muted" />
              <div className="h-64 animate-pulse rounded-3xl bg-muted" />
            </div>
            <div className="h-72 animate-pulse rounded-3xl bg-muted" />
          </div>
        </div>
      </>
    )
  }

  if (loadError || !task) {
    return (
      <>
        <Header title="Topshiriq" />
        <div className="p-4 sm:p-6">
          <div className={cn(CARD, "mx-auto max-w-lg text-center")}>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive-soft text-destructive-soft-foreground">
              <AlertCircle className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-foreground">Topshiriq ochilmadi</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{loadError}</p>
            <Link href="/dashboard/tasks" className={cn(BTN_SOFT, "mt-6")}>
              Topshiriqlar ro‘yxatiga qaytish
            </Link>
          </div>
        </div>
      </>
    )
  }

  const left = daysLeft(task.deadline)
  const overdue = left !== null && left < 0 && !isClosed && status !== "BAJARILDI"
  const orgs: any[] = task.assigned_organizations ?? []
  const deputies: any[] = task.assigned_deputies ?? []
  const attachments: any[] = task.attachments ?? []
  const proofs: any[] = executions.filter((e) => Array.isArray(e.attachments) && e.attachments.length > 0)

  /* Asosiy harakat — telefonda pastda qadalgan tugma uchun */
  const primaryAction =
    canApprove
      ? { label: "Tasdiqlash", icon: ShieldCheck, cls: BTN_SUCCESS, onClick: () => void run("approve", () => approveTaskExecution(id), "Topshiriq tasdiqlandi va yopildi") }
      : canAccept
        ? { label: "Ijroga olish", icon: Play, cls: BTN_PRIMARY, onClick: () => void run("accept", () => acceptTaskExecution(id), "Topshiriq ijroga olindi") }
        : canReport
          ? { label: "Hisobot va isbot yuklash", icon: Upload, cls: BTN_PRIMARY, onClick: () => setDialog("report") }
          : null

  return (
    <>
      <Header title="Topshiriq" description={task.title} />

      <DashboardDetailFrame
        breadcrumbs={[
          { label: "Topshiriqlar", href: "/dashboard/tasks" },
          { label: task.title?.length > 48 ? task.title.slice(0, 48) + "…" : task.title },
        ]}
        eyebrow={task.sector_name ? `Soha · ${task.sector_name}` : "Topshiriq"}
        title={task.title}
        badges={
          <>
            <TaskStatusBadge status={status} />
            <PriorityBadge priority={task.priority} />
            {overdue && (
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-destructive-soft px-2.5 text-xs font-semibold text-destructive-soft-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {Math.abs(left!)} kun kechikdi
              </span>
            )}
          </>
        }
        actions={
          canEdit ? (
            <button type="button" onClick={() => setDialog("edit")} className={BTN_SOFT}>
              <Pencil className="h-4 w-4" aria-hidden />
              Tahrirlash
            </button>
          ) : undefined
        }
      >
        {/* ------------------------------------------------ Xabarlar (toast/xato) */}
        {toast && (
          <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm font-medium text-success-soft-foreground">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {toast}
          </p>
        )}
        {actionError && (
          <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {actionError}
          </p>
        )}

        <div className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-0">
          {/* ================================================== CHAP USTUN */}
          <div className="min-w-0 space-y-6">
            {/* Holat banneri — hozir nima bo'lyapti, kim nima qilishi kerak */}
            <StatusBanner
              status={status}
              myOrgStatus={myOrgStatus}
              isOrgUser={isOrgUser}
              canApprove={canApprove}
              awaiting={awaiting}
            />

            {/* Tafsilot */}
            <section className={CARD}>
              <SectionTitle icon={FileText} title="Nima qilinishi kerak" />
              <div className="mt-4 whitespace-pre-wrap text-[16px] leading-8 text-foreground">
                {task.description?.trim() || (
                  <span className="text-muted-foreground">Tafsilot kiritilmagan.</span>
                )}
              </div>

              {attachments.length > 0 && (
                <div className="mt-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Biriktirilgan hujjatlar · {attachments.length}
                  </p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {attachments.map((a: any) => (
                      <AttachmentRow key={a.id} a={a} />
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Ijrochi tashkilotlar */}
            <section className={CARD}>
              <SectionTitle icon={Building2} title="Ijrochi tashkilotlar" count={orgs.length} />
              {orgs.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Tashkilot biriktirilmagan.</p>
              ) : (
                <ul className="mt-4 divide-y divide-border">
                  {orgs.map((o: any) => {
                    const st = o.status ?? status
                    const mine = myOrg && myOrg.id === o.id
                    return (
                      <li key={o.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold text-foreground">
                            {o.organization?.short_name || o.organization?.name || "—"}
                            {mine && (
                              <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-soft-foreground">
                                sizning
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {o.assigned_to ? `Mas’ul: ${personName(o.assigned_to)}` : "Mas’ul hali belgilanmagan"}
                            {o.accepted_at ? ` · ijroga olingan ${fmtDate(o.accepted_at)}` : ""}
                            {o.completed_at ? ` · hisobot ${fmtDate(o.completed_at)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold", taskStatusClass(st))}>
                            {TASK_STATUS_LABEL[st] ?? st}
                          </span>
                          {canApprove && st === "BAJARILDI" && orgs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => void run(`approve-${o.id}`, () => approveTaskExecution(id, { organizationId: o.organization?.id }), "Tashkilot hisoboti tasdiqlandi")}
                              disabled={busy !== null}
                              className="inline-flex h-8 items-center gap-1 rounded-lg bg-success-soft px-2.5 text-xs font-semibold text-success-soft-foreground"
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden />
                              Tasdiqlash
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Isbotlar — hisobot bilan yuklangan fayllar */}
            {proofs.length > 0 && (
              <section className={CARD}>
                <SectionTitle icon={ImageIcon} title="Ijro isbotlari" />
                <div className="mt-4 space-y-5">
                  {proofs.map((e: any) => (
                    <div key={e.id}>
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{e.executed_by_name || personName(e.executed_by)}</span>
                        <span className="text-muted-foreground"> · {fmtDate(e.created_at, true)}</span>
                      </p>
                      {e.comment && <p className="mt-1 text-sm leading-6 text-muted-foreground">{e.comment}</p>}
                      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                        {e.attachments.map((a: any) => (
                          <li key={a.id}>
                            {isImage(a) ? (
                              <a href={a.file} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl bg-background">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={a.file} alt={a.file_name} loading="lazy" className="aspect-square w-full object-cover" />
                              </a>
                            ) : (
                              <AttachmentRow a={a} />
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Muhokama / Tarix */}
            <section className={cn(CARD, "p-0 sm:p-0")}>
              <div className="flex items-center gap-1 px-3 pt-3 sm:px-4">
                <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={MessageSquare} label="Muhokama" count={timeline.filter((t) => t.type === "message").length} />
                <TabBtn active={tab === "history"} onClick={() => setTab("history")} icon={History} label="Tarix" count={timeline.filter((t) => t.type === "execution").length} />
              </div>
              <div className="p-5 sm:p-6">
                {tab === "chat" ? (
                  <ChatPanel taskId={id} me={me} items={timeline.filter((t) => t.type === "message")} disabled={isClosed} onSent={reloadTimeline} />
                ) : (
                  <HistoryPanel items={timeline.filter((t) => t.type === "execution")} createdAt={task.created_at} creator={personName(task.created_by)} />
                )}
              </div>
            </section>
          </div>

          {/* ================================================== O'NG USTUN */}
          <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* Harakatlar */}
            <section className={CARD}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Harakatlar</p>
              <div className="mt-4 flex flex-col gap-2">
                {canApprove && (
                  <>
                    <button type="button" disabled={busy !== null} onClick={() => void run("approve", () => approveTaskExecution(id), "Topshiriq tasdiqlandi va yopildi")} className={BTN_SUCCESS}>
                      {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                      Tasdiqlash va yopish
                    </button>
                    <button type="button" disabled={busy !== null} onClick={() => setDialog("return")} className={BTN_WARN}>
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      Qayta ijroga yuborish
                    </button>
                  </>
                )}
                {canAccept && (
                  <button type="button" disabled={busy !== null} onClick={() => void run("accept", () => acceptTaskExecution(id), "Topshiriq ijroga olindi")} className={BTN_PRIMARY}>
                    {busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" aria-hidden />}
                    Ijroga olish
                  </button>
                )}
                {canReport && (
                  <button type="button" disabled={busy !== null} onClick={() => setDialog("report")} className={canAccept ? BTN_SOFT : BTN_PRIMARY}>
                    <Upload className="h-4 w-4" aria-hidden />
                    Hisobot va isbot yuklash
                  </button>
                )}
                {canExtend && (
                  <button type="button" disabled={busy !== null} onClick={() => setDialog("extend")} className={BTN_SOFT}>
                    <Clock className="h-4 w-4" aria-hidden />
                    Muddat uzaytirishni so‘rash
                  </button>
                )}
                {canEdit && (
                  <button type="button" onClick={() => setDialog("edit")} className={BTN_SOFT}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    Tahrirlash
                  </button>
                )}
                {!canApprove && !canAccept && !canReport && !canExtend && !canEdit && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {isClosed ? "Topshiriq yopilgan — o‘zgartirish mumkin emas." : awaiting ? "Hisobot yuborilgan. Hokim tasdig‘i kutilmoqda." : "Bu topshiriq bo‘yicha sizda harakat yo‘q."}
                  </p>
                )}
              </div>
            </section>

            {/* Ma'lumot */}
            <section className={CARD}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ma’lumot</p>
              <dl className="mt-4 space-y-4">
                <MetaRow icon={Calendar} label="Muddat">
                  <span className={cn("font-semibold", overdue ? "text-destructive" : "text-foreground")}>
                    {fmtDate(task.deadline)}
                  </span>
                  {left !== null && !isClosed && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {left > 0 ? `${left} kun qoldi` : left === 0 ? "bugun" : `${Math.abs(left)} kun o‘tdi`}
                    </span>
                  )}
                </MetaRow>
                <MetaRow icon={AlertCircle} label="Muhimlik">
                  {PRIORITY_LABEL[task.priority] ?? task.priority ?? "—"}
                </MetaRow>
                <MetaRow icon={Users} label="Nazoratchi">
                  {deputies.length ? deputies.map((d: any) => personName(d)).join(", ") : "—"}
                </MetaRow>
                <MetaRow icon={UserIcon} label="Yaratdi">
                  {personName(task.created_by)}
                  <span className="block text-xs text-muted-foreground">{fmtDate(task.created_at, true)}</span>
                </MetaRow>
                {task.closed_at && (
                  <MetaRow icon={CheckCircle2} label="Yopildi">
                    {fmtDate(task.closed_at, true)}
                    {task.closed_by && <span className="block text-xs text-muted-foreground">{personName(task.closed_by)}</span>}
                  </MetaRow>
                )}
              </dl>
            </section>
          </aside>
        </div>
      </DashboardDetailFrame>

      {/* ---------------------------------- Telefonda qadalgan asosiy harakat */}
      {primaryAction && (
        <div className="fixed inset-x-0 bottom-14 z-30 border-t border-border bg-card/95 p-3 pb-safe backdrop-blur-sm lg:hidden">
          <button type="button" disabled={busy !== null} onClick={primaryAction.onClick} className={cn(primaryAction.cls, "w-full")}>
            <primaryAction.icon className="h-4 w-4" aria-hidden />
            {primaryAction.label}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------ Dialoglar */}
      {dialog === "report" && (
        <ReportDialog
          taskId={id}
          taskTitle={task.title}
          onClose={() => setDialog(null)}
          onSubmitted={(t) => {
            setDialog(null)
            if (t && typeof t === "object") setTask(t as any)
            setToast("Hisobot yuborildi — hokim tasdig‘i kutilmoqda")
            void reloadTimeline()
          }}
        />
      )}
      {dialog === "return" && (
        <ReturnReasonDialog
          subtitle="Sabab ijrochiga ko‘rsatiladi — nima yetishmayotganini aniq yozing."
          busy={busy === "return"}
          error={actionError}
          onCancel={() => setDialog(null)}
          onSubmit={(reason) => {
            void run("return", () => returnTaskForRework(id, reason), "Topshiriq qayta ijroga yuborildi").then(() => setDialog(null))
          }}
        />
      )}
      {dialog === "edit" && (
        <EditDialog
          task={task}
          busy={busy === "edit"}
          onClose={() => setDialog(null)}
          onSave={(payload) => {
            void run("edit", () => updateTask(id, payload as any), "O‘zgarishlar saqlandi").then(() => setDialog(null))
          }}
        />
      )}
      {dialog === "extend" && (
        <ExtendDialog
          currentDeadline={task.deadline}
          busy={busy === "extend"}
          onClose={() => setDialog(null)}
          onSubmit={(d, reason) => {
            void run("extend", () => requestExtension(id, { requested_deadline: d, reason }), "Muddat uzaytirish so‘rovi yuborildi").then(() => setDialog(null))
          }}
        />
      )}
    </>
  )
}

/* ============================================================ BO'LAKLAR */

function SectionTitle({ icon: Icon, title, count }: { icon: React.ComponentType<{ className?: string }>; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">
        {title}
        {typeof count === "number" && <span className="ml-2 text-sm font-medium text-muted-foreground">{count}</span>}
      </h2>
    </div>
  )
}

function MetaRow({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      {typeof count === "number" && count > 0 && <span className="tabular-nums opacity-70">{count}</span>}
    </button>
  )
}

function AttachmentRow({ a }: { a: any }) {
  return (
    <a
      href={a.file}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl bg-background px-3 py-2.5 transition-colors hover:bg-muted"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-xs">
        {isImage(a) ? <ImageIcon className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{a.file_name || "Fayl"}</span>
        <span className="block text-xs text-muted-foreground">
          {typeof a.file_size === "number" ? formatFileSize(a.file_size) : ""}
          {a.uploaded_by_name ? ` · ${a.uploaded_by_name}` : ""}
        </span>
      </span>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </a>
  )
}

/** Holat banneri — odam tilida: hozir nima bo'lyapti va kim nima qilishi kerak */
function StatusBanner({ status, myOrgStatus, isOrgUser, canApprove, awaiting }: { status: string; myOrgStatus: string; isOrgUser: boolean; canApprove: boolean; awaiting: boolean }) {
  const s = isOrgUser ? myOrgStatus : status
  let tone = "bg-info-soft text-info-soft-foreground"
  let text = TASK_STATUS_HINT[s] ?? ""
  let Icon: React.ComponentType<{ className?: string }> = Clock

  if (canApprove) {
    tone = "bg-warning-soft text-warning-soft-foreground"
    text = "Ijrochi hisobot va isbotlarni yukladi. Ko‘rib chiqing: tasdiqlang yoki kamchilik bo‘lsa qayta ijroga yuboring."
    Icon = ShieldCheck
  } else if (awaiting) {
    tone = "bg-success-soft text-success-soft-foreground"
    text = "Hisobotingiz yuborildi. Hokim yoki o‘rinbosari tasdiqlashi kutilmoqda — qo‘shimcha harakat kerak emas."
    Icon = CheckCircle2
  } else if (isOrgUser && ["YANGI", "TEKSHIRUVDA"].includes(s)) {
    text = "Sizga yangi topshiriq. Tafsilotni o‘qing, so‘ng «Ijroga olish»ni bosing — muddat hisobi shundan boshlanadi."
    Icon = Play
  } else if (isOrgUser && s === "IJRODA") {
    text = "Ish bajarilmoqda. Tugatgach «Hisobot va isbot yuklash» orqali foto/hujjat bilan hisobot bering."
    Icon = Upload
  } else if (isOrgUser && s === "QAYTA_IJROGA_YUBORILDI") {
    tone = "bg-destructive-soft text-destructive-soft-foreground"
    text = "Hisobot qabul qilinmadi. Tarixdagi sababni o‘qib, kamchilikni bartaraf eting va qayta hisobot yuklang."
    Icon = RotateCcw
  } else if (s === "MUDDATI_KECH") {
    tone = "bg-destructive-soft text-destructive-soft-foreground"
    Icon = AlertCircle
  } else if (CLOSED.has(s)) {
    tone = "bg-muted text-muted-foreground"
    Icon = CheckCircle2
  }

  if (!text) return null
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl px-4 py-3.5 text-sm leading-6", tone)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <p>{text}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ Chat */

function ChatPanel({ taskId, me, items, disabled, onSent }: { taskId: string; me: any; items: any[]; disabled: boolean; onSent: () => void }) {
  const [text, setText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" })
  }, [items.length])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending || (!text.trim() && !file)) return
    setSending(true)
    setErr(null)
    try {
      await sendTaskMessage(taskId, { content: text.trim(), attachment: file ?? undefined } as any)
      setText("")
      setFile(null)
      onSent()
    } catch (e: any) {
      setErr(e?.message || "Xabar yuborilmadi")
    } finally {
      setSending(false)
    }
  }

  const myId = String(me?.id ?? "")

  return (
    <div>
      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {items.length === 0 && (
          <p className="rounded-xl bg-background px-4 py-6 text-center text-sm text-muted-foreground">
            Hali xabar yo‘q. Savol yoki izohingizni yozing — ijrochi va nazoratchi ko‘radi.
          </p>
        )}
        {items.map((m: any) => {
          const mine = String(m.sender ?? "") === myId
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-6", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-background text-foreground")}>
                {!mine && <p className="mb-0.5 text-xs font-semibold text-muted-foreground">{m.user_name || "—"}</p>}
                {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                {m.attachment && (
                  <a href={m.attachment.file} target="_blank" rel="noopener noreferrer" className={cn("mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium underline-offset-2 hover:underline", mine ? "text-primary-foreground" : "text-primary")}>
                    <Paperclip className="h-3.5 w-3.5" aria-hidden />
                    {m.attachment.file_name || "Fayl"}
                  </a>
                )}
                <p className={cn("mt-1 text-[11px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>{fmtDate(m.timestamp, true)}</p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {disabled ? (
        <p className="mt-4 text-xs text-muted-foreground">Topshiriq yopilgan — muhokama faqat o‘qish uchun.</p>
      ) : (
        <form onSubmit={send} className="mt-4">
          {file && (
            <p className="mb-2 inline-flex items-center gap-2 rounded-lg bg-background px-3 py-1.5 text-xs text-foreground">
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              <span className="max-w-[220px] truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="Faylni olib tashlash" className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </p>
          )}
          {err && <p className="mb-2 text-xs text-destructive">{err}</p>}
          <div className="flex items-end gap-2">
            <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-background text-muted-foreground hover:bg-muted hover:text-foreground">
              <Paperclip className="h-4 w-4" aria-hidden />
              <span className="sr-only">Fayl biriktirish</span>
              <input type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  ;(e.currentTarget.form as HTMLFormElement | null)?.requestSubmit()
                }
              }}
              rows={1}
              placeholder="Xabar yozing…"
              className={cn(FIELD, "min-h-11 resize-none py-2.5")}
            />
            <button type="submit" disabled={sending || (!text.trim() && !file)} className={cn(BTN_PRIMARY, "h-11 w-11 shrink-0 px-0")} aria-label="Yuborish">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- Tarix */

function HistoryPanel({ items, createdAt, creator }: { items: any[]; createdAt?: string; creator: string }) {
  const rows = [
    { id: "created", timestamp: createdAt, user_name: creator, content: "Topshiriq yaratildi", action_type: "YARATILDI" },
    ...items,
  ]
  return (
    <ol className="space-y-4">
      {rows.map((r: any, i) => (
        <li key={`${r.id}-${i}`} className="flex gap-3">
          <span className="relative flex flex-col items-center">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
            {i < rows.length - 1 && <span className="mt-1 w-px flex-1 bg-border" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{r.user_name || "Tizim"}</span>
              <span className="text-muted-foreground"> · {fmtDate(r.timestamp, true)}</span>
            </p>
            <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{r.content}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

/* ------------------------------------------------------------ Dialoglar */

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#0d1524]/50" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" className="relative z-10 w-full max-w-lg rounded-t-3xl bg-card p-6 shadow-[0_40px_100px_-30px_rgba(13,21,36,0.4)] pb-safe sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

function EditDialog({ task, busy, onClose, onSave }: { task: any; busy: boolean; onClose: () => void; onSave: (p: Record<string, unknown>) => void }) {
  const [title, setTitle] = useState<string>(task.title ?? "")
  const [description, setDescription] = useState<string>(task.description ?? "")
  const [priority, setPriority] = useState<string>(task.priority ?? "ODDIY")
  const [deadline, setDeadline] = useState<string>(localDateInput(task.deadline))
  const [err, setErr] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setErr("Sarlavha majburiy")
    if (!deadline) return setErr("Muddatni tanlang")
    setErr(null)
    onSave({ title: title.trim(), description, priority, deadline: `${deadline}T23:59:00` })
  }

  return (
    <Modal title="Topshiriqni tahrirlash" subtitle="O‘zgarishlar ijro tarixiga yoziladi." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sarlavha</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} maxLength={500} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Tafsilot</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={cn(FIELD, "min-h-28 resize-y py-2.5")} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Muhimlik</span>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <button key={p} type="button" onClick={() => setPriority(p)} aria-pressed={priority === p} className={cn("h-10 rounded-xl px-3 text-sm font-medium", priority === p ? "bg-primary-soft text-primary-soft-foreground shadow-[inset_0_0_0_1.5px_var(--primary)]" : "bg-background text-foreground hover:bg-muted")}>
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Muddat</span>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={FIELD} />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={BTN_SOFT}>Bekor qilish</button>
          <button type="submit" disabled={busy} className={BTN_PRIMARY}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" aria-hidden />}
            Saqlash
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ExtendDialog({ currentDeadline, busy, onClose, onSubmit }: { currentDeadline?: string; busy: boolean; onClose: () => void; onSubmit: (deadline: string, reason: string) => void }) {
  const [deadline, setDeadline] = useState("")
  const [reason, setReason] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const min = localDateInput(new Date().toISOString())

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deadline) return setErr("Yangi muddatni tanlang")
    if (currentDeadline && deadline <= localDateInput(currentDeadline)) return setErr("Yangi muddat joriy muddatdan keyin bo‘lishi kerak")
    if (reason.trim().length < 10) return setErr("Sababni kamida 10 belgi bilan yozing")
    setErr(null)
    onSubmit(`${deadline}T23:59:00`, reason.trim())
  }

  return (
    <Modal title="Muddat uzaytirishni so‘rash" subtitle={`Joriy muddat: ${fmtDate(currentDeadline)}. So‘rovni hokim yoki o‘rinbosari ko‘rib chiqadi.`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Yangi muddat</span>
          <input type="date" min={min} value={deadline} onChange={(e) => setDeadline(e.target.value)} className={FIELD} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sabab</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Nima uchun muddat yetmayapti — aniq yozing" className={cn(FIELD, "min-h-24 resize-y py-2.5")} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={BTN_SOFT}>Bekor qilish</button>
          <button type="submit" disabled={busy} className={BTN_PRIMARY}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" aria-hidden />}
            So‘rov yuborish
          </button>
        </div>
      </form>
    </Modal>
  )
}
