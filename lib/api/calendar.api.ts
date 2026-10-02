/**
 * KALENDAR API
 *
 * Backend ikki manbani (topshiriq muddatlari va qo'lda qo'yilgan
 * eslatmalar) BITTA formatga keltirib beradi — `CalendarFeedItem`.
 * Shuning uchun frontend'da «bu topshiriqmi yoki eslatmami» degan
 * shartlar tarqalmaydi: bitta ro'yxat, bitta render.
 *
 * @module api/calendar
 */

import { buildQueryString, fetchApi } from "./client"

/* ------------------------------------------------------------------ TURLAR */

export type CalendarSource = "task" | "event"

export type CalendarEventKind =
  | "ESLATMA"
  | "YIGILISH"
  | "TADBIR"
  | "QABUL"
  | "BOSHQA"
  | "TOPSHIRIQ"

export type CalendarVisibility = "PRIVATE" | "ORGANIZATION" | "EVERYONE"

export interface CalendarFeedItem {
  /** `task:<uuid>` yoki `event:<uuid>` — manbalar aralashganda to'qnashmasligi uchun */
  id: string
  source: CalendarSource
  kind: CalendarEventKind
  title: string
  description: string
  start_at: string
  end_at: string | null
  all_day: boolean
  location: string
  /** `lib/status-styles.ts` dagi sinf nomi (st-yangi, st-kech …) */
  tone: string
  link: string
  can_edit: boolean
  meta?: {
    status?: string
    priority?: string
    is_overdue?: boolean
    organizations?: string[]
    visibility?: CalendarVisibility
    remind_before_minutes?: number
    participants?: { id: string; name: string }[]
  }
}

export interface CalendarFeed {
  from: string
  to: string
  count: number
  items: CalendarFeedItem[]
}

export interface CalendarEventInput {
  title: string
  description?: string
  location?: string
  kind: Exclude<CalendarEventKind, "TOPSHIRIQ">
  start_at: string
  end_at?: string | null
  all_day?: boolean
  visibility?: CalendarVisibility
  organization?: string | null
  participants?: string[]
  related_task?: string | null
  remind_before_minutes?: number
}

export interface CalendarEvent extends CalendarEventInput {
  id: string
  owner: string
  owner_name: string
  kind_display: string
  can_edit: boolean
  participants_detail?: { id: string; full_name: string; avatar: string | null }[]
  created_at: string
  updated_at: string
}

/* ------------------------------------------------------------- SO'ROVLAR */

/**
 * Oy ko'rinishi uchun lenta.
 * @param from  YYYY-MM-DD
 * @param to    YYYY-MM-DD  (backend 186 kundan uzunini qisqartiradi)
 */
export async function getCalendarFeed(params: {
  from: string
  to: string
  /** Yopilgan topshiriqlar ham ko'rsatilsinmi */
  includeClosed?: boolean
}): Promise<CalendarFeed> {
  const query = buildQueryString({
    from: params.from,
    to: params.to,
    ...(params.includeClosed ? { closed: "1" } : {}),
  })
  return fetchApi<CalendarFeed>(`/calendar/feed/${query}`)
}

/** Chap paneldagi «Yaqin kunlarda» ro'yxati */
export async function getUpcomingCalendarItems(days = 14): Promise<CalendarFeedItem[]> {
  const data = await fetchApi<{ count: number; items: CalendarFeedItem[] }>(
    `/calendar/upcoming/${buildQueryString({ days })}`,
  )
  return data?.items ?? []
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEvent> {
  return fetchApi<CalendarEvent>("/calendar/events/", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updateCalendarEvent(
  id: string,
  input: Partial<CalendarEventInput>,
): Promise<CalendarEvent> {
  return fetchApi<CalendarEvent>(`/calendar/events/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await fetchApi<void>(`/calendar/events/${id}/`, { method: "DELETE" })
}

/* ------------------------------------------------------------ YORDAMCHILAR */

/** `event:<uuid>` → `<uuid>` */
export function rawEventId(feedItemId: string): string {
  const idx = feedItemId.indexOf(":")
  return idx === -1 ? feedItemId : feedItemId.slice(idx + 1)
}
