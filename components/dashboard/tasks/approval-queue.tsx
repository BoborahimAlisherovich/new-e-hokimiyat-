"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Music,
  RotateCcw,
  Search,
  ShieldCheck,
  Video,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { PremiumEmptyState, PremiumTableSkeleton } from "@/components/dashboard/premium-dashboard-ui"
import { PriorityBadge, TaskStatusBadge } from "@/components/ui/status-badge"
import { ReturnReasonDialog } from "@/components/dashboard/tasks/task-action-dialogs"
import {
  approveTaskExecution,
  formatFileSize,
  getPendingApprovalTasks,
  isImageAttachment,
  returnTaskForRework,
  type AwaitingOrganization,
  type PendingApprovalTask,
  type ProofAttachment,
} from "@/lib/api/approval.api"

/**
 * «TASDIQLASHDA» — HOKIM UCHUN TASDIQLASH NAVBATI
 *
 * Ilgari bunday bo'lim yo'q edi. Hokim bajarilgan ishni ko'rish uchun
 * topshiriqlar ro'yxatida filtrdan qo'lda `BAJARILDI` ni tanlashi kerak
 * edi, statistikada esa `BAJARILDI` va `NAZORATDAN_YECHILDI` bitta
 * raqamga qo'shilgani uchun nechta ish kutayotganini bilish ham imkonsiz
 * edi. `my-actions.tsx` faylida "Nazoratdan yechish" va "Qayta ijroga
 * yuborish" tugmalari bor edi, lekin BIRORTASIDA `onClick` yo'q va
 * komponent hech qayerda ulanmagan.
 *
 * Bu yerda har bir topshiriq TASHKILOT KESIMIDA ko'rsatiladi: kim
 * hisobot topshirdi, qanday isbot yukladi, va shu tashkilot uchun
 * alohida tasdiqlash yoki qayta ijroga yuborish mumkin.
 */

