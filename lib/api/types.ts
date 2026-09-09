/**
 * API Module Type Definitions
 * 
 * Bu fayl API modullari uchun ichki type va interfacelarni o'z ichiga oladi.
 * Tashqi tiplar @/types dan import qilinadi.
 * 
 * @module api/types
 * @author E-Hokimiyat Development Team
 */

// ============================================================================
// HTTP & Request Types
// ============================================================================

/** HTTP metodlari */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** API so'rov konfiguratsiyasi */
export interface ApiRequestConfig extends RequestInit {
  /** Query parametrlari */
  params?: QueryParams
  /** Timeout millisekund */
  timeout?: number
}

/** Query string parametrlari */
export type QueryParams = Record<string, string | number | boolean | undefined | null>

// ============================================================================
// Response Types
// ============================================================================

/** Standart API javob interfeysi */
export interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

/** Paginatsiya metadatasi */
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** Paginatsiyalangan javob */
export interface PaginatedApiResponse<T> {
  results: T[]
  count: number
  next: string | null
  previous: string | null
}

// ============================================================================
// Auth Types
// ============================================================================

/** Login so'rovi */
export interface LoginRequest {
  login: string
  pnfl?: string
  password: string
}

/** Login javobi */
export interface LoginResponse {
  access: string
  refresh: string
  user: AuthUser
}

/** Autentifikatsiyalangan foydalanuvchi */
export interface AuthUser {
  id: number | string
  login: string
  pnfl?: string
  masked_pnfl?: string
  first_name: string
  last_name: string
  middle_name?: string
  role: string
  email?: string
  phone?: string
}

/** Token yangilash javobi */
export interface TokenRefreshResponse {
  access: string
}

// ============================================================================
// Chat Types
// ============================================================================

/** Chat xabari */
export interface ChatMessage {
  id: number
  sender: number
  sender_name: string
  receiver: number
  receiver_name: string
  content: string
  is_read: boolean
  created_at: string
  attachment?: {
    type: string
    url: string
    name?: string
    size?: string
  }
}

/** Chat suhbati */
export interface ChatConversation {
  id: number
  participant: {
    id: number
    name: string
    avatar?: string
    role: string
  }
  last_message?: ChatMessage
  unread_count: number
  updated_at: string
}

// ============================================================================
// Appeal Types (Telegram)
// ============================================================================

/** Murojaat holati */
export type AppealStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'

/** Murojaat ustuvorligi */
export type AppealPriority = 'LOW' | 'MEDIUM' | 'HIGH'

/** Normallashtirilgan murojaat */
export interface NormalizedAppeal {
  id: string
  citizenName: string
  citizenPhone: string
  citizenEmail: string
  subject: string
  description: string
  category: string
  priority: AppealPriority
  status: AppealStatus
  assignedTo: number | null
  organization: unknown | null
  district: string
  address: string
  createdAt: string
  updatedAt: string
  source?: string
  appealNumber?: string
  appealType?: string
  aiAnalysis?: string
  aiScore?: number
}

/** Telegram murojaat */
export interface TelegramAppeal {
  id: number
  text: string
  status: string
  priority: string
  category_name?: string
  appeal_number?: string
  appeal_type_name?: string
  ai_analysis?: string
  ai_score?: number
  created_at: string
  updated_at: string
  telegram_user?: TelegramUser
  user_name?: string
}

/** Telegram foydalanuvchi */
export interface TelegramUser {
  id: number
  telegram_id: number
  username?: string
  first_name?: string
  last_name?: string
  full_name?: string
  gender?: string
  phone?: string
  region_name?: string
  language?: string
  is_registered?: boolean
  is_blocked?: boolean
}

/** Murojaat ko'rib chiqish so'rovi */
export interface AppealReviewRequest {
  action: 'approve' | 'reject' | 'respond'
  response?: string
  priority?: string
  forward_to_site?: boolean
  create_task?: boolean
  organization_ids?: number[]
}

/** Murojaatdan topshiriq yaratish so'rovi */
export interface CreateTaskFromAppealRequest {
  title: string
  deadline: string
  priority: string
  organization_ids: string[]
  comment?: string
}

// ============================================================================
// Error Types
// ============================================================================

/** API xatosi detallari */
export interface ApiErrorDetails {
  detail?: string
  message?: string
  errors?: Record<string, string[]>
  [key: string]: unknown
}

// ============================================================================
// Constants
// ============================================================================

/** Token storage kalitlari */
export const TOKEN_KEYS = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  USER: 'user',
} as const

/** HTTP status kodlari */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const
