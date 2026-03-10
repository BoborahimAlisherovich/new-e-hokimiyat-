import type { UserRole } from "@/types"
import { normalizeUserRole } from "@/lib/role-utils"

export const DASHBOARD_ROUTE_ACCESS: Record<UserRole, string[]> = {
  HOKIM: [
    "/dashboard",
    "/dashboard/tasks",
    "/dashboard/users",
    "/dashboard/organizations",
    "/dashboard/notifications",
    "/dashboard/appeals",
    "/dashboard/analytics",
    "/dashboard/chat",
    "/dashboard/ai-assistant",
    "/dashboard/settings",
  ],
  HOKIM_YORDAMCHISI: [
    "/dashboard",
    "/dashboard/tasks",
    "/dashboard/users",
    "/dashboard/organizations",
    "/dashboard/notifications",
    "/dashboard/appeals",
    "/dashboard/analytics",
    "/dashboard/chat",
    "/dashboard/ai-assistant",
    "/dashboard/settings",
  ],
  HOKIMLIK_MASUL: [
    "/dashboard",
    "/dashboard/tasks",
    "/dashboard/users",
    "/dashboard/organizations",
    "/dashboard/notifications",
    "/dashboard/appeals",
    "/dashboard/analytics",
    "/dashboard/chat",
    "/dashboard/ai-assistant",
    "/dashboard/settings",
  ],
  TASHKILOT_RAHBAR: [
    "/dashboard",
    "/dashboard/tasks",
    "/dashboard/users",
    "/dashboard/notifications",
    "/dashboard/appeals",
    "/dashboard/chat",
    "/dashboard/settings",
  ],
  TASHKILOT_RAHBARI: [
    "/dashboard",
    "/dashboard/tasks",
    "/dashboard/users",
    "/dashboard/notifications",
    "/dashboard/appeals",
    "/dashboard/chat",
    "/dashboard/settings",
  ],
  TASHKILOT_MASUL: [
    "/dashboard",
    "/dashboard/tasks",
    "/dashboard/notifications",
    "/dashboard/chat",
    "/dashboard/settings",
  ],
  ADMIN: [
    "/dashboard",
    "/dashboard/tasks",
    "/dashboard/users",
    "/dashboard/organizations",
    "/dashboard/notifications",
    "/dashboard/appeals",
    "/dashboard/analytics",
    "/dashboard/chat",
    "/dashboard/ai-assistant",
    "/dashboard/telegram-bot",
    "/dashboard/settings",
  ],
}

const FALLBACK_ROLE: UserRole = "TASHKILOT_MASUL"

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
