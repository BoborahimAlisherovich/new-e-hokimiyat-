"use client"

import { cn } from "@/lib/utils"
import type { TaskStatus, UserStatus } from "@/lib/constants"
import { useTranslation } from "@/lib/i18n/context"
import {
  PRIORITY_LABEL,
  TASK_STATUS_HINT,
  TASK_STATUS_LABEL,
  USER_STATUS_LABEL,
  priorityClass,
  taskStatusClass,
  userStatusClass,
} from "@/lib/status-styles"

/**
 * Barcha holat nishonlari shu fayldan chiqadi. Ranglar lib/status-styles.ts
 * dagi klasslar orqali, klasslarning o'zi app/globals.css dagi tokenlarda —
 * shuning uchun bitta joyda o'zgartirilsa hamma joyda o'zgaradi va dark tema
 * avtomatik ishlaydi.
 *
 * Ilgari bu yerda bg-blue-500/20 text-blue-400 kabi DARK TEMA ranglari
 * yorug' fonda ishlatilgan edi: text-yellow-400 oq fonda 1.55:1 kontrast
 * bergan (WCAG AA talabi 4.5:1) — ya'ni topshiriq statusi amalda o'qilmasdi.
 */

type BadgeSize = "sm" | "md"

const sizeClass: Record<BadgeSize, string> = {
  sm: "text-2xs px-1.5 py-0.5",
  md: "",
}

export function TaskStatusBadge({
  status,
  size = "md",
  showHint = false,
  className,
}: {
  status: TaskStatus | string | null | undefined
  size?: BadgeSize
  /** Statusning ma'nosini title atributida ko'rsatish */
  showHint?: boolean
  className?: string
}) {
  const t = useTranslation()

  const i18nMap: Record<string, string | undefined> = {
    YANGI: t.task?.statuses?.NEW,
    IJRODA: t.task?.statuses?.IN_PROGRESS,
    TEKSHIRUVDA: t.task?.statuses?.IN_REVIEW,
    BAJARILDI: t.task?.statuses?.COMPLETED,
    MUDDATI_KECH: t.task?.statuses?.OVERDUE,
    QAYTA_IJROGA_YUBORILDI: t.task?.statuses?.REASSIGNED,
    BAJARILMADI: t.task?.statuses?.FAILED,
    NAZORATDAN_YECHILDI: t.task?.statuses?.RESOLVED,
  }

  const key = status ?? ""
  const label =
    i18nMap[key] ?? TASK_STATUS_LABEL[key] ?? key ?? t.common?.unknown ?? "—"

  return (
    <span
      className={cn(taskStatusClass(key), sizeClass[size], className)}
      title={showHint ? TASK_STATUS_HINT[key] : undefined}
    >
      {label}
    </span>
  )
}

export function UserStatusBadge({
  status,
  size = "md",
  className,
}: {
  status: UserStatus | string | null | undefined
  size?: BadgeSize
  className?: string
}) {
  const t = useTranslation()

  const i18nMap: Record<string, string | undefined> = {
    DRAFT: t.user?.statuses?.DRAFT,
    KUTILMOQDA: t.user?.statuses?.PENDING,
    FAOL: t.user?.statuses?.ACTIVE,
    BLOKLANGAN: t.user?.statuses?.BLOCKED,
    ARXIV: t.user?.statuses?.ARCHIVED,
  }

  const key = status ?? ""
  const label =
    i18nMap[key] ?? USER_STATUS_LABEL[key] ?? t.common?.unknown ?? "—"

  return (
    <span className={cn(userStatusClass(key), sizeClass[size], className)}>
      {label}
    </span>
  )
}

export function PriorityBadge({
  priority,
  size = "md",
  className,
}: {
  priority: string | null | undefined
  size?: BadgeSize
  className?: string
}) {
  const t = useTranslation()

  const i18nMap: Record<string, string | undefined> = {
    FAVQULODDA: t.task?.priorities?.FAVQULODDA,
    YUQORI: t.task?.priorities?.YUQORI,
    ODDIY: t.task?.priorities?.ODDIY,
    PAST: t.task?.priorities?.PAST,
  }

  const key = priority ?? ""
  const label =
    i18nMap[key] ?? PRIORITY_LABEL[key] ?? key ?? t.common?.unknown ?? "—"

  return (
    <span className={cn(priorityClass(key), sizeClass[size], className)}>
      {label}
    </span>
  )
}
