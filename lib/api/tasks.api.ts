/**
 * Tasks API Module
 * 
 * Topshiriqlarni boshqarish uchun funksiyalar:
 * - CRUD operatsiyalari
 * - Holat o'zgartirishlari (qabul qilish, boshlash, tasdiqlash, rad etish)
 * - Ijro jarayonlari
 * - Xabarlar va tarix
 * 
 * @module api/tasks
 * @author E-Hokimiyat Development Team
 */

import type { 
  Task, 
  TaskFilters, 
  TaskCreateInput, 
  TaskUpdateInput, 
  TaskExecution, 
  TaskChatMessage,
  PaginatedResponse 
} from '@/types'
import { fetchApi, buildQueryString, ApiError } from './client'
import { HTTP_STATUS, type QueryParams } from './types'

// ============================================================================
// Task CRUD Operations
// ============================================================================

/**
 * Topshiriqlar ro'yxatini oladi
 * 
 * @param filters - Filtrlash parametrlari
 * @param page - Sahifa raqami (default: 1)
 * @param pageSize - Sahifa o'lchami (default: 100)
 * @returns Topshiriqlar ro'yxati
 * 
 * @example
 * const tasks = await getTasks({ status: 'YANGI' }, 1, 50)
 */
export async function getTasks(
  filters?: TaskFilters,
  page = 1,
  pageSize = 100
): Promise<Task[]> {
  const offset = Math.max(0, (page - 1) * pageSize)
  const params = { ...filters, limit: pageSize, offset }
  const queryString = buildQueryString(params)
  const response = await fetchApi<PaginatedResponse<Task>>(`/tasks${queryString}`)
  
  return response?.results ?? []
}

export async function getTasksPage(
  filters?: TaskFilters,
  page = 1,
  pageSize = 100,
  ordering = 'deadline'
): Promise<PaginatedResponse<Task>> {
  const offset = Math.max(0, (page - 1) * pageSize)
  const params = { ...filters, limit: pageSize, offset, ordering }
  const queryString = buildQueryString(params)
  return fetchApi<PaginatedResponse<Task>>(`/tasks${queryString}`)
}

export async function getTaskStats(filters?: TaskFilters): Promise<{
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
  active_sectors: number
}> {
  const queryString = buildQueryString((filters ?? {}) as QueryParams)
  return fetchApi(`/tasks/stats${queryString}`)
}

/**
 * Bitta topshiriqni ID bo'yicha oladi
 * 
 * @param id - Topshiriq ID
 * @returns Topshiriq ma'lumotlari
 * @throws {ApiError} - Topshiriq topilmadi
 */
export async function getTaskById(id: number | string): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/`)
}

/**
 * Yangi topshiriq yaratadi
 * 
 * FormData yoki oddiy obyekt qabul qiladi (fayl yuklash uchun FormData)
 * 
 * @param data - Topshiriq ma'lumotlari
 * @returns Yaratilgan topshiriq
 */
export async function createTask(data: TaskCreateInput | FormData): Promise<Task> {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData
  
  return fetchApi<Task>('/tasks/', {
    method: 'POST',
    body: isFormData ? data : JSON.stringify(data),
  })
}

/**
 * AI yordamida topshiriq matnini tahlil qilish
 * Audio yoki matn yuborilsa, AI topshiriq maydonlarini tavsiya qiladi.
 * Audio avval Whisper orqali matnga o'giriladi, keyin AI tahrir qiladi.
 */
export async function aiAnalyzeTask(data: { text?: string; audio?: Blob }): Promise<{
  transcription: string
  raw_transcription: string
  suggestions: {
    title: string
    description: string
    priority: string
    category: string
    organization_ids: string[]
    organization_names: string[]
    is_recurring: boolean
    frequency: string | null
    deadline_days: number
  }
}> {
  const form = new FormData()
  if (data.text) form.append('text', data.text)
  if (data.audio) form.append('audio', data.audio, 'audio.webm')
  
  return fetchApi('/tasks/ai-analyze/', {
    method: 'POST',
    body: form,
  })
}

/**
 * Mavjud topshiriqni yangilaydi
 * 
 * @param id - Topshiriq ID
 * @param data - Yangilanadigan ma'lumotlar
 * @returns Yangilangan topshiriq
 */
export async function updateTask(id: number | string, data: TaskUpdateInput): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Topshiriqni o'chiradi
 * 
 * @param id - Topshiriq ID
 */
export async function deleteTask(id: number | string): Promise<void> {
  return fetchApi<void>(`/tasks/${id}/`, { method: 'DELETE' })
}

// ============================================================================
// Task Status Actions
// ============================================================================

/**
 * Topshiriqni qabul qiladi
 * 
 * Holat: YANGI → IJRODA
 * 
 * @param id - Topshiriq ID
 * @returns Yangilangan topshiriq
 */
export async function acceptTask(id: number | string): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/accept/`, { method: 'POST' })
}

