/**
 * Common API Module
 * 
 * Umumiy API funksiyalari:
 * - Bildirishnomalar
 * - Audit loglari
 * - Analitika
 * - Hududlar va tumanlar
 * - Sozlamalar
 * - Fayl yuklash
 * 
 * @module api/common
 * @author E-Hokimiyat Development Team
 */

import type { 
  Notification, 
  AuditLog, 
  DashboardStats, 
  OrganizationAnalytics, 
  TaskTrends, 
  Region, 
  District, 
  PaginatedResponse 
} from '@/types'
import { fetchApi, buildQueryString, getAccessToken, API_BASE, ApiError } from './client'

// ============================================================================
// Notifications API
// ============================================================================

/**
 * Bildirishnomalar ro'yxatini oladi
 * 
 * @param page - Sahifa raqami
 * @param pageSize - Sahifa o'lchami
 * @returns Bildirishnomalar ro'yxati
 */
export async function getNotifications(
  page = 1,
  pageSize = 100
): Promise<Notification[]> {
  const queryString = buildQueryString({ page, page_size: pageSize })
  const response = await fetchApi<PaginatedResponse<Notification>>(
    `/notifications/${queryString}`
  )
  
  return response.results ?? []
}

/**
 * Bitta bildirishnomani oladi
 * 
 * @param id - Bildirishnoma ID
 */
export async function getNotificationById(id: number | string): Promise<Notification> {
  return fetchApi<Notification>(`/notifications/${id}/`)
}

/**
 * Bildirishnomani o'qilgan deb belgilaydi
 * 
 * @param id - Bildirishnoma ID
 */
export async function markNotificationRead(id: number | string): Promise<Notification> {
  return fetchApi<Notification>(`/notifications/${id}/mark_read/`, {
    method: 'POST',
  })
}

/**
 * Barcha bildirishnomalarni o'qilgan deb belgilaydi
 */
export async function markAllNotificationsRead(): Promise<void> {
  return fetchApi<void>('/notifications/mark_all_read/', { method: 'POST' })
}

/**
 * O'qilmagan bildirishnomalar sonini oladi
 */
export async function getUnreadNotificationsCount(): Promise<number> {
  const data = await fetchApi<{ unread: number }>('/notifications/unread_count/')
  return data.unread ?? 0
}

// ============================================================================
// Audit API
// ============================================================================

/** Audit log filtrlari */
export interface AuditLogFilters {
  user?: number
  action?: string
  model_name?: string
  date_from?: string
  date_to?: string
}

/**
 * Audit loglarni oladi
 * 
 * @param filters - Filtrlash parametrlari
 * @param page - Sahifa raqami
 * @param pageSize - Sahifa o'lchami
 * @returns Audit loglar ro'yxati
 */
export async function getAuditLogs(
  filters?: AuditLogFilters,
  page = 1,
  pageSize = 50
): Promise<AuditLog[]> {
  const params = { ...filters, page, page_size: pageSize }
  const queryString = buildQueryString(params)
  const response = await fetchApi<PaginatedResponse<AuditLog>>(`/audit${queryString}`)
  
  return response.results ?? []
}

// ============================================================================
// Analytics API
// ============================================================================

/**
 * Dashboard statistikasini oladi
 */
export async function getAnalyticsDashboard(): Promise<DashboardStats> {
  return fetchApi<DashboardStats>('/analytics/dashboard/')
}

/**
 * Tashkilotlar analitikasini oladi
 */
export async function getAnalyticsOrganizations(): Promise<OrganizationAnalytics[]> {
  return fetchApi<OrganizationAnalytics[]>('/analytics/organizations/')
}

/** Foydalanuvchilar analitikasi */
export interface UserAnalytics {
  totalUsers: number
  activeUsers: number
  usersByRole: Record<string, number>
  usersByOrganization: Array<{
    organization: string
    count: number
  }>
}

/**
 * Foydalanuvchilar analitikasini oladi
 */
export async function getAnalyticsUsers(): Promise<UserAnalytics> {
  return fetchApi<UserAnalytics>('/analytics/users/')
}

/** Analitika davri */
export type AnalyticsPeriod = 'week' | 'month' | 'year'

/**
 * Topshiriqlar trendini oladi
 * 
 * @param period - Davr (hafta, oy, yil)
 */
export async function getAnalyticsTrends(
  period: AnalyticsPeriod = 'month'
): Promise<TaskTrends> {
  return fetchApi<TaskTrends>(`/analytics/trends/?period=${period}`)
}

/** Export formati */
export type ExportFormat = 'xlsx' | 'pdf'

/**
 * Analitikani eksport qiladi
 * 
 * @param format - Fayl formati
 * @returns Blob fayl
 */
export async function getAnalyticsExport(format: ExportFormat = 'xlsx'): Promise<Blob> {
  const token = getAccessToken()
  
  const response = await fetch(`${API_BASE}/analytics/export/?format=${format}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  
  if (!response.ok) {
    throw new ApiError('Eksport muvaffaqiyatsiz', response.status)
  }
  
  return response.blob()
}

// ============================================================================
// Regions & Districts API
// ============================================================================

/**
 * Barcha hududlarni oladi
 */
export async function getRegions(): Promise<Region[]> {
  return fetchApi<Region[]>('/regions/')
}

/**
 * Tumanlarni oladi
 * 
 * @param regionId - Hudud ID (ixtiyoriy - berilsa faqat shu hududning tumanlari)
 */
export async function getDistricts(regionId?: number): Promise<District[]> {
  const query = regionId ? `?region=${regionId}` : ''
  return fetchApi<District[]>(`/districts/${query}`)
}

// ============================================================================
// Settings API
// ============================================================================

/** Tizim sozlamalari */
export interface SystemSettings {
  site_name?: string
  default_deadline_days?: number
  max_file_size_mb?: number
  allowed_file_types?: string[]
  telegram_bot_enabled?: boolean
  email_notifications_enabled?: boolean
  [key: string]: unknown
}

/**
 * Tizim sozlamalarini oladi
 */
export async function getSettings(): Promise<SystemSettings> {
  return fetchApi<SystemSettings>('/settings/')
}

/**
 * Tizim sozlamalarini yangilaydi
 * 
 * @param data - Yangi sozlamalar
 */
export async function updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
  return fetchApi<SystemSettings>('/settings/', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * @deprecated updateSettings dan foydalaning
 */
export async function postSettings(body: Partial<SystemSettings>): Promise<SystemSettings> {
  return updateSettings(body)
}

// ============================================================================
// File Upload API
// ============================================================================

/** Yuklangan fayl javobi */
export interface UploadedFile {
  id: number
  url: string
  name: string
  size: number
  content_type: string
}

/**
 * Fayl yuklaydi
 * 
 * @param file - Yuklanadigan fayl
 * @param taskId - Bog'lanadigan topshiriq ID (ixtiyoriy)
 * @returns Yuklangan fayl ma'lumotlari
 */
export async function uploadFile(
  file: File, 
  taskId?: number
): Promise<UploadedFile> {
  const formData = new FormData()
  formData.append('file', file)
  
  if (taskId) {
    formData.append('task_id', String(taskId))
  }
  
  const token = getAccessToken()
  
  const response = await fetch(`${API_BASE}/files/upload/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
  
  if (!response.ok) {
    throw new ApiError('Fayl yuklash muvaffaqiyatsiz', response.status)
  }
  
  return response.json()
}
