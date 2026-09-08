"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertTriangle, ChevronLeft, ChevronRight, LogOut, Shield } from "lucide-react"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/context"
import { canAccessDashboardPath } from "@/lib/dashboard-access"
import { logout } from "@/lib/api/auth.api"
import { useCurrentUser } from "@/components/layout/current-user-provider"
import { useUnread } from "@/components/layout/unread-provider"
import { NAV_ITEMS, NAV_SECTIONS, isNavItemActive, type NavItem } from "@/components/layout/nav-items"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

/**
 * YON MENYU
 *
 * Tuzatilgan muammolar:
 *  1. Mobil "birinchi kadr" nuqsoni: shell `isMobile=false` bilan
 *     boshlanardi va faqat `useEffect` da to'g'rilanardi, shuning uchun
 *     har mobil yuklanishda 280px opaq panel 375px ekranning 75%ini
 *     yopib turardi, keyin hydration'dan so'ng yig'ilardi. Endi qaror
 *     CSS'da (`hidden lg:flex`) — JS holatiga bog'liq emas.
 *  2. Yopilgan drawer faqat `-translate-x-full` bilan surilardi: DOM'da
 *     qolardi va TAB tartibida ham qolardi — klaviatura foydalanuvchisi
 *     11 ta ko'rinmas havolaga tushib qolardi. Endi Radix Dialog asosidagi
 *     Sheet: yopiq holatda DOM'dan chiqadi, fokus tutqichi va Escape bor.
 *  3. `role="menuitem"` `<div>` da, ota `<nav>` da esa `role="menu"` yo'q —
 *     noto'g'ri ARIA. Endi oddiy `<nav><ul><li><a>` tuzilishi.
 *  4. Sensorli nishonlar: nav 36/40px, Chat 34px, yig'ish tugmasi 34px
 *     edi. Endi hammasi >= 44px.
 *  5. `getCurrentUser()` sidebar'da alohida chaqirilardi (sahifada 3-chi
 *     marta) va xato jim yutilib 'TASHKILOT_MASUL' ga tushib ketardi.
 *     Endi umumiy provider va xato KO'RINADI.
 */

const W_EXPANDED = "17.5rem" // 280px
const W_COLLAPSED = "4.75rem" // 76px
const STORAGE_KEY = "ehokimiyat:sidebar-collapsed"

/* ==========================================================================
   Umumiy nav mazmuni
   ========================================================================== */

function NavContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const t = useTranslation()
  const pathname = usePathname()
  const { role, status, error, refresh } = useCurrentUser()
  const unread = useUnread()

  const visible = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      // Marshrut ruxsati
      if (role && !canAccessDashboardPath(role, item.href)) return false
      // Qo'shimcha rol cheklovi (ilgari `adminOnly` o'qilmasdi)
      if (item.requiresRole && (!role || !item.requiresRole.includes(role))) return false
      return true
    })
  }, [role])

  const badgeValue = useCallback(
    (item: NavItem): number => {
      if (item.badge === "chat") return unread.chat
      if (item.badge === "appeals") return unread.appeals
      if (item.badge === "notifications") return unread.notifications
      return 0
    },
    [unread],
  )

  return (
    <>
      {/* Rolni aniqlash muvaffaqiyatsiz bo'lsa — jim qolmaydi */}
      {status === "error" && (
        <div
          role="alert"
          className={cn(
            "mx-3 mb-2 rounded-md bg-warning-soft px-2.5 py-2 text-2xs text-warning-soft-foreground",
            collapsed && "mx-2 px-1.5 text-center",
          )}
        >
          {collapsed ? (
            <AlertTriangle className="mx-auto h-4 w-4" aria-label={t.navigation.roleError} />
          ) : (
            <>
              <p className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t.navigation.roleError}
              </p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="mt-1.5 font-semibold underline"
              >
                {t.navigation.roleErrorRetry}
              </button>
              {error && <span className="sr-only">{error}</span>}
            </>
          )}
        </div>
      )}

      <nav
        aria-label={t.navigation.mainMenu}
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3"
      >
        {NAV_SECTIONS.map((section) => {
          const items = visible.filter((i) => i.section === section.key)
          if (items.length === 0) return null

          return (
            <div key={section.key} className="mb-3 last:mb-0">
              {!collapsed && (
                <h2 className="px-2.5 pb-1.5 pt-2 text-2xs font-bold uppercase tracking-[0.09em] text-muted-foreground">
                  {t.navigation[section.labelKey]}
                </h2>
              )}
              {collapsed && <div className="mx-2 my-2 border-t border-sidebar-border" aria-hidden />}

              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isNavItemActive(item.href, pathname)
                  const count = badgeValue(item)
                  const label = t.navigation[item.labelKey]
                  const Icon = item.icon

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? label : undefined}
                        className={cn(
                          "relative flex h-11 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-muted",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        {active && (
                          <span
                            className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-sidebar-primary"
                            aria-hidden
                          />
                        )}
                        <Icon className="h-5 w-5 shrink-0" aria-hidden />
                        {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
                        {count > 0 && (
                          <span
                            className={cn(
                              "flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-2xs font-bold tabular-nums text-destructive-foreground",
                              collapsed && "absolute right-1.5 top-1.5 h-4 min-w-4 px-1",
                            )}
                          >
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                        {collapsed && <span className="sr-only">{label}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
    </>
  )
}

/* ==========================================================================
   Foydalanuvchi futeri
   ========================================================================== */

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const t = useTranslation()
  const { user, role } = useCurrentUser()
  const [busy, setBusy] = useState(false)

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    (user as any)?.full_name ||
    (user as any)?.username ||
    "—"

  const roleLabel = role ? ((t.roles as any)?.[role] ?? role) : "—"

  const onLogout = async () => {
    setBusy(true)
    try {
      await logout()
    } finally {
      window.location.href = "/login"
    }
  }

  return (
    <div className="border-t border-sidebar-border p-2">
      {!collapsed && (
        <div className="mb-1.5 flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
            {initials(fullName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-sidebar-foreground">
              {fullName}
            </span>
            <span className="block truncate text-2xs text-muted-foreground">{roleLabel}</span>
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => void onLogout()}
        disabled={busy}
        title={collapsed ? t.common?.logout ?? "Chiqish" : undefined}
        className={cn(
          "flex h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-sidebar-foreground hover:bg-destructive-soft hover:text-destructive-soft-foreground disabled:opacity-50",
          collapsed && "justify-center px-0",
        )}
      >
        <LogOut className="h-5 w-5 shrink-0" aria-hidden />
        {!collapsed && <span>{t.common?.logout ?? "Chiqish"}</span>}
        {collapsed && <span className="sr-only">{t.common?.logout ?? "Chiqish"}</span>}
      </button>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?"
}

/* ==========================================================================
   Brend
   ========================================================================== */

function Brand({ collapsed }: { collapsed: boolean }) {
  const t = useTranslation()
  return (
    <Link
      href="/dashboard"
      className={cn(
        "flex h-16 items-center gap-2.5 border-b border-sidebar-border px-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sidebar-ring",
        collapsed && "justify-center px-0",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Shield className="h-5 w-5" aria-hidden />
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-md font-bold tracking-tight text-sidebar-foreground">
            {t.sidebar?.appName ?? "e-Hokimiyat"}
          </span>
          <span className="block truncate text-2xs text-muted-foreground">Xatirchi tumani</span>
        </span>
      )}
    </Link>
  )
}

/* ==========================================================================
   Desktop rail
   ========================================================================== */

export function Sidebar() {
  const t = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  // Tanlov saqlanadi, lekin birinchi kadrda layout unga BOG'LIQ EMAS —
  // kenglik CSS o'zgaruvchisi orqali beriladi.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1")
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }
      document.documentElement.style.setProperty(
        "--sidebar-w",
        next ? W_COLLAPSED : W_EXPANDED,
      )
      return next
    })
  }

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-w",
      collapsed ? W_COLLAPSED : W_EXPANDED,
    )
  }, [collapsed])

  return (
    <aside
      data-collapsed={collapsed ? "1" : "0"}
      style={{ width: collapsed ? W_COLLAPSED : W_EXPANDED }}
      className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex"
    >
      <Brand collapsed={collapsed} />
      <NavContent collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />

      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Menyuni ochish" : "Menyuni yig'ish"}
        className="absolute -right-3.5 top-20 flex h-11 w-7 items-center justify-center rounded-r-md border border-l-0 border-sidebar-border bg-sidebar text-muted-foreground shadow-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronLeft className="h-4 w-4" aria-hidden />
        )}
      </button>
    </aside>
  )
}

/* ==========================================================================
   Mobil drawer — haqiqiy dialog
   ========================================================================== */

export function MobileNavDrawer({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslation()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-[86vw] max-w-[20rem] flex-col gap-0 border-sidebar-border bg-sidebar p-0"
      >
        <SheetTitle className="sr-only">{t.navigation.mainMenu}</SheetTitle>
        <Brand collapsed={false} />
        <NavContent collapsed={false} onNavigate={() => onOpenChange(false)} />
        <SidebarFooter collapsed={false} />
      </SheetContent>
    </Sheet>
  )
}
