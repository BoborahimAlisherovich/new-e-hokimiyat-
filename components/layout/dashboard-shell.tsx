"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { MobileNavDrawer, Sidebar } from "@/components/layout/sidebar"
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav"
import { MobileNavProvider, type MobileNavState } from "@/components/layout/mobile-nav-context"
import { UnreadProvider } from "@/components/layout/unread-provider"
import {
  CurrentUserProvider,
  useCurrentUser,
} from "@/components/layout/current-user-provider"
import { canAccessDashboardPath, getFirstAllowedDashboardPath } from "@/lib/dashboard-access"

/**
 * DASHBOARD QOBIG'I
 *
 * Tuzatilgan muammolar:
 *  1. `isMobile` JS holati `false` bilan boshlanardi va faqat `useEffect`
 *     da to'g'rilanardi — har mobil yuklanishda buzilgan layout bir zum
 *     ko'rinardi. Endi layout to'liq CSS'da: sidebar `hidden lg:flex`,
 *     main esa `lg:pl-[var(--sidebar-w)]`.
 *  2. `resize` hodisasi debounce'siz tinglanardi va har hodisada ikki
 *     setter chaqirilardi — deraza chetini sudraganda butun qobiq
 *     qayta renderlanardi. Endi resize tinglanmaydi.
 *  3. Ruxsat tekshiruvi `[pathname]` ga bog'langan edi: HAR route
 *     almashinuvida `/auth/me` qayta so'ralar va butun daraxt spinner
 *     ortida qolar edi. Endi foydalanuvchi bir marta yechiladi
 *     (CurrentUserProvider), tekshiruv esa keshdagi roldan hisoblanadi —
 *     navigatsiya tarmoqni kutmaydi.
 *  4. Ildiz `overflow-hidden`, main esa `overflow-x-hidden` edi: viewport'dan
 *     keng har qanday element jimgina kesilardi va unga yetib borish
 *     imkoni yo'q edi. Endi kesilmaydi — keng kontent o'z konteynerida
 *     `scroll-x` bilan siljiydi.
 *  5. Fonda uchta 420–520px `blur-3xl` shar aylanardi (sahifa freymlari
 *     va dashboard yana oltitasini qo'shardi). Endi bittasi ham yo'q.
 *  6. Telefonda pastki navigatsiya yo'q edi. Endi bor va main unga joy
 *     qoldiradi.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)

  const mobileNav: MobileNavState = useMemo(
    () => ({
      isOpen: navOpen,
      open: () => setNavOpen(true),
      close: () => setNavOpen(false),
      setOpen: setNavOpen,
    }),
    [navOpen],
  )

  return (
    <CurrentUserProvider onUnauthenticated={() => (window.location.href = "/kirish")}>
      <UnreadProvider>
        <MobileNavProvider value={mobileNav}>
          <AccessGate>
            <div className="min-h-dvh bg-background">
              <Sidebar />
              <MobileNavDrawer open={navOpen} onOpenChange={setNavOpen} />

              <div className="lg:pl-[var(--sidebar-w,17.5rem)] lg:transition-[padding] lg:duration-200">
                <main id="main-content" className="min-h-dvh pb-14 lg:pb-0">
                  {children}
                </main>
              </div>

              <MobileBottomNav />
            </div>
          </AccessGate>
        </MobileNavProvider>
      </UnreadProvider>
    </CurrentUserProvider>
  )
}

/**
 * Marshrut ruxsatini tekshiradi. Hamma rollarga ochiq sahifalar rol
 * yechilmasidan oldin ham chiziladi (tez o'tish uchun); cheklangan
 * sahifalar esa rolni kutadi va ruxsat bo'lmasa umuman chizilmaydi.
 */
function AccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { role, user, status } = useCurrentUser()

  const isUnauthenticated = status !== "loading" && !user
  const denied = !!role && !canAccessDashboardPath(role, pathname)
  const waitForRole = status === "loading"

  useEffect(() => {
    if (isUnauthenticated) {
      window.location.href = "/kirish"
    } else if (denied) {
      router.replace(getFirstAllowedDashboardPath(role))
    }
  }, [isUnauthenticated, denied, role, router])

  if (denied || waitForRole || isUnauthenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="surface flex flex-col items-center gap-3 px-6 py-5">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">
            {isUnauthenticated ? "Kirish sahifasiga yo‘naltirilmoqda…" : "Tekshirilmoqda…"}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
