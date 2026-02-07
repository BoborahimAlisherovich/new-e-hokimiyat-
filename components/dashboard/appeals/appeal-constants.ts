export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-600 border-slate-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-rose-50 text-rose-600 border-rose-200",
  // Telegram bot priorities
  low: "bg-slate-50 text-slate-600 border-slate-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-600 border-orange-200",
  urgent: "bg-rose-50 text-rose-600 border-rose-200",
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-blue-50 text-blue-600 border-blue-100",
  IN_PROGRESS: "bg-emerald-50 text-emerald-600 border-emerald-100",
  RESOLVED: "bg-teal-50 text-teal-600 border-teal-100",
  REJECTED: "bg-rose-50 text-rose-600 border-rose-100",
  OVERDUE: "bg-red-50 text-red-600 border-red-100",
  // Telegram bot statuses
  pending_ai: "bg-blue-50 text-blue-600 border-blue-100",
  pending_review: "bg-amber-50 text-amber-600 border-amber-100",
  approved: "bg-teal-50 text-teal-600 border-teal-100",
  rejected: "bg-rose-50 text-rose-600 border-rose-100",
  responded: "bg-violet-50 text-violet-600 border-violet-100",
  forwarded: "bg-indigo-50 text-indigo-600 border-indigo-100",
  resolved: "bg-emerald-50 text-emerald-600 border-emerald-100",
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
