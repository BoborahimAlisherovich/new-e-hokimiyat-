export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-background text-muted-foreground border-border",
  MEDIUM: "bg-warning-soft text-warning-soft-foreground border-border",
  HIGH: "bg-destructive-soft text-destructive-soft-foreground border-border",
  // Telegram bot priorities
  low: "bg-background text-muted-foreground border-border",
  medium: "bg-warning-soft text-warning-soft-foreground border-border",
  high: "bg-warning-soft text-warning-soft-foreground border-border",
  urgent: "bg-destructive-soft text-destructive-soft-foreground border-border",
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-primary-soft text-primary-soft-foreground border-border",
  IN_PROGRESS: "bg-success-soft text-success-soft-foreground border-border",
  RESOLVED: "bg-success-soft text-success-soft-foreground border-border",
  REJECTED: "bg-destructive-soft text-destructive-soft-foreground border-border",
  OVERDUE: "bg-destructive-soft text-destructive-soft-foreground border-border",
  // Telegram bot statuses
  pending_ai: "bg-primary-soft text-primary-soft-foreground border-border",
  pending_review: "bg-warning-soft text-warning-soft-foreground border-border",
  approved: "bg-success-soft text-success-soft-foreground border-border",
  rejected: "bg-destructive-soft text-destructive-soft-foreground border-border",
  responded: "bg-[var(--st-tekshiruvda-bg)] text-[var(--st-tekshiruvda-fg)] border-border",
  forwarded: "bg-primary-soft text-primary-soft-foreground border-border",
  resolved: "bg-success-soft text-success-soft-foreground border-border",
}

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Паст",
  MEDIUM: "Ўртача",
  HIGH: "Юқори",
  // Telegram bot priorities
  low: "Паст",
  medium: "Ўртача",
  high: "Юқори",
  urgent: "Шошилинч",
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Кутилмоқда",
  IN_PROGRESS: "Бажарилмоқда",
  RESOLVED: "Ҳал этилган",
  REJECTED: "Рад этилган",
  // Telegram bot statuses
  pending_ai: "AI текширувида",
  pending_review: "Кўриб чиқилмоқда",
  approved: "Тасдиқланган",
  rejected: "Рад этилган",
  responded: "Жавоб берилган",
  forwarded: "Топшириқ сифатида киритилган",
  resolved: "Ҳал қилинган",
}
