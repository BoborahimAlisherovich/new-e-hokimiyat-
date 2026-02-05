export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800 border-gray-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-red-100 text-red-800 border-red-200",
  // Telegram bot priorities
  low: "bg-gray-100 text-gray-800 border-gray-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-orange-100 text-orange-800 border-orange-200",
  RESOLVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  // Telegram bot statuses
  pending_ai: "bg-blue-100 text-blue-800 border-blue-200",
  pending_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  responded: "bg-purple-100 text-purple-800 border-purple-200",
  forwarded: "bg-indigo-100 text-indigo-800 border-indigo-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
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
