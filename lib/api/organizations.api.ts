/**
 * Organizations API Module
 * 
 * Tashkilotlarni boshqarish uchun funksiyalar:
 * - CRUD operatsiyalari
 * - Ierarxik struktura
 * - Statistika
 * 
 * @module api/organizations
 * @author E-Hokimiyat Development Team
 */

import type { Organization, OrganizationCreateInput, OrganizationUpdateInput } from '@/types'
import { fetchApi } from './client'

// ============================================================================
// Types
// ============================================================================

/** Tashkilot statistikasi */
export interface OrganizationStatistics {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  completionRate: number
  employeesCount: number
}

/** Tashkilot daraxti elementi */
export interface OrganizationTreeNode extends Organization {
  children: OrganizationTreeNode[]
  level: number
}

// ============================================================================
// Organization CRUD Operations
// ============================================================================

/**
 * Barcha tashkilotlar ro'yxatini oladi
 * 
 * @returns Tashkilotlar ro'yxati
 * 
 * @example
 * const organizations = await getOrganizations()
 */
export async function getOrganizations(): Promise<Organization[]> {
  const response = await fetchApi<{ count: number; results: Organization[] } | Organization[]>('/organizations/')
  // Paginated yoki oddiy array bo'lishi mumkin
  if (Array.isArray(response)) {
    return response
  }
  return response.results || []
}

/* --------------------------------------------------------------------------
   Topshiriq berish doirasi
   -------------------------------------------------------------------------- */

/** Foydalanuvchi topshiriq berishi mumkin bo'lgan tashkilotlar doirasi */
export type AssignableScope = 'all' | 'sector' | 'curated' | 'own' | 'none'

export interface AssignableOrganization {
  id: string
  name: string
  short_name?: string
  sector?: string | null
  sector_name?: string | null
}

export interface AssignableOrganizations {
  scope: AssignableScope
  sector: { id: string; name: string } | null
  organizations: AssignableOrganization[]
}

/**
 * Joriy foydalanuvchi topshiriq BERISHI mumkin bo'lgan tashkilotlar.
 *
 * Topshiriq yaratish oynasi shu ro'yxatni ko'rsatadi: hokim o'rinbosari
 * kabinetida faqat o'ziga tegishli tashkilotlar chiqadi, hokim hammasini
 * ko'radi. Backend yaratishda aynan shu doirani tekshiradi
 * (backend/tasks/access.py), shuning uchun ikkalasi bir-biriga mos.
 */
export async function getAssignableOrganizations(): Promise<AssignableOrganizations> {
  const res = await fetchApi<AssignableOrganizations>('/organizations/assignable/')
  return {
    scope: res?.scope ?? 'none',
    sector: res?.sector ?? null,
    organizations: Array.isArray(res?.organizations) ? res.organizations : [],
  }
}

/**
 * Bitta tashkilotni ID bo'yicha oladi
 * 
 * @param id - Tashkilot ID
 * @returns Tashkilot ma'lumotlari
 * @throws {ApiError} - Tashkilot topilmadi
 */
export async function getOrganizationById(id: number | string): Promise<Organization> {
  return fetchApi<Organization>(`/organizations/${id}/`)
}

/**
 * Yangi tashkilot yaratadi
 * 
 * @param data - Tashkilot ma'lumotlari
 * @returns Yaratilgan tashkilot
 */
export async function createOrganization(data: OrganizationCreateInput): Promise<Organization> {
  return fetchApi<Organization>('/organizations/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Mavjud tashkilotni yangilaydi
 * 
 * @param id - Tashkilot ID
 * @param data - Yangilanadigan ma'lumotlar
 * @returns Yangilangan tashkilot
 */
export async function updateOrganization(
  id: number | string, 
  data: OrganizationUpdateInput
): Promise<Organization> {
  return fetchApi<Organization>(`/organizations/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Tashkilotni o'chiradi
 * 
 * @param id - Tashkilot ID
 */
export async function deleteOrganization(id: number | string): Promise<void> {
  return fetchApi<void>(`/organizations/${id}/`, { method: 'DELETE' })
}

// ============================================================================
// Organization Statistics & Tree
// ============================================================================

/**
 * Tashkilot statistikasini oladi
 * 
 * @param id - Tashkilot ID
 * @returns Statistika ma'lumotlari
 */
export async function getOrganizationStatistics(id: number | string): Promise<OrganizationStatistics> {
  return fetchApi<OrganizationStatistics>(`/organizations/${id}/statistics/`)
}

/**
 * Tashkilotlar ierarxik daraxtini oladi
 * 
 * @returns Tashkilotlar daraxti
 * 
 * @example
 * const tree = await getOrganizationTree()
 * // tree[0].children - birinchi tashkilotning bolalari
 */
export async function getOrganizationTree(): Promise<OrganizationTreeNode[]> {
  return fetchApi<OrganizationTreeNode[]>('/organizations/tree/')
}
