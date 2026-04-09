/**
 * Appeals API Module (Telegram Murojaatlar)
 * 
 * Telegram bot orqali kelgan murojaatlarni boshqarish:
 * - Murojaatlar ro'yxati
 * - Xabarlar tarixi
 * - Javob berish va yopish
 * - Topshiriqqa aylantirish
 * 
 * @module api/appeals
 * @author E-Hokimiyat Development Team
 */

import type { Appeal, AppealAttachment } from '@/types'
import { fetchApi } from './client'

// ============================================================================
// Types
// ============================================================================

/** Telegram murojaat (raw API response) */
interface TelegramAppealResponse {
  id: number
  text: string
  status: string
  priority: string
  source?: string
  category_name?: string
  latitude?: string | number | null
  longitude?: string | number | null
  address?: string
  category_detail?: {
    name_uz?: string
    name_ru?: string
    name_en?: string
  }
  appeal_number?: string
  appeal_type_name?: string
  ai_analysis?: string
  ai_score?: number
  created_at: string
  updated_at: string
  telegram_user?: {
    id: number
    telegram_id: number
    first_name?: string
    last_name?: string
    full_name?: string
    gender?: string
    phone?: string
    region_name?: string
  }
  user_name?: string
  user_phone?: string
  region_name?: string
  attachments?: TelegramAppealAttachmentResponse[]
  new_messages_count?: number
  last_message_at?: string | null
}

interface TelegramAppealAttachmentResponse {
  id: number
  file_type: string
  telegram_file_id: string
  file?: string | null
  file_url?: string | null
  file_name?: string
  file_size?: number
  mime_type?: string
  created_at?: string
}

/** Murojaat xabari */
export interface AppealMessage {
  id: number
  text: string
  sender_type: 'user' | 'operator'
  sender_name: string
  created_at: string
  is_read: boolean
  is_from_admin: boolean
  admin_name: string | null
  sender_avatar_url: string | null
}

/** Murojaat tarix yozuvi */
export interface AppealHistoryItem {
  id: number
  type: 'ai_analysis' | 'admin_review' | 'message'
  title: string
  description?: string
  text?: string
  score?: number
  priority?: string
  is_valid?: boolean
  rejection_reason?: string
  admin?: string | null
  status?: string
  response?: string
  action: string
  user: string
  comment?: string
  created_at: string
}

/** Murojaat ko'rib chiqish so'rovi */
export interface AppealReviewRequest {
  action: 'approve' | 'reject' | 'respond'
  response?: string
  priority?: string
  forward_to_site?: boolean
  create_task?: boolean
  organization_ids?: string[]
}

/** Murojaatdan topshiriq yaratish so'rovi */
export interface CreateTaskFromAppealRequest {
  title: string
  deadline: string
  priority: string
  organization_ids: string[]
  comment?: string
}

export interface AppealCategoryItem {
  id: number
  name_uz: string
  name_ru?: string
  name_en?: string
  code?: string
  icon?: string
  is_active?: boolean
  order?: number
}

export interface AppealTypeItem {
  id: number
  name_uz: string
  name_ru?: string
  name_en?: string
  code?: string
  icon?: string
  is_active?: boolean
  order?: number
}

export interface AppealCategoryAdminItem extends AppealCategoryItem {
  responsible_organizations: string[]
  responsible_organizations_detail?: Array<{
    id: string
    name: string
    short_name?: string | null
  }>
}

export interface AppealAssignRequest {
  category_id?: number
  organization_ids?: string[]
}

// ============================================================================
// Status & Priority Mappers
// ============================================================================

type AppealStatus = Appeal['status']
type AppealPriority = Appeal['priority']

/** Telegram holat → Frontend holat */
const TELEGRAM_STATUS_MAP: Record<string, AppealStatus> = {
  pending: 'PENDING',
  pending_ai: 'pending_ai',
  pending_review: 'pending_review',
  approved: 'approved',
  in_progress: 'IN_PROGRESS',
  responded: 'responded',
  resolved: 'RESOLVED',
  rejected: 'REJECTED',
  forwarded: 'forwarded',
} as const

