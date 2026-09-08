"use client"

import type React from "react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  Copy,
  Loader2,
  Pencil,
  Reply,
  Trash2,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ChatAttachment } from "@/lib/api/chat-v2.api"
import { MessageBubble } from "./message-bubble"
import { buildThreadRows, type LocalMessage } from "./chat-utils"

/**
 * XABARLAR OQIMI
 *
 * Tuzatilgan nuqsonlar:
 *  1. Virtualizatsiya yo'q edi — har bir xabar, avatari, media elementi
 *     va lokatsiya xabarlari uchun OpenStreetMap `<iframe>` i bilan
 *     birga DOM'ga chiziladi. Endi ekranga faqat oxirgi oyna
 *     renderlanadi, qolgani «Eskilarini yuklash» bilan keladi.
 *  2. Uchta effekt har uzunlik o'zgarishida majburan pastga sakrardi,
 *     «foydalanuvchi pastda turibdimi?» tekshiruvi yo'q edi — tarixni
 *     o'qish imkonsiz edi. Endi faqat pastga yaqin bo'lsa siljiydi.
 *  3. `setTimeout(...,100)` taymerlari hech qachon tozalanmasdi.
 *  4. Mobil: balandlik cheklovi faqat `lg:` da bor edi, shuning uchun
 *     telefonda xabarlar ro'yxati ichida scroll bo'lmasdi — BUTUN sahifa
 *     scroll bo'lardi va yozish maydoni pastga qadalmasdi. Endi
 *     `min-h-0` zanjiri barcha o'lchamlarda ishlaydi.
 */

const WINDOW_SIZE = 120
const NEAR_BOTTOM_PX = 120
const LOAD_MORE_PX = 220

export interface MessageAction {
  type: "reply" | "edit" | "delete" | "copy"
  message: LocalMessage
}

