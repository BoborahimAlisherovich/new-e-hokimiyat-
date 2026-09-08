import type { UserRole } from "@/types"

const KNOWN_ROLES: readonly UserRole[] = [
  "HOKIM",
  "HOKIM_YORDAMCHISI",
  "HOKIMLIK_MASUL",
  "TASHKILOT_RAHBAR",
  "TASHKILOT_RAHBARI",
  "TASHKILOT_MASUL",
  "ADMIN",
] as const

const ROLE_ALIASES: Record<string, UserRole> = {
  // Canonicals
  HOKIM: "HOKIM",
  HOKIM_YORDAMCHISI: "HOKIM_YORDAMCHISI",
  HOKIMLIK_MASUL: "HOKIMLIK_MASUL",
  TASHKILOT_RAHBAR: "TASHKILOT_RAHBARI",
  TASHKILOT_RAHBARI: "TASHKILOT_RAHBARI",
  TASHKILOT_MASUL: "TASHKILOT_MASUL",
  ADMIN: "ADMIN",

  // Common backend/UI variations
  HOKIMLIK_MASULI: "HOKIMLIK_MASUL",
  TASHKILOT_MASULI: "TASHKILOT_MASUL",
}

export function normalizeUserRole(role?: UserRole | string | null): UserRole | null {
  if (!role) return null

  const raw = String(role).trim()
  if (!raw) return null

  const key = raw
    .toUpperCase()
    .replace(/[’']/g, "") // strip apostrophes
    .replace(/[\s-]+/g, "_") // spaces/hyphens -> underscore
    .replace(/_+/g, "_") // collapse multiple underscores

  const aliased = ROLE_ALIASES[key]
  if (aliased) return aliased

  if ((KNOWN_ROLES as readonly string[]).includes(key)) {
    return key as UserRole
  }

  return null
}

export function isOrganizationRole(role?: UserRole | string | null): boolean {
  const normalizedRole = normalizeUserRole(role)
  return normalizedRole === "TASHKILOT_RAHBARI" || normalizedRole === "TASHKILOT_MASUL"
}
