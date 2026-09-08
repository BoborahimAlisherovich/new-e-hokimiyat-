"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, FileText, Loader2, RotateCcw, Send, Trash2, Upload, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { submitTaskReport } from "@/lib/api/approval.api"

/**
 * TOPSHIRIQ IJROSI OYNALARI
 *
 * 1) ReportDialog — ijrochi hisobot va ISBOT fayllarini topshiradi.
 *
 *    Nima uchun kerak: topshiriqni `BAJARILDI` holatiga o'tkazadigan
 *    yagona to'g'ri endpoint `/tasks/{id}/report/` bo'lib, u bir nechta
 *    fayl qabul qiladi va ularni `TaskExecution` bilan bog'laydi — lekin
 *    frontend'da uning klienti YO'Q edi. UI `mark-complete` ni chaqirardi,
 *    u esa fayl qabul qilmaydi. Natijada topshiriq NOL isbot bilan
 *    "bajarildi" bo'lib yopilardi.
 *
 * 2) ReturnReasonDialog — hokim ishni qayta ijroga yuboradi, sabab bilan.
 *
 *    Ilgari sabab `prompt()` orqali olinardi va so'rov mavjud bo'lmagan
 *    `/tasks/{id}/reject/` endpointiga ketardi (404).
 */

const MIN_COMMENT = 10
const MIN_REASON = 10
const MAX_FILES = 10
const MAX_FILE_MB = 20
const ALLOWED_EXT = [
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
  "jpg", "jpeg", "png", "webp", "heic", "gif",
  "mp4", "webm", "mov", "mp3", "m4a", "ogg", "wav",
]

/* ========================================================== UMUMIY QOBIQ */

