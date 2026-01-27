import type {
  User,
  Organization,
  Task,
  Notification,
  AuditLog,
  DashboardStats,
  OrganizationAnalytics,
  TaskTrends,
  PaginatedResponse,
  LoginRequest,
  LoginResponse,
  TokenRefreshResponse,
  TaskFilters,
  UserFilters,
  OrganizationFilters,
  TaskCreateInput,
  TaskUpdateInput,
  UserCreateInput,
  UserUpdateInput,
  OrganizationCreateInput,
  OrganizationUpdateInput,
  TaskExecution,
  TaskChatMessage,
  District,
  Region,
} from '@/types'

// API Base URL - Django backend
// Production: https://api.gameroom.uz, Development: /api (proxy)
const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  // Production environment detection
  if (typeof window !== 'undefined' && window.location.hostname === 'gameroom.uz') {
    return 'https://api.gameroom.uz'
  }
  return '/api'
}

export const API_BASE = getApiBase()

// ==================== Token Management ====================

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('access_token', token)
    } else {
      localStorage.removeItem('access_token')
    }
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('access_token')
  }
  return accessToken
}

export function setRefreshToken(token: string | null) {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('refresh_token', token)
    } else {
      localStorage.removeItem('refresh_token')
    }
  }
}

export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refresh_token')
  }
  return null
}

export function clearTokens() {
  accessToken = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }
}

// ==================== API Client ====================

class ApiError extends Error {
  status: number
  data: any

  constructor(message: string, status: number, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken()
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  }

  if (isFormData && (headers as Record<string, string>)['Content-Type']) {
    delete (headers as Record<string, string>)['Content-Type']
  }
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  // Handle 401 – try to refresh token and retry once
  if (response.status === 401) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      const newToken = getAccessToken()
      if (newToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
      }
      const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      })
      // Use the retry response for further handling
      if (!retryResponse.ok) {
        const errorText = await retryResponse.text().catch(() => 'No response body')
        let errorData = {}
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          console.error(`fetchApi: Failed to parse error response as JSON. Status: ${retryResponse.status}, Body: ${errorText}`)
        }
        console.error(`fetchApi: Request failed for ${endpoint}. Status: ${retryResponse.status}, Error Data:`, errorData)
        throw new ApiError(
          errorData.detail || errorData.message || `Request failed with status ${retryResponse.status}`,
          retryResponse.status,
          errorData
        )
      }
      // Successful retry
      if (retryResponse.status === 204) return {} as T
      return retryResponse.json()
    }
    // If we couldn't refresh, clear tokens and redirect to login
    clearTokens()
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new ApiError('Session expired', 401)
  }

  // Non‑401 response handling
  if (!response.ok) {
    // Gracefully handle missing Settings endpoint – return empty object instead of throwing.
    if (response.status === 404 && endpoint.includes('/settings/')) {
      return {} as T
    }
    const errorText = await response.text().catch(() => 'No response body')
    let errorData = {}
    try {
      errorData = JSON.parse(errorText)
    } catch (e) {
      console.error(`fetchApi: Failed to parse error response as JSON. Status: ${response.status}, Body: ${errorText}`)
    }
    console.error(`fetchApi: Request failed for ${endpoint}. Status: ${response.status}, Error Data:`, errorData)
    throw new ApiError(
      errorData.detail || errorData.message || `Request failed with status ${response.status}`,
      response.status,
      errorData
    )
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  
  try {
    const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    })
    
    if (!response.ok) return false
    
    const data: TokenRefreshResponse = await response.json()
    setAccessToken(data.access)
    return true
  } catch {
    return false
  }
}

function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  }
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

// ==================== Auth API ====================

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      errorData.detail || 'Login failed',
      response.status,
      errorData
    )
  }
  
  const result: LoginResponse = await response.json()
  setAccessToken(result.access)
  setRefreshToken(result.refresh)
  return result
}

export async function logout(): Promise<void> {
  try {
    await fetchApi('/auth/logout/', { method: 'POST' })
  } finally {
    clearTokens()
  }
}

export async function getCurrentUser(): Promise<User> {
  return fetchApi<User>('/auth/me/')
}

export async function refreshToken(): Promise<TokenRefreshResponse> {
  const refresh = getRefreshToken()
  if (!refresh) throw new ApiError('No refresh token', 401)
  
  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  
  if (!response.ok) {
    throw new ApiError('Token refresh failed', response.status)
  }
  
  const data: TokenRefreshResponse = await response.json()
  setAccessToken(data.access)
  return data
}

// ==================== Users API ====================

export async function getUsers(
  filters?: UserFilters,
  page = 1,
  pageSize = 100
): Promise<User[]> {
  const params = { ...filters, page, page_size: pageSize }
  const queryString = buildQueryString(params)
  const response = await fetchApi<PaginatedResponse<User>>(`/users${queryString}`)
  return response.results || []
}

export async function getUserById(id: number | string): Promise<User> {
  return fetchApi<User>(`/users/${id}/`)
}

