/**
 * OneID API integratsiyasi.
 * 
 * Ushbu modul OneID tizimi bilan ishlash uchun kerakli API funksiyalarini o'z ichiga oladi.
 */

import { api } from './client'

export interface OneIDLoginRequest {
  pnfl: string
  redirect_uri?: string
}

export interface OneIDLoginResponse {
  success: boolean
  authorization_url?: string
  state?: string
  session_id?: string
  error?: string
}

export interface OneIDCallbackParams {
  code?: string
  state?: string
  error?: string
  error_description?: string
}

export interface OneIDTokenRefreshRequest {
  refresh_token: string
}

export interface OneIDTokenRefreshResponse {
  success: boolean
  access_token?: string
  expires_in?: number
  error?: string
}

export interface OneIDStatusResponse {
  connected: boolean
  oneid_user_id?: string
  expires_at?: string
  is_expired?: boolean
  session_id?: string
  message?: string
}

export interface OneIDSyncResponse {
  success: boolean
  changed?: boolean
  message?: string
  error?: string
}

/**
 * OneID orqali login boshlash.
 */
export async function oneidLogin(data: OneIDLoginRequest): Promise<OneIDLoginResponse> {
  const response = await api.post<OneIDLoginResponse>('/oneid/auth/login/', data)
  return response.data
}

/**
 * OneID token yangilash.
 */
export async function refreshOneIDToken(data: OneIDTokenRefreshRequest): Promise<OneIDTokenRefreshResponse> {
  const response = await api.post<OneIDTokenRefreshResponse>('/oneid/auth/refresh/', data)
  return response.data
}

/**
 * OneID orqali chiqish.
 */
export async function oneidLogout(): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await api.post<{ success: boolean; message?: string; error?: string }>('/oneid/auth/logout/')
  return response.data
}

/**
 * Foydalanuvchining OneID statusini olish.
 */
export async function getOneIDStatus(): Promise<OneIDStatusResponse> {
  const response = await api.get<OneIDStatusResponse>('/oneid/status/status/')
  return response.data
}

/**
 * OneID dan ma'lumotlarni qayta sinxronizatsiya qilish.
 */
export async function syncOneIDData(): Promise<OneIDSyncResponse> {
  const response = await api.post<OneIDSyncResponse>('/oneid/status/sync_data/')
  return response.data
}

/**
 * OneID callback URL ni qurish.
 */
export function buildOneIDCallbackUrl(): string {
  const baseUrl = window.location.origin
  return `${baseUrl}/login/callback`
}

/**
 * URL dan OneID callback parametrlarini olish.
 */
export function parseOneIDCallback(url: string): OneIDCallbackParams {
  const urlObj = new URL(url)
  const params: OneIDCallbackParams = {}
  
  params.code = urlObj.searchParams.get('code') || undefined
  params.state = urlObj.searchParams.get('state') || undefined
  params.error = urlObj.searchParams.get('error') || undefined
  params.error_description = urlObj.searchParams.get('error_description') || undefined
  
  return params
}

/**
 * OneID sessiya ma'lumotlarini localStorage ga saqlash.
 */
export function storeOneIDSession(sessionData: {
  session_id: string
  state: string
  pnfl: string
}): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('oneid_session', JSON.stringify(sessionData))
  }
}

/**
 * OneID sessiya ma'lumotlarini localStorage dan olish.
 */
export function getOneIDSession(): {
  session_id: string
  state: string
  pnfl: string
} | null {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('oneid_session')
    return data ? JSON.parse(data) : null
  }
  return null
}

/**
 * OneID sessiya ma'lumotlarini localStorage dan o'chirish.
 */
export function clearOneIDSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('oneid_session')
  }
}
