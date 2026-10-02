"use client"

/**
 * FAYL KO'RGICHI — topshiriq va murojaat fayllari SAYT ICHIDA ochiladi.
 *
 * Ilgari har bir ilova `<a href target="_blank">` edi: rasm yangi
 * varaqda ochilardi, `.docx` esa jim yuklab olinardi. Foydalanuvchi
 * saytdan chiqib ketardi va topshiriq konteksti yo'qolardi.
 *
 * Endi hamma narsa bitta modalda: rasm, video, audio, PDF, matn,
 * Word va Excel. Ochib bo'lmaydigan format uchun yuklab olish
 * taklif qilinadi — yolg'on va'da berilmaydi.
 *
 * Ishlatish:
 *
 *     const viewer = useFileViewer()
 *     <button onClick={() => viewer.open(files, index)}>...</button>
 *     <FileViewer {...viewer.props} />
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react"

import {
  detectPreviewKind,
  formatBytes,
  kindLabel,
  type PreviewKind,
  type ViewerFile,
} from "@/lib/file-preview"
import { cn } from "@/lib/utils"

import { OfficePane, PdfPane, TextPane, UnsupportedPane } from "./document-panes"

/* ================================================================== HOOK */

export interface FileViewerState {
  files: ViewerFile[]
  index: number
  open: (files: ViewerFile[], index?: number) => void
  close: () => void
  props: FileViewerProps
}

/** Ko'rgich holatini boshqaradigan hook. */
export function useFileViewer(): FileViewerState {
  const [files, setFiles] = useState<ViewerFile[]>([])
  const [index, setIndex] = useState(0)

  const open = useCallback((next: ViewerFile[], startIndex = 0) => {
    if (!next.length) return
    setFiles(next)
    setIndex(Math.min(Math.max(startIndex, 0), next.length - 1))
  }, [])

  const close = useCallback(() => setFiles([]), [])

  return {
    files,
    index,
    open,
    close,
    props: { files, index, onIndexChange: setIndex, onClose: close },
  }
}

/* ============================================================== KOMPONENT */

