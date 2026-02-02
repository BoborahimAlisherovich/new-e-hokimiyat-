/**
 * Sectors API Module
 * 
 * Sohalarni boshqarish uchun funksiyalar:
 * - CRUD operatsiyalari
 * - Statistika
 * 
 * @module api/sectors
 * @author E-Hokimiyat Development Team
 */

import { fetchApi } from './client'

// ============================================================================
// Types
// ============================================================================

/** Soha interface */
export interface Sector {
  id: number
  name: string
  description: string
  is_active: boolean
  organization_count: number
}

/** Soha yaratish uchun input */
export interface SectorCreateInput {
  name: string
  description?: string
  is_active?: boolean
}

/** Soha yangilash uchun input */
export interface SectorUpdateInput {
  name?: string
  description?: string
  is_active?: boolean
}

// ============================================================================
// Sector CRUD Operations
// ============================================================================

/**
 * Barcha sohalar ro'yxatini oladi
 * 
 * @returns Sohalar ro'yxati
 * 
 * @example
 * const sectors = await getSectors()
 */
export async function getSectors(): Promise<Sector[]> {
  return fetchApi<Sector[]>('/organizations/sectors/')
}

/**
 * Bitta sohani ID bo'yicha oladi
 * 
 * @param id - Soha ID
 * @returns Soha ma'lumotlari
 * @throws {ApiError} - Soha topilmadi
 */
export async function getSectorById(id: number | string): Promise<Sector> {
  return fetchApi<Sector>(`/organizations/sectors/${id}/`)
}

/**
 * Yangi soha yaratadi
 * 
 * @param data - Soha ma'lumotlari
 * @returns Yaratilgan soha
 */
export async function createSector(data: SectorCreateInput): Promise<Sector> {
  return fetchApi<Sector>('/organizations/sectors/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Mavjud sohani yangilaydi
 * 
 * @param id - Soha ID
 * @param data - Yangilanadigan ma'lumotlar
 * @returns Yangilangan soha
 */
export async function updateSector(
  id: number | string, 
  data: SectorUpdateInput
): Promise<Sector> {
  return fetchApi<Sector>(`/organizations/sectors/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Sohani o'chiradi
 * 
 * @param id - Soha ID
 */
export async function deleteSector(id: number | string): Promise<void> {
  return fetchApi<void>(`/organizations/sectors/${id}/`, { method: 'DELETE' })
}