/** Telegram ustuvorlik → Frontend ustuvorlik */
const TELEGRAM_PRIORITY_MAP: Record<string, AppealPriority> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  urgent: 'HIGH',
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Telegram foydalanuvchi ismini oladi
 */
function extractUserName(
  telegramUser?: TelegramAppealResponse['telegram_user'], 
  fallback?: string
): string {
  if (!telegramUser) {
    return fallback || 'Telegram foydalanuvchi'
  }
  
  if (telegramUser.full_name) {
    return telegramUser.full_name
  }
  
  const nameParts = [telegramUser.first_name, telegramUser.last_name].filter(Boolean)
  return nameParts.join(' ') || fallback || 'Telegram foydalanuvchi'
}

/**
 * Murojaat mavzusini AI tahlil yoki matndan oladi
 */
function extractSubject(appeal: TelegramAppealResponse): string {
  const DEFAULT_SUBJECT = 'Telegram murojaat'
  
  if (appeal.ai_analysis) {
    const match = appeal.ai_analysis.match(/Mavzu[:\s]+([^\n]+)/i)
    if (match) {
      return match[1].trim()
    }
  }
  
  if (appeal.text) {
    const truncated = appeal.text.substring(0, 50)
    return appeal.text.length > 50 ? `${truncated}...` : truncated
  }
  
  return DEFAULT_SUBJECT
}

/**
 * Telegram murojaatni Appeal formatga aylantiradi
 */
function normalizeAppeal(appeal: TelegramAppealResponse): Appeal {
  const telegramUser = appeal.telegram_user
  const latitude = appeal.latitude === null || appeal.latitude === undefined ? null : Number(appeal.latitude)
  const longitude = appeal.longitude === null || appeal.longitude === undefined ? null : Number(appeal.longitude)
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude)
  const attachments: AppealAttachment[] | undefined = appeal.attachments?.map((att) => ({
    id: att.id,
    file_type: att.file_type,
    telegram_file_id: att.telegram_file_id,
    file: att.file ?? null,
    file_url: att.file_url ?? null,
    file_name: att.file_name,
    file_size: att.file_size,
    mime_type: att.mime_type,
    created_at: att.created_at,
  }))
  
  return {
    id: `tg-${appeal.id}`,
    citizenName: extractUserName(telegramUser, appeal.user_name),
    citizenGender: telegramUser?.gender,
    citizenPhone: (appeal.user_phone || telegramUser?.phone || '').trim(),
    citizenEmail: '',
    subject: extractSubject(appeal),
    description: appeal.text || '',
    category: appeal.category_name || appeal.category_detail?.name_uz || 'Boshqa',
    priority: TELEGRAM_PRIORITY_MAP[appeal.priority] || 'MEDIUM',
    status: TELEGRAM_STATUS_MAP[appeal.status] || 'PENDING',
    assignedTo: undefined,
    organization: undefined,
    district: telegramUser?.region_name || appeal.region_name || '',
    address: appeal.address || '',
    latitude: hasLocation ? (latitude as number) : null,
    longitude: hasLocation ? (longitude as number) : null,
    createdAt: appeal.created_at,
    updatedAt: appeal.updated_at,
    attachments,
    newMessagesCount: appeal.new_messages_count || 0,
    lastMessageAt: appeal.last_message_at || null,
  }
}

/**
 * ID dan Telegram prefix ni olib tashlaydi
 */
function stripTelegramPrefix(id: string): string {
  return id.startsWith('tg-') ? id.slice(3) : id
}

// ============================================================================
// Appeals API Functions
// ============================================================================

/** API javob turi */
interface AppealsApiResponse {
  results?: TelegramAppealResponse[]
}

/**
 * Barcha murojaatlarni oladi
 * 
 * @returns Appeal formatidagi murojaatlar ro'yxati
 */
