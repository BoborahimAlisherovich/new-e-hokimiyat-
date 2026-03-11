import type { UserRole } from "@/types"
import { normalizeUserRole } from "@/lib/role-utils"

export type SettingsTabKey =
  | "profile"
  | "notifications"
  | "security"
  | "appearance"
  | "sectors"

const SETTINGS_ACCESS_BY_ROLE: Record<UserRole, SettingsTabKey[]> = {
  ADMIN: ["profile", "notifications", "security", "appearance", "sectors"],
  HOKIM: ["profile", "notifications", "security", "appearance", "sectors"],
  HOKIM_YORDAMCHISI: ["profile", "notifications", "security", "appearance", "sectors"],
  HOKIMLIK_MASUL: ["profile", "notifications", "security", "appearance", "sectors"],
  TASHKILOT_RAHBAR: ["profile", "notifications", "security", "appearance"],
  TASHKILOT_RAHBARI: ["profile", "notifications", "security", "appearance"],
  TASHKILOT_MASUL: ["profile", "notifications", "security", "appearance"],
}

const FALLBACK_TABS: SettingsTabKey[] = ["profile", "notifications", "security", "appearance"]

export function getAllowedSettingsTabs(role?: UserRole | null): SettingsTabKey[] {
  const normalizedRole = normalizeUserRole(role)
  if (!normalizedRole) return FALLBACK_TABS
  return SETTINGS_ACCESS_BY_ROLE[normalizedRole] || FALLBACK_TABS
}

export function canAccessSettingsTab(role: UserRole | null | undefined, tab: SettingsTabKey): boolean {
  return getAllowedSettingsTabs(role).includes(tab)
}
