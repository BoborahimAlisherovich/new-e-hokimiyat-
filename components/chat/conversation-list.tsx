"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, MessageSquare, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  displayName,
  searchMessages,
  type ChatMessage,
  type ChatUserBrief,
} from "@/lib/api/chat-v2.api"
import { listTimeLabel } from "./chat-utils"

/**
 * SUHBATLAR RO'YXATI
 *
 * Tuzatilgan nuqsonlar:
 *  1. Qidiruv faqat ISM bo'yicha ishlardi. Endi xabar matni bo'yicha ham
 *     (backend `/chat/search/`).
 *  2. Oxirgi xabar `substring(0, 30)` bilan kesilardi — uchtalik nuqta
 *     yo'q, «Siz:» prefiksi yo'q, fayl xabarlari bo'sh ko'rinardi.
 *  3. O'qilmaganlar nishoni avatar ustida turardi; Telegram'da u satrning
 *     o'ng chetida, vaqt ostida.
 *  4. `chat_users` ro'yxatidan tashqarida qolgan suhbatlar ochilmasdi:
 *     xarita ichida bor edi, lekin ro'yxat faqat `users` bo'yicha
 *     aylanardi. Endi ikkisi birlashtiriladi.
 *  5. Ro'yxat har renderda map→filter→sort qilinardi (memoizatsiya yo'q).
 */

export interface ConversationRow {
  peer: ChatUserBrief
  lastMessage: ChatMessage | null
  lastAt: string | null
  preview: string
  unread: number
  typing?: boolean
}

export function ConversationList({
  rows,
  activePeerId,
  loading,
  onSelect,
  language,
}: {
  rows: ConversationRow[]
  activePeerId: string | null
  loading: boolean
  onSelect: (peerId: string) => void
  language?: string
}) {
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [hits, setHits] = useState<ChatMessage[] | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  // Xabar matni bo'yicha qidiruv — faqat 2+ belgi bo'lganda
  useEffect(() => {
    if (debounced.length < 2) {
      setHits(null)
      return
    }
    let alive = true
    setSearching(true)
    searchMessages(debounced)
      .then((res) => {
        if (alive) setHits(res.results)
      })
      .finally(() => {
        if (alive) setSearching(false)
      })
    return () => {
      alive = false
    }
  }, [debounced])

  const byName = useMemo(() => {
    const q = debounced.toLowerCase()
    if (!q) return rows
    return rows.filter((r) => displayName(r.peer).toLowerCase().includes(q))
  }, [rows, debounced])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Qidiruv */}
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ism yoki xabar bo‘yicha qidirish…"
            aria-label="Suhbatlarda qidirish"
            className="h-11 w-full rounded-md border border-input bg-background pl-8.5 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Tozalash"
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <ul className="space-y-1 p-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </ul>
        ) : (
          <>
            {/* Suhbatlar */}
            {byName.length === 0 && !hits?.length ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <MessageSquare className="h-7 w-7 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  {debounced ? "Hech narsa topilmadi" : "Suhbat yo‘q"}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {byName.map((row) => {
                  const active = row.peer.id === activePeerId
                  const name = displayName(row.peer)
                  return (
                    <li key={row.peer.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(row.peer.id)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-2.5 py-2.5 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                          active && "bg-accent",
                        )}
                      >
                        <span className="relative shrink-0">
                          <Avatar user={row.peer} />
                          {row.peer.is_online && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success"
                              aria-label="onlayn"
                            />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                              {name}
                            </span>
                            {row.lastAt && (
                              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                {listTimeLabel(row.lastAt, language)}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2">
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-xs",
                                row.typing
                                  ? "font-medium text-primary"
                                  : "text-muted-foreground",
                              )}
                            >
                              {row.typing ? "yozmoqda…" : row.preview || "—"}
                            </span>
                            {row.unread > 0 && (
                              <span className="flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold leading-5 tabular-nums text-primary-foreground">
                                {row.unread > 99 ? "99+" : row.unread}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Xabar matni bo'yicha topilganlar */}
            {debounced.length >= 2 && (
              <div className="border-t border-border">
                <p className="flex items-center gap-1.5 px-2.5 py-2 text-2xs font-bold uppercase tracking-wide text-muted-foreground">
                  Xabarlarda
                  {searching && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                </p>
                {hits && hits.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {hits.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => m.peer_id && onSelect(m.peer_id)}
                          className="flex w-full flex-col items-start px-2.5 py-2 text-left hover:bg-muted"
                        >
                          <span className="text-2xs font-semibold text-foreground">
                            {m.sender_name}
                          </span>
                          <span className="line-clamp-2 text-xs text-muted-foreground">
                            {m.content}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !searching && (
                    <p className="px-2.5 pb-3 text-xs text-muted-foreground">
                      Xabarlarda topilmadi
                    </p>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function Avatar({
  user,
  size = 40,
}: {
  user: ChatUserBrief
  size?: number
}) {
  const name = displayName(user)
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"

  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar_url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className="flex items-center justify-center rounded-full bg-primary-soft font-bold text-primary-soft-foreground"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden
    >
      {initials}
    </span>
  )
}
