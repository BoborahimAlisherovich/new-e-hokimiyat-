"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { WS_BASE, getAccessToken } from "@/lib/api/client"

/**
 * CHAT SOCKET
 *
 * Ilgari socket to'g'ridan-to'g'ri sahifa komponenti ichida edi va:
 *  - `onclose` faqat ref'ni null qilardi. QAYTA ULANISH YO'Q EDI: ulanish
 *    uzilsa chat jim o'lardi va sahifa qo'lda yangilanmaguncha xabarlar
 *    kelmasdi. `onopen`, `onerror`, heartbeat, `visibilitychange` —
 *    hech biri yo'q.
 *  - token yoki foydalanuvchi hali yechilmagan bo'lsa effekt darhol
 *    chiqib ketardi va QAYTA URINMASDI.
 *  - effektning bog'liqliklarida `loadConversation` va
 *    `upsertConversationMessage` bor edi (ular esa `users` va tarjimaga
 *    bog'langan), shuning uchun TILNI ALMASHTIRISH yoki foydalanuvchilar
 *    ro'yxatining yangilanishi SOCKETNI QAYTA QURARDI — va shu oynada
 *    kelgan xabarlar yo'qolardi.
 *
 * Endi: hook socketga yakka egalik qiladi, callback'lar ref orqali
 * uzatiladi (bog'liqlik zanjiriga tushmaydi), eksponensial backoff,
 * heartbeat va uzilishdan keyin `resync` bor.
 */

export type SocketStatus = "connecting" | "open" | "closed"

export interface ChatSocketEvent {
  type: string
  [key: string]: unknown
}

interface Options {
  /** Foydalanuvchi aniqlangandan keyin true bo'ladi */
  enabled: boolean
  onEvent: (event: ChatSocketEvent) => void
  /** Uzilishdan keyin qaysi id dan keyingi xabarlarni so'rash kerak */
  getSinceId: () => number | null
}

const HEARTBEAT_MS = 25_000
const PONG_TIMEOUT_MS = 10_000
const MAX_BACKOFF_MS = 30_000

export function useChatSocket({ enabled, onEvent, getSinceId }: Options) {
  const [status, setStatus] = useState<SocketStatus>("closed")

  const wsRef = useRef<WebSocket | null>(null)
  const attemptRef = useRef(0)
  const reconnectTimer = useRef<number | null>(null)
  const heartbeatTimer = useRef<number | null>(null)
  const pongTimer = useRef<number | null>(null)
  const closedByUs = useRef(false)

  // Callback'lar ref'da — o'zgarishi socketni qayta qurmaydi
  const onEventRef = useRef(onEvent)
  const getSinceRef = useRef(getSinceId)
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])
  useEffect(() => {
    getSinceRef.current = getSinceId
  }, [getSinceId])

  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    if (heartbeatTimer.current) {
      window.clearInterval(heartbeatTimer.current)
      heartbeatTimer.current = null
    }
    if (pongTimer.current) {
      window.clearTimeout(pongTimer.current)
      pongTimer.current = null
    }
  }, [])

  const send = useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload))
      return true
    }
    return false
  }, [])

  const connect = useCallback(() => {
    if (!enabled) return
    if (typeof window === "undefined") return
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return

    const token = getAccessToken()
    if (!token) {
      // Token hali yo'q — 2 sekunddan keyin qayta urinamiz (ilgari
      // effekt shu yerda butunlay to'xtab qolardi)
      reconnectTimer.current = window.setTimeout(connect, 2000)
      return
    }

    setStatus("connecting")
    closedByUs.current = false

    // DIQQAT: token URL query'sida ketadi — backend middleware shunday
    // kutadi. Proksi loglariga tushishi mumkin; kelajakda qisqa muddatli
    // ticket'ga o'tkazish tavsiya etiladi.
    const ws = new WebSocket(`${WS_BASE}/ws/chat/?token=${encodeURIComponent(token)}`)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus("open")
      const wasReconnect = attemptRef.current > 0
      attemptRef.current = 0

      // Uzilish davomida o'tkazib yuborilgan xabarlarni so'raymiz
      if (wasReconnect) {
        const since = getSinceRef.current()
        if (since) ws.send(JSON.stringify({ action: "resync", since_id: since }))
      }

      // Heartbeat: ba'zi proksilar jim socketni 60 s dan keyin uzadi
      heartbeatTimer.current = window.setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return
        ws.send(JSON.stringify({ action: "ping", ts: Date.now() }))
        if (pongTimer.current) window.clearTimeout(pongTimer.current)
        pongTimer.current = window.setTimeout(() => {
          // Pong kelmadi — ulanish o'lik, yopamiz va qayta ulanamiz
          try {
            ws.close()
          } catch {
            /* ignore */
          }
        }, PONG_TIMEOUT_MS)
      }, HEARTBEAT_MS)
    }

    ws.onmessage = (raw) => {
      let data: ChatSocketEvent
      try {
        data = JSON.parse(raw.data)
      } catch {
        return
      }

      if (data.type === "pong") {
        if (pongTimer.current) {
          window.clearTimeout(pongTimer.current)
          pongTimer.current = null
        }
        return
      }

      onEventRef.current(data)
    }

    ws.onerror = () => {
      // onclose ham chaqiriladi — qayta ulanish shu yerda boshqarilmaydi
    }

    ws.onclose = () => {
      wsRef.current = null
      clearTimers()
      setStatus("closed")

      if (closedByUs.current || !enabled) return

      // Eksponensial backoff + jitter (bir vaqtda ko'p klient
      // qayta ulanib serverni bosmasligi uchun)
      const attempt = ++attemptRef.current
      const base = Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS)
      const delay = base + Math.random() * 700
      reconnectTimer.current = window.setTimeout(connect, delay)
    }
  }, [enabled, clearTimers])

  useEffect(() => {
    if (!enabled) return

    connect()

    const onVisible = () => {
      if (document.hidden) return
      if (!wsRef.current || wsRef.current.readyState > WebSocket.OPEN) {
        attemptRef.current = Math.max(attemptRef.current, 1)
        connect()
      }
    }
    const onOnline = () => {
      attemptRef.current = Math.max(attemptRef.current, 1)
      connect()
    }

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onOnline)

    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onOnline)
      closedByUs.current = true
      clearTimers()
      try {
        wsRef.current?.close()
      } catch {
        /* ignore */
      }
      wsRef.current = null
    }
  }, [enabled, connect, clearTimers])

  return { status, send }
}
