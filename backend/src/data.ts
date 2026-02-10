// Database Models according to Technical Specification

export enum UserStatus {
  DRAFT = 'DRAFT',
  KUTILMOQDA = 'KUTILMOQDA',
  FAOL = 'FAOL',
  BLOKLANGAN = 'BLOKLANGAN',
  ARXIV = 'ARXIV'
}

export enum UserRole {
  TUMAN_HOKIMI = 'TUMAN_HOKIMI',
  HOKIMLIK_MASUL = 'HOKIMLIK_MASUL',
  TASHKILOT_RAHBARI = 'TASHKILOT_RAHBARI',
  TASHKILOT_MASUL = 'TASHKILOT_MASUL',
  ADMIN = 'ADMIN'
}

export enum TaskStatus {
  YANGI = 'YANGI',
  IJRODA = 'IJRODA',
  BAJARILDI = 'BAJARILDI',
  QAYTA_IJROGA_YUBORILDI = 'QAYTA_IJROGA_YUBORILDI',
  MUDDATI_KECH = 'MUDDATI_KECH',
  BAJARILMADI = 'BAJARILMADI',
  NAZORATDAN_YECHILDI = 'NAZORATDAN_YECHILDI'
}

export enum TaskPriority {
  MUHIM_SHOSHILINCH = 'MUHIM_SHOSHILINCH',
  MUHIM = 'MUHIM',
  ORTACHA = 'ORTACHA'
}

export enum ActionType {
  IJROGA_OLINDI = 'IJROGA_OLINDI',
  HISOBOT_TOPSHIRILDI = 'HISOBOT_TOPSHIRILDI',
  QAYTA_YUBORILDI = 'QAYTA_YUBORILDI',
  NAZORATDAN_YECHILDI = 'NAZORATDAN_YECHILDI',
  MUDDAT_UZAYTIRISH_SOROVI = 'MUDDAT_UZAYTIRISH_SOROVI'
}

export enum AuditAction {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_BLOCKED = 'USER_BLOCKED',
  USER_ARCHIVED = 'USER_ARCHIVED',
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_EXECUTED = 'TASK_EXECUTED',
  TASK_CLOSED = 'TASK_CLOSED',
  ORGANIZATION_CREATED = 'ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED = 'ORGANIZATION_UPDATED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED'
}

export interface User {
  id: string
  pnfl: string // Unique, indexed - OneID integration
  firstName: string
  lastName: string
  middleName?: string
  phone?: string
  roleId: string
  organizationId?: string
  status: UserStatus
  oneidConnected: boolean
  createdBy: string
  createdAt: string
  activatedAt?: string
  blockedAt?: string
  archivedAt?: string
}

export interface Role {
  id: string
  name: string
  displayName: string
  permissions: string[]
}

export interface Organization {
  id: string
  name: string
  parentOrgId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  // Sector is kept as string to stay compatible with frontend mock Sector type
  sector?: string
  deadline: string
  location?: {
    lat: number
    lng: number
    address?: string
  }
  createdBy: string
  createdAt: string
  updatedAt: string
  closedAt?: string
  // Multiple organizations can be assigned
  organizations: string[]
  // Files and attachments
  attachments?: string[]
}

export interface TaskOrganization {
  id: string
  taskId: string
  organizationId: string
  status: TaskStatus
  assignedAt: string
  acceptedAt?: string
  completedAt?: string
  deadline: string
  extendedDeadline?: string
}

export interface TaskExecution {
  id: string
  taskId: string
  executedBy: string
  actionType: ActionType
  comment: string
  attachments?: string[]
  createdAt: string
  // For organization-specific executions
  organizationId?: string
}

export interface TaskTimeline {
  id: string
  taskId: string
  userId: string
  type: 'message' | 'file' | 'audio' | 'system_log'
  content: string
  fileUrl?: string
  audioUrl?: string
  systemAction?: string
  createdAt: string
  isSystem: boolean
}

export interface UserAssignment {
  id: string
  assignedUserId: string
  assignedBy: string
  assignedRoleId: string
  assignedOrganizationId?: string
  assignedAt: string
}

export interface AuditLog {
  id: string
  userId: string
  action: AuditAction
  details: string
  targetType: 'user' | 'task' | 'organization' | 'settings'
  targetId: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  description: string
  read: boolean
  createdAt: string
  taskId?: string
  organizationId?: string
}

