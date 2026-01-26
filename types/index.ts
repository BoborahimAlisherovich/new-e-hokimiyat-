// Types for E-Hokimiyat platform - Django Backend Compatible

// ==================== Enums ====================

export type UserRole = 'HOKIM' | 'HOKIMLIK_MASUL' | 'TASHKILOT_RAHBAR' | 'TASHKILOT_MASUL' | 'ADMIN'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

export type OrganizationType = 'HOKIMIYAT' | 'MAKTAB' | 'BOLALAR_BOG' | 'SHIFOXONA' | 'POLIKLINIKA' | 'BOSHQA'

export type OrganizationStatus = 'ACTIVE' | 'INACTIVE'

export type TaskStatus = 'YANGI' | 'QABUL_QILINDI' | 'JARAYONDA' | 'TEKSHIRUVDA' | 'BAJARILDI' | 'RAD_ETILDI' | 'BEKOR_QILINDI'

export type TaskPriority = 'PAST' | 'ODDIY' | 'YUQORI' | 'FAVQULODDA'

export type TaskCategory = 'IJRO' | 'NAZORAT' | 'HISOBOT' | 'YIGIRISH' | 'BOSHQA'

export type NotificationType = 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'TASK_COMPLETED' | 'TASK_OVERDUE' | 'SYSTEM' | 'MESSAGE'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'DOWNLOAD' | 'STATUS_CHANGE'

// ==================== Base Interfaces ====================

export interface BaseModel {
  id: number
  created_at: string
  updated_at: string
}

// ==================== User Interfaces ====================

export interface User extends BaseModel {
  pnfl: string
  first_name: string
  last_name: string
  middle_name?: string
  email?: string
  phone?: string
  role: UserRole
  status: UserStatus
  position?: string
  organization?: Organization
  organization_id?: number
  district?: District
  district_id?: number
  last_login?: string
  avatar?: string
  full_name: string
}

export interface UserProfile {
  user: User
  statistics: {
    total_tasks: number
    completed_tasks: number
    pending_tasks: number
    overdue_tasks: number
    completion_rate: number
  }
}

// ==================== Region & District ====================

export interface Region extends BaseModel {
  name: string
  code: string
}

export interface District extends BaseModel {
  name: string
  code: string
  region: Region
  region_id: number
}

// ==================== Organization Interfaces ====================

export interface Organization extends BaseModel {
  name: string
  type: OrganizationType
  inn?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  district: District
  district_id: number
  parent?: Organization
  parent_id?: number
  director?: User
  director_id?: number
  status: OrganizationStatus
  employee_count?: number
  description?: string
  children?: Organization[]
  statistics?: OrganizationStatistics
}

export interface OrganizationStatistics {
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  overdue_tasks: number
  completion_rate: number
  average_completion_time: number
}

// ==================== Task Interfaces ====================

export interface Task extends BaseModel {
  number: string
  title: string
  description?: string
  category: TaskCategory
  priority: TaskPriority
  status: TaskStatus
  source?: string
  source_document_number?: string
  source_document_date?: string
  
  created_by: User
  created_by_id: number
  assigned_to?: User
  assigned_to_id?: number
  organization?: Organization
  organization_id?: number
  
  due_date: string
  started_at?: string
  completed_at?: string
  
  parent_task?: Task
  parent_task_id?: number
  
  attachments?: TaskAttachment[]
  executions?: TaskExecution[]
  chat_messages?: TaskChatMessage[]
  history?: TaskHistory[]
  
  is_overdue: boolean
  days_remaining?: number
  progress_percentage: number
}

export interface TaskAttachment extends BaseModel {
  task_id: number
  file: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_by: User
  uploaded_by_id: number
}

export interface TaskExecution extends BaseModel {
  task_id: number
  executor: User
  executor_id: number
  status: TaskStatus
  comment?: string
  attachments?: TaskAttachment[]
  progress_percentage: number
}

export interface TaskChatMessage extends BaseModel {
  task_id: number
  sender: User
  sender_id: number
  message: string
  attachments?: TaskAttachment[]
  is_system_message: boolean
}

