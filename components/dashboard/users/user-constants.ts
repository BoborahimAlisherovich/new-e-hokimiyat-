import { UserRole } from "@/types"

export const ROLE_COLORS: Record<string, string> = {
  HOKIM: "bg-[var(--st-tekshiruvda-bg)] text-[var(--st-tekshiruvda-fg)] border-border",
  HOKIM_YORDAMCHISI: "bg-primary-soft text-primary-soft-foreground border-border",
  HOKIMLIK_MASUL: "bg-primary-soft text-primary-soft-foreground border-border",
  TASHKILOT_RAHBARI: "bg-success-soft text-success-soft-foreground border-border",
  TASHKILOT_RAHBAR: "bg-success-soft text-success-soft-foreground border-border", // legacy
  TASHKILOT_MASUL: "bg-muted text-foreground border-border",
  ADMIN: "bg-destructive-soft text-destructive-soft-foreground border-border",
}

// Users page shows a simplified 2-state "holat":
// - ACTIVE: user has logged in at least once (first_login_at exists) and not blocked/archived
// - INACTIVE: never logged in yet, or blocked/archived
export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-success-soft text-success-soft-foreground border-border",
  INACTIVE: "bg-destructive-soft text-destructive-soft-foreground border-border",
}

export const ROLE_LABELS: Record<string, string> = {
  HOKIM: "Hokim",
  HOKIM_YORDAMCHISI: "Hokim o'rinbosari",
  HOKIMLIK_MASUL: "Hokimlik mutaxassisi",
  TASHKILOT_RAHBARI: "Tashkilot rahbari",
  TASHKILOT_RAHBAR: "Tashkilot rahbari", // legacy
  TASHKILOT_MASUL: "Tashkilot mas'uli",
  ADMIN: "Administrator",
}

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Faol",
  INACTIVE: "Faol emas",
}

// Helper to get status key from user object
export function getUserStatusKey(user: any): string {
  const backendStatus = String(user?.status || "")
  if (backendStatus === "BLOKLANGAN" || backendStatus === "ARXIV") return "INACTIVE"

  const hasLoggedIn =
    Boolean(user?.first_login_at) ||
    Boolean(user?.activated_at) ||
    Boolean(user?.last_login)

  return hasLoggedIn ? "ACTIVE" : "INACTIVE"
}
