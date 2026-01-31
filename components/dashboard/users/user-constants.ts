import { UserRole, UserStatus } from "@/types"

export const ROLE_COLORS: Record<UserRole, string> = {
  HOKIM: "bg-purple-100 text-purple-800 border-purple-200",
  HOKIMLIK_MASUL: "bg-blue-100 text-blue-800 border-blue-200",
  TASHKILOT_RAHBAR: "bg-green-100 text-green-800 border-green-200",
  TASHKILOT_MASUL: "bg-gray-100 text-gray-800 border-gray-200",
  ADMIN: "bg-red-100 text-red-800 border-red-200",
}

export const STATUS_COLORS: Record<UserStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  INACTIVE: "bg-red-100 text-red-800 border-red-200",
  BLOCKED: "bg-yellow-100 text-yellow-800 border-yellow-200",
}

export const ROLE_LABELS: Record<UserRole, string> = {
  HOKIM: "Ҳоким",
  HOKIMLIK_MASUL: "Ҳокимлик масъули",
  TASHKILOT_RAHBAR: "Ташкилот раҳбари",
  TASHKILOT_MASUL: "Ташкилот масъули",
  ADMIN: "Администратор",
}

export const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Актив",
  INACTIVE: "Нофаол",
  BLOCKED: "Блокланган",
}