/**
 * Topshiriqni boshlaydi
 * 
 * @param id - Topshiriq ID
 * @returns Yangilangan topshiriq
 */
export async function startTask(id: number | string): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/start/`, { method: 'POST' })
}

/**
 * Topshiriqni ko'rib chiqishga yuboradi
 * 
 * Holat: IJRODA → BAJARILDI (tekshiruv kutish)
 * 
 * @param id - Topshiriq ID
 * @param data - Izoh
 * @returns Yangilangan topshiriq
 */
export async function submitTaskForReview(
  id: number | string,
  data: { comment?: string } = {}
): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/submit_for_review/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Topshiriqni tasdiqlaydi (nazoratdan yechish)
 * 
 * Holat: BAJARILDI → NAZORATDAN_YECHILDI
 * 
 * @param id - Topshiriq ID
 * @param data - Izoh
 * @returns Yangilangan topshiriq
 */
export async function approveTask(
  id: number | string, 
  data: { comment?: string } = {}
): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/close/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Topshiriqni rad etadi
 * 
 * Holat: BAJARILDI → QAYTA_IJROGA_YUBORILDI
 * 
 * @param id - Topshiriq ID
 * @param data - Rad etish sababi (majburiy)
 * @returns Yangilangan topshiriq
 */
export async function rejectTask(
  id: number | string, 
  data: { comment: string }
): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Topshiriqni bekor qiladi
 * 
 * @param id - Topshiriq ID
 * @param data - Bekor qilish sababi (majburiy)
 * @returns Yangilangan topshiriq
 */
export async function cancelTask(
  id: number | string, 
  data: { comment: string }
): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/cancel/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Topshiriq muddatini uzaytirish so'rovi yuboradi
 * 
 * @param id - Topshiriq ID
 * @param data - Yangi muddat va sabab
 * @returns Yangilangan topshiriq
 */
export async function requestDeadlineExtension(
  id: number | string, 
  data: { requested_deadline: string; reason: string }
): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/extend_request/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Topshiriqni bajarildi deb belgilaydi (tashkilot rahbari/mas'uli uchun)
 * 
 * @param id - Topshiriq ID
 * @param comment - Izoh (ixtiyoriy)
 * @returns Yangilangan topshiriq
 */
export async function markTaskComplete(
  id: number | string, 
  comment?: string
): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/mark-complete/`, {
    method: 'POST',
    body: JSON.stringify({ comment: comment || '' }),
  })
}

// ============================================================================
// Task Executions
// ============================================================================

/** Ijro yaratish uchun ma'lumotlar */
export interface ExecutionCreateInput {
  comment: string
  progress_percentage?: number
}

/**
 * Topshiriq ijro jarayonlarini oladi
 * 
 * @param taskId - Topshiriq ID
 * @returns Ijro jarayonlari ro'yxati
 */
export async function getTaskExecutions(taskId: number | string): Promise<TaskExecution[]> {
  return fetchApi<TaskExecution[]>(`/tasks/${taskId}/executions/`)
}

/**
 * Yangi ijro jarayonini qo'shadi
 * 
 * @param taskId - Topshiriq ID
 * @param data - Ijro ma'lumotlari
 * @returns Yaratilgan ijro
 */