export interface FileViewerProps {
  files: ViewerFile[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

export function FileViewer({ files, index, onIndexChange, onClose }: FileViewerProps) {
  // Kattalashtirish QAYSI fayl uchun yoqilgani saqlanadi — fayl
  // almashganda effekt bilan tozalash kerak emas.
  const [expandedFor, setExpandedFor] = useState<number | null>(null)
  const expanded = expandedFor === index
  const isOpen = files.length > 0
  const file = files[index]

  const goPrev = useCallback(() => {
    if (files.length > 1) onIndexChange((index - 1 + files.length) % files.length)
  }, [files.length, index, onIndexChange])

  const goNext = useCallback(() => {
    if (files.length > 1) onIndexChange((index + 1) % files.length)
  }, [files.length, index, onIndexChange])

  // Klaviatura: Esc yopadi, o'q tugmalari fayllar orasida yuradi.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      else if (event.key === "ArrowLeft") goPrev()
      else if (event.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen, onClose, goPrev, goNext])

  // Modal ochiq turganda orqadagi sahifa siljimaydi.
  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  if (!isOpen || !file) return null

  const kind = detectPreviewKind(file)
  const meta = [kindLabel(kind), formatBytes(file.size), file.meta].filter(Boolean).join(" · ")

  return (
    // 100dvh — iOS Safari brauzer paneli bilan hisoblaydi, 100vh emas.
    <div
      className="fixed inset-0 z-[70] flex h-[100dvh] w-full flex-col bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Fayl: ${file.name}`}
    >
      <ViewerHeader
        file={file}
        meta={meta}
        position={files.length > 1 ? `${index + 1} / ${files.length}` : ""}
        expanded={expanded}
        onToggleExpand={() => setExpandedFor(expanded ? null : index)}
        onClose={onClose}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <PreviewPane file={file} kind={kind} expanded={expanded} />

        {files.length > 1 && (
          <>
            <NavButton side="left" onClick={goPrev} />
            <NavButton side="right" onClick={goNext} />
          </>
        )}
      </div>

      {files.length > 1 && (
        <ViewerStrip files={files} index={index} onSelect={onIndexChange} />
      )}
    </div>
  )
}

/* =================================================================== BOSHLIQ */

function ViewerHeader({
  file,
  meta,
  position,
  expanded,
  onToggleExpand,
  onClose,
}: {
  file: ViewerFile
  meta: string
  position: string
  expanded: boolean
  onToggleExpand: () => void
  onClose: () => void
}) {
  const kind = detectPreviewKind(file)
  const canZoom = kind === "image"

  return (
    <header className="flex shrink-0 items-center gap-3 bg-card px-3 py-2.5 shadow-sm sm:px-5 sm:py-3">
      {/* Nom truncate bo'lgani uchun nishonlar alohida flex qatorda —
          aks holda ular kesilmay viewport'dan chiqib ketadi. */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
        {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
      </div>

      {position && (
        <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
          {position}
        </span>
      )}

      {canZoom && (
        <IconButton
          label={expanded ? "Kichraytirish" : "Kattalashtirish"}
          onClick={onToggleExpand}
          icon={expanded ? Minimize2 : Maximize2}
        />
      )}

      <IconButton
        label="Yangi oynada ochish"
        href={file.url}
        icon={ExternalLink}
        className="hidden sm:inline-flex"
      />

      <IconButton
        label="Yuklab olish"
        href={file.downloadUrl || file.url}
        download={file.name}
        icon={Download}
      />

      <IconButton label="Yopish" onClick={onClose} icon={X} tone="solid" />
    </header>
  )
}

/* ==================================================================== PANEL */

function PreviewPane({
  file,
  kind,
  expanded,
}: {
  file: ViewerFile
  kind: PreviewKind
  expanded: boolean
}) {
  if (kind === "image") {
    return (
      <div className={cn("h-full w-full bg-surface-sunken", expanded ? "overflow-auto" : "overflow-hidden")}>
        <div className={cn("flex min-h-full w-full items-center justify-center p-3 sm:p-6", expanded && "min-w-max")}>
          {/* next/image ishlatilmaydi: manba ixtiyoriy domendagi
              imzolangan havola bo'lishi mumkin va optimizatsiya uni
              qayta yozib, imzoni buzadi. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.url}
            alt={file.name}
            className={cn(
              "rounded-xl bg-card shadow-sm",
              expanded ? "max-w-none" : "max-h-full max-w-full object-contain",
            )}
          />
        </div>
      </div>
    )
  }

  if (kind === "video") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-sunken p-3 sm:p-6">
        {/* To'g'ridan-to'g'ri manba: backend Range so'rovlarini
            qo'llab-quvvatlaydi, ya'ni videoni oldinga surish ishlaydi.
            Blob orqali yuklansa butun fayl kutilardi. */}
        <video
          src={file.url}
          controls
          playsInline
          preload="metadata"
          className="max-h-full max-w-full rounded-xl bg-card shadow-sm"
        >
          Brauzeringiz videoni qo'llab-quvvatlamaydi.
        </video>
      </div>
    )
  }

  if (kind === "audio") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-sunken p-4">
        <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-sm">
          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
          <audio src={file.url} controls preload="metadata" className="mt-4 w-full">
            Brauzeringiz audioni qo'llab-quvvatlamaydi.
          </audio>
        </div>
      </div>
    )
  }

  if (kind === "pdf") return <PdfPane file={file} />
  if (kind === "text") return <TextPane file={file} />
  if (kind === "office") return <OfficePane file={file} />

  return <UnsupportedPane file={file} />
}

/* ================================================================ NAVIGATSIYA */

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Oldingi fayl" : "Keyingi fayl"}
      className={cn(
        "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-colors hover:bg-muted",
        side === "left" ? "left-2 sm:left-4" : "right-2 sm:right-4",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  )
}

function ViewerStrip({
  files,
  index,
  onSelect,
}: {
  files: ViewerFile[]
  index: number
  onSelect: (index: number) => void
}) {
  return (
    // Gorizontal siljish: 10 ta fayl 360px ga hech qachon sig'maydi.
    <div className="flex shrink-0 gap-2 overflow-x-auto bg-card px-3 py-2.5 sm:px-5">
      {files.map((file, position) => {
        const kind = detectPreviewKind(file)
        const isActive = position === index
        return (
          <button
            key={`${file.id}-${position}`}
            type="button"
            onClick={() => onSelect(position)}
            aria-current={isActive}
            className={cn(
              "flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-primary-soft text-primary-soft-foreground hover:bg-muted",
            )}
          >
            <span className="max-w-[140px] truncate">{file.name}</span>
            <span className="opacity-70">{kindLabel(kind)}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ==================================================================== TUGMA */

function IconButton({
  label,
  icon: Icon,
  onClick,
  href,
  download,
  tone = "soft",
  className,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  href?: string
  download?: string
  tone?: "soft" | "solid"
  className?: string
}) {
  // Sensorli nishon 44px — mobil talab.
  const classes = cn(
    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
    tone === "solid"
      ? "bg-primary text-primary-foreground hover:bg-primary-hover"
      : "bg-primary-soft text-primary-soft-foreground hover:bg-muted",
    className,
  )

  if (href) {
    return (
      <a
        href={href}
        download={download}
        target={download ? undefined : "_blank"}
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className={classes}
      >
        <Icon className="h-4.5 w-4.5" aria-hidden />
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={classes}>
      <Icon className="h-4.5 w-4.5" aria-hidden />
    </button>
  )
}

export type { ViewerFile }
