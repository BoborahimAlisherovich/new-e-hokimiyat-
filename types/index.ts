// Types for E-Hokimiyat platform - Django Backend Compatible

// ==================== Enums ====================

export type UserRole = 'HOKIM' | 'HOKIM_YORDAMCHISI' | 'HOKIMLIK_MASUL' | 'TASHKILOT_RAHBAR' | 'TASHKILOT_RAHBARI' | 'TASHKILOT_MASUL' | 'ADMIN'

export type UserStatus = 'DRAFT' | 'KUTILMOQDA' | 'FAOL' | 'BLOKLANGAN' | 'ARXIV' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

export type OrganizationType = 'HOKIMIYAT' | 'MAKTAB' | 'BOLALAR_BOG' | 'SHIFOXONA' | 'POLIKLINIKA' | 'BOSHQA'

export type OrganizationStatus = 'ACTIVE' | 'INACTIVE'

export type TaskStatus = 'YANGI' | 'IJRODA' | 'TEKSHIRUVDA' | 'BAJARILDI' | 'QAYTA_IJROGA_YUBORILDI' | 'MUDDATI_KECH' | 'BAJARILMADI' | 'NAZORATDAN_YECHILDI'

export type TaskPriority = 'PAST' | 'ODDIY' | 'YUQORI' | 'FAVQULODDA'

export type TaskCategory = 'IJRO' | 'NAZORAT' | 'HISOBOT' | 'YIGIRISH' | 'BOSHQA'

export type NotificationType = 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'TASK_COMPLETED' | 'TASK_OVERDUE' | 'SYSTEM' | 'MESSAGE'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'DOWNLOAD' | 'STATUS_CHANGE'

// ==================== Base Interfaces ====================

export interface BaseModel {
  id: number | string
  created_at: string
  updated_at: string
}

// ==================== User Interfaces ====================

export interface User extends BaseModel {
  login: string
  pnfl?: string
  masked_pnfl?: string
  first_name: string
  last_name: string
  middle_name?: string
  email?: string
  phone?: string
  role: UserRole
  status: UserStatus
  activated_at?: string
  first_login_at?: string
  position?: string
  organization?: Organization
  organization_id?: number | string
  organization_name?: string
  sector?: string | { id: string | number; name: string }
  sector_id?: number | string
  sector_name?: string
  supervisor?: User | string
  supervisor_id?: number | string
  supervisor_name?: string
  permissions?: {
    can_create_tasks?: boolean
    can_close_tasks?: boolean
    can_manage_users?: boolean
    can_manage_organizations?: boolean
    can_execute_tasks?: boolean
    can_view_analytics?: boolean
    can_view_audit?: boolean
  }
  profile_guidance?: string
  district?: District
  district_id?: number
  last_login?: string
  avatar?: string
  avatar_url?: string
  visible_password?: string
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

export interface PositionOption {
  id: number | string
  name: string
  description?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
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
 type?: OrganizationType
 inn?: string
 address?: string
 phone?: string
 email?: string
 website?: string
 district?: District
 district_id?: number
 parent?: Organization
 parent_id?: number
 director?: User
 director_id?: number
 status?: OrganizationStatus
 is_active?: boolean
 isActive?: boolean
 sector?: string
 head?: string
 rating?: number
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
  assigned_deputies?: User[]
  assigned_to?: User
  assigned_to_id?: number
  organization?: Organization
  organization_id?: number
  