export interface TaskHistory extends BaseModel {
  task_id: number
  changed_by: User
  changed_by_id: number
  action: AuditAction
  old_value?: string
  new_value?: string
  field_name?: string
  comment?: string
}

// ==================== Notification Interfaces ====================

export interface Notification extends BaseModel {
  user_id: number
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  read_at?: string
  related_task?: Task
  related_task_id?: number
  link?: string
}

// ==================== Audit Interfaces ====================

export interface AuditLog extends BaseModel {
  user?: User
  user_id?: number
  action: AuditAction
  model_name: string
  object_id?: number
  object_repr: string
  changes?: Record<string, any>
  ip_address?: string
  user_agent?: string
  extra_data?: Record<string, any>
}

// ==================== Analytics Interfaces ====================

export interface DashboardStats {
  users: {
    total: number
    active: number
    by_role: Record<UserRole, number>
  }
  organizations: {
    total: number
    active: number
    by_type: Record<OrganizationType, number>
  }
  tasks: {
    total: number
    by_status: Record<TaskStatus, number>
    by_priority: Record<TaskPriority, number>
    overdue: number
    completed_today: number
    created_today: number
  }
  notifications: {
    total: number
    unread: number
  }
}

export interface OrganizationAnalytics {
  organization: Organization
  statistics: OrganizationStatistics
  monthly_data: {
    month: string
    created: number
    completed: number
  }[]
  top_performers: {
    user: User
    completed_tasks: number
    completion_rate: number
  }[]
}

export interface TaskTrends {
  period: string
  data: {
    date: string
    created: number
    completed: number
    overdue: number
  }[]
}

// ==================== API Response Interfaces ====================

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface ApiError {
  detail?: string
  message?: string
  errors?: Record<string, string[]>
}

// ==================== Auth Interfaces ====================

export interface LoginRequest {
  pnfl: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export interface TokenRefreshRequest {
  refresh: string
}

export interface TokenRefreshResponse {
  access: string
}

// ==================== Filter & Search Interfaces ====================

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  category?: TaskCategory
  assigned_to?: number
  organization?: number
  created_by?: number
  due_date_from?: string
  due_date_to?: string
  search?: string
  ordering?: string
}

export interface UserFilters {
  role?: UserRole
  status?: UserStatus
  organization?: number
  district?: number
  search?: string
}

export interface OrganizationFilters {
  type?: OrganizationType
  status?: OrganizationStatus
  district?: number
  parent?: number
  search?: string
}

// ==================== Form Interfaces ====================

export interface TaskCreateInput {
  title: string
  description?: string
  category: TaskCategory
  priority: TaskPriority
  assigned_to_id?: number
  organization_id?: number
  due_date: string
  parent_task_id?: number
  source?: string
  source_document_number?: string
  source_document_date?: string
}

export interface TaskUpdateInput extends Partial<TaskCreateInput> {
  status?: TaskStatus
}

export interface UserCreateInput {
  pnfl: string
  first_name: string
  last_name: string
  middle_name?: string
  email?: string
  phone?: string
  role: UserRole
  position?: string
  organization_id?: number
  district_id?: number
}

export interface UserUpdateInput extends Partial<Omit<UserCreateInput, 'pnfl'>> {
  status?: UserStatus
}

export interface OrganizationCreateInput {
  name: string
  type: OrganizationType
  inn?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  district_id: number
  parent_id?: number
  director_id?: number
  description?: string
}

export interface OrganizationUpdateInput extends Partial<OrganizationCreateInput> {
  status?: OrganizationStatus
}

// ==================== Legacy Compatibility (for existing components) ====================

export interface Appeal {
  id: string
  citizenName: string
  citizenPhone: string
  citizenEmail: string
  subject: string
  description: string
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
  assignedTo?: User
  organization?: Organization
  district: string
  address: string
  createdAt: string
  updatedAt: string
}

export interface Stats {
  total: number
  pending: number
  inProgress: number
  resolved: number
  completed?: number
}

export interface FilterOptions {
  status: Record<string, string>
  priority: Record<string, string>
  category: Record<string, string>
  districts: string[]
}
