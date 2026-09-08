/**
 * CHAT API — v2
 * =============
 *
 * Nima uchun yangi fayl: eski `lib/api/chat.api.ts` `page`/`page_size`
 * parametrlarini yuborardi, backend esa ularni e'tiborsiz qoldirib BUTUN
 * tarixni bitta javobda qaytarardi (10 000 xabarli suhbat = 10 000 obyekt).
 * Endi backend kursor bo'yicha sahifalaydi (`before_id` + `limit`) va
 * qo'shimcha imkoniyatlar bor: `client_id` (optimistik yuborish),
 * `reply_to`, tahrirlash, yumshoq o'chirish, alohida fayl yuklash,
 * qidiruv, birinchi o'qilmagan xabar.
 *
 * Eski fayl saqlanadi — `getUnreadChatCount()` boshqa joylarda ishlatiladi.
 */

import { API_BASE, fetchApi, getAccessToken } from './client'

/* ============================================================== TURLAR */

export type AttachmentKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE' | 'FILE'

export interface ChatAttachment {
  id: number
  url: string | null
  original_name: string
  mime_type: string
  kind: AttachmentKind
  size: number
  width: number | null
  height: number | null
  duration_ms: number | null
  created_at: string
}

export interface ChatUserBrief {
  id: string
  email?: string
  first_name?: string
  last_name?: string
  full_name?: string
  role?: string
  position?: string
  avatar_url?: string | null
  is_online?: boolean
  last_seen?: string | null
}

export interface ReplyPreview {
  id: number
  sender_name: string
  preview: string
  kind: string
  is_deleted: boolean
}

export interface ChatMessage {
  id: number
  client_id: string | null
  sender: ChatUserBrief
  sender_name: string
  recipient: ChatUserBrief
  recipient_name: string
  content: string
  /** Eski bitta fayl maydoni (orqaga moslik) */
  attachment: string | null
  attachments: ChatAttachment[]
  reply_to: ReplyPreview | null
  created_at: string
  updated_at: string
  is_read: boolean
  read_at: string | null
  delivered_at: string | null
  is_edited: boolean
  edited_at: string | null
  is_deleted: boolean
  deleted_at: string | null
  /** Qidiruv natijalarida qo'shiladi */
  peer_id?: string
}

export interface ChatConversation {
  id: number
  other_participant: ChatUserBrief | null
  last_message: ChatMessage | null
  unread_count: number
  updated_at: string
}

export interface HistoryPage {
  results: ChatMessage[]
  has_more: boolean
  next_before_id: number | null
}

/* =========================================================== SUHBATLAR */

/** Suhbatdosh bo'lishi mumkin bo'lgan foydalanuvchilar (rolga qarab) */
export async function getChatPeers(): Promise<ChatUserBrief[]> {
  const res = await fetchApi<{ results?: ChatUserBrief[] } | ChatUserBrief[]>(
    '/users/chat_users/',
  )
  return Array.isArray(res) ? res : (res.results ?? [])
}

/** Sidebar uchun suhbatlar ro'yxati (oxirgi xabar + o'qilmagan soni) */
export async function getConversations(): Promise<ChatConversation[]> {
  const res = await fetchApi<{ results?: ChatConversation[] } | ChatConversation[]>(
    '/chat/messages/conversations/',
  )
  return Array.isArray(res) ? res : (res.results ?? [])
}

/**
 * Suhbat tarixi — kursor bo'yicha.
 *
 * `before_id` berilmasa eng yangi sahifa qaytadi. Natijalar ESKIDAN
 * YANGIGA tartibda. Bu GET hech narsani o'zgartirmaydi (ilgari u
 * o'qilganlik holatini yozib, bo'sh suhbat satri ham yaratardi).
 */
export async function getHistory(
  peerId: string,
  options: { beforeId?: number; limit?: number } = {},
): Promise<HistoryPage> {
  const sp = new URLSearchParams()
  sp.set('limit', String(options.limit ?? 40))
  if (options.beforeId) sp.set('before_id', String(options.beforeId))

  const res = await fetchApi<HistoryPage | ChatMessage[]>(
    `/chat/messages/conversation/${peerId}/?${sp.toString()}`,
  )
  if (Array.isArray(res)) {
    return { results: res, has_more: false, next_before_id: null }
  }
  return {
    results: res.results ?? [],
    has_more: Boolean(res.has_more),
    next_before_id: res.next_before_id ?? null,
  }
}

