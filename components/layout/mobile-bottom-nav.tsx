"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/context"
import { canAccessDashboardPath } from "@/lib/dashboard-access"
import { useCurrentUser } from "@/components/layout/current-user-provider"
import { useUnread } from "@/components/layout/unread-provider"
import { BOTTOM_NAV_HREFS, NAV_ITEMS, isNavItemActive } from "@/components/layout/nav-items"

/**
 * MOBIL PASTKI NAVIGATSIYA
 *
 * Nima uchun kerak edi: telefonda bildirishnomalar qo'ng'irog'i
 * `hidden md:flex` bilan yashirilgan, sidebar'da esa bandi umuman yo'q
 * edi — ya'ni modulga kirish nuqtasi qolmagan. Qidiruv ham `lg:` dan
 * pastda yo'q. Header'dagi hamburger tugmasi esa hech narsa qilmasdi
 * (holati o'qilmasdi), 768–1023px oralig'ida esa ishlaydigan menyu
 * tugmasi umuman yo'q edi.
 *
 * Nishonlar >= 44px, `pb-safe` bilan tizim panellari ostiga tushmaydi.
 */
export function MobileBottomNav() {
  const t = useTranslation()
  const pathname = usePathname()
  const { role } = useCurrentUser()
  const unread = useUnread()

  const items = BOTTOM_NAV_HREFS.map((href) =>
    NAV_ITEMS.find((i) => i.href === href),
  )
    .filter((i): i is NonNullable<typeof i> => Boolean(i))
    .filter((i) => !role || canAccessDashboardPath(role, i.href))
    .filter((i) => !i.requiresRole || (role && i.requiresRole.includes(role)))

  if (items.length === 0) return null

  const badgeOf = (key?: "chat" | "appeals" | "notifications") => {
    if (key === "chat") return unread.chat
    if (key === "appeals") return unread.appeals
    if (key === "notifications") return unread.notifications
    return 0
  }

  return (
    <nav
      aria-label={t.navigation.bottomNavLabel}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-safe lg:hidden"
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const active = isNavItemActive(item.href, pathname)
          const count = badgeOf(item.badge)
          const Icon = item.icon
          const label = t.navigation[item.labelKey]

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 px-1 text-2xs font-medium",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <span
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary"
                    aria-hidden
                  />
                )}
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden />
                  {count > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 tabular-nums text-destructive-foreground">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
