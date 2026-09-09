"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Shield,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/context"
import { canAccessDashboardPath } from "@/lib/dashboard-access"
import { logout } from "@/lib/api/auth.api"
import { useCurrentUser } from "@/components/layout/current-user-provider"
import { useUnread } from "@/components/layout/unread-provider"
import {
  NAV_ITEMS,
  SIDEBAR_LAYOUT,
  isNavItemActive,
  type NavItem,
} from "@/components/layout/nav-items"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

/**
 * YON MENYU — 3-tahrir (Frappe/ERPNext uslubi)
 *
 * Foydalanuvchi so'rovi: bo'limlar aniqroq ajralsin, ko'rinish ERPNext
 * yon menyusiga o'xshasin. Nima o'zgardi:
 *
 *  1. Fon och kulrang (`bg-surface-sunken`), kontent oq — ikkisi CHEGARASIZ
 *     ajraladi. Faol band — oq karta + yumshoq soya (kulrang chiziq emas).
 *  2. Uppercase mikro-yorliqli bo'limlar o'rniga:
 *       · tepada tezkor amallar — Qidiruv (Ctrl K) va Bildirishnomalar;
 *       · asosiy ish bandlari tekis ro'yxatda;
 *       · «Tahlil» va «Administratsiya» — ochiladigan guruhlar (chevron,
 *         ichidagi bandlar chapdan surilgan); faol band bo'lsa guruh o'zi
 *         ochiladi, holat localStorage da saqlanadi;
 *       · «Sozlamalar» eng pastda, alohida.
 *  3. Qatorlar 44px, matn 15px, ikonkalar 18px va och rangda — faol
 *     bandda ikonka ham quyuqlashadi.
 *
 * Saqlangan: mobil Sheet drawer (fokus tutqichi, Escape), yig'iladigan
 * 76px rail, rol bo'yicha filtr, o'qilmaganlar nishonlari, <nav><ul><li>
 * semantikasi, >=44px sensorli nishonlar.
 */

const W_EXPANDED = "17.5rem" // 280px
const W_COLLAPSED = "4.75rem" // 76px
const STORAGE_KEY = "ehokimiyat:sidebar-collapsed"
const GROUPS_KEY = "ehokimiyat:sidebar-groups"

/* Faol band — oq karta + yumshoq soya (chegara yo'q) */
const ROW =
  "relative flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
const ROW_IDLE = "text-sidebar-foreground hover:bg-card/70"
const ROW_ACTIVE =
  "bg-card text-foreground shadow-[0_1px_2px_rgba(13,21,36,0.06),0_6px_16px_-8px_rgba(13,21,36,0.16)]"
const ICON = "h-[18px] w-[18px] shrink-0"

/* ==========================================================================
   Qidiruvni ochish — header'dagi maydonga ulanadi
   ========================================================================== */

export const OPEN_SEARCH_EVENT = "ehokimiyat:open-search"

function openGlobalSearch() {
  const input = document.getElementById("hdr-search") as HTMLInputElement | null
  // Desktopda maydon ko'rinib tursa — to'g'ridan-to'g'ri fokus
  if (input && input.offsetParent !== null) {
    input.focus()
    input.select()
    return
  }
  // Mobilda header o'z qidiruv varag'ini ochadi
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT))
}

/* ==========================================================================
   Bitta band
   ========================================================================== */

function Badge({ count, collapsed }: { count: number; collapsed?: boolean }) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        "flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-2xs font-bold tabular-nums text-destructive-foreground",
        collapsed && "absolute right-1.5 top-1.5 h-4 min-w-4 px-1",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}

