import type { ChatMessage } from "@/lib/api/chat-v2.api"

/**
 * Chat uchun sof funksiyalar: guruhlash, sana yorliqlari, formatlash.
 *
 * `Intl.DateTimeFormat` obyektlari MODUL DARAJASIDA keshlanadi. Ilgari
 * har bir xabar uchun har renderda `toLocaleString`/`toLocaleTimeString`
 * chaqirilardi — bu Intl obyektini har safar qaytadan quradi va uzun
 * suhbatda sezilarli sekinlashuvga olib keladi.
 */

const fmtCache = new Map<string, Intl.DateTimeFormat>()

function fmt(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(opts)}`
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, opts)
    fmtCache.set(key, f)
  }
  return f
}

export function intlLocale(language: string | undefined): string {
  switch (language) {
    case "ru":
      return "ru-RU"
    case "en":
      return "en-GB"
    case "uz-cyrl":
      return "uz-Cyrl-UZ"
    default:
      return "uz-Latn-UZ"
  }
}

/** Faqat vaqt — bubble ichidagi belgi */
export function timeLabel(iso: string, language?: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return fmt(intlLocale(language), { hour: "2-digit", minute: "2-digit" }).format(d)
}

/** Suhbat ro'yxatidagi vaqt: bugun bo'lsa soat, aks holda sana */
export function listTimeLabel(iso: string | null | undefined, language?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  if (isSameDay(d, new Date())) {
    return fmt(intlLocale(language), { hour: "2-digit", minute: "2-digit" }).format(d)
  }
  const days = daysBetween(d, new Date())
  if (days < 7) {
    return fmt(intlLocale(language), { weekday: "short" }).format(d)
  }
  return fmt(intlLocale(language), { day: "2-digit", month: "2-digit" }).format(d)
}

/**
 * Sana ajratgichi: «Bugun», «Kecha», «12 sentabr».
 * Ilgari har bir xabar ustida to'liq `dd.mm.yyyy hh:mm` turardi.
 */
export function dateSeparatorLabel(iso: string, language?: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const now = new Date()

  if (isSameDay(d, now)) return LABELS[language ?? "uz"]?.today ?? "Bugun"

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(d, yesterday)) return LABELS[language ?? "uz"]?.yesterday ?? "Kecha"

  const sameYear = d.getFullYear() === now.getFullYear()
  return fmt(intlLocale(language), {
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(d)
}

const LABELS: Record<string, { today: string; yesterday: string }> = {
  uz: { today: "Bugun", yesterday: "Kecha" },
  "uz-cyrl": { today: "Бугун", yesterday: "Кеча" },
  ru: { today: "Сегодня", yesterday: "Вчера" },
  en: { today: "Today", yesterday: "Yesterday" },
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime())
  return Math.floor(ms / 86_400_000)
}

/** «oxirgi faollik 14:32» / «oxirgi faollik 12.09» */
export function lastSeenLabel(iso: string | null | undefined, language?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (mins < 1) return "hozir onlayn edi"
  if (mins < 60) return `${mins} daqiqa oldin`
  if (isSameDay(d, new Date())) return `bugun ${timeLabel(iso, language)}`
  return `${fmt(intlLocale(language), { day: "2-digit", month: "2-digit" }).format(d)} ${timeLabel(iso, language)}`
}

/* ======================================================= GURUHLASH ========= */

/** Klient tomonda kutayotgan xabar ham shu shaklda saqlanadi */
export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed"

export interface LocalMessage extends Partial<ChatMessage> {
  /** Server id (kelgach) */
  id?: number
  client_id: string | null
  content: string
  created_at: string
  is_read?: boolean
  delivered_at?: string | null
  is_edited?: boolean
  is_deleted?: boolean
  /** Bizning xabarimiz bo'lsa true */
  mine: boolean
  status: MessageStatus
  /** Yuborishda xato bo'lsa — foydalanuvchiga ko'rsatiladi */
  error?: string
}

export type ThreadRow =
  | { kind: "date"; key: string; label: string }
  | { kind: "unread"; key: string; count: number }
  | {
      kind: "message"
      key: string
      message: LocalMessage
      /** Guruhda birinchi (avatar/ism ko'rsatiladi) */
      first: boolean
      /** Guruhda oxirgi (vaqt va bubble dumi ko'rsatiladi) */
      last: boolean
    }

const GROUP_WINDOW_MS = 5 * 60 * 1000

/**
 * Xabarlar ro'yxatini ko'rinish qatorlariga aylantiradi:
 * sana ajratgichlari, o'qilmaganlar chizig'i va jo'natuvchi + vaqt
 * bo'yicha guruhlash.
 */
export function buildThreadRows(
  messages: LocalMessage[],
  options: { firstUnreadId?: number | null; unreadCount?: number; language?: string } = {},
): ThreadRow[] {
  const rows: ThreadRow[] = []
  let lastDateKey = ""
  let unreadInserted = false

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    const prev = messages[i - 1]
    const next = messages[i + 1]

    // Sana ajratgichi
    const d = new Date(m.created_at)
    const dateKey = Number.isNaN(d.getTime())
      ? "?"
      : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (dateKey !== lastDateKey) {
      rows.push({
        kind: "date",
        key: `date-${dateKey}`,
        label: dateSeparatorLabel(m.created_at, options.language),
      })
      lastDateKey = dateKey
    }

    // O'qilmaganlar chizig'i
    if (
      !unreadInserted &&
      options.firstUnreadId &&
      m.id === options.firstUnreadId &&
      (options.unreadCount ?? 0) > 0
    ) {
      rows.push({
        kind: "unread",
        key: "unread-divider",
        count: options.unreadCount ?? 0,
      })
      unreadInserted = true
    }

    const sameAsPrev =
      prev &&
      prev.mine === m.mine &&
      withinWindow(prev.created_at, m.created_at) &&
      sameDayIso(prev.created_at, m.created_at)

    const sameAsNext =
      next &&
      next.mine === m.mine &&
      withinWindow(m.created_at, next.created_at) &&
      sameDayIso(m.created_at, next.created_at) &&
      // Ajratgich orasiga tushsa guruh uziladi
      !(options.firstUnreadId && next.id === options.firstUnreadId && !unreadInserted)

    rows.push({
      kind: "message",
      key: `m-${m.id ?? m.client_id ?? i}`,
      message: m,
      first: !sameAsPrev,
      last: !sameAsNext,
    })
  }

  return rows
}

function withinWindow(a: string, b: string): boolean {
  const ta = new Date(a).getTime()
  const tb = new Date(b).getTime()
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false
  return Math.abs(tb - ta) <= GROUP_WINDOW_MS
}

function sameDayIso(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false
  return isSameDay(da, db)
}

/* ==================================================== SERVERDAN MAHALLIYGA */

export function toLocal(m: ChatMessage, myId: string): LocalMessage {
  const mine = String(m.sender?.id ?? "") === String(myId)
  return {
    ...m,
    mine,
    status: mine ? (m.is_read ? "read" : m.delivered_at ? "delivered" : "sent") : "sent",
  }
}

/** Oxirgi xabar oldin ko'rsatiladigan qisqa matn */
export function previewOf(m: ChatMessage | null | undefined, myId: string): string {
  if (!m) return ""
  const prefix = String(m.sender?.id ?? "") === String(myId) ? "Siz: " : ""
  if (m.is_deleted) return `${prefix}xabar o‘chirildi`

  const text = (m.content ?? "").trim()
  if (text) return prefix + text

  const kind = m.attachments?.[0]?.kind
  if (kind === "IMAGE") return `${prefix}📷 Rasm`
  if (kind === "VIDEO") return `${prefix}🎬 Video`
  if (kind === "VOICE") return `${prefix}🎤 Ovozli xabar`
  if (kind === "AUDIO") return `${prefix}🎵 Audio`
  if (kind === "FILE" || m.attachment) return `${prefix}📎 Fayl`
  return prefix.trim()
}
