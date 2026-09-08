"use client"

import type React from "react"
import { useRef } from "react"
import { AlertCircle, Check, CheckCheck, Clock, Download, FileText, Play, RotateCcw } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  formatBytes,
  formatDuration,
  type ChatAttachment,
} from "@/lib/api/chat-v2.api"
import { timeLabel, type LocalMessage } from "./chat-utils"

/**
 * XABAR PUFAGI
 *
 * Ilgari har bir xabar ustida avatar, ism va to'liq `dd.mm.yyyy hh:mm`
 * takrorlanardi, pufak esa oddiy `rounded-[20px]` to'rtburchak edi.
 * Endi guruhlash (`first`/`last`), burchak «dumi», ✓/✓✓ belgilari
 * pufak ichida, javob bloki, tahrirlangan belgisi va o'chirilgan
 * xabar o'rniga placeholder bor.
 *
 * O'chirish tugmasi ilgari `opacity-0 group-hover:opacity-100` edi —
 * sensorli ekranda unga yetib bo'lmasdi. Endi amallar uzoq bosish
 * (long-press) yoki o'ng tugma bilan ochiladi va ular thread
 * komponentidagi bitta panelda ko'rsatiladi.
 */

const LONG_PRESS_MS = 450

export function MessageBubble({
  message,
  first,
  last,
  language,
  onMenu,
  onRetry,
  onJumpToReply,
  onOpenImage,
  highlighted,
}: {
  message: LocalMessage
  first: boolean
  last: boolean
  language?: string
  onMenu: (message: LocalMessage) => void
  onRetry: (message: LocalMessage) => void
  onJumpToReply: (id: number) => void
  onOpenImage: (a: ChatAttachment) => void
  highlighted?: boolean
}) {
  const mine = message.mine
  const timer = useRef<number | null>(null)

  const startPress = () => {
    timer.current = window.setTimeout(() => {
      timer.current = null
      onMenu(message)
    }, LONG_PRESS_MS)
  }
  const cancelPress = () => {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  if (message.is_deleted) {
    return (
      <div className={cn("flex px-3", mine ? "justify-end" : "justify-start")}>
        <p className="my-0.5 rounded-xl border border-dashed border-border px-3 py-1.5 text-xs italic text-muted-foreground">
          Xabar o‘chirildi
        </p>
      </div>
    )
  }

  const attachments = message.attachments ?? []
  const images = attachments.filter((a) => a.kind === "IMAGE")
  const others = attachments.filter((a) => a.kind !== "IMAGE")
  const hasText = Boolean((message.content ?? "").trim())

  return (
    <div
      className={cn("flex px-3", mine ? "justify-end" : "justify-start")}
      data-message-id={message.id ?? undefined}
    >
      <div
        role="group"
        tabIndex={0}
        onContextMenu={(e) => {
          e.preventDefault()
          onMenu(message)
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") startPress()
        }}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onKeyDown={(e) => {
          if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
            e.preventDefault()
            onMenu(message)
          }
        }}
        className={cn(
          "my-0.5 max-w-[85%] select-text overflow-hidden text-sm sm:max-w-[72%]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          // Guruhning oxirgi pufagida burchak «dumi» hosil bo'ladi
          mine
            ? cn(
                "bg-primary text-primary-foreground",
                first ? "rounded-t-2xl" : "rounded-t-md",
                last ? "rounded-bl-2xl rounded-br-sm" : "rounded-b-md rounded-bl-2xl",
              )
            : cn(
                "border border-border bg-card text-card-foreground",
                first ? "rounded-t-2xl" : "rounded-t-md",
                last ? "rounded-br-2xl rounded-bl-sm" : "rounded-b-md rounded-br-2xl",
              ),
          highlighted && "ring-2 ring-ring",
          message.status === "failed" && "opacity-80",
        )}
      >
        {/* Javob bloki */}
        {message.reply_to && (
          <button
            type="button"
            onClick={() => message.reply_to && onJumpToReply(message.reply_to.id)}
            className={cn(
              "block w-full border-l-2 px-2.5 pt-2 text-left",
              mine ? "border-primary-foreground/60" : "border-primary",
            )}
          >
            <span
              className={cn(
                "block truncate text-2xs font-semibold",
                mine ? "text-primary-foreground/90" : "text-primary",
              )}
            >
              {message.reply_to.sender_name}
            </span>
            <span
              className={cn(
                "block truncate text-2xs",
                mine ? "text-primary-foreground/75" : "text-muted-foreground",
              )}
            >
              {message.reply_to.is_deleted
                ? "xabar o‘chirildi"
                : message.reply_to.preview || attachmentWord(message.reply_to.kind)}
            </span>
          </button>
        )}

        {/* Rasmlar */}
        {images.length > 0 && (
          <div
            className={cn(
              "grid gap-0.5",
              images.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {images.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onOpenImage(a)}
                className="block overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                aria-label={`${a.original_name} — kattalashtirish`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url ?? ""}
                  alt={a.original_name || "Rasm"}
                  loading="lazy"
                  width={a.width ?? undefined}
                  height={a.height ?? undefined}
                  // Haqiqiy nisbat serverdan keladi — layout sakramaydi
                  style={
                    a.width && a.height
                      ? { aspectRatio: `${a.width} / ${a.height}` }
                      : undefined
                  }
                  className={cn(
                    "h-auto w-full object-cover",
                    images.length === 1 ? "max-h-72" : "aspect-square",
                  )}
                />
              </button>
            ))}
          </div>
        )}

        {/* Boshqa fayllar */}
        {others.length > 0 && (
          <div className="space-y-1 p-2">
            {others.map((a) => (
              <AttachmentRow key={a.id} attachment={a} mine={mine} />
            ))}
          </div>
        )}

        {/* Eski bitta fayl maydoni (orqaga moslik) */}
        {attachments.length === 0 && message.attachment && (
          <div className="p-2">
            <a
              href={message.attachment}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5",
                mine ? "bg-primary-foreground/10" : "bg-muted",
              )}
            >
              <FileText className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-xs">Fayl</span>
              <Download className="h-4 w-4 shrink-0" aria-hidden />
            </a>
          </div>
        )}

        {/* Matn */}
        {hasText && (
          <p className="whitespace-pre-wrap break-words px-3 py-2 leading-snug">
            {message.content}
          </p>
        )}

        {/* Pastki qator: tahrirlangan · vaqt · ✓✓ */}
        <div
          className={cn(
            "flex items-center justify-end gap-1 px-3 pb-1.5",
            hasText || others.length ? "-mt-1" : "pt-1.5",
          )}
        >
          {message.is_edited && (
            <span
              className={cn(
                "text-[10px] italic",
                mine ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              tahrirlandi
            </span>
          )}
          <span
            className={cn(
              "text-[10px] tabular-nums",
              mine ? "text-primary-foreground/75" : "text-muted-foreground",
            )}
          >
            {timeLabel(message.created_at, language)}
          </span>
          {mine && <Receipt status={message.status} />}
        </div>

        {/* Yuborilmagan xabar — qayta urinish */}
        {message.status === "failed" && (
          <button
            type="button"
            onClick={() => onRetry(message)}
            className="flex w-full items-center gap-1.5 border-t border-primary-foreground/20 px-3 py-1.5 text-[11px] font-semibold"
          >
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            {message.error ?? "Yuborilmadi"}
            <RotateCcw className="ml-auto h-3.5 w-3.5" aria-hidden />
            Qayta
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- BELGILAR */

function Receipt({ status }: { status: LocalMessage["status"] }) {
  if (status === "pending") {
    return <Clock className="h-3.5 w-3.5 text-primary-foreground/70" aria-label="yuborilmoqda" />
  }
  if (status === "failed") {
    return <AlertCircle className="h-3.5 w-3.5 text-primary-foreground" aria-label="yuborilmadi" />
  }
  if (status === "read") {
    return <CheckCheck className="h-3.5 w-3.5 text-primary-foreground" aria-label="o‘qildi" />
  }
  if (status === "delivered") {
    return (
      <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/60" aria-label="yetkazildi" />
    )
  }
  return <Check className="h-3.5 w-3.5 text-primary-foreground/60" aria-label="yuborildi" />
}

function AttachmentRow({
  attachment,
  mine,
}: {
  attachment: ChatAttachment
  mine: boolean
}) {
  const surface = mine ? "bg-primary-foreground/10" : "bg-muted"

  if (attachment.kind === "VIDEO") {
    return (
      <video
        src={attachment.url ?? undefined}
        controls
        preload="metadata"
        className="max-h-64 w-full rounded-md"
      />
    )
  }

  if (attachment.kind === "VOICE" || attachment.kind === "AUDIO") {
    return (
      <div className={cn("rounded-md px-2 py-1.5", surface)}>
        <div className="mb-1 flex items-center gap-1.5">
          <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="text-2xs font-semibold">
            {attachment.kind === "VOICE" ? "Ovozli xabar" : attachment.original_name}
          </span>
          {attachment.duration_ms ? (
            <span className="ml-auto text-2xs tabular-nums opacity-75">
              {formatDuration(attachment.duration_ms)}
            </span>
          ) : null}
        </div>
        <audio src={attachment.url ?? undefined} controls preload="metadata" className="w-full" />
      </div>
    )
  }

  return (
    <a
      href={attachment.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("flex items-center gap-2 rounded-md px-2 py-1.5", surface)}
    >
      <FileText className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">
          {attachment.original_name || "Fayl"}
        </span>
        <span className="block text-[10px] tabular-nums opacity-75">
          {formatBytes(attachment.size)}
        </span>
      </span>
      <Download className="h-4 w-4 shrink-0" aria-hidden />
    </a>
  )
}

function attachmentWord(kind: string): string {
  switch (kind) {
    case "IMAGE":
      return "📷 Rasm"
    case "VIDEO":
      return "🎬 Video"
    case "VOICE":
      return "🎤 Ovozli xabar"
    case "AUDIO":
      return "🎵 Audio"
    case "FILE":
      return "📎 Fayl"
    default:
      return ""
  }
}
