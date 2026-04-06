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
  NotificationType,
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

type NotificationApi = {
  id: number
  title: string
  message: string
  notification_type?: string
  type?: string
  is_read?: boolean
  read_at?: string | null
  created_at?: string
  createdAt?: string
  updated_at?: string
  related_task?: number | null
  related_task_id?: number | null
  link?: string
  user_id?: number
}

export interface PushStatusResponse {
  enabled: boolean
  count: number
  permission_required: boolean
}

export interface NotificationPreferences {
  email_notifications_enabled: boolean
  telegram_notifications_enabled: boolean
  push_notifications_enabled: boolean
  new_task_notifications_enabled: boolean
  deadline_reminders_enabled: boolean
}

const mapNotificationType = (type?: string): NotificationType => {
  switch (type) {
    case 'TASK_ASSIGNED':
    case 'TASK_UPDATED':
    case 'TASK_COMPLETED':
    case 'TASK_OVERDUE':
    case 'MESSAGE':
    case 'SYSTEM':
      return type
    case 'TASK':
      return 'TASK_ASSIGNED'
    case 'DEADLINE':
      return 'TASK_OVERDUE'
    case 'SUCCESS':
      return 'TASK_COMPLETED'
    case 'WARNING':
      return 'TASK_UPDATED'
    case 'ERROR':
      return 'TASK_OVERDUE'
    case 'INFO':
    default:
      return 'SYSTEM'
  }
}

const normalizeNotification = (item: NotificationApi): Notification => {
  const createdAt = item.created_at ?? item.createdAt ?? new Date().toISOString()

  return {
    id: item.id,
    user_id: item.user_id ?? 0,
    title: item.title,
    message: item.message,
    type: mapNotificationType(item.notification_type ?? item.type),
    is_read: item.is_read ?? false,
    read_at: item.read_at ?? undefined,
    related_task_id: item.related_task_id ?? item.related_task ?? undefined,
    link: item.link,
    created_at: createdAt,
    updated_at: item.updated_at ?? createdAt,
  }
}

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
  const limit = pageSize
  const offset = Math.max(0, (page - 1) * pageSize)
  const queryString = buildQueryString({ limit, offset })
  const response = await fetchApi<PaginatedResponse<NotificationApi> | NotificationApi[]>(
    `/notifications/${queryString}`
  )

  if (Array.isArray(response)) {
    return response.map(normalizeNotification)
  }

  return (response.results ?? []).map(normalizeNotification)
}

/**
 * Bitta bildirishnomani oladi
 * 
 * @param id - Bildirishnoma ID
 */
export async function getNotificationById(id: number | string): Promise<Notification> {
  const data = await fetchApi<NotificationApi>(`/notifications/${id}/`)
  return normalizeNotification(data)
}

/**
 * Bildirishnomani o'qilgan deb belgilaydi
 * 
 * @param id - Bildirishnoma ID
 */
export async function markNotificationRead(id: number | string): Promise<Notification> {
  const data = await fetchApi<NotificationApi>(`/notifications/${id}/read/`, {
    method: 'PATCH',
  })
  return normalizeNotification(data)
}

/**
 * Barcha bildirishnomalarni o'qilgan deb belgilaydi
 */
export async function markAllNotificationsRead(): Promise<void> {
  return fetchApi<void>('/notifications/mark_all_read/', { method: 'POST' })
}

/**
 * Bildirishnomani o'chiradi
 * 
 * @param id - Bildirishnoma ID
 */
export async function deleteNotification(id: number | string): Promise<void> {
  return fetchApi<void>(`/notifications/${id}/`, { method: 'DELETE' })
}

/**
 * O'qilmagan bildirishnomalar sonini oladi
 */
export async function getUnreadNotificationsCount(): Promise<number> {
  const data = await fetchApi<{ unread: number }>('/notifications/unread_count/')
  return data.unread ?? 0
}

export async function getPushPublicKey(): Promise<{ public_key: string; configured: boolean }> {
  return fetchApi<{ public_key: string; configured: boolean }>('/notifications/push_public_key/')
}

export async function getPushStatus(): Promise<PushStatusResponse> {
  return fetchApi<PushStatusResponse>('/notifications/push_status/')
}

export async function subscribePushNotifications(payload: {
  endpoint: string
  keys: { p256dh: string; auth: string }
  user_agent?: string
}): Promise<void> {
  return fetchApi<void>('/notifications/push_subscribe/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function unsubscribePushNotifications(endpoint?: string): Promise<void> {
  return fetchApi<void>('/notifications/push_unsubscribe/', {
    method: 'POST',
    body: JSON.stringify({ endpoint: endpoint || '' }),
  })
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return fetchApi<NotificationPreferences>('/notifications/preferences/')
}

export async function updateNotificationPreferences(
  payload: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return fetchApi<NotificationPreferences>('/notifications/preferences/', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
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
 * Tashkilot rahbari/mas'uli uchun maxsus dashboard ma'lumotlarini oladi
 */
export interface OrgDashboardData {
  organization: {
    id: string
    name: string
    short_name: string
    sector: string | null
    director_name: string
    address: string
    phone: string
  }
  tasks: {
    total: number
    new: number
    in_progress: number
    in_review: number
    completed: number
    overdue: number
    resubmitted: number
    completion_rate: number
    recent: Array<{
      id: string
      title: string
      priority: string
      status: string
      deadline: string | null
      created_at: string
      assigned_to: string | null
    }>
  }
  appeals: {
    total: number
    pending: number
    approved: number
    responded: number
    resolved: number
    avg_resolution_days: number
    average_rating: number | null
    rated_count: number
    recent: Array<{
      id: number
      appeal_number: string
      text: string
      status: string
      priority: string
      created_at: string
      user_name: string
      category_name: string | null
    }>
  }
  service: {
    target_review_days: number
    target_response_days: number
  }
  employees: {
    count: number
  }
}

export async function getOrgDashboard(): Promise<OrgDashboardData> {
  return fetchApi<OrgDashboardData>('/analytics/org-dashboard/')
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
  return fetchApi<Region[]>('/organizations/regions/')
}

/**
 * Tumanlarni oladi
 * 
 * @param regionId - Hudud ID (ixtiyoriy - berilsa faqat shu hududning tumanlari)
 */
export async function getDistricts(regionId?: number): Promise<District[]> {
  const query = regionId ? `?region=${regionId}` : ''
  return fetchApi<District[]>(`/organizations/districts/${query}`)
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