function Modal({
  titleId,
  title,
  subtitle,
  onClose,
  children,
}: {
  titleId: string
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    // Fon skrolli oynadan orqada qolib ketmasligi uchun
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-border bg-card p-4 pb-safe shadow-lg sm:rounded-xl sm:pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4.5 w-4.5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ================================================== 1) HISOBOT VA ISBOTLAR */

export function ReportDialog({
  taskId,
  taskTitle,
  onClose,
  onSubmitted,
}: {
  taskId: string | number
  taskTitle?: string
  onClose: () => void
  /** Muvaffaqiyatli topshirilgandan keyin — yangilangan topshiriq */
  onSubmitted: (task: unknown) => void
}) {
  const [comment, setComment] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [touched, setTouched] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const areaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    areaRef.current?.focus()
  }, [])

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming)
    const problems: string[] = []

    setFiles((prev) => {
      const next = [...prev]
      for (const f of list) {
        if (next.length >= MAX_FILES) {
          problems.push(`Ko‘pi bilan ${MAX_FILES} ta fayl`)
          break
        }
        const ext = f.name.split(".").pop()?.toLowerCase() ?? ""
        if (!ALLOWED_EXT.includes(ext)) {
          problems.push(`«${f.name}» — bu fayl turi ruxsat etilmagan`)
          continue
        }
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          problems.push(`«${f.name}» — ${MAX_FILE_MB} MB dan katta`)
          continue
        }
        if (next.some((x) => x.name === f.name && x.size === f.size)) continue
        next.push(f)
      }
      return next
    })

    setFileError(problems.length ? problems.join(". ") : null)
  }, [])

  const commentTooShort = comment.trim().length < MIN_COMMENT
  const noProof = files.length === 0
  const showCommentError = touched && commentTooShort
  const showProofError = touched && noProof

  const submit = useCallback(async () => {
    setTouched(true)
    setSubmitError(null)
    if (commentTooShort || noProof) return

    setBusy(true)
    try {
      const task = await submitTaskReport(taskId, comment.trim(), files)
      onSubmitted(task)
    } catch (err: any) {
      setSubmitError(
        err?.data?.attachments?.[0] ||
          err?.data?.comment?.[0] ||
          err?.data?.detail ||
          err?.data?.error ||
          err?.message ||
          "Hisobotni topshirib bo‘lmadi. Fayllar hajmi va turini tekshirib, qayta urinib ko‘ring.",
      )
    } finally {
      setBusy(false)
    }
  }, [taskId, comment, files, commentTooShort, noProof, onSubmitted])

  return (
    <Modal
      titleId="report-title"
      title="Hisobot va isbotlarni topshirish"
      subtitle={taskTitle}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="mt-4 space-y-4"
      >
        {submitError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md bg-destructive-soft px-3 py-2.5 text-sm text-destructive-soft-foreground"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {submitError}
          </p>
        )}

        {/* Hisobot matni */}
        <div>
          <label
            htmlFor="report-comment"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Bajarilgan ish bayoni
            <span className="ml-1 text-destructive" aria-label="majburiy">*</span>
          </label>
          <textarea
            id="report-comment"
            ref={areaRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => setTouched(true)}
            rows={4}
            aria-invalid={showCommentError}
            placeholder="Nima qilindi, qancha hajmda, qachon tugatildi…"
            className={cn(
              "w-full resize-y rounded-md border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              showCommentError ? "border-destructive" : "border-input",
            )}
          />
          {showCommentError && (
            <p role="alert" className="mt-1 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              Kamida {MIN_COMMENT} belgi yozing
            </p>
          )}
        </div>

        {/* Isbot fayllari */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Isbot fayllari
            <span className="ml-1 text-destructive" aria-label="majburiy">*</span>
          </label>
          <p className="mb-1.5 text-xs text-muted-foreground">
            Ish bajarilganini ko‘rsatadigan foto, video yoki hujjat. Hokim
            aynan shu fayllarga qarab tasdiqlaydi. Ko‘pi bilan {MAX_FILES} ta,
            har biri {MAX_FILE_MB} MB gacha.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
            }}
            className={cn(
              "rounded-md border-2 border-dashed p-4 text-center transition-colors",
              dragging
                ? "border-primary bg-accent"
                : showProofError
                  ? "border-destructive bg-destructive-soft/40"
                  : "border-border bg-muted/40",
            )}
          >
            <Upload className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-2 inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Fayl tanlash
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files)
                e.target.value = ""
              }}
            />
          </div>

          {(fileError || showProofError) && (
            <p role="alert" className="mt-1 flex items-start gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {fileError ?? "Kamida bitta isbot fayl yuklang"}
            </p>
          )}

          {files.length > 0 && (
            <ul className="mt-2 divide-y divide-border rounded-md border border-border">
              {files.map((f, i) => (
                <li key={`${f.name}-${f.size}`} className="flex items-center gap-2.5 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{f.name}</span>
                    <span className="block text-2xs tabular-nums text-muted-foreground">
                      {(f.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, x) => x !== i))}
                    aria-label={`${f.name} — o‘chirish`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="rounded-md bg-info-soft px-3 py-2 text-xs text-info-soft-foreground">
          Topshirilgandan keyin topshiriq <strong>«Tasdiqlashda»</strong>
          {" "}holatiga o‘tadi va hokim tasdig‘ini kutadi.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            Hisobotni topshirish
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ============================================ 2) QAYTA IJROGA YUBORISH */

export function ReturnReasonDialog({
  title = "Qayta ijroga yuborish",
  subtitle,
  busy = false,
  error,
  onCancel,
  onSubmit,
}: {
  title?: string
  subtitle?: string
  busy?: boolean
  error?: string | null
  onCancel: () => void
  onSubmit: (reason: string) => void
}) {
  const [reason, setReason] = useState("")
  const [touched, setTouched] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    areaRef.current?.focus()
  }, [])

  const tooShort = reason.trim().length < MIN_REASON
  const showError = touched && tooShort

  return (
    <Modal titleId="return-title" title={title} subtitle={subtitle} onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setTouched(true)
          if (tooShort) return
          onSubmit(reason.trim())
        }}
        className="mt-4"
      >
        {error && (
          <p
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-md bg-destructive-soft px-3 py-2.5 text-sm text-destructive-soft-foreground"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <label
          htmlFor="return-reason"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Sabab
          <span className="ml-1 text-destructive" aria-label="majburiy">*</span>
        </label>
        <p className="mb-1.5 text-xs text-muted-foreground">
          Ijrochi nimani tuzatishi kerakligini aniq yozing — bu matn unga
          bildirishnoma sifatida boradi va topshiriq tarixida saqlanadi.
        </p>
        <textarea
          id="return-reason"
          ref={areaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={4}
          aria-invalid={showError}
          placeholder="Masalan: yuklangan foto ishning tugaganini ko‘rsatmaydi, yo‘lning to‘liq uzunligi bo‘yicha suratlar kerak."
          className={cn(
            "w-full resize-y rounded-md border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            showError ? "border-destructive" : "border-input",
          )}
        />
        <div className="mt-1 flex items-center justify-between">
          {showError ? (
            <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              Kamida {MIN_REASON} belgi yozing
            </p>
          ) : (
            <span />
          )}
          <p className="text-2xs tabular-nums text-muted-foreground">{reason.trim().length}</p>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden />
            )}
            Qayta ijroga yuborish
          </button>
        </div>
      </form>
    </Modal>
  )
}
