"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Check, Globe, LogOut, Menu, Search, Settings, User, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useI18n, useTranslation } from "@/lib/i18n/context"
import type { Language } from "@/lib/i18n/types"
import { logout } from "@/lib/api/auth.api"
import { getNotifications, markAllNotificationsRead } from "@/lib/api/common.api"
import { useCurrentUser } from "@/components/layout/current-user-provider"
import { notifyUnreadChanged, useUnread } from "@/components/layout/unread-provider"
import { useMobileNav } from "@/components/layout/mobile-nav-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

/**
 * SAHIFA SARLAVHASI
 *
 * Tuzatilgan muammolar:
 *  1. Har 15 sekundda UCHTA so'rov yuboradigan `setInterval` — va yonida
 *     ochilgan WebSocket faqat ovozni o'chirish uchun ishlatilardi.
 *     Endi hisoblar umumiy `UnreadProvider` dan (60 s, `document.hidden`
 *     bo'lganda to'xtaydi).
 *  2. `isMobileMenuOpen` holati e'lon qilingan va o'rnatilardi, lekin
 *     HECH QAYERDA o'qilmasdi — hamburger tugmasi hech narsa qilmasdi.
 *     Ikkinchi, ishlaydigan hamburger esa sidebar'da `fixed left-4 top-4`
 *     bilan sarlavha ustiga chiqib turardi. Endi bitta tugma, header ichida.
 *  3. Qo'ng'iroq `hidden md:flex` edi — telefonda bildirishnomalarga
 *     kirishning imkoni yo'q edi. Endi barcha o'lchamlarda.
 *  4. Qidiruv `hidden lg:block` edi. Endi kichik ekranda ikonka bosilsa
 *     to'liq ekranli panel ochiladi.
 *  5. Til menyusida emoji bayroqlar ishlatilardi va `uz` bilan `uz-cyrl`
 *     ikkisi ham 🇺🇿 — farqlanmasdi. Endi matnli kodlar: UZ / ЎЗ / RU / EN.
 *  6. Chiqish tugmasida `<X>` ikonkasi turardi.
 *  7. `px-6` qat'iy edi — 375px ekranda har tomondan 24px yo'qolardi.
 */

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  /** Mobil menyuni ochish — shell uzatadi */
  onMenuClick?: () => void
}

const LANGUAGES: { code: Language; short: string; name: string }[] = [
  { code: "uz", short: "UZ", name: "O‘zbekcha" },
  { code: "uz-cyrl", short: "ЎЗ", name: "Ўзбекча" },
  { code: "ru", short: "RU", name: "Русский" },
  { code: "en", short: "EN", name: "English" },
]

