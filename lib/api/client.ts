/**
 * API Client Module
 * 
 * Bu modul API bilan aloqa qilish uchun asosiy vositalarni taqdim etadi:
 * - Token boshqaruvi (access, refresh)
 * - Fetch wrapper avtomatik error handling bilan
 * - Query string builder
 * - Axios-uslubidagi API obyekti
 * 
 * @module api/client
 * @author E-Hokimiyat Development Team
 */

import type { TokenRefreshResponse } from '@/types'
import type { QueryParams, ApiErrorDetails } from './types'
import { TOKEN_KEYS, HTTP_STATUS } from './types'

// ============================================================================
// Configuration
// ============================================================================

/**
 * API base URL ni aniqlaydi muhit va domain asosida
 */
function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL
  if (configured) {
    const normalized = normalizeApiBaseUrl(configured)

    // In the browser, prefer same-origin proxy to avoid CORS/mixed-content issues.
    if (typeof window !== 'undefined') {
      try {
        const configuredUrl = new URL(normalized, window.location.origin)
        if (configuredUrl.origin !== window.location.origin) {
          return '/api'
        }
      } catch {
        // If URL parsing fails, fall back to the proxy.
        return '/api'
      }
    }

    return normalized
  }
  
  if (typeof window !== 'undefined') {
    const { hostname } = window.location
    
    if (hostname === 'gameroom.uz') {
      return 'https://api.gameroom.uz/api'
    }
    
    if (hostname === 'pytech.uz' || hostname === 'www.pytech.uz') {
      return 'https://api.pytech.uz/api'
    }
  }
  
  return '/api'
}

/** API Base URL */
export const API_BASE = resolveApiBaseUrl()

function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return '/api'
  if (trimmed === '/api') return '/api'
  if (trimmed.endsWith('/api')) return trimmed
  return `${trimmed}/api`
}

function resolveWsBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    const raw = process.env.NEXT_PUBLIC_WS_URL.trim().replace(/\/+$/, '')
    // Some deployments configure WS url as `wss://host/ws`. Our code appends `/ws/...`,
    // so normalize to base host to avoid `/ws/ws/...` duplication.
    return raw.replace(/\/ws\/?$/, '')
  }

  const configuredApi = process.env.NEXT_PUBLIC_API_URL
  if (configuredApi) {
    const httpBase = normalizeApiBaseUrl(configuredApi)
    const baseNoApi = httpBase.replace(/\/api\/?$/, '')
    if (baseNoApi.startsWith('http')) {
      return baseNoApi.replace(/^http/, 'ws').replace(/\/ws\/?$/, '')
    }
  }

  if (typeof window !== 'undefined') {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.hostname
    if (host === 'gameroom.uz') return 'wss://api.gameroom.uz'
    if (host === 'pytech.uz' || host === 'www.pytech.uz') return 'wss://api.pytech.uz'
    return `${wsProtocol}://${host}:8000`
  }

  return ''
}

/** WebSocket Base URL (no `/api` suffix) */
export const WS_BASE = resolveWsBaseUrl()

// ============================================================================
// Token Management
// ============================================================================

/** Xotiradagi access token (tezkor kirish uchun) */
let cachedAccessToken: string | null = null

function setCookieItem(key: string, value: string | null): void {
  if (typeof document === 'undefined') return

  const encodedKey = encodeURIComponent(key)
  if (value !== null) {
    const encodedValue = encodeURIComponent(value)
    document.cookie = `${encodedKey}=${encodedValue}; path=/; SameSite=Lax`
    return
  }

  document.cookie = `${encodedKey}=; path=/; Max-Age=0; SameSite=Lax`
}

/**
 * LocalStorage dan qiymat oladi (SSR-safe)
 */
function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(key)
}

/**
 * LocalStorage ga qiymat saqlaydi (SSR-safe)
 */