/** Birinchi o'qilmagan xabar — "O'qilmagan xabarlar" chizig'i uchun */
export async function getFirstUnread(
  peerId: string,
): Promise<{ message_id: number | null; unread_count: number }> {
  try {
    return await fetchApi(`/chat/messages/conversation/${peerId}/first-unread/`)
  } catch {
    return { message_id: null, unread_count: 0 }
  }
}

/* ============================================================ YUBORISH */

export interface SendPayload {
  content?: string
  /** Optimistik yuborish kaliti — server shu bilan dublikatni oldini oladi */
  clientId: string
  replyToId?: number
  /** Oldindan yuklangan fayllarning id'lari */
  attachmentIds?: number[]
}

export async function sendMessage(peerId: string, payload: SendPayload): Promise<ChatMessage> {
  return fetchApi<ChatMessage>(`/chat/messages/message/${peerId}/`, {
    method: 'POST',
    body: JSON.stringify({
      content: payload.content ?? '',
      client_id: payload.clientId,
      ...(payload.replyToId ? { reply_to_id: payload.replyToId } : {}),
      ...(payload.attachmentIds?.length ? { attachment_ids: payload.attachmentIds } : {}),
    }),
  })
}

/**
 * Faylni xabardan ALOHIDA yuklaydi va id qaytaradi.
 * Shu sababli yuklash progressini ko'rsatish mumkin va xabar matni
 * fayl yuklanishini kutib turmaydi.
 *
 * `XMLHttpRequest` ishlatilgan: `fetch` yuklash progressini bermaydi.
 */
export function uploadAttachment(
  file: File,
  options: {
    kind?: 'VOICE'
    durationMs?: number
    width?: number
    height?: number
    onProgress?: (percent: number) => void
    signal?: AbortSignal
  } = {},
): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    if (options.kind) form.append('kind', options.kind)
    if (options.durationMs) form.append('duration_ms', String(Math.round(options.durationMs)))
    if (options.width) form.append('width', String(options.width))
    if (options.height) form.append('height', String(options.height))

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/chat/attachments/`)

    const token = getAccessToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && options.onProgress) {
        options.onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as ChatAttachment)
        } catch {
          reject(new Error('Server javobini o‘qib bo‘lmadi'))
        }
      } else {
        let message = `Yuklash xatosi (${xhr.status})`
        try {
          const body = JSON.parse(xhr.responseText)
          if (body?.detail) message = body.detail
        } catch {
          /* ignore */
        }
        reject(new Error(message))
      }
    }

    xhr.onerror = () => reject(new Error('Tarmoq xatosi — fayl yuklanmadi'))
    xhr.onabort = () => reject(new DOMException('Bekor qilindi', 'AbortError'))

    options.signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(form)
  })
}

/* ============================================================= AMALLAR */

export async function markConversationRead(peerId: string): Promise<void> {
  await fetchApi('/chat/messages/mark-as-read/', {
    method: 'POST',
    body: JSON.stringify({ user_id: peerId }),
  })
}

export async function editMessage(messageId: number, content: string): Promise<ChatMessage> {
  return fetchApi<ChatMessage>(`/chat/messages/${messageId}/edit/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function deleteMessage(
  messageId: number,
): Promise<{ status: string; message: ChatMessage }> {
  return fetchApi(`/chat/messages/${messageId}/delete/`, { method: 'DELETE' })
}

export async function searchMessages(
  query: string,
  peerId?: string,
): Promise<{ results: ChatMessage[]; count: number }> {
  const sp = new URLSearchParams({ q: query })
  if (peerId) sp.set('user_id', peerId)
  try {
    return await fetchApi(`/chat/search/?${sp.toString()}`)
  } catch {
    return { results: [], count: 0 }
  }
}

/* ============================================================ YORDAMCHI */

export function displayName(u?: ChatUserBrief | null): string {
  if (!u) return '—'
  const joined = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
  return joined || u.full_name || u.email || '—'
}

export function attachmentKindOf(m: ChatMessage): AttachmentKind | null {
  if (m.attachments?.length) return m.attachments[0].kind
  if (m.attachment) {
    if (/\.(jpe?g|png|webp|gif|heic|avif)$/i.test(m.attachment)) return 'IMAGE'
    if (/\.(mp4|webm|mov)$/i.test(m.attachment)) return 'VIDEO'
    if (/\.(mp3|m4a|ogg|wav)$/i.test(m.attachment)) return 'AUDIO'
    return 'FILE'
  }
  return null
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDuration(ms?: number | null): string {
  if (!ms || ms <= 0) return '0:00'
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
