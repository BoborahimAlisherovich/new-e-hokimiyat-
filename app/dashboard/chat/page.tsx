"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, Loader2, MessageSquare, Upload, WifiOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { Header } from "@/components/layout/header"
import { useCurrentUser } from "@/components/layout/current-user-provider"
import { notifyUnreadChanged } from "@/components/layout/unread-provider"
import { useChatSocket, type ChatSocketEvent } from "@/hooks/use-chat-socket"
import {
  deleteMessage as apiDeleteMessage,
  displayName,
  editMessage as apiEditMessage,
  getConversations,
  getChatPeers,
  getFirstUnread,
  getHistory,
  markConversationRead,
  sendMessage as apiSendMessage,
  type ChatMessage,
  type ChatUserBrief,
} from "@/lib/api/chat-v2.api"
import { Avatar, ConversationList, type ConversationRow } from "@/components/chat/conversation-list"
import { MessageThread, type MessageAction } from "@/components/chat/message-thread"
import { MessageComposer } from "@/components/chat/message-composer"
import { NewChatDialog } from "@/components/chat/new-chat-dialog"
import { lastSeenLabel, previewOf, toLocal, type LocalMessage } from "@/components/chat/chat-utils"

/**
 * CHAT
 *
 * Ilgari butun chat bitta 1812 qatorli komponent edi: 17 `useState`,
 * ichida socket, media yozish, fayl yuklash va barcha JSX. Har harf
 * bosilganda butun xabarlar ro'yxati qayta renderlanardi.
 *
 * Eng jiddiy nuqsonlar va ular qanday yopilgani:
 *  - Har kelgan xabarda BUTUN tarix qaytadan yuklanardi (60 xabar = 60
 *    to'liq fetch) → endi xabar shunchaki ro'yxatga qo'shiladi.
 *  - Qayta ulanish yo'q edi → `useChatSocket` (backoff + heartbeat +
 *    resync).
 *  - Yuborishda dublikat pufaklar paydo bo'lardi (server echo bilan
 *    poyga) → `client_id` bo'yicha yarashtirish.
 *  - Tarix sahifalanmasdi → kursor bo'yicha «eskilarini yuklash».
 *  - Mobilda xabarlar ro'yxatida scroll bo'lmasdi, yozish maydoni
 *    pastga qadalmasdi → `dvh` + `min-h-0` zanjiri.
 *  - Chat ustida ~340px marketing kartalari turardi → olib tashlandi.
 */

interface Thread {
  messages: LocalMessage[]
  hasMore: boolean
  nextBeforeId: number | null
  loaded: boolean
  loading: boolean
  loadingMore: boolean
  firstUnreadId: number | null
  unreadAtOpen: number
}

const emptyThread = (): Thread => ({
  messages: [],
  hasMore: false,
  nextBeforeId: null,
  loaded: false,
  loading: false,
  loadingMore: false,
  firstUnreadId: null,
  unreadAtOpen: 0,
})

