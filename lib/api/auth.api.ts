/**
 * Authentication API Module
 * 
 * Autentifikatsiya va sessiya boshqaruvi uchun funksiyalar:
 * - Login/Logout
 * - Token yangilash
 * - Joriy foydalanuvchi ma'lumotlari
 * 
 * @module api/auth
 * @author E-Hokimiyat Development Team
 */

import type { User } from '@/types'
import type { LoginRequest, LoginResponse, TokenRefreshResponse } from './types'
import { 
  fetchApi, 
  setAccessToken, 
  setRefreshToken, 
  clearTokens,
  getRefreshToken,
  API_BASE 
} from './client'
import { TOKEN_KEYS } from './types'
import { invalidateCurrentUser, loadCurrentUser, primeCurrentUser } from '@/lib/current-user'

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Foydalanuvchini tizimga kiritadi
 * 
 * @param pnflOrData - Login yoki login payload
 * @param password - Parol
 * @returns Login javobi (tokenlar va foydalanuvchi)
 * @throws {ApiError} - Login muvaffaqiyatsiz
 * 
 * @example
 * const { user, access } = await login('admin', 'password123')
 */
export async function login(
  pnflOrData: string | LoginRequest,
  password?: string
): Promise<LoginResponse> {
  if (typeof pnflOrData === 'string' && !password) {
    throw new Error('Parol kiritilishi shart')
  }

  const payload: LoginRequest =
    typeof pnflOrData === 'string'
      ? { login: pnflOrData, password: password as string }
      : pnflOrData

  const response = await fetchApi<LoginResponse>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  
  // Tokenlarni saqlash
  setAccessToken(response.access)
  setRefreshToken(response.refresh)
  
  // Sessiya almashdi — eski `/auth/me` keshi yaroqsiz
  invalidateCurrentUser()

  // Foydalanuvchi ma'lumotlarini saqlash. Login javobi allaqachon
  // foydalanuvchini qaytaradi, shuning uchun uni keshga yozamiz va
  // dashboard ochilganda qo'shimcha `/auth/me` so'rovi ketmaydi.
  if (response.user) {
    primeCurrentUser(response.user)
  }

  return response
}

/**
 * Foydalanuvchini tizimdan chiqaradi
 * 
 * Backend ga logout so'rovi yuboradi va barcha tokenlarni tozalaydi.
 * 
 * @example
 * await logout()
 * // Foydalanuvchi login sahifasiga yo'naltiriladi
 */
export async function logout(): Promise<void> {
  try {
    await fetchApi('/auth/logout/', { method: 'POST' })
  } catch {
    // Logout xatosini e'tiborsiz qoldirish
  } finally {
    clearTokens()
    invalidateCurrentUser()

    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEYS.USER)
    }
  }
}

/**
 * Joriy autentifikatsiyalangan foydalanuvchini oladi.
 *
 * MUHIM: bu funksiya `lib/current-user.ts` dagi umumiy kesh orqali ishlaydi.
 * Bir vaqtda kelgan chaqiruvlar bitta `/auth/me` so'rovini bo'lishadi va
 * qisqa TTL ichida takroriy chaqiruv tarmoqqa chiqmaydi. Ilgari bu oddiy
 * `fetch` edi va har sahifa yuklanishida 3 ta bir xil so'rov ketardi.
 *
 * Yangi kodda `useCurrentUser()` (React kontekst) ni afzal ko'ring.
 *
 * @returns Joriy foydalanuvchi ma'lumotlari
 * @throws {ApiError} - Foydalanuvchi autentifikatsiyalanmagan
 */
export async function getCurrentUser(): Promise<User> {
  return loadCurrentUser()
}

/** Keshni chetlab o'tib, foydalanuvchini majburan qayta o'qiydi */
export async function refetchCurrentUser(): Promise<User> {
  return loadCurrentUser({ force: true })
}

/**
 * Access token ni refresh token orqali yangilaydi
 * 
 * @returns Yangi access token
 * @throws {ApiError} - Token yangilash muvaffaqiyatsiz
 * 
 * @example
 * const { access } = await refreshToken()
 * setAccessToken(access)
 */
export async function refreshToken(): Promise<TokenRefreshResponse> {
  const refresh = getRefreshToken()
  
  if (!refresh) {
    throw new Error('Refresh token mavjud emas')
  }
  
  const response = await fetch(`${API_BASE}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  
  if (!response.ok) {
    clearTokens()
    throw new Error('Token yangilash muvaffaqiyatsiz')
  }
  
  const data: TokenRefreshResponse = await response.json()
  setAccessToken(data.access)
  
  return data
}