export async function getAppeals(): Promise<Appeal[]> {
  try {
    const response = await fetchApi<TelegramAppealResponse[] | AppealsApiResponse>(
      '/telegram-bot/appeals/'
    )
    
    const appeals = Array.isArray(response) 
      ? response 
      : (response?.results ?? [])
    
    return appeals.map(normalizeAppeal)
  } catch (error) {
    console.error('[Appeals API] getAppeals xatosi:', error)
    return []
  }
}

export interface ManualAppealCreateRequest {
  citizen_name: string
  citizen_phone?: string
  citizen_gender?: 'male' | 'female' | ''
  citizen_region_id?: number | null
  items: Array<{
    text: string
    appeal_type_id: number
    category_id: number
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    address?: string
    latitude?: number | null
    longitude?: number | null
    organization_ids?: string[]
    attachments?: File[]
  }>
}

export interface ManualAppealCreateResult {
  appeals: Appeal[]
  warnings: string[]
}

/**
 * Qo'lda murojaat qo'shish (dashboard orqali).
 */
export async function createManualAppeal(payload: ManualAppealCreateRequest): Promise<ManualAppealCreateResult> {
  const form = new FormData()
  form.append(
    'payload',
    JSON.stringify({
      citizen_name: payload.citizen_name,
      citizen_phone: payload.citizen_phone || '',
      citizen_gender: payload.citizen_gender || '',
      citizen_region_id: payload.citizen_region_id ?? null,
      items: payload.items.map((item) => ({
        text: item.text,
        appeal_type_id: item.appeal_type_id,
        category_id: item.category_id,
        priority: item.priority || 'medium',
        address: item.address || '',
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        organization_ids: item.organization_ids || [],
      })),
    })
  )

  payload.items.forEach((item, index) => {
    item.attachments?.forEach((file) => {
      form.append(`attachments_${index}`, file)
    })
  })

  const result = await fetchApi<{ results?: TelegramAppealResponse[]; warnings?: string[] }>(
    `/telegram-bot/appeals/manual-create/`,
    {
      method: 'POST',
      body: form,
    }
  )
  return {
    appeals: (result.results || []).map(normalizeAppeal),
    warnings: Array.isArray(result.warnings) ? result.warnings.map((item) => String(item)) : [],
  }
}

/**
 * Bitta murojaatni ID bo'yicha oladi
 * 
 * @param id - Murojaat ID (tg- prefiksi bilan yoki bo'lmasa)
 */
export async function getAppealById(id: string): Promise<Appeal> {
  const appealId = stripTelegramPrefix(id)
  const appeal = await fetchApi<TelegramAppealResponse>(
    `/telegram-bot/appeals/${appealId}/`
  )
  
  return normalizeAppeal(appeal)
}

/**
 * Murojaat sohalari ro'yxati (Telegram bot kategoriyalari).
 */
export async function getAppealCategories(): Promise<AppealCategoryItem[]> {
  const response = await fetchApi<any>(`/telegram-bot/categories/`)
  const rows = Array.isArray(response) ? response : (response?.results ?? [])
  return (rows || []).map((item: any) => ({
    id: Number(item.id),
    name_uz: String(item.name_uz || item.name || ''),
    name_ru: item.name_ru || undefined,
    name_en: item.name_en || undefined,
    code: item.code || undefined,
    icon: item.icon || undefined,
    is_active: item.is_active ?? undefined,
    order: item.order ?? undefined,
  })).filter((item: AppealCategoryItem) => Boolean(item.id) && Boolean(item.name_uz))
}

/**
 * Murojaat turlari ro'yxati (Telegram bot appeal types).
 */
export async function getAppealTypes(): Promise<AppealTypeItem[]> {
  const response = await fetchApi<any>(`/telegram-bot/types/`)
  const rows = Array.isArray(response) ? response : (response?.results ?? [])
  return (rows || []).map((item: any) => ({
    id: Number(item.id),
    name_uz: String(item.name_uz || item.name || ''),
    name_ru: item.name_ru || undefined,
    name_en: item.name_en || undefined,
    code: item.code || undefined,
    icon: item.icon || undefined,
    is_active: item.is_active ?? undefined,
    order: item.order ?? undefined,
  })).filter((item: AppealTypeItem) => Boolean(item.id) && Boolean(item.name_uz))
}

