import { UserRole } from "@/types"

export const ROLE_COLORS: Record<string, string> = {
  HOKIM: "bg-purple-100 text-purple-800 border-purple-200",
  HOKIM_YORDAMCHISI: "bg-indigo-100 text-indigo-800 border-indigo-200",
  HOKIMLIK_MASUL: "bg-blue-100 text-blue-800 border-blue-200",
  TASHKILOT_RAHBARI: "bg-green-100 text-green-800 border-green-200",
  TASHKILOT_RAHBAR: "bg-green-100 text-green-800 border-green-200", // legacy
  TASHKILOT_MASUL: "bg-gray-100 text-gray-800 border-gray-200",
  ADMIN: "bg-red-100 text-red-800 border-red-200",
}

// Users page shows a simplified 2-state "holat":
// - ACTIVE: user has logged in at least once (first_login_at exists) and not blocked/archived
// - INACTIVE: never logged in yet, or blocked/archived
export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  INACTIVE: "bg-red-100 text-red-800 border-red-200",
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