export async function createTaskExecution(
  taskId: number | string,
  data: ExecutionCreateInput
): Promise<TaskExecution> {
  return fetchApi<TaskExecution>(`/tasks/${taskId}/executions/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ============================================================================
// Task Chat/Timeline
// ============================================================================

/** Xabar yuborish ma'lumotlari */
export interface TaskMessageInput {
  content?: string
  attachment?: File
}

/**
 * Topshiriq xabarlar tarixini oladi (timeline)
 * 
 * @param taskId - Topshiriq ID
 * @returns Xabarlar ro'yxati
 */
export async function getTaskChat(taskId: number | string): Promise<TaskChatMessage[]> {
  return fetchApi<TaskChatMessage[]>(`/tasks/${taskId}/timeline/`)
}

/**
 * Topshiriqqa xabar yuboradi
 * 
 * @param taskId - Topshiriq ID
 * @param data - Xabar mazmuni va/yoki fayl
 * @returns Yuborilgan xabar
 * @throws {ApiError} - Xabar yoki fayl bo'lishi kerak
 */
export async function sendTaskMessage(
  taskId: number | string,
  data: TaskMessageInput
): Promise<TaskChatMessage> {
  const hasContent = data.content?.trim()
  const hasAttachment = data.attachment instanceof File
  
  if (!hasContent && !hasAttachment) {
    throw new ApiError(
      'Xabar yoki fayl bo\'lishi kerak', 
      HTTP_STATUS.BAD_REQUEST,
      { detail: 'Xabar yoki fayl bo\'lishi kerak' }
    )
  }

  const form = new FormData()
  
  if (hasContent) {
    form.append('content', data.content!.trim())
  }
  
  if (hasAttachment && data.attachment) {
    form.append('attachment', data.attachment)
  }
  
  return fetchApi<TaskChatMessage>(`/tasks/${taskId}/timeline/`, {
    method: 'POST',
    body: form,
  })
}

/**
 * Topshiriq xabarini yangilaydi
 * 
 * @param taskId - Topshiriq ID
 * @param messageId - Xabar ID
 * @param content - Yangi mazmun
 * @returns Yangilangan xabar
 */
export async function updateTaskMessage(
  taskId: number | string,
  messageId: number | string,
  content: string
): Promise<TaskChatMessage> {
  return fetchApi<TaskChatMessage>(`/tasks/${taskId}/messages/${messageId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
}

/**
 * Topshiriq xabarini o'chiradi
 * 
 * @param taskId - Topshiriq ID
 * @param messageId - Xabar ID
 */
export async function deleteTaskMessage(
  taskId: number | string,
  messageId: number | string
): Promise<void> {
  return fetchApi<void>(`/tasks/${taskId}/messages/${messageId}/`, {
    method: 'DELETE',
  })
}

// ============================================================================
// Task History & User Tasks
// ============================================================================

/** Tarix yozuvi */
export interface TaskHistoryEntry {
  id: number
  action: string
  user: string
  comment?: string
  created_at: string
}

/**
 * Topshiriq o'zgarishlar tarixini oladi
 * 
 * @param taskId - Topshiriq ID
 * @returns Tarix yozuvlari
 */
export async function getTaskHistory(taskId: number | string): Promise<TaskHistoryEntry[]> {
  return fetchApi<TaskHistoryEntry[]>(`/tasks/${taskId}/history/`)
}

/**
 * Joriy foydalanuvchiga tegishli topshiriqlarni oladi
 * 
 * @returns Foydalanuvchi topshiriqlari
 */
export async function getMyTasks(): Promise<Task[]> {
  return fetchApi<Task[]>('/tasks/my_tasks/')
}

/**
 * Muddati o'tgan topshiriqlarni oladi
 * 
 * @returns Muddati o'tgan topshiriqlar
 */
export async function getOverdueTasks(): Promise<Task[]> {
  return fetchApi<Task[]>('/tasks/overdue/')
}

// ============================================================================
// Legacy Compatibility
// ============================================================================

/**
 * @deprecated sendTaskMessage dan foydalaning
 */
export async function postTaskChat(
  taskId: string, 
  body: { message: string }
): Promise<TaskChatMessage> {
  return sendTaskMessage(taskId, { content: body.message })
}

/**
 * @deprecated createTaskExecution dan foydalaning
 */
export async function postTaskExecution(
  taskId: string, 
  body: ExecutionCreateInput
): Promise<TaskExecution> {
  return createTaskExecution(taskId, body)
}

// ============================================================================
// Recurring Tasks
// ============================================================================

export interface RecurringTaskInput {
  title: string
  description: string
  frequency: string
  priority: string
  deadline_days: number
  organizations: string[]
  start_date: string
  end_date?: string
}

export interface RecurringTaskResponse {
  id: string
  title: string
  description: string
  frequency: string
  frequency_display: string
  priority: string
  deadline_days: number
  organizations: string[]
  organizations_count: number
  start_date: string
  end_date: string | null
  next_run_date: string | null
  last_run_date: string | null
  status: string
  status_display: string
  total_created: number
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
}

/**
 * Takrorlanuvchi topshiriq yaratish
 */
export async function createRecurringTask(data: RecurringTaskInput): Promise<RecurringTaskResponse> {
  return fetchApi<RecurringTaskResponse>('/tasks/recurring/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Takrorlanuvchi topshiriqlar ro'yxatini olish
 */
export async function getRecurringTasks(params?: {
  status?: string
  frequency?: string
}): Promise<RecurringTaskResponse[]> {
  const queryString = buildQueryString((params ?? {}) as QueryParams)
  const response = await fetchApi<PaginatedResponse<RecurringTaskResponse>>(`/tasks/recurring/${queryString}`)
  return response?.results ?? []
}