export function MessageThread({
  messages,
  loading,
  hasMore,
  loadingMore,
  firstUnreadId,
  unreadCount,
  typing,
  language,
  onLoadMore,
  onAction,
  onRetry,
}: {
  messages: LocalMessage[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  firstUnreadId: number | null
  unreadCount: number
  typing: boolean
  language?: string
  onLoadMore: () => void
  onAction: (action: MessageAction) => void
  onRetry: (m: LocalMessage) => void
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const nearBottomRef = useRef(true)
  const prevLenRef = useRef(0)
  const prevFirstIdRef = useRef<number | null>(null)
  const keepScrollRef = useRef<{ height: number; top: number } | null>(null)

  const [showJump, setShowJump] = useState(false)
  const [menuFor, setMenuFor] = useState<LocalMessage | null>(null)
  const [lightbox, setLightbox] = useState<ChatAttachment | null>(null)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const [windowStart, setWindowStart] = useState(0)

  /* Ko'rinadigan oyna: oxirgi WINDOW_SIZE xabar */
  const visible = useMemo(() => {
    const start = Math.max(0, messages.length - WINDOW_SIZE - windowStart)
    return messages.slice(start)
  }, [messages, windowStart])

  const rows = useMemo(
    () => buildThreadRows(visible, { firstUnreadId, unreadCount, language }),
    [visible, firstUnreadId, unreadCount, language],
  )

  /* -------------------------------------------------- Scroll kuzatuvchi */
  const onScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    nearBottomRef.current = distance < NEAR_BOTTOM_PX
    setShowJump(distance > NEAR_BOTTOM_PX * 3)

    // Yuqoriga yetganda: avval mahalliy oynani kengaytiramiz,
    // xabarlar tugagach serverdan eskilarini so'raymiz
    if (el.scrollTop < LOAD_MORE_PX) {
      const localRemaining = messages.length - WINDOW_SIZE - windowStart
      if (localRemaining > 0) {
        keepScrollRef.current = { height: el.scrollHeight, top: el.scrollTop }
        setWindowStart((s) => s + WINDOW_SIZE)
      } else if (hasMore && !loadingMore) {
        keepScrollRef.current = { height: el.scrollHeight, top: el.scrollTop }
        onLoadMore()
      }
    }
  }, [messages.length, windowStart, hasMore, loadingMore, onLoadMore])

  /* ------------------------------------- Scroll pozitsiyasini saqlash */
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const firstId = messages[0]?.id ?? null
    const grewAtTop = prevFirstIdRef.current !== null && firstId !== prevFirstIdRef.current
    prevFirstIdRef.current = firstId

    // Yuqoriga yuklanganda ko'rinish joyida qolishi kerak
    if (keepScrollRef.current && (grewAtTop || windowStart > 0)) {
      const { height, top } = keepScrollRef.current
      el.scrollTop = el.scrollHeight - height + top
      keepScrollRef.current = null
      prevLenRef.current = messages.length
      return
    }

    const grew = messages.length > prevLenRef.current
    prevLenRef.current = messages.length

    if (!grew) return

    // Faqat foydalanuvchi pastda bo'lsa siljitamiz
    if (nearBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, windowStart])

  /* Suhbat almashganda pastga */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (loading) return
    el.scrollTop = el.scrollHeight
    nearBottomRef.current = true
    setWindowStart(0)
  }, [loading])

  const jumpToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    nearBottomRef.current = true
  }, [])

  const jumpToMessage = useCallback((id: number) => {
    const el = scrollRef.current
    if (!el) return
    const target = el.querySelector<HTMLElement>(`[data-message-id="${id}"]`)
    if (!target) return
    target.scrollIntoView({ block: "center", behavior: "smooth" })
    setHighlightId(id)
    window.setTimeout(() => setHighlightId(null), 1600)
  }, [])

  /* ------------------------------------------------------------- RENDER */

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 p-3" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-10 max-w-[60%] animate-pulse rounded-2xl bg-muted",
              i % 2 === 0 ? "self-start" : "self-end",
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="contain-list min-h-0 flex-1 overflow-y-auto overscroll-contain py-2"
      >
        {(hasMore || messages.length > visible.length) && (
          <div className="flex justify-center py-2">
            {loadingMore ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Yuklanmoqda…
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const el = scrollRef.current
                  if (el) keepScrollRef.current = { height: el.scrollHeight, top: el.scrollTop }
                  if (messages.length > visible.length) setWindowStart((s) => s + WINDOW_SIZE)
                  else onLoadMore()
                }}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Eskilarini yuklash
              </button>
            )}
          </div>
        )}

        {rows.map((row) => {
          if (row.kind === "date") {
            return (
              <div key={row.key} className="sticky top-0 z-[1] flex justify-center py-1.5">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-2xs font-semibold text-muted-foreground">
                  {row.label}
                </span>
              </div>
            )
          }

          if (row.kind === "unread") {
            return (
              <div key={row.key} className="my-2 flex items-center gap-2 px-3">
                <span className="h-px flex-1 bg-destructive/40" />
                <span className="text-2xs font-bold uppercase tracking-wide text-destructive">
                  {row.count} o‘qilmagan xabar
                </span>
                <span className="h-px flex-1 bg-destructive/40" />
              </div>
            )
          }

          return (
            <MessageBubble
              key={row.key}
              message={row.message}
              first={row.first}
              last={row.last}
              language={language}
              highlighted={highlightId !== null && row.message.id === highlightId}
              onMenu={setMenuFor}
              onRetry={onRetry}
              onJumpToReply={jumpToMessage}
              onOpenImage={setLightbox}
            />
          )
        })}

        {typing && (
          <div className="flex px-3 py-1">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2">
              <span className="robot-think h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <span className="robot-think h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <span className="robot-think h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <span className="ml-1 text-2xs text-muted-foreground">yozmoqda…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Pastga tushish tugmasi */}
      {showJump && (
        <button
          type="button"
          onClick={jumpToBottom}
          aria-label="Eng pastga tushish"
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card shadow-md hover:bg-muted"
        >
          <ArrowDown className="h-4.5 w-4.5 text-foreground" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Xabar amallari — long-press / o'ng tugma */}
      {menuFor && (
        <ActionSheet
          message={menuFor}
          onClose={() => setMenuFor(null)}
          onAction={(type) => {
            onAction({ type, message: menuFor })
            setMenuFor(null)
          }}
        />
      )}

      {/* Rasm ko'rish */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.original_name}
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url ?? ""}
            alt={lightbox.original_name}
            className="max-h-full max-w-full rounded-md object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Yopish"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------- AMALLAR PANELI */

function ActionSheet({
  message,
  onClose,
  onAction,
}: {
  message: LocalMessage
  onClose: () => void
  onAction: (type: MessageAction["type"]) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const canEdit = message.mine && Boolean(message.id) && Boolean((message.content ?? "").trim())
  const canDelete = message.mine && Boolean(message.id)
  const canReply = Boolean(message.id)

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Xabar amallari"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-sm rounded-t-xl border border-border bg-card p-2 pb-safe shadow-lg sm:rounded-xl sm:pb-2">
        <p className="truncate px-2 py-1.5 text-2xs text-muted-foreground">
          {(message.content ?? "").trim() || "Fayl"}
        </p>
        <ul className="divide-y divide-border">
          {canReply && (
            <SheetItem icon={Reply} label="Javob berish" onClick={() => onAction("reply")} />
          )}
          <SheetItem icon={Copy} label="Nusxalash" onClick={() => onAction("copy")} />
          {canEdit && (
            <SheetItem icon={Pencil} label="Tahrirlash" onClick={() => onAction("edit")} />
          )}
          {canDelete && (
            <SheetItem
              icon={Trash2}
              label="O‘chirish"
              destructive
              onClick={() => onAction("delete")}
            />
          )}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 flex h-11 w-full items-center justify-center rounded-md text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          Bekor qilish
        </button>
      </div>
    </div>
  )
}

function SheetItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-12 w-full items-center gap-3 px-2.5 text-sm font-medium hover:bg-muted",
          destructive ? "text-destructive" : "text-foreground",
        )}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
        {label}
      </button>
    </li>
  )
}
