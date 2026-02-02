/**
 * Users API Module
 * 
 * Foydalanuvchilarni boshqarish uchun funksiyalar:
 * - CRUD operatsiyalari
 * - Bloklash/Arxivlash
 * - Statistika
 * - Profil yangilash
 * 
 * @module api/users
 * @author E-Hokimiyat Development Team
 */

import type { User, UserFilters, UserCreateInput, UserUpdateInput, PaginatedResponse } from '@/types'
import { fetchApi, buildQueryString, ApiError } from './client'
import { TOKEN_KEYS } from './types'

// ============================================================================
// User CRUD Operations
// ============================================================================

/**
 * Foydalanuvchilar ro'yxatini oladi
 * 
 * @param filters - Filtrlash parametrlari
 * @param page - Sahifa raqami (default: 1)
 * @param pageSize - Sahifa o'lchami (default: 500)
 * @returns Foydalanuvchilar ro'yxati
 * 
 * @example
 * const users = await getUsers({ role: 'ADMIN' }, 1, 50)
 */
export async function getUsers(
  filters?: UserFilters,
  page = 1,
  pageSize = 500
): Promise<User[]> {
  const params = { 
    ...filters, 
    limit: pageSize, 
    offset: (page - 1) * pageSize 
  }
  const queryString = buildQueryString(params)
  const response = await fetchApi<PaginatedResponse<User>>(`/users/${queryString}`)
  
  return response.results || []
}

/**
 * Bitta foydalanuvchini ID bo'yicha oladi
 * 
 * @param id - Foydalanuvchi ID
 * @returns Foydalanuvchi ma'lumotlari
 * @throws {ApiError} - Foydalanuvchi topilmadi
 */
export async function getUserById(id: number | string): Promise<User> {
  return fetchApi<User>(`/users/${id}/`)
}

/**
 * Yangi foydalanuvchi yaratadi
 * 
 * @param data - Foydalanuvchi ma'lumotlari
 * @returns Yaratilgan foydalanuvchi
 * @throws {ApiError} - Yaratish muvaffaqiyatsiz
 */
export async function createUser(data: UserCreateInput): Promise<User> {
  return fetchApi<User>('/users/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Mavjud foydalanuvchini yangilaydi
 * 
 * @param id - Foydalanuvchi ID
 * @param data - Yangilanadigan ma'lumotlar
 * @returns Yangilangan foydalanuvchi
 */
export async function updateUser(id: number | string, data: UserUpdateInput): Promise<User> {
  return fetchApi<User>(`/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Foydalanuvchini o'chiradi
 * 
 * @param id - Foydalanuvchi ID
 */
export async function deleteUser(id: number | string): Promise<void> {
  return fetchApi<void>(`/users/${id}/`, { method: 'DELETE' })
}

// ============================================================================
// User Status Actions
// ============================================================================

/**
 * Foydalanuvchini bloklaydi
 * 
 * Bloklangan foydalanuvchi tizimga kira olmaydi.
 * 
 * @param id - Foydalanuvchi ID
 * @returns Yangilangan foydalanuvchi
 */
export async function blockUser(id: number | string): Promise<User> {
  return fetchApi<User>(`/users/${id}/block/`, { method: 'PATCH' })
}

/**
 * Foydalanuvchi blokini olib tashlaydi
 * 
 * @param id - Foydalanuvchi ID
 * @returns Yangilangan foydalanuvchi
 */
export async function unblockUser(id: number | string): Promise<User> {
  return fetchApi<User>(`/users/${id}/unblock/`, { method: 'PATCH' })
}

/**
 * Foydalanuvchini arxivlaydi
 * 
 * Arxivlangan foydalanuvchi tizimda ko'rinmaydi.
 * 
 * @param id - Foydalanuvchi ID
 * @returns Yangilangan foydalanuvchi
 */
export async function archiveUser(id: number | string): Promise<User> {
  return fetchApi<User>(`/users/${id}/archive/`, { method: 'PATCH' })
}

// ============================================================================
// User Statistics & Profile
// ============================================================================

/** Foydalanuvchi statistikasi interfeysi */
export interface UserStatistics {
  tasksAssigned: number
  tasksCompleted: number
  tasksInProgress: number
  tasksOverdue: number
  completionRate: number
  averageCompletionTime: number
}

/**
 * Foydalanuvchi statistikasini oladi
 * 
 * @param id - Foydalanuvchi ID
 * @returns Statistika ma'lumotlari
 */
export async function getUserStatistics(id: number | string): Promise<UserStatistics> {
  return fetchApi<UserStatistics>(`/users/${id}/statistics/`)
}

/** Profil yangilash ma'lumotlari */
export interface ProfileUpdateInput {
  first_name?: string
  last_name?: string
  middle_name?: string
  phone?: string
  email?: string
}

/**
 * Joriy foydalanuvchi profilini yangilaydi
 * 
 * @param data - Yangilanadigan ma'lumotlar
 * @param userId - Foydalanuvchi ID (ixtiyoriy, agar berilmasa localStorage dan olinadi)
 * @returns Yangilangan foydalanuvchi
 * @throws {ApiError} - Foydalanuvchi topilmadi
 */
export async function updateCurrentUserProfile(
  data: ProfileUpdateInput,
  userId?: number | string
): Promise<User> {
  let id = userId
  
  if (!id) {
    const userStr = typeof window !== 'undefined' 
      ? localStorage.getItem(TOKEN_KEYS.USER) 
      : null
      
    if (!userStr) {
      throw new ApiError('Foydalanuvchi topilmadi', 401)
    }
    
    const user = JSON.parse(userStr)
    id = user.id
  }
  
  return fetchApi<User>(`/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
