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
import { HTTP_STATUS } from './types'

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
  const params = { ...filters, page, page_size: pageSize }
  const queryString = buildQueryString(params)
  const response = await fetchApi<PaginatedResponse<Task>>(`/tasks${queryString}`)
  
  return response?.results ?? []
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
 * Topshiriqni tasdiqlaydi
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
  return fetchApi<Task>(`/tasks/${id}/approve/`, {
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