export interface SystemSettings {
  telegramBotToken: string
  telegramBotUsername: string
  emailSmtpHost: string
  emailSmtpPort: number
  emailSenderAddress: string
  oneidClientId: string
  oneidClientSecret: string
  oneidCallbackUrl: string
}

// Mock data for development
export const roles: Role[] = [
  {
    id: '1',
    name: 'TUMAN_HOKIMI',
    displayName: 'Туман ҳокими',
    permissions: [
      'create_users',
      'create_organizations',
      'manage_organizations',
      'create_tasks',
      'close_tasks',
      'view_all',
      'manage_settings'
    ]
  },
  {
    id: '2',
    name: 'HOKIMLIK_MASUL',
    displayName: 'Ҳокимлик масъули',
    permissions: [
      'create_users',
      'create_organizations',
      'manage_organizations',
      'create_tasks',
      'view_department'
    ]
  },
  {
    id: '3',
    name: 'TASHKILOT_RAHBARI',
    displayName: 'Ташкилот раҳбари',
    permissions: ['manage_organization_users', 'accept_tasks', 'submit_reports', 'request_extensions']
  },
  {
    id: '4',
    name: 'TASHKILOT_MASUL',
    displayName: 'Ташкилот масъули',
    permissions: ['accept_tasks', 'submit_reports', 'request_extensions']
  },
  {
    id: '5',
    name: 'ADMIN',
    displayName: 'Админ',
    permissions: ['admin_all']
  }
]

export const users: User[] = [
  {
    id: "1",
    pnfl: "31234567890123",
    firstName: "Абдулла",
    lastName: "Каримов",
    middleName: "Тошпўлатович",
    phone: "+998901234567",
    roleId: "1",
    status: UserStatus.FAOL,
    oneidConnected: true,
    createdBy: "1",
    createdAt: "2026-01-01T00:00:00Z",
    activatedAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "2",
    pnfl: "32345678901234",
    firstName: "Дилшод",
    lastName: "Раҳимов",
    middleName: "Абдураҳмонович",
    phone: "+998902345678",
    roleId: "2",
    status: UserStatus.FAOL,
    oneidConnected: true,
    createdBy: "1",
    createdAt: "2026-01-01T00:00:00Z",
    activatedAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "3",
    pnfl: "33456789012345",
    firstName: "Малика",
    lastName: "Тошматова",
    middleName: "Илҳомовна",
    phone: "+998903456789",
    roleId: "3",
    organizationId: "1",
    status: UserStatus.FAOL,
    oneidConnected: true,
    createdBy: "2",
    createdAt: "2026-01-02T00:00:00Z",
    activatedAt: "2026-01-02T00:00:00Z"
  }
]

export const organizations: Organization[] = [
  {
    id: "1",
    name: "Коммунал хўжалик бўлими",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "2",
    name: "Таълим бўлими",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z"
  }
]

export const tasks: Task[] = [
  {
    id: "1",
    title: "Ички йўлларни таъмирлаш",
    description: "Марказий кўчада 500 метр масофада йўл қопламаси таъмирлаш ишлари",
    priority: TaskPriority.MUHIM_SHOSHILINCH,
    status: TaskStatus.IJRODA,
    sector: "KOMMUNAL_SOHA",
    deadline: "2026-02-01T00:00:00Z",
    location: {
      lat: 40.123456,
      lng: 67.890123,
      address: "Марказий кўча, 1-уй"
    },
    createdBy: "1",
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-01-10T09:00:00Z",
    organizations: ["1"]
  },
  {
    id: "2",
    title: "Мактаб биноси таъмирлаш",
    description: "15-сонли мактаб спорт зали ва ошхона биноси капитал таъмирлаш",
    priority: TaskPriority.MUHIM,
    status: TaskStatus.BAJARILDI,
    sector: "TALIM",
    deadline: "2026-01-25T00:00:00Z",
    createdBy: "1",
    createdAt: "2026-01-05T10:00:00Z",
    updatedAt: "2026-01-20T15:00:00Z",
    closedAt: "2026-01-20T15:00:00Z",
    organizations: ["2"]
  }
]