function setStorageItem(key: string, value: string | null): void {
  if (typeof window === 'undefined') return
  
  if (value !== null) {
    localStorage.setItem(key, value)
  } else {
    localStorage.removeItem(key)
  }

  setCookieItem(key, value)
}

/**
 * Access token ni oladi
 */
export function getAccessToken(): string | null {
  if (cachedAccessToken) return cachedAccessToken
  cachedAccessToken = getStorageItem(TOKEN_KEYS.ACCESS)
  return cachedAccessToken
}

/**
 * Access token ni saqlaydi
 */
export function setAccessToken(token: string | null): void {
  cachedAccessToken = token
  setStorageItem(TOKEN_KEYS.ACCESS, token)
}

/**
 * Refresh token ni oladi
 */
export function getRefreshToken(): string | null {
  return getStorageItem(TOKEN_KEYS.REFRESH)
}

/**
 * Refresh token ni saqlaydi
 */
export function setRefreshToken(token: string | null): void {
  setStorageItem(TOKEN_KEYS.REFRESH, token)
}

/**
 * Barcha tokenlarni tozalaydi (logout uchun)
 */
export function clearTokens(): void {
  cachedAccessToken = null
  setStorageItem(TOKEN_KEYS.ACCESS, null)
  setStorageItem(TOKEN_KEYS.REFRESH, null)
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * API xatosi klassi
 * 
 * HTTP xatolarini ifodalash uchun ishlatiladi.
 * Status code va qo'shimcha ma'lumotlarni saqlaydi.
 */
export class ApiError extends Error {
  readonly status: number
  readonly data: ApiErrorDetails

  constructor(message: string, status: number, data: ApiErrorDetails = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  /** Xato 401 Unauthorized ekanligini tekshiradi */
  isUnauthorized(): boolean {
    return this.status === HTTP_STATUS.UNAUTHORIZED
  }

  /** Xato 404 Not Found ekanligini tekshiradi */
  isNotFound(): boolean {
    return this.status === HTTP_STATUS.NOT_FOUND
  }
}

// ============================================================================
// Token Refresh
// ============================================================================

/**
 * Access token ni yangilashga harakat qiladi
 */
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  
  try {
    const response = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    })
    
    if (!response.ok) return false
    
    const data: TokenRefreshResponse = await response.json()
    setAccessToken(data.access)
    return true
  } catch {
    return false
  }
}

/**
 * Foydalanuvchini login sahifasiga yo'naltiradi
 */
function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Response body ni parse qiladi
 */