export function ApprovalQueue() {
  const [items, setItems] = useState<PendingApprovalTask[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")

  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [returnTarget, setReturnTarget] = useState<{
    task: PendingApprovalTask
    org: AwaitingOrganization
  } | null>(null)
  const [lightbox, setLightbox] = useState<ProofAttachment | null>(null)

  const reqRef = useRef(0)
  const liveRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    const id = ++reqRef.current
    setLoading(true)
    setError(null)
    try {
      const page = await getPendingApprovalTasks({ search: debounced || undefined }, 1, 50)
      if (id !== reqRef.current) return
      setItems(page.results)
      setCount(page.count)
    } catch (err: any) {
      if (id !== reqRef.current) return
      setItems([])
      setCount(0)
      setError(
        err?.status === 403
          ? "Bu bo‘limga faqat hokim kira oladi."
          : err?.message || "Navbatni yuklab bo‘lmadi.",
      )
    } finally {
      if (id === reqRef.current) setLoading(false)
    }
  }, [debounced])

  useEffect(() => {
    void load()
  }, [load])

  function announce(text: string) {
    if (liveRef.current) liveRef.current.textContent = text
  }

  /* ------------------------------------------------------------ Tasdiqlash */
  const approve = useCallback(
    async (task: PendingApprovalTask, org: AwaitingOrganization) => {
      const key = `${task.id}:${org.organization_id}:approve`
      setPendingAction(key)
      setActionError(null)
      try {
        await approveTaskExecution(task.id, { organizationId: org.organization_id })
        announce(`${org.organization_name} ishi nazoratdan yechildi.`)
        await load()
      } catch (err: any) {
        setActionError(
          err?.data?.detail ||
            err?.data?.error ||
            err?.message ||
            "Tasdiqlab bo‘lmadi. Qayta urinib ko‘ring.",
        )
      } finally {
        setPendingAction(null)
      }
    },
    [load],
  )

  /* --------------------------------------------------------- Qayta ijroga */
  const submitReturn = useCallback(
    async (reason: string) => {
      if (!returnTarget) return
      const { task, org } = returnTarget
      const key = `${task.id}:${org.organization_id}:return`
      setPendingAction(key)
      setActionError(null)
      try {
        await returnTaskForRework(task.id, reason, org.organization_id)
        announce(`${org.organization_name} ishi qayta ijroga yuborildi.`)
        setReturnTarget(null)
        await load()
      } catch (err: any) {
        setActionError(
          err?.data?.comment?.[0] ||
            err?.data?.detail ||
            err?.message ||
            "Qayta ijroga yuborib bo‘lmadi.",
        )
      } finally {
        setPendingAction(null)
      }
    },
    [returnTarget, load],
  )

  /* ------------------------------------------------------------------ RENDER */
  return (
    <div className="space-y-4">
      <div ref={liveRef} role="status" aria-live="polite" className="sr-only" />

      {/* Qidiruv */}
      <div className="surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Topshiriq yoki tashkilot bo‘yicha qidirish…"
            aria-label="Tasdiqlash navbatida qidirish"
            className="h-11 w-full rounded-md border border-input bg-card pl-8.5 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
        <p className="shrink-0 text-sm text-muted-foreground">
          Navbatda:{" "}
          <span className="font-semibold tabular-nums text-foreground">{count}</span>
        </p>
      </div>

      {actionError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-destructive-soft px-3 py-2.5 text-sm text-destructive-soft-foreground"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {actionError}
        </p>
      )}

      {error ? (
        <div role="alert" className="surface p-6 text-center">
          <p className="text-md font-semibold text-foreground">Yuklab bo‘lmadi</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Qayta urinish
          </button>
        </div>
      ) : loading ? (
        <div className="surface overflow-hidden">
          <PremiumTableSkeleton rows={4} columns={3} />
        </div>
      ) : items.length === 0 ? (
        <div className="surface">
          <PremiumEmptyState
            icon={ShieldCheck}
            title="Navbat bo‘sh"
            description={
              debounced
                ? "Qidiruv bo‘yicha tasdiqlashni kutayotgan topshiriq topilmadi."
                : "Hozircha tasdiqlashni kutayotgan topshiriq yo‘q. Ijrochilar hisobot yuklaganda ular shu yerda paydo bo‘ladi."
            }
            action={
              <Link
                href="/dashboard/tasks"
                className="inline-flex h-11 items-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Barcha topshiriqlar
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((task) => (
            <li key={task.id} className="surface animate-fade-in overflow-hidden">
              {/* Topshiriq sarlavhasi */}
              <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PriorityBadge priority={task.priority} size="sm" />
                    <TaskStatusBadge status={task.status} size="sm" />
                    {(task as any).sector_name && (
                      <span className="badge-status badge-status-plain st-bajarilmadi text-2xs">
                        {(task as any).sector_name}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-1.5 text-md font-semibold text-foreground">
                    {task.title}
                  </h2>
                  {task.deadline && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Muddat: {formatDate(task.deadline)}
                    </p>
                  )}
                </div>
                <Link
                  href={`/dashboard/tasks/${task.id}`}
                  className="inline-flex h-9 shrink-0 items-center gap-1 self-start rounded-md px-2 text-xs font-semibold text-primary hover:underline"
                >
                  To‘liq ko‘rish
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>

              {/* Tashkilot kesimida hisobotlar */}
              <ul className="divide-y divide-border">
                {(task.awaiting_organizations ?? []).map((org) => {
                  const approveKey = `${task.id}:${org.organization_id}:approve`
                  const returnKey = `${task.id}:${org.organization_id}:return`
                  const busy = pendingAction === approveKey || pendingAction === returnKey

                  return (
                    <li key={org.id ?? org.organization_id} className="p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {org.organization_name}
                        </p>
                        {org.reported_at && (
                          <p className="text-2xs tabular-nums text-muted-foreground">
                            Hisobot: {formatDateTime(org.reported_at)}
                          </p>
                        )}
                      </div>

                      {/* Hisobot matni */}
                      {org.report_comment ? (
                        <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted px-3 py-2.5 text-sm text-foreground">
                          {org.report_comment}
                        </p>
                      ) : (
                        <p className="mt-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">
                          Hisobot matni kiritilmagan
                        </p>
                      )}

                      {/* Isbotlar */}
                      <ProofList
                        attachments={org.attachments ?? []}
                        onOpenImage={setLightbox}
                      />

                      {/* Harakatlar */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void approve(task, org)}
                          className="inline-flex h-11 items-center gap-1.5 rounded-md bg-success px-4 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-50"
                        >
                          {pendingAction === approveKey ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Check className="h-4 w-4" aria-hidden />
                          )}
                          Nazoratdan yechish
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setActionError(null)
                            setReturnTarget({ task, org })
                          }}
                          className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden />
                          Qayta ijroga yuborish
                        </button>
                      </div>
                    </li>
                  )
                })}

                {(task.awaiting_organizations ?? []).length === 0 && (
                  <li className="p-4 text-sm text-muted-foreground">
                    Tashkilot kesimidagi ma’lumot topilmadi.{" "}
                    <Link
                      href={`/dashboard/tasks/${task.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      Topshiriqni ochish
                    </Link>
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {/* Qayta ijroga yuborish oynasi — sabab majburiy */}
      {returnTarget && (
        <ReturnReasonDialog
          subtitle={`${returnTarget.org.organization_name} · ${returnTarget.task.title ?? ""}`}
          busy={pendingAction?.endsWith(":return") ?? false}
          error={actionError}
          onCancel={() => setReturnTarget(null)}
          onSubmit={submitReturn}
        />
      )}

      {/* Isbot rasmini kattalashtirib ko'rish */}
      {lightbox && <Lightbox attachment={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}

/* ========================================================== ISBOT RO'YXATI */

function ProofList({
  attachments,
  onOpenImage,
}: {
  attachments: ProofAttachment[]
  onOpenImage: (a: ProofAttachment) => void
}) {
  if (attachments.length === 0) {
    return (
      <p className="mt-2 flex items-center gap-1.5 rounded-md bg-warning-soft px-3 py-2 text-xs font-medium text-warning-soft-foreground">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Isbot fayl biriktirilmagan — tasdiqlashdan oldin ijrochidan so‘rash tavsiya etiladi
      </p>
    )
  }

  const images = attachments.filter(isImageAttachment)
  const others = attachments.filter((a) => !isImageAttachment(a))

  return (
    <div className="mt-3 space-y-2">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Isbotlar ({attachments.length})
      </p>

      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {images.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onOpenImage(a)}
                className="block overflow-hidden rounded-md border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                aria-label={`${a.file_name} — kattalashtirib ko‘rish`}
              >
                {/* next/image ishlatilmadi: fayl manzillari media serverdan
                    keladi va remotePatterns ro'yxatiga kirmasligi mumkin */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.file}
                  alt={a.file_name}
                  loading="lazy"
                  className="h-24 w-24 object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {others.map((a) => (
            <li key={a.id} className="flex items-center gap-2.5 px-3 py-2">
              <FileIcon type={a.file_type} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{a.file_name}</span>
                <span className="block text-2xs tabular-nums text-muted-foreground">
                  {formatFileSize(a.file_size)}
                </span>
              </span>
              <a
                href={a.file}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`${a.file_name} — ochish`}
              >
                <Download className="h-4 w-4" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FileIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0 text-muted-foreground"
  if (type === "VIDEO") return <Video className={cls} aria-hidden />
  if (type === "AUDIO") return <Music className={cls} aria-hidden />
  if (type === "IMAGE") return <ImageIcon className={cls} aria-hidden />
  return <FileText className={cls} aria-hidden />
}

/* ================================================================ LIGHTBOX */

function Lightbox({
  attachment,
  onClose,
}: {
  attachment: ProofAttachment
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={attachment.file_name}
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachment.file}
        alt={attachment.file_name}
        className="max-h-full max-w-full rounded-md object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Yopish"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
      <a
        href={attachment.file}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
      >
        Asl faylni ochish
      </a>
    </div>
  )
}

/* ------------------------------------------------------------- Yordamchi */

function formatDate(v?: string | null): string {
  if (!v) return "—"
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d)
}

function formatDateTime(v?: string | null): string {
  if (!v) return "—"
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("uz-UZ", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d)
}
