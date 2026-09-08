"use client"

import * as React from "react"

import { getUnreadChatCount } from "@/lib/api/chat.api"
import { getUnreadAppealsCount } from "@/lib/api/appeals.api"
import { getUnreadNotificationsCount } from "@/lib/api/common.api"

/**
 * O'QILMAGANLAR SONI — BITTA MANBA
 *
 * Ilgari:
 *  - header.tsx har 15 sekundda `setInterval` bilan UCHTA so'rov yuborardi
 *    (getCurrentUser + unread notifications + notifications list), va shu
 *    bilan birga bildirishnomalar uchun WebSocket ham ochardi — `wsReady`
 *    faqat OVOZNI o'chirish uchun ishlatilardi, poll esa abadiy davom
 *    etardi.
 *  - sidebar.tsx har 30 sekundda yana ikkita so'rovni KETMA-KET yuborardi
 *    (`await` ... `await`) — bittasini kutib, keyin ikkinchisini.
 *  - notifications sahifasi yana bitta 15 sekundlik interval qo'shardi.
 *  Ya'ni bitta ochiq tabda daqiqada ~20 so'rov, foydalanuvchi boshqa
 *  tabga o'tib ketgan bo'lsa ham.
 *
 * Endi: bitta provider, parallel so'rovlar, 60 sekundlik interval va
 * `document.hidden` bo'lganda TO'XTAYDI. Tab yana ko'ringanda darhol
 * bir marta yangilanadi.
 */

export interface UnreadCounts {
  chat: number
  appeals: number
  notifications: number
}

export interface UnreadState extends UnreadCounts {
  refresh: () => void
}

const ZERO: UnreadCounts = { chat: 0, appeals: 0, notifications: 0 }

const UnreadContext = React.createContext<UnreadState | null>(null)

const POLL_MS = 60_000

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = React.useState<UnreadCounts>(ZERO)
  const inflight = React.useRef(false)

  const load = React.useCallback(async () => {
    if (inflight.current) return
    if (typeof document !== "undefined" && document.hidden) return
    inflight.current = true
    try {
      // Parallel — ilgari ketma-ket edi
      const [chat, appeals, notifications] = await Promise.all([
        getUnreadChatCount().catch(() => 0),
        getUnreadAppealsCount().catch(() => 0),
        getUnreadNotificationsCount().catch(() => 0),
      ])
      setCounts({
        chat: Number(chat) || 0,
        appeals: Number(appeals) || 0,
        notifications: Number(notifications) || 0,
      })
    } finally {
      inflight.current = false
    }
  }, [])

  React.useEffect(() => {
    void load()

    const timer = window.setInterval(() => void load(), POLL_MS)

    const onVisible = () => {
      if (!document.hidden) void load()
    }
    const onCustom = () => void load()

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onCustom)
    // Sahifalar o'qilgan deb belgilaganda darhol yangilash uchun
    window.addEventListener("unreadChanged", onCustom)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onCustom)
      window.removeEventListener("unreadChanged", onCustom)
    }
  }, [load])

  const value = React.useMemo<UnreadState>(
    () => ({ ...counts, refresh: () => void load() }),
    [counts, load],
  )

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>
}

export function useUnread(): UnreadState {
  const ctx = React.useContext(UnreadContext)
  if (ctx) return ctx
  return { ...ZERO, refresh: () => {} }
}

/** Sahifalar o'qilganlik holatini o'zgartirgach shuni chaqiradi */
export function notifyUnreadChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event("unreadChanged"))
}
