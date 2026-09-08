"use client"

/**
 * Joriy foydalanuvchini BIR MARTA yechadi va butun dashboard daraxtiga beradi.
 *
 * Nima uchun kerak:
 *  1. Ilgari dashboard-shell, header, sidebar, dashboard/page va quick-ribbon
 *     har biri alohida `getCurrentUser()` chaqirardi → har sahifa yuklanishida
 *     5 ga yaqin `/auth/me`. Endi bittasi.
 *  2. Ilgari shell'ning effekti `[pathname]` ga bog'langan edi — har route
 *     almashinuvida foydalanuvchi qaytadan so'ralar va butun daraxt spinner
 *     ortida qolar edi. Endi foydalanuvchi bir marta yechiladi, navigatsiya
 *     tarmoqni kutmaydi.
 *  3. Xatolikni YASHIRMAYDI. Ilgari `/auth/me` yiqilsa jim ravishda
 *     'TASHKILOT_MASUL' ga tushib ketardi va HOKIM 6 ta bandli menyuni
 *     ko'rardi. Endi `error` maydoni bor va UI buni ko'rsatadi.
 */

import * as React from "react"
import type { User, UserRole } from "@/types"
import { loadCurrentUser, peekCurrentUser, getCachedUserFromStorage } from "@/lib/current-user"
import { normalizeUserRole } from "@/lib/role-utils"

export type CurrentUserStatus = "loading" | "ready" | "error"

export interface CurrentUserState {
  user: User | null
  /** Normalizatsiya qilingan rol. `null` — rol ishonchli aniqlanmagan. */
  role: UserRole | null
  status: CurrentUserStatus
  /** Tarmoq/avtorizatsiya xatosi matni — UI da ko'rsatilishi shart */
  error: string | null
  /** Ma'lumot localStorage zaxirasidan olingan, serverdan emas */
  isStale: boolean
  refresh: () => Promise<void>
}

const CurrentUserContext = React.createContext<CurrentUserState | null>(null)

export function CurrentUserProvider({
  children,
  onUnauthenticated,
}: {
  children: React.ReactNode
  /** 401 bo'lganda chaqiriladi (odatda /login ga yo'naltirish) */
  onUnauthenticated?: () => void
}) {
  const [user, setUser] = React.useState<User | null>(() => peekCurrentUser())
  const [status, setStatus] = React.useState<CurrentUserStatus>(() =>
    peekCurrentUser() ? "ready" : "loading",
  )
  const [error, setError] = React.useState<string | null>(null)
  const [isStale, setIsStale] = React.useState(false)

  const mountedRef = React.useRef(true)
  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const resolve = React.useCallback(
    async (force: boolean) => {
      try {
        const next = await loadCurrentUser({ force })
        if (!mountedRef.current) return
        setUser(next)
        setError(null)
        setIsStale(false)
        setStatus("ready")
      } catch (err: unknown) {
        if (!mountedRef.current) return

        const statusCode = (err as { status?: number })?.status
        if (statusCode === 401) {
          onUnauthenticated?.()
          return
        }

        // Zaxira: oxirgi ma'lum foydalanuvchi. Lekin bu holat YASHIRILMAYDI —
        // isStale/error orqali interfeysga chiqadi.
        const fallback = getCachedUserFromStorage()
        setUser(fallback)
        setIsStale(Boolean(fallback))
        setError(
          (err as { message?: string })?.message ||
            "Foydalanuvchi ma'lumotlarini olish muvaffaqiyatsiz tugadi",
        )
        setStatus("error")
      }
    },
    [onUnauthenticated],
  )

  React.useEffect(() => {
    void resolve(false)
  }, [resolve])

  // Profil tahrirlanganda boshqa komponentlar `userUpdated` hodisasini yuboradi
  React.useEffect(() => {
    const onUserUpdated = () => void resolve(true)
    window.addEventListener("userUpdated", onUserUpdated)
    return () => window.removeEventListener("userUpdated", onUserUpdated)
  }, [resolve])

  const refresh = React.useCallback(() => resolve(true), [resolve])

  const value = React.useMemo<CurrentUserState>(
    () => ({
      user,
      role: normalizeUserRole(user?.role),
      status,
      error,
      isStale,
      refresh,
    }),
    [user, status, error, isStale, refresh],
  )

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
}

/**
 * Dashboard ichida joriy foydalanuvchi. Provider'dan tashqarida chaqirilsa
 * "loading" holatini qaytaradi (throw qilmaydi), shunda alohida sahifalar
 * ham buzilmaydi.
 */
export function useCurrentUser(): CurrentUserState {
  const ctx = React.useContext(CurrentUserContext)
  if (ctx) return ctx
  return {
    user: null,
    role: null,
    status: "loading",
    error: null,
    isStale: false,
    refresh: async () => {},
  }
}
