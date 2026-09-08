import type { UserRole } from "@/types"
import { normalizeUserRole } from "@/lib/role-utils"

/**
 * Rol bo'yicha dashboard marshrutlari.
 *
 * Tuzatilgan muammolar:
 *  1. `/dashboard/recurring-tasks` hech bir rolda yo'q edi — sahifa va nav
 *     bandi mavjud bo'lsa ham, `canAccessDashboardPath` false qaytarardi,
 *     sidebar bandni filtrlab tashlardi va shell URL'ga kelgan har kimni
 *     qayta yo'naltirardi. Butun modul o'lik edi. Endi barcha rollarda.
 *  2. `/dashboard/map` (Interaktiv xarita) hech qayerda yo'q edi. Endi bor.
 *  3. TASHKILOT_RAHBAR va TASHKILOT_RAHBARI bir xil ro'yxatni ikki marta
 *     takrorlardi. Endi bitta manba (`ORGANIZATION_PATHS`) va ikkala kalit
 *     ham unga ishora qiladi.
 */

/** Har bir rol ko'radigan minimal to'plam */
const ORGANIZATION_PATHS: readonly string[] = [
  "/dashboard",
  "/dashboard/tasks",
  "/dashboard/recurring-tasks",
  "/dashboard/appeals",
  "/dashboard/chat",
  "/dashboard/map",
  "/dashboard/notifications",
  "/dashboard/settings",
]

const HOKIMLIK_MASUL_PATHS: readonly string[] = [
  "/dashboard",
  "/dashboard/tasks",
  "/dashboard/recurring-tasks",
  "/dashboard/appeals",
  "/dashboard/chat",
  "/dashboard/ai-assistant",
  "/dashboard/map",
  "/dashboard/notifications",
  "/dashboard/settings",
]

const HOKIM_YORDAMCHISI_PATHS: readonly string[] = [
  "/dashboard",
  "/dashboard/tasks",
  "/dashboard/recurring-tasks",
  "/dashboard/projects",
  "/dashboard/organizations",
  "/dashboard/appeals",
  "/dashboard/chat",
  "/dashboard/ai-assistant",
  "/dashboard/analytics",
  "/dashboard/map",
  "/dashboard/notifications",
  "/dashboard/settings",
]

const HOKIM_PATHS: readonly string[] = [
  "/dashboard",
  "/dashboard/tasks",
  "/dashboard/recurring-tasks",
  "/dashboard/projects",
  "/dashboard/users",
  "/dashboard/organizations",
  "/dashboard/appeals",
  "/dashboard/chat",
  "/dashboard/ai-assistant",
  "/dashboard/analytics",
  "/dashboard/map",
  "/dashboard/notifications",
  "/dashboard/settings",
]

const ADMIN_PATHS: readonly string[] = [
  ...HOKIM_PATHS,
  "/dashboard/telegram-bot",
]

export const DASHBOARD_ROUTE_ACCESS: Record<UserRole, string[]> = {
  HOKIM: [...HOKIM_PATHS],
  HOKIM_YORDAMCHISI: [...HOKIM_YORDAMCHISI_PATHS],
  HOKIMLIK_MASUL: [...HOKIMLIK_MASUL_PATHS],
  // Ikki kalit ham bir manbadan — normalizeUserRole ikkisini
  // TASHKILOT_RAHBARI ga keltiradi, lekin backend eski kalitni
  // yuborsa ham ishlashi kerak.
  TASHKILOT_RAHBAR: [...ORGANIZATION_PATHS],
  TASHKILOT_RAHBARI: [...ORGANIZATION_PATHS],
  TASHKILOT_MASUL: [...ORGANIZATION_PATHS],
  ADMIN: [...ADMIN_PATHS],
}

/**
 * Takrorlanuvchi topshiriq YARATISH huquqi. Ko'rish huquqi hammada bor
 * (tashkilotlar o'zlariga tegishlisini ko'radi), yaratish esa faqat
 * hokimiyat tomonida.
 */
const RECURRING_TASK_AUTHORS: readonly UserRole[] = [
  "HOKIM",
  "HOKIM_YORDAMCHISI",
  "HOKIMLIK_MASUL",
  "ADMIN",
]

export function canCreateRecurringTasks(role?: UserRole | null): boolean {
  const normalized = normalizeUserRole(role)
  return normalized ? RECURRING_TASK_AUTHORS.includes(normalized) : false
}

const FALLBACK_ROLE: UserRole = "TASHKILOT_MASUL"

/**
 * Rol aniqlanmagan bo'lsa eng kam huquqli to'plam qaytariladi (fail-closed).
 * DIQQAT: chaqiruvchi tomon rol haqiqatan aniqlanganini bilishi kerak —
 * shuning uchun `isRoleResolved()` bor. Sidebar shu orqali "rolni aniqlash
 * muvaffaqiyatsiz" holatini foydalanuvchiga ko'rsatadi.
 */
export function isRoleResolved(role?: UserRole | string | null): boolean {
  return normalizeUserRole(role) !== null
}

export function getAllowedDashboardPaths(role?: UserRole | null): string[] {
  const normalizedRole = normalizeUserRole(role)
  if (!normalizedRole) return DASHBOARD_ROUTE_ACCESS[FALLBACK_ROLE]
  return DASHBOARD_ROUTE_ACCESS[normalizedRole] || DASHBOARD_ROUTE_ACCESS[FALLBACK_ROLE]
}

export function canAccessDashboardPath(role: UserRole | null | undefined, pathname: string): boolean {
  const allowedPaths = getAllowedDashboardPaths(role)

  return allowedPaths.some((allowedPath) => {
    if (allowedPath === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname === allowedPath || pathname.startsWith(`${allowedPath}/`)
  })
}

export function isDashboardNavItemActive(itemHref: string, pathname: string): boolean {
  if (itemHref === "/dashboard") {
    return pathname === "/dashboard"
  }
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`)
}

export function getFirstAllowedDashboardPath(role?: UserRole | null): string {
  return getAllowedDashboardPaths(role)[0] || "/dashboard"
}