function NavRow({
  item,
  label,
  active,
  count,
  collapsed,
  nested,
  onNavigate,
}: {
  item: NavItem
  label: string
  active: boolean
  count: number
  collapsed: boolean
  nested?: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        className={cn(
          ROW,
          active ? ROW_ACTIVE : ROW_IDLE,
          collapsed && "justify-center px-0",
          nested && !collapsed && "pl-11 text-[14.5px]",
        )}
      >
        {/* Ichki bandda ikonka yo'q — ERPNext kabi faqat surilgan matn */}
        {(!nested || collapsed) && (
          <Icon
            className={cn(ICON, active ? "text-foreground" : "text-muted-foreground")}
            aria-hidden
          />
        )}
        {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
        <Badge count={count} collapsed={collapsed} />
        {collapsed && <span className="sr-only">{label}</span>}
      </Link>
    </li>
  )
}

/* ==========================================================================
   Guruh (ochiladigan)
   ========================================================================== */

function NavGroup({
  label,
  icon: Icon,
  items,
  open,
  hasActive,
  collapsed,
  onToggle,
  renderItem,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
  open: boolean
  hasActive: boolean
  collapsed: boolean
  onToggle: () => void
  renderItem: (item: NavItem, nested: boolean) => React.ReactNode
}) {
  if (items.length === 0) return null

  // Yig'ilgan rail'da guruh sarlavhasi yo'q — bandlar ajratgich bilan
  if (collapsed) {
    return (
      <li>
        <div className="mx-3 my-2 h-px bg-border" aria-hidden />
        <ul className="space-y-0.5">{items.map((i) => renderItem(i, false))}</ul>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(ROW, hasActive && !open ? "text-foreground" : ROW_IDLE)}
      >
        <Icon
          className={cn(ICON, hasActive ? "text-foreground" : "text-muted-foreground")}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        )}
      </button>
      {open && <ul className="mt-0.5 space-y-0.5">{items.map((i) => renderItem(i, true))}</ul>}
    </li>
  )
}

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

  const visible = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (role && !canAccessDashboardPath(role, item.href)) return false
        if (item.requiresRole && (!role || !item.requiresRole.includes(role))) return false
        return true
      }),
    [role],
  )

  const byHref = useMemo(() => new Map(visible.map((i) => [i.href, i])), [visible])
  const pick = useCallback(
    (hrefs: readonly string[]) => hrefs.map((h) => byHref.get(h)).filter(Boolean) as NavItem[],
    [byHref],
  )

  const badgeValue = useCallback(
    (item: NavItem): number => {
      if (item.badge === "chat") return unread.chat
      if (item.badge === "appeals") return unread.appeals
      if (item.badge === "notifications") return unread.notifications
      return 0
    },
    [unread],
  )

  /* Guruhlarning ochiq/yopiq holati — saqlanadi; faol band bo'lsa ochiladi */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GROUPS_KEY)
      if (raw) setOpenGroups(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [])
  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        window.localStorage.setItem(GROUPS_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })

  const renderItem = (item: NavItem, nested: boolean) => (
    <NavRow
      key={item.href}
      item={item}
      label={t.navigation[item.labelKey]}
      active={isNavItemActive(item.href, pathname)}
      count={badgeValue(item)}
      collapsed={collapsed}
      nested={nested}
      onNavigate={onNavigate}
    />
  )

  const flat = pick(SIDEBAR_LAYOUT.flat)
  const tail = pick(SIDEBAR_LAYOUT.tail)
  const notifications = byHref.get("/dashboard/notifications")

  return (
    <>
      {status === "error" && (
        <div
          role="alert"
          className={cn(
            "mx-3 mb-2 rounded-xl bg-warning-soft px-3 py-2 text-2xs text-warning-soft-foreground",
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
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3"
      >
        {/* ------------------------------------------------ Tezkor amallar */}
        <ul className="space-y-0.5">
          <li>
            <button
              type="button"
              onClick={() => {
                openGlobalSearch()
                onNavigate?.()
              }}
              title={collapsed ? (t.common?.search ?? "Qidirish") : undefined}
              className={cn(ROW, ROW_IDLE, collapsed && "justify-center px-0")}
            >
              <Search className={cn(ICON, "text-muted-foreground")} aria-hidden />
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate text-left">
                    {t.common?.search ?? "Qidirish"}
                  </span>
                  <kbd className="rounded-md bg-card px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground shadow-xs">
                    Ctrl K
                  </kbd>
                </>
              )}
              {collapsed && <span className="sr-only">{t.common?.search ?? "Qidirish"}</span>}
            </button>
          </li>
          {notifications && (
            <NavRow
              item={{ ...notifications, icon: Bell }}
              label={t.navigation.notifications}
              active={isNavItemActive(notifications.href, pathname)}
              count={unread.notifications}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          )}
        </ul>

        {/* --------------------------------------------------- Asosiy ish */}
        <ul className="mt-4 space-y-0.5">{flat.map((i) => renderItem(i, false))}</ul>

        {/* ------------------------------------------------------ Guruhlar */}
        <ul className="mt-4 space-y-0.5">
          {SIDEBAR_LAYOUT.groups.map((g) => {
            const items = pick(g.hrefs)
            const hasActive = items.some((i) => isNavItemActive(i.href, pathname))
            return (
              <NavGroup
                key={g.key}
                label={t.navigation[g.labelKey]}
                icon={g.icon}
                items={items}
                open={Boolean(openGroups[g.key]) || hasActive}
                hasActive={hasActive}
                collapsed={collapsed}
                onToggle={() => toggleGroup(g.key)}
                renderItem={renderItem}
              />
            )
          })}
        </ul>

        {/* ------------------------------------------------------- Oxirgi */}
        {tail.length > 0 && (
          <ul className="mt-4 space-y-0.5">{tail.map((i) => renderItem(i, false))}</ul>
        )}
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
  const logoutLabel = t.common?.logout ?? "Chiqish"

  const onLogout = async () => {
    setBusy(true)
    try {
      await logout()
    } finally {
      window.location.href = "/login"
    }
  }

  return (
    <div className="p-3">
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl bg-card p-2 shadow-[0_1px_2px_rgba(13,21,36,0.05),0_8px_20px_-12px_rgba(13,21,36,0.16)]",
          collapsed && "justify-center p-1.5",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-soft-foreground">
          {initials(fullName)}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">
                {fullName}
              </span>
              <span className="block truncate text-2xs text-muted-foreground">{roleLabel}</span>
            </span>
            <button
              type="button"
              onClick={() => void onLogout()}
              disabled={busy}
              aria-label={logoutLabel}
              title={logoutLabel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive-soft hover:text-destructive-soft-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </>
        )}
      </div>
      {collapsed && (
        <button
          type="button"
          onClick={() => void onLogout()}
          disabled={busy}
          aria-label={logoutLabel}
          title={logoutLabel}
          className="mt-1 flex h-11 w-full items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive-soft hover:text-destructive-soft-foreground disabled:opacity-50"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden />
        </button>
      )}
    </div>
  )
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
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
        "flex h-[72px] items-center gap-3 px-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sidebar-ring",
        collapsed && "justify-center px-0",
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_20px_-10px_var(--primary)]">
        <Shield className="h-5 w-5" aria-hidden />
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-[17px] font-semibold tracking-[-0.01em] text-foreground">
            {t.sidebar?.appName ?? "e-Hokimiyat"}
          </span>
          <span className="block truncate text-[13px] text-muted-foreground">Xatirchi tumani</span>
        </span>
      )}
    </Link>
  )
}

/* ==========================================================================
   Desktop rail
   ========================================================================== */

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1")
    } catch {
      /* ignore */
    }
  }, [])

  /* Ctrl/⌘ + K — global qidiruv */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        openGlobalSearch()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
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
      className="fixed inset-y-0 left-0 z-30 hidden flex-col bg-surface-sunken transition-[width] duration-200 lg:flex"
    >
      <Brand collapsed={collapsed} />
      <NavContent collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />

      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Menyuni ochish" : "Menyuni yig'ish"}
        className="absolute -right-3 top-[26px] flex h-7 w-7 items-center justify-center rounded-full bg-card text-muted-foreground shadow-[0_1px_2px_rgba(13,21,36,0.08),0_4px_12px_-4px_rgba(13,21,36,0.2)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
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
        className="flex w-[86vw] max-w-[20rem] flex-col gap-0 border-0 bg-surface-sunken p-0"
      >
        <SheetTitle className="sr-only">{t.navigation.mainMenu}</SheetTitle>
        <Brand collapsed={false} />
        <NavContent collapsed={false} onNavigate={() => onOpenChange(false)} />
        <SidebarFooter collapsed={false} />
      </SheetContent>
    </Sheet>
  )
}