/**
 * Murojaat sohalari (admin) - mas'ul tashkilotlar bilan.
 */
export async function getAppealCategoriesAdmin(): Promise<AppealCategoryAdminItem[]> {
  const response = await fetchApi<any>(`/telegram-bot/categories/admin_list/`)
  const rows = Array.isArray(response) ? response : (response?.results ?? [])
  return (rows || []).map((item: any) => ({
    id: Number(item.id),
    name_uz: String(item.name_uz || item.name || ''),
    name_ru: item.name_ru || undefined,
    name_en: item.name_en || undefined,
    code: item.code || undefined,
    icon: item.icon || undefined,
    is_active: item.is_active ?? undefined,
    order: item.order ?? undefined,
    responsible_organizations: Array.isArray(item.responsible_organizations)
      ? item.responsible_organizations.map((v: any) => String(v))
      : [],
    responsible_organizations_detail: Array.isArray(item.responsible_organizations_detail)
      ? item.responsible_organizations_detail.map((org: any) => ({
          id: String(org.id),
          name: String(org.name || ''),
          short_name: org.short_name ?? undefined,
        }))
      : undefined,
  })).filter((item: AppealCategoryAdminItem) => Boolean(item.id) && Boolean(item.name_uz))
}

/**
 * Murojaat sohasiga mas'ul tashkilotlarni saqlash.
 */