function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `c-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function ChatPage() {
  const { language } = useI18n()
  const { user } = useCurrentUser()
  const myId = String(user?.id ?? "")

  const [peers, setPeers] = useState<ChatUserBrief[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [lastMsg, setLastMsg] = useState<Record<string, ChatMessage | null>>({})
  const [threads, setThreads] = useState<Record<string, Thread>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [typingPeers, setTypingPeers] = useState<Record<string, boolean>>({})
  const [presence, setPresence] = useState<Record<string, { online: boolean; lastSeen: string | null }>>({})

  const [activeId, setActiveId] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [replyTo, setReplyTo] = useState<LocalMessage | null>(null)
  const [editing, setEditing] = useState<LocalMessage | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newChatOpen, setNewChatOpen] = useState(false)
  /**
   * «+» orqali ochilgan, lekin hali xabar yozilmagan suhbatlar.
   * Yon ro'yxat faqat YOZISHILGAN suhbatlarni ko'rsatadi — aks holda u
   * yuz xodimli telefon kitobiga aylanadi. Yangi tanlangan odam esa
   * darhol ro'yxatda turishi kerak, aks holda foydalanuvchi «qayerga
   * yozayotganini» yo'qotadi.
   */
  const [openedIds, setOpenedIds] = useState<string[]>([])

  const activeIdRef = useRef<string | null>(null)
  const typingTimers = useRef<Record<string, number>>({})
  const maxIdRef = useRef<number>(0)

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  /* ================================================== Boshlang'ich yuklash */
  useEffect(() => {
    let alive = true

    Promise.all([getChatPeers().catch(() => []), getConversations().catch(() => [])])
      .then(([peerList, convs]) => {
        if (!alive) return

        const map = new Map<string, ChatUserBrief>()
        for (const p of peerList) map.set(String(p.id), p)

        const u: Record<string, number> = {}
        const lm: Record<string, ChatMessage | null> = {}
        const pr: Record<string, { online: boolean; lastSeen: string | null }> = {}

        for (const c of convs) {
          const other = c.other_participant
          if (!other) continue
          const id = String(other.id)
          // chat_users ro'yxatidan tashqarida qolgan suhbatdosh ham
          // ro'yxatga tushadi (ilgari u ochilmasdi)
          if (!map.has(id)) map.set(id, other)
          u[id] = c.unread_count ?? 0
          lm[id] = c.last_message ?? null
          if (c.last_message?.id) {
            maxIdRef.current = Math.max(maxIdRef.current, c.last_message.id)
          }
        }

        for (const p of map.values()) {
          pr[String(p.id)] = {
            online: Boolean(p.is_online),
            lastSeen: p.last_seen ?? null,
          }
        }

        setPeers(Array.from(map.values()).filter((p) => String(p.id) !== myId))
        setUnread(u)
        setLastMsg(lm)
        setPresence(pr)
      })
      .catch(() => {
        if (alive) setError("Suhbatlarni yuklab bo‘lmadi")
      })
      .finally(() => {
        if (alive) setListLoading(false)
      })

    return () => {
      alive = false
    }
  }, [myId])

  /* ============================================================== Socket */

  const handleEvent = useCallback(
    (evt: ChatSocketEvent) => {
      const type = evt.type

      if (type === "direct_message" || type === "resync_result") {
        const incoming: ChatMessage[] =
          type === "resync_result"
            ? ((evt.messages as ChatMessage[]) ?? [])
            : [evt.message as ChatMessage]

        for (const m of incoming) {
          if (!m?.id) continue
          maxIdRef.current = Math.max(maxIdRef.current, m.id)

          const mine = String(m.sender?.id ?? "") === myId
          const peerId = mine ? String(m.recipient?.id ?? "") : String(m.sender?.id ?? "")
          if (!peerId) continue

          // Ro'yxatda bo'lmagan suhbatdoshni qo'shamiz
          setPeers((prev) => {
            if (prev.some((p) => String(p.id) === peerId)) return prev
            const brief = mine ? m.recipient : m.sender
            return brief ? [...prev, brief] : prev
          })

          setLastMsg((prev) => ({ ...prev, [peerId]: m }))

          setThreads((prev) => {
            const t = prev[peerId] ?? emptyThread()
            const local = toLocal(m, myId)

            // Dublikatni oldini olish: client_id yoki server id bo'yicha
            const idx = t.messages.findIndex(
              (x) =>
                (m.client_id && x.client_id === m.client_id) ||
                (x.id && x.id === m.id),
            )

            const messages =
              idx >= 0
                ? t.messages.map((x, i) => (i === idx ? { ...local } : x))
                : [...t.messages, local]

            return { ...prev, [peerId]: { ...t, messages } }
          })

          // O'qilmaganlar
          if (!mine && peerId !== activeIdRef.current) {
            setUnread((prev) => ({ ...prev, [peerId]: (prev[peerId] ?? 0) + 1 }))
          }
          // Faol suhbatda bo'lsa darhol o'qilgan deb belgilaymiz
          if (!mine && peerId === activeIdRef.current && !document.hidden) {
            void markConversationRead(peerId).then(() => notifyUnreadChanged())
          }
        }
        return
      }

      if (type === "message_edited") {
        const m = evt.message as ChatMessage
        if (!m?.id) return
        const mine = String(m.sender?.id ?? "") === myId
        const peerId = mine ? String(m.recipient?.id ?? "") : String(m.sender?.id ?? "")
        setThreads((prev) => {
          const t = prev[peerId]
          if (!t) return prev
          return {
            ...prev,
            [peerId]: {
              ...t,
              messages: t.messages.map((x) => (x.id === m.id ? toLocal(m, myId) : x)),
            },
          }
        })
        return
      }

      if (type === "message_deleted") {
        const messageId = Number(evt.message_id)
        const peerId = String(evt.other_user_id ?? "")
        setThreads((prev) => {
          const t = prev[peerId]
          if (!t) return prev
          return {
            ...prev,
            [peerId]: {
              ...t,
              messages: t.messages.map((x) =>
                x.id === messageId ? { ...x, is_deleted: true, content: "" } : x,
              ),
            },
          }
        })
        return
      }

      if (type === "messages_read") {
        // Bizning xabarlarimiz o'qildi
        const peerId = String(evt.user_id ?? "")
        const ids = new Set((evt.message_ids as number[]) ?? [])
        setThreads((prev) => {
          const t = prev[peerId]
          if (!t) return prev
          return {
            ...prev,
            [peerId]: {
              ...t,
              messages: t.messages.map((x) =>
                x.id && ids.has(x.id) && x.mine
                  ? { ...x, is_read: true, status: "read" }
                  : x,
              ),
            },
          }
        })
        return
      }

      if (type === "delivered") {
        const peerId = String(evt.recipient_id ?? evt.user_id ?? "")
        const ids = new Set((evt.message_ids as number[]) ?? [])
        setThreads((prev) => {
          const t = prev[peerId]
          if (!t) return prev
          return {
            ...prev,
            [peerId]: {
              ...t,
              messages: t.messages.map((x) =>
                x.id && ids.has(x.id) && x.mine && x.status !== "read"
                  ? { ...x, status: "delivered" }
                  : x,
              ),
            },
          }
        })
        return
      }

      if (type === "chat_typing") {
        const peerId = String(evt.user_id ?? "")
        const isTyping = Boolean(evt.is_typing)
        setTypingPeers((prev) => ({ ...prev, [peerId]: isTyping }))
        if (typingTimers.current[peerId]) window.clearTimeout(typingTimers.current[peerId])
        if (isTyping) {
          typingTimers.current[peerId] = window.setTimeout(
            () => setTypingPeers((prev) => ({ ...prev, [peerId]: false })),
            4000,
          )
        }
        return
      }

      if (type === "chat_presence") {
        const peerId = String(evt.user_id ?? "")
        setPresence((prev) => ({
          ...prev,
          [peerId]: {
            online: Boolean(evt.is_online),
            lastSeen: (evt.last_seen as string) ?? prev[peerId]?.lastSeen ?? null,
          },
        }))
        return
      }

      if (type === "conversation_updated") {
        notifyUnreadChanged()
      }
    },
    [myId],
  )

  const getSinceId = useCallback(() => maxIdRef.current || null, [])

  const { status: socketStatus, send: socketSend } = useChatSocket({
    enabled: Boolean(myId),
    onEvent: handleEvent,
    getSinceId,
  })

  /* ========================================================= Tarix yuklash */

  const openPeer = useCallback(
    async (peerId: string) => {
      setActiveId(peerId)
      setReplyTo(null)
      setEditing(null)
      // Hali xabar yozilmagan bo'lsa ham, tanlangan odam yon ro'yxatda
      // ko'rinib tursin — aks holda «qayerga yozyapman» degan savol tug'iladi.
      setOpenedIds((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]))

      // Mobil: orqaga tugmasi ro'yxatga qaytarishi uchun tarix holati
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        window.history.pushState({ chatPeer: peerId }, "")
      }

      const existing = threads[peerId]
      if (existing?.loaded) {
        // Kirganda o'qilgan deb belgilash
        if ((unread[peerId] ?? 0) > 0) {
          await markConversationRead(peerId).catch(() => {})
          setUnread((p) => ({ ...p, [peerId]: 0 }))
          notifyUnreadChanged()
        }
        return
      }

      setThreads((prev) => ({
        ...prev,
        [peerId]: { ...(prev[peerId] ?? emptyThread()), loading: true },
      }))

      try {
        const [page, firstUnread] = await Promise.all([
          getHistory(peerId, { limit: 40 }),
          getFirstUnread(peerId),
        ])

        for (const m of page.results) {
          if (m.id) maxIdRef.current = Math.max(maxIdRef.current, m.id)
        }

        setThreads((prev) => ({
          ...prev,
          [peerId]: {
            messages: page.results.map((m) => toLocal(m, myId)),
            hasMore: page.has_more,
            nextBeforeId: page.next_before_id,
            loaded: true,
            loading: false,
            loadingMore: false,
            firstUnreadId: firstUnread.message_id,
            unreadAtOpen: firstUnread.unread_count,
          },
        }))

        if (firstUnread.unread_count > 0 || (unread[peerId] ?? 0) > 0) {
          await markConversationRead(peerId).catch(() => {})
          setUnread((p) => ({ ...p, [peerId]: 0 }))
          notifyUnreadChanged()
          socketSend({ action: "mark_read", user_id: peerId })
        }
      } catch {
        setThreads((prev) => ({
          ...prev,
          [peerId]: { ...(prev[peerId] ?? emptyThread()), loading: false, loaded: true },
        }))
        setError("Suhbat tarixini yuklab bo‘lmadi")
      }
    },
    [threads, unread, myId, socketSend],
  )

  const loadOlder = useCallback(async () => {
    const peerId = activeIdRef.current
    if (!peerId) return
    const t = threads[peerId]
    if (!t || !t.hasMore || t.loadingMore || !t.nextBeforeId) return

    setThreads((prev) => ({ ...prev, [peerId]: { ...t, loadingMore: true } }))

    try {
      const page = await getHistory(peerId, { beforeId: t.nextBeforeId, limit: 40 })
      setThreads((prev) => {
        const cur = prev[peerId] ?? emptyThread()
        const older = page.results.map((m) => toLocal(m, myId))
        const knownIds = new Set(cur.messages.map((m) => m.id))
        return {
          ...prev,
          [peerId]: {
            ...cur,
            messages: [...older.filter((m) => !knownIds.has(m.id)), ...cur.messages],
            hasMore: page.has_more,
            nextBeforeId: page.next_before_id,
            loadingMore: false,
          },
        }
      })
    } catch {
      setThreads((prev) => ({
        ...prev,
        [peerId]: { ...(prev[peerId] ?? emptyThread()), loadingMore: false },
      }))
    }
  }, [threads, myId])

  /* Mobil orqaga tugmasi */
  useEffect(() => {
    const onPop = () => setActiveId(null)
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  /* Oyna fokuslanganda o'qilgan deb belgilash */
  useEffect(() => {
    const onFocus = () => {
      const peerId = activeIdRef.current
      if (!peerId || document.hidden) return
      if ((unread[peerId] ?? 0) === 0) return
      void markConversationRead(peerId).then(() => {
        setUnread((p) => ({ ...p, [peerId]: 0 }))
        notifyUnreadChanged()
      })
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [unread])

  /* ============================================================= Yuborish */

  const doSend = useCallback(
    async (text: string, attachmentIds: number[], retryOf?: LocalMessage) => {
      const peerId = activeIdRef.current
      if (!peerId) return

      const clientId = retryOf?.client_id ?? newClientId()
      const optimistic: LocalMessage = {
        client_id: clientId,
        content: text,
        created_at: new Date().toISOString(),
        mine: true,
        status: "pending",
        attachments: [],
        reply_to: replyTo?.id
          ? {
              id: replyTo.id,
              sender_name: replyTo.sender_name ?? "",
              preview: (replyTo.content ?? "").slice(0, 120),
              kind: "TEXT",
              is_deleted: false,
            }
          : null,
      }

      setThreads((prev) => {
        const t = prev[peerId] ?? emptyThread()
        const idx = t.messages.findIndex((x) => x.client_id === clientId)
        const messages =
          idx >= 0
            ? t.messages.map((x, i) => (i === idx ? { ...optimistic } : x))
            : [...t.messages, optimistic]
        return { ...prev, [peerId]: { ...t, messages, loaded: true } }
      })

      const replyId = replyTo?.id
      setReplyTo(null)

      try {
        const saved = await apiSendMessage(peerId, {
          content: text,
          clientId,
          replyToId: replyId,
          attachmentIds,
        })
        if (saved.id) maxIdRef.current = Math.max(maxIdRef.current, saved.id)

        setThreads((prev) => {
          const t = prev[peerId] ?? emptyThread()
          return {
            ...prev,
            [peerId]: {
              ...t,
              messages: t.messages.map((x) =>
                x.client_id === clientId ? toLocal(saved, myId) : x,
              ),
            },
          }
        })
        setLastMsg((prev) => ({ ...prev, [peerId]: saved }))
      } catch (err: any) {
        setThreads((prev) => {
          const t = prev[peerId] ?? emptyThread()
          return {
            ...prev,
            [peerId]: {
              ...t,
              messages: t.messages.map((x) =>
                x.client_id === clientId
                  ? {
                      ...x,
                      status: "failed",
                      error: err?.data?.detail || err?.message || "Yuborilmadi",
                    }
                  : x,
              ),
            },
          }
        })
      }
    },
    [replyTo, myId],
  )

  const onRetry = useCallback(
    (m: LocalMessage) => {
      void doSend(m.content ?? "", [], m)
    },
    [doSend],
  )

  /* ============================================================== Amallar */

  const onAction = useCallback(
    async (action: MessageAction) => {
      const peerId = activeIdRef.current
      const m = action.message
      if (!peerId) return

      if (action.type === "reply") {
        setReplyTo(m)
        return
      }
      if (action.type === "copy") {
        try {
          await navigator.clipboard.writeText(m.content ?? "")
        } catch {
          /* ruxsat berilmagan bo'lishi mumkin */
        }
        return
      }
      if (action.type === "edit") {
        setEditing(m)
        return
      }
      if (action.type === "delete" && m.id) {
        if (!window.confirm("Xabar o‘chirilsinmi?")) return
        try {
          await apiDeleteMessage(m.id)
          setThreads((prev) => {
            const t = prev[peerId]
            if (!t) return prev
            return {
              ...prev,
              [peerId]: {
                ...t,
                messages: t.messages.map((x) =>
                  x.id === m.id ? { ...x, is_deleted: true, content: "" } : x,
                ),
              },
            }
          })
        } catch {
          setError("Xabarni o‘chirib bo‘lmadi")
        }
      }
    },
    [],
  )

  const submitEdit = useCallback(
    async (m: LocalMessage, text: string) => {
      if (!m.id) return
      const peerId = activeIdRef.current
      if (!peerId) return
      setEditing(null)
      try {
        const saved = await apiEditMessage(m.id, text)
        setThreads((prev) => {
          const t = prev[peerId]
          if (!t) return prev
          return {
            ...prev,
            [peerId]: {
              ...t,
              messages: t.messages.map((x) => (x.id === m.id ? toLocal(saved, myId) : x)),
            },
          }
        })
      } catch {
        setError("Xabarni tahrirlab bo‘lmadi")
      }
    },
    [myId],
  )

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const peerId = activeIdRef.current
      if (!peerId) return
      socketSend({ action: "typing", user_id: peerId, is_typing: isTyping })
    },
    [socketSend],
  )

  /* ============================================================== RO'YXAT */

  const rows: ConversationRow[] = useMemo(() => {
    // Yon ro'yxat = YOZISHILGAN suhbatlar + shu seansda «+» orqali
    // ochilganlar + faol suhbat. Butun xodimlar ro'yxati «+» tugmasi
    // ortidagi oynada (NewChatDialog).
    const visible = new Set<string>(openedIds)
    if (activeId) visible.add(activeId)
    for (const [id, m] of Object.entries(lastMsg)) {
      if (m) visible.add(id)
    }
    for (const [id, count] of Object.entries(unread)) {
      if (count > 0) visible.add(id)
    }

    return peers
      .filter((p) => visible.has(String(p.id)))
      .map((p) => {
        const id = String(p.id)
        const lm = lastMsg[id] ?? null
        const pres = presence[id]
        return {
          peer: { ...p, is_online: pres?.online ?? p.is_online, last_seen: pres?.lastSeen ?? p.last_seen },
          lastMessage: lm,
          lastAt: lm?.created_at ?? null,
          preview: previewOf(lm, myId),
          unread: unread[id] ?? 0,
          typing: Boolean(typingPeers[id]),
        }
      })
      .sort((a, b) => {
        // Suhbat bo'lganlar tepada, keyin oxirgi xabar vaqti bo'yicha
        const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0
        const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0
        if (tb !== ta) return tb - ta
        return displayName(a.peer).localeCompare(displayName(b.peer), "uz")
      })
  }, [peers, lastMsg, unread, presence, typingPeers, myId, openedIds, activeId])

  const activePeer = activeId ? peers.find((p) => String(p.id) === activeId) : undefined
  const activeThread = activeId ? (threads[activeId] ?? emptyThread()) : emptyThread()
  const activePresence = activeId ? presence[activeId] : undefined

  /* =============================================================== RENDER */

  return (
    <>
      <Header title="Chat" description="Xodimlar o‘rtasida tezkor muloqot" />

      <div className="p-0 lg:p-4">
        {error && (
          <p
            role="alert"
            className="m-3 rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground"
          >
            {error}
          </p>
        )}

        {socketStatus !== "open" && (
          <p className="flex items-center justify-center gap-1.5 bg-warning-soft px-3 py-1 text-xs text-warning-soft-foreground">
            {socketStatus === "connecting" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Ulanmoqda…
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5" aria-hidden />
                Ulanish yo‘q — qayta urinilmoqda
              </>
            )}
          </p>
        )}

        {/*
          Balandlik zanjiri: tashqi konteynerga aniq balandlik beriladi va
          ichkarida `min-h-0` bilan uzatiladi. Ilgari bu faqat `lg:` da
          bor edi, shuning uchun telefonda butun sahifa scroll bo'lardi.
        */}
        <div
          className={cn(
            "flex overflow-hidden border-border bg-card lg:rounded-xl lg:border lg:shadow-sm",
            "h-[calc(100dvh-4rem-3.5rem)] lg:h-[calc(100dvh-8rem)]",
          )}
        >
          {/* Suhbatlar paneli */}
          <div
            className={cn(
              "flex min-h-0 w-full flex-col border-r border-border lg:w-80 lg:shrink-0",
              activeId && "hidden lg:flex",
            )}
          >
            <ConversationList
              rows={rows}
              activePeerId={activeId}
              loading={listLoading}
              onSelect={(id) => void openPeer(id)}
              onNewChat={() => setNewChatOpen(true)}
              language={language}
            />
          </div>

          {/* Suhbat */}
          <div
            className={cn(
              "relative flex min-h-0 w-full flex-col",
              !activeId && "hidden lg:flex",
            )}
            onDragOver={(e) => {
              if (!activeId) return
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              if (!activeId) return
              const files = Array.from(e.dataTransfer.files ?? [])
              if (files.length) (window as any).__chatAddFiles?.(files)
            }}
          >
            {!activePeer ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <MessageSquare className="h-9 w-9 text-muted-foreground" aria-hidden />
                <p className="text-md font-semibold text-foreground">Suhbatni tanlang</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Chapdagi ro‘yxatdan xodimni tanlab, yozishni boshlang.
                </p>
              </div>
            ) : (
              <>
                {/* Suhbat sarlavhasi */}
                <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-2 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.history.state?.chatPeer) window.history.back()
                      else setActiveId(null)
                    }}
                    aria-label="Ro‘yxatga qaytish"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:hidden"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  </button>

                  <Avatar user={activePeer} size={36} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {displayName(activePeer)}
                    </p>
                    <p className="truncate text-2xs text-muted-foreground">
                      {typingPeers[activeId!]
                        ? "yozmoqda…"
                        : activePresence?.online
                          ? "onlayn"
                          : lastSeenLabel(activePresence?.lastSeen, language) || "oflayn"}
                    </p>
                  </div>
                </div>

                <MessageThread
                  messages={activeThread.messages}
                  loading={activeThread.loading}
                  hasMore={activeThread.hasMore}
                  loadingMore={activeThread.loadingMore}
                  firstUnreadId={activeThread.firstUnreadId}
                  unreadCount={activeThread.unreadAtOpen}
                  typing={Boolean(typingPeers[activeId!])}
                  language={language}
                  onLoadMore={() => void loadOlder()}
                  onAction={(a) => void onAction(a)}
                  onRetry={onRetry}
                />

                <MessageComposer
                  disabled={socketStatus === "closed" && !activeThread.loaded}
                  replyTo={replyTo}
                  editing={editing}
                  onCancelReply={() => setReplyTo(null)}
                  onCancelEdit={() => setEditing(null)}
                  onSend={(text, ids) => void doSend(text, ids)}
                  onSubmitEdit={(m, text) => void submitEdit(m, text)}
                  onTyping={sendTyping}
                  draft={drafts[activeId!] ?? ""}
                  onDraftChange={(v) =>
                    setDrafts((prev) => ({ ...prev, [activeId!]: v }))
                  }
                />

                {/* Butun panel ustiga fayl tashlash */}
                {dragging && (
                  <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-primary bg-accent/80">
                    <p className="flex items-center gap-2 text-md font-semibold text-accent-foreground">
                      <Upload className="h-5 w-5" aria-hidden />
                      Fayllarni bu yerga tashlang
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* «+» — butun xodimlar ro'yxati, tepasida qidiruv */}
      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        peers={peers.filter((p) => String(p.id) !== myId)}
        recentIds={rows.map((r) => String(r.peer.id))}
        onSelect={(id) => void openPeer(id)}
      />
    </>
  )
}