export function Header({ title, description, actions, onMenuClick }: HeaderProps) {
  const t = useTranslation()
  const router = useRouter()
  const { language, setLanguage } = useI18n()
  const { user, role } = useCurrentUser()
  const unread = useUnread()
  // Sahifalar <Header> ni prop uzatmasdan chaqiradi, shuning uchun mobil
  // menyuni ochish shell'dan kontekst orqali keladi.
  const mobileNav = useMobileNav()
  const openMenu = onMenuClick ?? mobileNav.open

  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement | null>(null)

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    (user as any)?.full_name ||
    (user as any)?.username ||
    "—"
  const roleLabel = role ? ((t.roles as any)?.[role] ?? role) : ""

  /* Bildirishnomalar ro'yxati faqat menyu ochilganda yuklanadi */
  useEffect(() => {
    if (!notifOpen) return
    let alive = true
    setNotifLoading(true)
    getNotifications(1, 6)
      .then((res: any) => {
        if (!alive) return
        setNotifications(Array.isArray(res) ? res : res?.results ?? [])
      })
      .catch(() => {
        if (alive) setNotifications([])
      })
      .finally(() => {
        if (alive) setNotifLoading(false)
      })
    return () => {
      alive = false
    }
  }, [notifOpen])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearchOpen(false)
    router.push(`/dashboard/tasks?search=${encodeURIComponent(q)}`)
  }

  const onLogout = async () => {
    try {
      await logout()
    } finally {
      window.location.href = "/login"
    }
  }

  const markAll = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      notifyUnreadChanged()
    } catch {
      /* jim qolmaydi: hisob keyingi yangilanishda tiklanadi */
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-4 sm:px-6">
      <div className="flex h-16 items-center gap-2">
        {/* Mobil menyu — YAGONA hamburger */}
        <button
          type="button"
          onClick={openMenu}
          aria-label={t.navigation.mainMenu}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        {/* Sarlavha — sahifadagi yagona <h1> */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-md font-semibold text-foreground sm:text-lg">{title}</h1>
          {description && (
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
          )}
        </div>

        {/* Desktop qidiruv */}
        <form onSubmit={submitSearch} className="hidden lg:block lg:w-72">
          <label htmlFor="hdr-search" className="sr-only">
            {t.common?.search ?? "Qidirish"}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="hdr-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.common?.search ?? "Qidirish"}
              className="h-11 w-full rounded-md border border-input bg-background pl-8.5 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </div>
        </form>

        {/* Mobil qidiruv tugmasi */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label={t.common?.search ?? "Qidirish"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Search className="h-5 w-5" aria-hidden />
        </button>

        {/* Bildirishnomalar — barcha o'lchamlarda */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={`${t.navigation.notifications}${unread.notifications ? ` (${unread.notifications})` : ""}`}
          >
            <Bell className="h-5 w-5" aria-hidden />
            {unread.notifications > 0 && (
              <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 tabular-nums text-destructive-foreground">
                {unread.notifications > 9 ? "9+" : unread.notifications}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(92vw,20rem)] p-0">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold text-foreground">
                {t.navigation.notifications}
              </span>
              {unread.notifications > 0 && (
                <button
                  type="button"
                  onClick={() => void markAll()}
                  className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-primary hover:bg-muted"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Barchasini o‘qilgan qilish
                </button>
              )}
            </div>

            {notifLoading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Yangi bildirishnoma yo‘q
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/dashboard/notifications/${n.id}`}
                      onClick={() => setNotifOpen(false)}
                      className={cn(
                        "block px-3 py-2.5 hover:bg-muted",
                        !n.is_read && "bg-accent/50",
                      )}
                    >
                      <span className="flex items-start gap-2">
                        {!n.is_read && (
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                            aria-label="o‘qilmagan"
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {n.title ?? "—"}
                          </span>
                          {n.message && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {n.message}
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-border p-2">
              <Link
                href="/dashboard/notifications"
                onClick={() => setNotifOpen(false)}
                className="flex h-10 items-center justify-center rounded-md text-sm font-semibold text-primary hover:bg-muted"
              >
                Barchasini ko‘rish
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Til — matnli kodlar, emoji bayroqlar emas */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Tilni tanlash"
          >
            <Globe className="h-4 w-4" aria-hidden />
            {LANGUAGES.find((l) => l.code === language)?.short ?? "UZ"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {LANGUAGES.map((l) => (
              <DropdownMenuItem
                key={l.code}
                onSelect={() => setLanguage(l.code)}
                className={cn("gap-2", language === l.code && "bg-accent")}
              >
                <span className="w-7 text-xs font-bold tabular-nums">{l.short}</span>
                {l.name}
                {language === l.code && <Check className="ml-auto h-4 w-4" aria-hidden />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Foydalanuvchi */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-11 shrink-0 items-center gap-2 rounded-md px-1.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Foydalanuvchi menyusi"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-2xs font-bold text-primary-soft-foreground">
              {initials(fullName)}
            </span>
            <span className="hidden min-w-0 text-left xl:block">
              <span className="block max-w-32 truncate text-xs font-semibold text-foreground">
                {fullName}
              </span>
              <span className="block max-w-32 truncate text-2xs text-muted-foreground">
                {roleLabel}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-semibold text-foreground">{fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="gap-2">
                <User className="h-4 w-4" aria-hidden />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="gap-2">
                <Settings className="h-4 w-4" aria-hidden />
                {t.navigation.settings}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => void onLogout()}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t.common?.logout ?? "Chiqish"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sahifa harakatlari */}
        {actions && <div className="ml-1 hidden shrink-0 sm:block">{actions}</div>}
      </div>

      {/* Sahifa harakatlari — mobilda alohida qator */}
      {actions && <div className="pb-3 sm:hidden">{actions}</div>}

      {/* Mobil qidiruv paneli */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="top" className="p-4">
          <SheetTitle className="sr-only">{t.common?.search ?? "Qidirish"}</SheetTitle>
          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Topshiriq qidirish…"
                aria-label={t.common?.search ?? "Qidirish"}
                className="h-11 w-full rounded-md border border-input bg-card pl-8.5 pr-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </div>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Qidirish
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </header>
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