export async function updateAppealCategory(
  categoryId: number,
  data: Partial<{ responsible_organizations: string[]; is_active: boolean; order: number }>
): Promise<AppealCategoryAdminItem> {
  const result = await fetchApi<any>(
    `/telegram-bot/categories/${categoryId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  )
  return {
    id: Number(result.id),
    name_uz: String(result.name_uz || result.name || ''),
    name_ru: result.name_ru || undefined,
    name_en: result.name_en || undefined,
    code: result.code || undefined,
    icon: result.icon || undefined,
    is_active: result.is_active ?? undefined,
    order: result.order ?? undefined,
    responsible_organizations: Array.isArray(result.responsible_organizations)
      ? result.responsible_organizations.map((v: any) => String(v))
      : [],
    responsible_organizations_detail: Array.isArray(result.responsible_organizations_detail)
      ? result.responsible_organizations_detail.map((org: any) => ({
          id: String(org.id),
          name: String(org.name || ''),
          short_name: org.short_name ?? undefined,
        }))
      : undefined,
  }
}

/**
 * Murojaatni yo'naltirish: soha va/yo tashkilotlarni biriktirish.
 */
export async function assignAppeal(
  appealId: string,
  data: AppealAssignRequest
): Promise<Appeal> {
  const id = stripTelegramPrefix(appealId)
  const result = await fetchApi<TelegramAppealResponse>(
    `/telegram-bot/appeals/${id}/assign/`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
  return normalizeAppeal(result)
}

// ============================================================================
// Appeal Messages & History
// ============================================================================

/**
 * Murojaat xabarlarini oladi
 * 
 * @param appealId - Murojaat ID
 */
export async function getAppealMessages(appealId: string): Promise<AppealMessage[]> {
  const id = stripTelegramPrefix(appealId)
  const messages = await fetchApi<any[]>(`/telegram-bot/appeals/${id}/messages/`)

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("appealsRead"))
  }
  
  // Normalize to expected format
  return messages.map(msg => ({
    id: msg.id,
    text: msg.text || msg.content || '',
    sender_type: msg.sender_type || (msg.is_from_admin ? 'operator' : 'user'),
    sender_name: msg.sender_name || msg.admin_name || 'Foydalanuvchi',
    created_at: msg.created_at,
    is_read: msg.is_read ?? true,
    is_from_admin: msg.is_from_admin ?? (msg.sender_type === 'operator'),
    admin_name: msg.admin_name ?? msg.sender_name ?? null,
    sender_avatar_url: msg.sender_avatar_url || null,
  }))
}

/**
 * O'qilmagan murojaat xabarlar sonini oladi
 */
export async function getUnreadAppealsCount(): Promise<number> {
  const data = await fetchApi<{ unread_count: number }>('/telegram-bot/appeals/unread-count/')
  return data.unread_count ?? 0
}

/**
 * Murojaat tarixini oladi
 * 
 * @param appealId - Murojaat ID
 */
export async function getAppealHistory(appealId: string): Promise<AppealHistoryItem[]> {
  const id = stripTelegramPrefix(appealId)
  const history = await fetchApi<any[]>(`/telegram-bot/appeals/${id}/history/`)
  
  // Normalize to expected format
  return history.map(item => ({
    id: item.id,
    type: (item.type as 'ai_analysis' | 'admin_review' | 'message') || 'admin_review',
    title: item.title || item.action || 'Holat o\'zgarishi',
    description: item.description,
    text: item.text,
    score: item.score,
    priority: item.priority,
    is_valid: item.is_valid,
    rejection_reason: item.rejection_reason,
    admin: item.admin ?? null,
    status: item.status,
    response: item.response,
    action: item.action || '',
    user: item.user || '',
    comment: item.comment,
    created_at: item.created_at,
  }))
}

// ============================================================================
// Appeal Actions
// ============================================================================

/** Javob javobi */
export interface SendMessageResponse {
  success: boolean
  message_id?: number
}

/**
 * Murojaatga javob xabari yuboradi
 * 
 * @param appealId - Murojaat ID
 * @param text - Xabar matni (ixtiyoriy)
 * @param attachment - Fayl (ixtiyoriy)
 */
export async function sendAppealMessage(
  appealId: string, 
  text?: string,
  attachment?: File
): Promise<SendMessageResponse> {
  const id = stripTelegramPrefix(appealId)
  
  const hasContent = text?.trim()
  const hasFile = attachment instanceof File
  
  if (!hasContent && !hasFile) {
    throw new Error('Xabar yoki fayl bo\'lishi kerak')
  }
  
  // If file is attached, use FormData
  if (hasFile) {
    const form = new FormData()
    if (hasContent) {
      form.append('text', text!.trim())
    }
    form.append('file', attachment)
    
    return fetchApi<SendMessageResponse>(
      `/telegram-bot/appeals/${id}/send_message/`,
      {
        method: 'POST',
        body: form,
      }
    )
  }
  
  // Text only
  return fetchApi<SendMessageResponse>(
    `/telegram-bot/appeals/${id}/send_message/`,
    {
      method: 'POST',
      body: JSON.stringify({ text: text!.trim() }),
    }
  )
}

/**
 * Murojaatni yopadi
 * 
 * @param appealId - Murojaat ID
 * @param response - Yakuniy javob
 */
export async function closeAppeal(
  appealId: string, 
  response: string
): Promise<void> {
  const id = stripTelegramPrefix(appealId)
  
  return fetchApi<void>(
    `/telegram-bot/appeals/${id}/close_appeal/`,
    {
      method: 'POST',
      body: JSON.stringify({ response }),
    }
  )
}

/**
 * Murojaatni ko'rib chiqadi (tasdiqlash, rad etish, javob berish)
 * 
 * @param appealId - Murojaat ID
 * @param data - Ko'rib chiqish ma'lumotlari
 */
export async function reviewAppeal(
  appealId: string, 
  data: AppealReviewRequest
): Promise<void> {
  const id = stripTelegramPrefix(appealId)
  
  return fetchApi<void>(
    `/telegram-bot/appeals/${id}/review/`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
}

/**
 * Murojaatdan topshiriq yaratadi
 * 
 * @param appealId - Murojaat ID
 * @param data - Topshiriq ma'lumotlari
 */
export async function createTaskFromAppeal(
  appealId: string, 
  data: CreateTaskFromAppealRequest
): Promise<{ task_id: string }> {
  const id = stripTelegramPrefix(appealId)
  
  return fetchApi<{ task_id: string }>(
    `/telegram-bot/appeals/${id}/create_task/`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
}
