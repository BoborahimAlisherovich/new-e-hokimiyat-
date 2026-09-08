/**
 * TASDIQLASH OQIMI API
 * ====================
 *
 * Nima uchun alohida fayl: `lib/api/tasks.api.ts` da bu oqim uchun bir
 * nechta noto'g'ri va o'lik funksiya bor edi —
 *   - `rejectTask()` `/tasks/{id}/reject/` ga so'rov yuborardi. Bunday
 *     endpoint YO'Q (haqiqiy nomi `/reassign/`), ya'ni "Qayta ijroga
 *     yuborish" tugmasi har doim 404 qaytarardi.
 *   - `startTask`, `submitTaskForReview`, `cancelTask`, `getTaskExecutions`,
 *     `getTaskHistory`, `getMyTasks`, `getOverdueTasks` — backend'da mavjud
 *     bo'lmagan endpointlarga murojaat qiladi, hech qayerda ishlatilmaydi.
 *   - Isbot yuklaydigan YAGONA endpoint `/tasks/{id}/report/` uchun esa
 *     klient funksiyasi umuman yo'q edi. Shuning uchun frontend
 *     `mark-complete` ni chaqirardi — u fayl qabul qilmaydi. Natijada
 *     topshiriq NOL isbot bilan "bajarildi" bo'lardi.
 *
 * Bu faylda faqat haqiqatan mavjud endpointlar bor.
 */

import { fetchApi } from './client'
import type { Task } from '@/types'

// ============================================================================
// Turlar
// ============================================================================

/** Hisobotga biriktirilgan fayl */
export interface ProofAttachment {
  id: string | number
  file: string
  file_name: string
  file_type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'OTHER' | string
  file_size: number
  uploaded_at?: string
}

/** Tasdiqlashni kutayotgan tashkilot topshirig'i */
export interface AwaitingOrganization {
  id: string
  organization_id: string
  organization_name: string
  status: string
  reported_at: string | null
  report_comment: string
  attachments: ProofAttachment[]
}

/** Tasdiqlash navbatidagi topshiriq */
export interface PendingApprovalTask extends Task {
  awaiting_organizations: AwaitingOrganization[]
}

export interface PendingApprovalPage {
  count: number
  next: string | null
  previous: string | null
  results: PendingApprovalTask[]
}

export interface PendingApprovalFilters {
  search?: string
  priority?: string
  sector?: string
  organization?: string
  ordering?: string
}

// ============================================================================
// Navbat
// ============================================================================

function query(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '' || v === 'all') continue
    sp.append(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

/**
 * Hokim tasdig'ini kutayotgan topshiriqlar.
 * `GET /api/tasks/pending-approval/`
 *
 * Faqat HOKIM roli uchun (backend `CanCloseTask` bilan tekshiradi).
 */
export async function getPendingApprovalTasks(
  filters: PendingApprovalFilters = {},
  page = 1,
  pageSize = 20,
): Promise<PendingApprovalPage> {
  const qs = query({
    ...filters,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  const res = await fetchApi<PendingApprovalPage | PendingApprovalTask[]>(
    `/tasks/pending-approval/${qs}`,
  )

  // Paginatsiya o'chirilgan bo'lsa oddiy massiv qaytadi
  if (Array.isArray(res)) {
    return { count: res.length, next: null, previous: null, results: res }
  }
  return {
    count: res.count ?? res.results?.length ?? 0,
    next: res.next ?? null,
    previous: res.previous ?? null,
    results: res.results ?? [],
  }
}

// ============================================================================
// Hokim harakatlari
// ============================================================================

/**
 * Topshiriqni nazoratdan yechish (tasdiqlash).
 * `POST /api/tasks/{id}/close/`
 *
 * `organizationId` berilsa — faqat shu tashkilotning ijrosi yopiladi.
 * Ilgari `close` BARCHA tashkilotlar `BAJARILDI` bo'lishini talab qilardi,
 * shuning uchun bitta kechikkan tashkilot qolganlarini ham blokladi.
 */
export async function approveTaskExecution(
  taskId: string | number,
  options: { comment?: string; organizationId?: string } = {},
): Promise<Task> {
  return fetchApi<Task>(`/tasks/${taskId}/close/`, {
    method: 'POST',
    body: JSON.stringify({
      ...(options.comment ? { comment: options.comment } : {}),
      ...(options.organizationId ? { organization_id: options.organizationId } : {}),
    }),
  })
}

/**
 * Qayta ijroga yuborish.
 * `POST /api/tasks/{id}/return/`
 *
 * Sabab MAJBURIY — ijrochi nimani tuzatishi kerakligini bilishi shart.
 */
export async function returnTaskForRework(
  taskId: string | number,
  comment: string,
  organizationId?: string,
): Promise<Task> {
  return fetchApi<Task>(`/tasks/${taskId}/return/`, {
    method: 'POST',
    body: JSON.stringify({
      comment,
      ...(organizationId ? { organization_id: organizationId } : {}),
    }),
  })
}

// ============================================================================
// Ijrochi harakatlari
// ============================================================================

/**
 * Topshiriqni ijroga olish.
 * `POST /api/tasks/{id}/accept/`
 */
export async function acceptTaskExecution(taskId: string | number): Promise<Task> {
  return fetchApi<Task>(`/tasks/${taskId}/accept/`, { method: 'POST' })
}

/**
 * Hisobot va ISBOTLARNI topshirish — topshiriqni `BAJARILDI` holatiga
 * o'tkazadigan yagona to'g'ri yo'l.
 * `POST /api/tasks/{id}/report/`  (multipart)
 *
 * @param comment  Bajarilgan ish bayoni
 * @param files    Isbot fayllari (rasm, video, hujjat) — bir nechta
 */
export async function submitTaskReport(
  taskId: string | number,
  comment: string,
  files: File[] = [],
): Promise<Task> {
  const form = new FormData()
  form.append('comment', comment)
  for (const f of files) form.append('attachments', f)

  return fetchApi<Task>(`/tasks/${taskId}/report/`, {
    method: 'POST',
    body: form,
  })
}

/**
 * Muddatni uzaytirish so'rovi.
 * `POST /api/tasks/{id}/extend_request/`
 *
 * DIQQAT: backend bu endpointni faqat TASHKILOT rollariga ruxsat beradi
 * (`CanExecuteTasks`). Frontend ilgari uni `isAdmin` shartida ko'rsatardi,
 * ya'ni tugma faqat 403 oladigan foydalanuvchilarga chiqardi.
 */
export async function requestExtension(
  taskId: string | number,
  data: { requested_deadline: string; reason: string },
): Promise<unknown> {
  return fetchApi(`/tasks/${taskId}/extend_request/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ============================================================================
// Yordamchi
// ============================================================================

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function isImageAttachment(a: ProofAttachment): boolean {
  if (a.file_type === 'IMAGE') return true
  return /\.(jpe?g|png|webp|gif|heic|avif)$/i.test(a.file ?? '')
}