export const taskOrganizations: TaskOrganization[] = [
  {
    id: "1",
    taskId: "1",
    organizationId: "1",
    status: TaskStatus.IJRODA,
    assignedAt: "2026-01-10T09:00:00Z",
    acceptedAt: "2026-01-11T09:15:00Z",
    deadline: "2026-02-01T00:00:00Z"
  },
  {
    id: "2",
    taskId: "2",
    organizationId: "2",
    status: TaskStatus.BAJARILDI,
    assignedAt: "2026-01-05T10:00:00Z",
    acceptedAt: "2026-01-06T11:00:00Z",
    completedAt: "2026-01-20T15:00:00Z",
    deadline: "2026-01-25T00:00:00Z"
  }
]

export const taskExecutions: TaskExecution[] = [
  {
    id: "1",
    taskId: "1",
    executedBy: "3",
    actionType: ActionType.IJROGA_OLINDI,
    comment: "Топшириқ қабул қилинди, материаллар буюртма қилинди",
    createdAt: "2026-01-11T09:15:00Z",
    organizationId: "1"
  },
  {
    id: "2",
    taskId: "2",
    executedBy: "4",
    actionType: ActionType.HISOBOT_TOPSHIRILDI,
    comment: "Таъмирлаш ишлари муваффақиятли якунланди. Барча ҳужжатлар тақдим этилди.",
    attachments: ["report_15_school.pdf", "photos_15_school.zip"],
    createdAt: "2026-01-20T14:30:00Z",
    organizationId: "2"
  }
]

export const taskTimeline: TaskTimeline[] = [
  {
    id: "1",
    taskId: "1",
    userId: "1",
    type: "system_log",
    content: "Топшириқ яратилди",
    systemAction: "TASK_CREATED",
    createdAt: "2026-01-10T09:00:00Z",
    isSystem: true
  },
  {
    id: "2",
    taskId: "1",
    userId: "3",
    type: "message",
    content: "Топшириқ қабул қилинди. Ишлар бошланди.",
    createdAt: "2026-01-11T09:15:00Z",
    isSystem: false
  },
  {
    id: "3",
    taskId: "2",
    userId: "1",
    type: "system_log",
    content: "Топшириқ назоратдан ечиб қўйилди",
    systemAction: "TASK_CLOSED",
    createdAt: "2026-01-20T15:00:00Z",
    isSystem: true
  }
]

export const userAssignments: UserAssignment[] = [
  {
    id: "1",
    assignedUserId: "3",
    assignedBy: "2",
    assignedRoleId: "3",
    assignedOrganizationId: "1",
    assignedAt: "2026-01-02T10:00:00Z"
  }
]

export const auditLogs: AuditLog[] = [
  {
    id: "1",
    userId: "1",
    action: AuditAction.TASK_CREATED,
    details: "Ички йўлларни таъмирлаш топшириғи яратилди",
    targetType: "task",
    targetId: "1",
    createdAt: "2026-01-10T09:00:00Z"
  },
  {
    id: "2",
    userId: "2",
    action: AuditAction.USER_CREATED,
    details: "Малика Тошматова ташкилот раҳбари сифатида қўшилди",
    targetType: "user",
    targetId: "3",
    createdAt: "2026-01-02T10:00:00Z"
  }
]

export const notifications: Notification[] = [
  {
    id: "1",
    userId: "3",
    type: "task_new",
    title: "Янги топшириқ",
    description: "Ички йўлларни таъмирлаш - муддат: 01.02.2026",
    read: false,
    createdAt: "2026-01-10T09:00:00Z",
    taskId: "1"
  },
  {
    id: "2",
    userId: "1",
    type: "task_completed",
    title: "Топшириқ бажарилди",
    description: "Мактаб биноси таъмирлаш топшириғи якунланди",
    read: false,
    createdAt: "2026-01-20T15:00:00Z",
    taskId: "2"
  }
]

export const systemSettings: SystemSettings = {
  telegramBotToken: "",
  telegramBotUsername: "",
  emailSmtpHost: "smtp.gov.uz",
  emailSmtpPort: 587,
  emailSenderAddress: "noreply@hokimlik.uz",
  oneidClientId: "ehokimiyat_client",
  oneidClientSecret: "secret_key",
  oneidCallbackUrl: "http://localhost:4000/auth/oneid/callback"
}