  due_date?: string
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
 deadline?: string
 assigned_organizations?: (Organization | number)[]
 organizations?: (Organization | number)[]
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
  id: number
  task_id: number
  sender: User
  sender_id: number
  message: string
  attachments?: TaskAttachment[]
  attachment?: TaskAttachment[]
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
  due_date?: string
  parent_task_id?: number
  source?: string
  source_document_number?: string
  source_document_date?: string
}

export interface TaskUpdateInput extends Partial<TaskCreateInput> {
  status?: TaskStatus
}

export interface UserCreateInput {
  login: string
  pnfl: string
  first_name: string
  last_name: string
  middle_name?: string
  email?: string
  phone?: string
  role: UserRole
  position?: string
  password: string
  organization?: string  // UUID string
  sector?: string
  supervisor?: string
  district_id?: string   // UUID string
}

export interface UserUpdateInput extends Partial<Omit<UserCreateInput, 'pnfl'>> {
  status?: UserStatus
}

export interface OrganizationCreateInput {
  name: string
  type?: OrganizationType
  inn?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  district_id?: number
  parent_id?: number
  director_id?: number
  description?: string
  sector?: string
}

export interface OrganizationUpdateInput extends Partial<OrganizationCreateInput> {
 status?: OrganizationStatus
 is_active?: boolean
}

// ==================== Legacy Compatibility (for existing components) ====================

export interface Appeal {
  id: string
  citizenName: string
  citizenGender?: string
  citizenPhone: string
  citizenEmail: string
  subject: string
  description: string
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'low' | 'medium' | 'high' | 'urgent'
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'pending_ai' | 'pending_review' | 'approved' | 'rejected' | 'responded' | 'forwarded' | 'resolved' | 'OVERDUE' | 'overdue'
  assignedTo?: User
  organization?: Organization
  district: string
  address: string
  latitude?: number | null
  longitude?: number | null
  createdAt: string
  updatedAt: string
  // Baholash maydonlari
  rating?: number | null
  rating_comment?: string
  rated_at?: string | null
  closed_at?: string | null
  attachments?: AppealAttachment[]
  newMessagesCount?: number
  lastMessageAt?: string | null
}

export interface AppealAttachment {
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

export interface Project extends BaseModel {
  title: string
  summary: string
  category: 'MAHALLIY' | 'XALQARO' | 'DRIVER'
  category_display?: string
  status: 'REJA' | 'TASDIQLANGAN' | 'IJRODA' | 'MONITORING' | 'YAKUNLANGAN'
  status_display?: string
  progress: number
  budget?: string
  owner?: string
  start_date?: string | null
  end_date?: string | null
  sort_order?: number
  is_active?: boolean
  history_entries?: ProjectHistory[]
}

export type ProjectScope = 'active' | 'archived' | 'all'

export interface ProjectCreateInput {
  title: string
  summary?: string
  category: 'MAHALLIY' | 'XALQARO' | 'DRIVER'
  status: 'REJA' | 'TASDIQLANGAN' | 'IJRODA' | 'MONITORING' | 'YAKUNLANGAN'
  progress: number
  budget?: string
  owner?: string
  start_date?: string | null
  end_date?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface ProjectUpdateInput extends Partial<ProjectCreateInput> {}

export interface ProjectHistory extends BaseModel {
  action_type: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'PROGRESS_CHANGED' | 'DELETED'
  action_display?: string
  title: string
  description?: string
  actor_name?: string
}

export interface ProjectAttachment extends BaseModel {
  file_name: string
  file_url?: string | null
  uploaded_by_name?: string
}

export interface ProjectComment extends BaseModel {
  message: string
  author_name?: string
}

export interface ProjectSummary {
  total: number
  active_count: number
  archived_count: number
  completed_count: number
  driver_count: number
  average_progress: number
}

// ==================== Recurring Task Interfaces ====================

export type RecurringFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'

export type RecurringStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'

export interface RecurringTask extends BaseModel {
  title: string
  description: string
  frequency: RecurringFrequency
  frequency_display: string
  cron_expression?: string
  cron_description?: string
  start_date: string
  end_date?: string
  next_run_date?: string
  last_run_date?: string
  priority: TaskPriority
  deadline_days: number
  organizations: number[]
  organizations_count: number
  created_by: number
  created_by_name: string
  status: RecurringStatus
  status_display: string
  total_created: number
}

// ==================== AI Interfaces ====================

export type AIMessageRole = 'system' | 'user' | 'assistant'

export type AIActionType = 'CREATE_RECURRING_TASK' | 'EXPORT_ANALYTICS' | 'CREATE_TASK' | 'CLOSE_TASK' | 'REMOVE_CONTROL' | 'GENERATE_REPORT' | 'SEND_NOTIFICATION' | 'CLOSE_APPEAL'

export type AIActionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface AIConversation extends BaseModel {
  title: string
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  last_message?: {
    role: AIMessageRole
    content: string
    created_at: string
  }
}

export interface AIMessage extends BaseModel {
  role: AIMessageRole
  content: string
  is_audio_message: boolean
  detected_intent?: string
  intent_confidence?: number
}

export interface AIAction extends BaseModel {
  action_type: AIActionType
  status: AIActionStatus
  parameters: Record<string, unknown>
  result: Record<string, unknown>
  initiated_by: number
  initiated_by_name?: string
  executed_at?: string
}

export interface AIReport extends BaseModel {
  report_type: string
  title: string
  summary: string
  content: Record<string, unknown>
  period_start?: string
  period_end?: string
  requested_by: number
  requested_by_name?: string
}

export interface AITaskMonitor extends BaseModel {
  task: number
  task_title: string
  task_status: TaskStatus
  task_deadline: string
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  needs_attention: boolean
  ai_notes: string
  warning_sent: boolean
  warning_sent_at?: string
}
