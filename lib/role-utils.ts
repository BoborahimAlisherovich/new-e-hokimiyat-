import type { UserRole } from "@/types"

const ROLE_ALIAS_MAP: Partial<Record<UserRole, UserRole>> = {
  TASHKILOT_RAHBAR: "TASHKILOT_RAHBARI",
}

export function normalizeUserRole(role?: UserRole | string | null): UserRole | null {
  if (!role) return null
  const typedRole = role as UserRole
  return ROLE_ALIAS_MAP[typedRole] || typedRole
}

export function isOrganizationRole(role?: UserRole | string | null): boolean {
  const normalizedRole = normalizeUserRole(role)
  return normalizedRole === "TASHKILOT_RAHBARI" || normalizedRole === "TASHKILOT_MASUL"
}
