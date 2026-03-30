/**
 * API Module Index
 * 
 * Barcha API modullarini eksport qiladi.
 * Tashqi foydalanish uchun yagona kirish nuqtasi.
 * 
 * @module api
 * @author E-Hokimiyat Development Team
 * 
 * @example
 * // Tavsiya etilgan import usuli
 * import { getUsers, getTasks, login } from '@/lib/api'
 * 
 * // Yoki barcha API ni import qilish
 * import * as api from '@/lib/api'
 */

// ============================================================================
// Client (Core Utilities)
// ============================================================================

export {
  // Configuration
  API_BASE,
  WS_BASE,
  
  // Token Management
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
  
  // Core Functions
  fetchApi,
  buildQueryString,
  
  // Error Class
  ApiError,
  
  // Axios-like API
  api,
} from './client'

// ============================================================================
// Types
// ============================================================================

export {
  // Constants
  TOKEN_KEYS,
  HTTP_STATUS,
} from './types'

export type {
  // HTTP Types
  HttpMethod,
  ApiRequestConfig,
  QueryParams,
  ApiResponse,
  PaginationMeta,
  PaginatedApiResponse,
  
  // Auth Types
  LoginRequest,
  LoginResponse,
  AuthUser,
  TokenRefreshResponse,
  
  // Chat Types
  ChatMessage,
  ChatConversation,
  
  // Appeal Types
  AppealStatus,
  AppealPriority,
  NormalizedAppeal,
  TelegramAppeal,
  TelegramUser,
  
  // Error Types
  ApiErrorDetails,
} from './types'

// ============================================================================
// Authentication
// ============================================================================

export {
  login,
  logout,
  getCurrentUser,
  refreshToken,
} from './auth.api'

// ============================================================================
// Users
// ============================================================================

export {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
  archiveUser,
  getUserStatistics,
  updateCurrentUserProfile,
  uploadAvatar,
  deleteAvatar,
  getChatUsers,
} from './users.api'

export type {
  UserStatistics,
  ProfileUpdateInput,
} from './users.api'

// ============================================================================
// Organizations
// ============================================================================

export {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationStatistics,
  getOrganizationTree,
} from './organizations.api'

export type {
  OrganizationStatistics,
  OrganizationTreeNode,
} from './organizations.api'

export {
  getProjects,
  getProjectsSummary,
  createProject,
  updateProject,
  deleteProject,
  restoreProject,
  getProjectById,
  getProjectHistory,
  getProjectComments,
  addProjectComment,
  getProjectAttachments,
  uploadProjectAttachment,
  getProjectKpi,
} from './projects.api'

// ============================================================================
// Sectors
// ============================================================================

export {
  getSectors,
  getSectorById,
  createSector,
  updateSector,
  deleteSector,
} from './sectors.api'

export type {
  Sector,
  SectorCreateInput,
  SectorUpdateInput,
} from './sectors.api'

// ============================================================================
// Tasks
// ============================================================================

export {
  // CRUD
  getTasks,
  getTasksPage,
  getTaskStats,
  getTaskById,
  createTask,
  aiAnalyzeTask,
  updateTask,
  deleteTask,
  
  // Status Actions
  acceptTask,
  startTask,
  submitTaskForReview,
  approveTask,
  rejectTask,
  cancelTask,
  requestDeadlineExtension,
  markTaskComplete,
  
  // Executions
  getTaskExecutions,
  createTaskExecution,
  
  // Chat/Timeline
  getTaskChat,
  sendTaskMessage,
  updateTaskMessage,
  deleteTaskMessage,
  
  // History & User Tasks
  getTaskHistory,
  getMyTasks,
  getOverdueTasks,
  
  // Legacy (deprecated)
  postTaskChat,
  postTaskExecution,
  
  // Recurring Tasks
  createRecurringTask,
  getRecurringTasks,
} from './tasks.api'

export type {
  ExecutionCreateInput,
  TaskMessageInput,
  TaskHistoryEntry,
  RecurringTaskInput,
  RecurringTaskResponse,
} from './tasks.api'

// ============================================================================
// Chat
// ============================================================================

export {
  getChatConversations,
  getChatMessages,
  sendChatMessage,
  markChatMessagesAsRead,
  getUnreadChatCount,
  deleteChatMessage,
} from './chat.api'

// ============================================================================
// Appeals (Telegram)
// ============================================================================

export {
  getAppeals,
  getAppealById,
  getAppealCategories,
  getAppealCategoriesAdmin,
  getAppealMessages,
  getAppealHistory,
  getUnreadAppealsCount,
  sendAppealMessage,
  closeAppeal,
  reviewAppeal,
  assignAppeal,
  updateAppealCategory,
  createTaskFromAppeal,
} from './appeals.api'

export type {
  AppealMessage,
  AppealHistoryItem,
  SendMessageResponse,
  AppealReviewRequest,
  CreateTaskFromAppealRequest,
  AppealCategoryItem,
  AppealCategoryAdminItem,
  AppealAssignRequest,
} from './appeals.api'

// ============================================================================
// Common (Notifications, Audit, Analytics, Settings, etc.)
// ============================================================================

export {
  // Notifications
  getNotifications,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getUnreadNotificationsCount,
  
  // Audit
  getAuditLogs,
  
  // Analytics
  getAnalyticsDashboard,
  getOrgDashboard,
  getAnalyticsOrganizations,
  getAnalyticsUsers,
  getAnalyticsTrends,
  getAnalyticsExport,
  
  // Regions & Districts
  getRegions,
  getDistricts,
  
  // Settings
  getSettings,
  updateSettings,
  postSettings,
  
  // File Upload
  uploadFile,
} from './common.api'

export type {
  AuditLogFilters,
  OrgDashboardData,
  UserAnalytics,
  AnalyticsPeriod,
  ExportFormat,
  SystemSettings,
  UploadedFile,
} from './common.api'