export async function createUser(data: UserCreateInput): Promise<User> {
  return fetchApi<User>('/users/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateUser(id: number | string, data: UserUpdateInput): Promise<User> {
  return fetchApi<User>(`/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteUser(id: number | string): Promise<void> {
  return fetchApi<void>(`/users/${id}/`, { method: 'DELETE' })
}

export async function getUserStatistics(id: number | string) {
  return fetchApi<any>(`/users/${id}/statistics/`)
}

// ==================== Organizations API ====================

export async function getOrganizations(
  filters?: OrganizationFilters,
  page = 1,
  pageSize = 100
): Promise<Organization[]> {
  const params = { ...filters, page, page_size: pageSize }
  const queryString = buildQueryString(params)
  const response = await fetchApi<PaginatedResponse<Organization>>(`/organizations${queryString}`)
  return response.results || []
}

export async function getOrganizationById(id: number | string): Promise<Organization> {
  return fetchApi<Organization>(`/organizations/${id}/`)
}

export async function createOrganization(data: OrganizationCreateInput): Promise<Organization> {
  return fetchApi<Organization>('/organizations/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateOrganization(
  id: number | string,
  data: OrganizationUpdateInput
): Promise<Organization> {
  return fetchApi<Organization>(`/organizations/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteOrganization(id: number | string): Promise<void> {
  return fetchApi<void>(`/organizations/${id}/`, { method: 'DELETE' })
}

export async function getOrganizationStatistics(id: number | string): Promise<any> {
  return fetchApi<any>(`/organizations/${id}/statistics/`)
}

export async function getOrganizationTree(): Promise<Organization[]> {
  return fetchApi<Organization[]>('/organizations/tree/')
}

// ==================== Tasks API ====================

export async function getTasks(
  filters?: TaskFilters,
  page = 1,
  pageSize = 100
): Promise<Task[]> {
  const params = { ...filters, page, page_size: pageSize }
  const queryString = buildQueryString(params)
  const response = await fetchApi<PaginatedResponse<Task>>(`/tasks${queryString}`)
  if (!response || !response.results) return []
  return response.results
}

export async function getTaskById(id: number | string): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/`)
}

export async function createTask(data: TaskCreateInput | FormData): Promise<Task> {
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData
  return fetchApi<Task>('/tasks/', {
    method: 'POST',
    body: isFormData ? data : JSON.stringify(data),
  })
}

export async function updateTask(id: number | string, data: TaskUpdateInput): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteTask(id: number | string): Promise<void> {
  return fetchApi<void>(`/tasks/${id}/`, { method: 'DELETE' })
}

// Task status actions
export async function acceptTask(id: number | string): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/accept/`, { method: 'POST' })
}

export async function startTask(id: number | string): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/start/`, { method: 'POST' })
}

export async function submitTaskForReview(
  id: number | string,
  data: { comment?: string }
): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/submit_for_review/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function approveTask(id: number | string, data: { comment?: string }): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/approve/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function rejectTask(id: number | string, data: { comment: string }): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function cancelTask(id: number | string, data: { comment: string }): Promise<Task> {
  return fetchApi<Task>(`/tasks/${id}/cancel/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Task executions
export async function getTaskExecutions(taskId: number | string): Promise<TaskExecution[]> {
  return fetchApi<TaskExecution[]>(`/tasks/${taskId}/executions/`)
}

export async function createTaskExecution(
  taskId: number | string,
  data: { comment: string; progress_percentage?: number }
): Promise<TaskExecution> {
  return fetchApi<TaskExecution>(`/tasks/${taskId}/executions/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Task chat
export async function getTaskChat(taskId: number | string): Promise<TaskChatMessage[]> {
  return fetchApi<TaskChatMessage[]>(`/tasks/${taskId}/timeline/`)
}

export async function sendTaskMessage(
  taskId: number | string,
  data: { content?: string; attachment?: File }
): Promise<TaskChatMessage> {
  // Validate that at least one field is provided
  const hasContent = data.content && data.content.trim()
  const hasAttachment = data.attachment instanceof File
  
  if (!hasContent && !hasAttachment) {
    throw new ApiError('Message must have content or attachment', 400, {
      detail: 'Message must have content or attachment',
    })
  }

  const form = new FormData()
  if (hasContent) form.append('content', data.content!.trim())
  if (hasAttachment) form.append('attachment', data.attachment)
  
  return fetchApi<TaskChatMessage>(`/tasks/${taskId}/timeline/`, {
    method: 'POST',
    body: form,
  })
}

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

export async function deleteTaskMessage(
  taskId: number | string,
  messageId: number | string
): Promise<void> {
  return fetchApi<void>(`/tasks/${taskId}/messages/${messageId}/`, {
    method: 'DELETE',
  })
}

// ==================== Direct Chat API ====================

export async function getChatConversations(): Promise<any[]> {
  return fetchApi<any[]>('/chat/messages/conversations/')
}

export async function getChatMessages(userId: number | string): Promise<any[]> {
  return fetchApi<any[]>(`/chat/messages/conversation/${userId}/`)
}

export async function sendChatMessage(
  userId: number | string,
  data: { content?: string; attachment?: File | Blob | null }
): Promise<any> {
  const hasAttachment = data.attachment instanceof File || data.attachment instanceof Blob
  if (hasAttachment) {
    const formData = new FormData()
    if (data.content) formData.append('content', data.content)
    if (data.attachment) {
      const file = data.attachment instanceof File
        ? data.attachment
        : new File([data.attachment], `attachment_${Date.now()}`, {
            type: (data.attachment as Blob).type || 'application/octet-stream',
          })
      formData.append('attachment', file)
    }
    return fetchApi<any>(`/chat/messages/message/${userId}/`, {
      method: 'POST',
      body: formData,
    })
  }

  return fetchApi<any>(`/chat/messages/message/${userId}/`, {
    method: 'POST',
    body: JSON.stringify({ content: data.content || '' }),
  })
}

// Task history
export async function getTaskHistory(taskId: number | string) {
  return fetchApi<any[]>(`/tasks/${taskId}/history/`)
}

// Task statistics
export async function getMyTasks(): Promise<Task[]> {
  return fetchApi<Task[]>('/tasks/my_tasks/')
}

export async function getOverdueTasks(): Promise<Task[]> {
  return fetchApi<Task[]>('/tasks/overdue/')
}

// ==================== Notifications API ====================

export async function getNotifications(
  page = 1,
  pageSize = 100
): Promise<Notification[]> {
  const response = await fetchApi<PaginatedResponse<Notification>>(
    `/notifications/?page=${page}&page_size=${pageSize}`
  )
  return response.results || []
}

export async function getNotificationById(id: number | string): Promise<Notification> {
  return fetchApi<Notification>(`/notifications/${id}/`)
}

export async function markNotificationRead(id: number | string): Promise<Notification> {
  return fetchApi<Notification>(`/notifications/${id}/mark_read/`, {
    method: 'POST',
  })
}

export async function markAllNotificationsRead(): Promise<void> {
  return fetchApi<void>('/notifications/mark_all_read/', { method: 'POST' })
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const data = await fetchApi<{ count: number }>('/notifications/unread_count/')
  return data.count
}

// ==================== Audit API ====================

export async function getAuditLogs(
  filters?: {
    user?: number
    action?: string
    model_name?: string
    date_from?: string
    date_to?: string
  },
  page = 1,
  pageSize = 50
): Promise<AuditLog[]> {
  const params = { ...filters, page, page_size: pageSize }
  const queryString = buildQueryString(params)
  const response = await fetchApi<PaginatedResponse<AuditLog>>(`/audit${queryString}`)
  return response.results || []
}

// ==================== Analytics API ====================

export async function getAnalyticsDashboard(): Promise<DashboardStats> {
  return fetchApi<DashboardStats>('/analytics/dashboard/')
}

export async function getAnalyticsOrganizations(): Promise<OrganizationAnalytics[]> {
  return fetchApi<OrganizationAnalytics[]>('/analytics/organizations/')
}

export async function getAnalyticsUsers() {
  return fetchApi<any>('/analytics/users/')
}

export async function getAnalyticsTrends(period: 'week' | 'month' | 'year' = 'month'): Promise<TaskTrends> {
  return fetchApi<TaskTrends>(`/analytics/trends/?period=${period}`)
}

export async function getAnalyticsExport(format: 'xlsx' | 'pdf' = 'xlsx'): Promise<Blob> {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE}/analytics/export/?format=${format}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  
  if (!response.ok) {
    throw new ApiError('Export failed', response.status)
  }
  
  return response.blob()
}

// ==================== Regions & Districts API ====================

export async function getRegions(): Promise<Region[]> {
  return fetchApi<Region[]>('/regions/')
}

export async function getDistricts(regionId?: number): Promise<District[]> {
  const query = regionId ? `?region=${regionId}` : ''
  return fetchApi<District[]>(`/districts/${query}`)
}

// ==================== Settings API ====================

export async function getSettings(): Promise<any> {
  return fetchApi<any>('/settings/')
}

export async function updateSettings(data: any): Promise<any> {
  return fetchApi<any>('/settings/', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// ==================== File Upload ====================

export async function uploadFile(file: File, taskId?: number): Promise<{ url: string; id: number }> {
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
    throw new ApiError('File upload failed', response.status)
  }
  
  return response.json()
}

// ==================== Legacy compatibility functions ====================

export async function postTaskChat(taskId: string, body: { message: string }) {
  return sendTaskMessage(taskId, body)
}

export async function postTaskExecution(taskId: string, body: any) {
  return createTaskExecution(taskId, body)
}

export async function postSettings(body: any) {
  return updateSettings(body)
}

export async function getAppeals() {
  // Appeals are now handled as tasks with specific category
  const tasks = await getTasks({ category: 'IJRO' })
  return tasks || []
}

export async function getAppealById(id: string) {
  return getTaskById(id)
}
