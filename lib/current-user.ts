/**
 * Joriy foydalanuvchi uchun yagona manba (single source of truth).
 *
 * MUAMMO: `getCurrentUser()` oddiy `fetch` edi — dashboard-shell, header va
 * sidebar uni bir vaqtda chaqirar edi, natijada har sahifa yuklanishida
 * 3 ta parallel `/auth/me` so'rovi ketardi, ustiga har 15 sekundda yana bittasi.
 *
 * YECHIM: bitta "in-flight" promise + qisqa TTL kesh. Bir vaqtda kelgan
 * chaqiruvlar bir xil promise'ni kutadi; TTL ichida takroriy chaqiruv
 * tarmoqqa chiqmaydi. Login/logout `invalidateCurrentUser()` bilan keshni
 * tozalaydi, shuning uchun sessiya almashganda eski foydalanuvchi qolmaydi.
 */

import type { User } from "@/types"
import { fetchApi } from "@/lib/api/client"
import { TOKEN_KEYS } from "@/lib/api/types"

/** Kesh muddati — navigatsiya paytida takroriy so'rovni to'xtatish uchun yetarli */
const TTL_MS = 60_000

let cachedUser: User | null = null
let cachedAt = 0
let inFlight: Promise<User> | null = null

function persist(user: User): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user))
  } catch {
    // kvota to'lgan bo'lsa jim o'tamiz — kesh ixtiyoriy
  }
}

/** localStorage'dagi oxirgi ma'lum foydalanuvchi (faqat zaxira sifatida) */
export function getCachedUserFromStorage(): User | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(TOKEN_KEYS.USER)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    localStorage.removeItem(TOKEN_KEYS.USER)
    return null
  }
}

/** Keshdagi foydalanuvchi — tarmoqqa chiqmasdan (birinchi render uchun) */
export function peekCurrentUser(): User | null {
  if (cachedUser && Date.now() - cachedAt < TTL_MS) return cachedUser
  return null
}

/**
 * Joriy foydalanuvchini oladi. Bir vaqtda kelgan chaqiruvlar bitta
 * so'rovni bo'lishadi.
 *
 * @param force - keshni chetlab o'tib, majburan qayta o'qish
 */
export function loadCurrentUser(options?: { force?: boolean }): Promise<User> {
  const force = options?.force === true

  if (!force && cachedUser && Date.now() - cachedAt < TTL_MS) {
    return Promise.resolve(cachedUser)
  }

  if (!force && inFlight) return inFlight

  const request = fetchApi<User>("/auth/me/")
    .then((user) => {
      cachedUser = user
      cachedAt = Date.now()
      persist(user)
      return user
    })
    .finally(() => {
      if (inFlight === request) inFlight = null
    })

  inFlight = request
  return request
}

/** Login/logout va profil tahriridan keyin chaqirilishi shart */
export function invalidateCurrentUser(): void {
  cachedUser = null
  cachedAt = 0
  inFlight = null
}

/** Login javobidagi foydalanuvchini keshga yozadi — qo'shimcha `/auth/me` kerak emas */
export function primeCurrentUser(user: User): void {
  cachedUser = user
  cachedAt = Date.now()
  inFlight = null
  persist(user)
}
