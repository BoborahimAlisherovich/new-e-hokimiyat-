/**
 * ESKI FAYL — MOSLASHUV QATLAMI.
 *
 * Bu yerda ilgari topshiriq statuslari va muhimliklari uchun alohida rang
 * jadvali bor edi (bir xil statuslar uchun boshqa joylarda yana 5 xil jadval
 * bilan birga). Endi yagona manba — lib/status-styles.ts.
 *
 * Yangi kodda to'g'ridan-to'g'ri quyidagilardan foydalaning:
 *   import { TaskStatusBadge, PriorityBadge } from "@/components/ui/status-badge"
 *   import { taskStatusClass, priorityClass } from "@/lib/status-styles"
 */

export {
  TASK_STATUS_CLASS as STATUS_COLORS,
  TASK_STATUS_LABEL as STATUS_LABELS,
  PRIORITY_CLASS as PRIORITY_COLORS,
  PRIORITY_LABEL as PRIORITY_LABELS,
  TASK_STATUS_HINT,
  TASK_STATUS_ORDER,
  TASK_STATUS_TERMINAL,
  TASK_STATUS_AWAITING_APPROVAL,
  TASK_STATUS_NEEDS_ACTION,
  PRIORITY_ORDER,
  PRIORITY_DEFAULT_DAYS,
  TASK_STATUSES,
  PRIORITIES,
  taskStatusClass,
  priorityClass,
  badgeClass,
} from "@/lib/status-styles"

export type { TaskStatusKey, PriorityKey } from "@/lib/status-styles"
