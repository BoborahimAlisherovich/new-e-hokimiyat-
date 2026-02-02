import { UserRole } from "@/types"

export const ROLE_COLORS: Record<string, string> = {
  HOKIM: "bg-purple-100 text-purple-800 border-purple-200",
  HOKIMLIK_MASUL: "bg-blue-100 text-blue-800 border-blue-200",
  TASHKILOT_RAHBARI: "bg-green-100 text-green-800 border-green-200",
  TASHKILOT_RAHBAR: "bg-green-100 text-green-800 border-green-200", // legacy
  TASHKILOT_MASUL: "bg-gray-100 text-gray-800 border-gray-200",
  ADMIN: "bg-red-100 text-red-800 border-red-200",
}

// Backend status values: DRAFT, KUTILMOQDA, FAOL, BLOKLANGAN, ARXIV
export const STATUS_COLORS: Record<string, string> = {
  // Backend statuses
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  KUTILMOQDA: "bg-yellow-100 text-yellow-800 border-yellow-200",
  FAOL: "bg-green-100 text-green-800 border-green-200",
  BLOKLANGAN: "bg-red-100 text-red-800 border-red-200",
  ARXIV: "bg-gray-100 text-gray-600 border-gray-200",
  // Legacy frontend statuses
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  INACTIVE: "bg-red-100 text-red-800 border-red-200",
  BLOCKED: "bg-yellow-100 text-yellow-800 border-yellow-200",
}

export const ROLE_LABELS: Record<string, string> = {
  HOKIM: "Hokim",
  HOKIMLIK_MASUL: "Hokimlik mas'uli",
  TASHKILOT_RAHBARI: "Tashkilot rahbari",
  TASHKILOT_RAHBAR: "Tashkilot rahbari", // legacy
  TASHKILOT_MASUL: "Tashkilot mas'uli",
  ADMIN: "Administrator",
}

export const STATUS_LABELS: Record<string, string> = {
  // Backend statuses
  DRAFT: "Qoralama",
  KUTILMOQDA: "Kutilmoqda",
  FAOL: "Faol",
  BLOKLANGAN: "Bloklangan",
  ARXIV: "Arxiv",
  // Legacy frontend statuses
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  BLOCKED: "Bloklangan",
}

// Helper to get status key from user object
export function getUserStatusKey(user: any): string {
  return user.status || 'DRAFT'
}
