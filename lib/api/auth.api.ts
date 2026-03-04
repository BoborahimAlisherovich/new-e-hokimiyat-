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

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Foydalanuvchini tizimga kiritadi
 * 
 * @param pnfl - Foydalanuvchi PNFL
 * @param password - Parol
 * @returns Login javobi (tokenlar va foydalanuvchi)
 * @throws {ApiError} - Login muvaffaqiyatsiz
 * 
 * @example
 * const { user, access } = await login('12345678901234', 'password123')
 */
export async function login(
  pnflOrData: string | LoginRequest,
  password?: string
): Promise<LoginResponse> {
  const payload: LoginRequest =
    typeof pnflOrData === 'string'
      ? { login: pnflOrData, password }
      : pnflOrData

  const response = await fetchApi<LoginResponse>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  
  // Tokenlarni saqlash
  setAccessToken(response.access)
  setRefreshToken(response.refresh)
  
  // Foydalanuvchi ma'lumotlarini saqlash
  if (typeof window !== 'undefined' && response.user) {
    localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(response.user))
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
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEYS.USER)
    }
  }
}

/**
 * Joriy autentifikatsiyalangan foydalanuvchini oladi
 * 
 * @returns Joriy foydalanuvchi ma'lumotlari
 * @throws {ApiError} - Foydalanuvchi autentifikatsiyalanmagan
 * 
 * @example
 * const currentUser = await getCurrentUser()
 * console.log(currentUser.first_name)
 */
export async function getCurrentUser(): Promise<User> {
  return fetchApi<User>('/auth/me/')
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
  
  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
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