async function parseResponseBody(response: Response): Promise<ApiErrorDetails> {
  try {
    const text = await response.text()
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

/**
 * Xato xabarini oladi response dan
 * Django ValidationError field-level xatolarini ham qo'llab-quvvatlaydi
 */
function extractErrorMessage(data: ApiErrorDetails, status: number): string {
  // Standard Django error messages
  if (data.detail) return data.detail
  if (data.message) return data.message
  
  // Handle Django serializer field-level validation errors
  // Format: { "field_name": ["error message"] } or { "field_name": "error message" }
  const fieldErrors = Object.entries(data)
    .filter(([key]) => !['detail', 'message', 'status_code'].includes(key))
    .map(([field, errors]) => {
      const errorMsg = Array.isArray(errors) ? errors.join(', ') : String(errors)
      return `${field}: ${errorMsg}`
    })
  
  if (fieldErrors.length > 0) {
    return fieldErrors.join('; ')
  }
  
  return `So'rov muvaffaqiyatsiz: ${status}`
}

// ============================================================================
// Main Fetch Function
// ============================================================================

/**
 * API so'rovlarini yuborish uchun asosiy funksiya
 * 
 * Xususiyatlari:
 * - Avtomatik authorization header
 * - 401 xatoda token yangilash va qayta urinish
 * - FormData qo'llab-quvvatlashi
 * - Xatolarni ApiError sifatida qaytarish
 * 
 * @template T - Javob turi
 * @param endpoint - API endpoint (/bilan boshlanadi)
 * @param options - Fetch options
 * @throws {ApiError} - HTTP xatosi
 * 
 * @example
 * const users = await fetchApi<User[]>('/users/')
 */
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken()
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const hasBody = options.body !== undefined && options.body !== null

  const headers: Record<string, string> = {
    ...(!isFormData && hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  }

  if (isFormData) {
    delete headers['Content-Type']
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
 
  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    })
  } catch (error) {
    throw new ApiError(
      `API bilan bog'lanib bo'lmadi: ${String(error)}`,
      0,
      { url: `${API_BASE}${endpoint}` }
    )
  }

  // 401 Unauthorized - token yangilashga urinish
  if (response.status === HTTP_STATUS.UNAUTHORIZED) {
    const refreshed = await tryRefreshToken()
    
    if (refreshed) {
      const newToken = getAccessToken()
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`
      }
      
      let retryResponse: Response
      try {
        retryResponse = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        })
      } catch (error) {
        throw new ApiError(
          `API bilan bog'lanib bo'lmadi: ${String(error)}`,
          0,
          { url: `${API_BASE}${endpoint}` }
        )
      }
      
      if (!retryResponse.ok) {
        const errorData = await parseResponseBody(retryResponse)
        throw new ApiError(
          extractErrorMessage(errorData, retryResponse.status),
          retryResponse.status,
          errorData
        )
      }
      
      if (retryResponse.status === HTTP_STATUS.NO_CONTENT) {
        return {} as T
      }
      
      return retryResponse.json()
    }
    
    clearTokens()
    redirectToLogin()
    throw new ApiError('Sessiya muddati tugadi', HTTP_STATUS.UNAUTHORIZED)
  }

  // Boshqa xatolar
  if (!response.ok) {
    if (response.status === HTTP_STATUS.NOT_FOUND && endpoint.includes('/settings/')) {
      return {} as T
    }
    
    const errorData = await parseResponseBody(response)
    throw new ApiError(
      extractErrorMessage(errorData, response.status),
      response.status,
      errorData
    )
  }

  if (response.status === HTTP_STATUS.NO_CONTENT) {
    return {} as T
  }

  return response.json()
}

// ============================================================================
// Query Builder
// ============================================================================

/**
 * Query parametrlarini URL query string ga aylantiradi
 * 
 * @example
 * buildQueryString({ page: 1, search: 'test' }) // '?page=1&search=test'
 */
export function buildQueryString(params: QueryParams): string {
  const searchParams = new URLSearchParams()
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  }
  
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

// ============================================================================
// Axios-like API Object
// ============================================================================

/**
 * Axios-uslubidagi API wrapper
 * 
 * @example
 * const { data } = await api.get<User[]>('/users/')
 */
export const api = {
  async get<T = unknown>(
    url: string, 
    config?: { params?: QueryParams }
  ): Promise<{ data: T }> {
    const queryString = config?.params ? buildQueryString(config.params) : ''
    const data = await fetchApi<T>(`${url}${queryString}`)
    return { data }
  },

  async post<T = unknown>(url: string, body?: unknown): Promise<{ data: T }> {
    const data = await fetchApi<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return { data }
  },

  async put<T = unknown>(url: string, body?: unknown): Promise<{ data: T }> {
    const data = await fetchApi<T>(url, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return { data }
  },

  async patch<T = unknown>(url: string, body?: unknown): Promise<{ data: T }> {
    const data = await fetchApi<T>(url, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return { data }
  },

  async delete<T = unknown>(url: string): Promise<{ data: T }> {
    const data = await fetchApi<T>(url, { method: 'DELETE' })
    return { data }
  },

  async postFormData<T = unknown>(url: string, formData: FormData): Promise<{ data: T }> {
    const data = await fetchApi<T>(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    return { data }
  },
} as const
