"use client"

import { useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { PRIORITY_LABEL, TASK_STATUS_LABEL, formatDateShort } from "@/lib/status-styles"
import {
  createCalendarEvent,
  deleteCalendarEvent,
  rawEventId,
  updateCalendarEvent,
  type CalendarEventInput,
  type CalendarFeedItem,
  type CalendarVisibility,
} from "@/lib/api/calendar.api"

/**
 * ESLATMA OYNASI — yaratish va tahrirlash
 *
 * Bitta oyna ikkala holatda ishlaydi: `item` berilsa — tahrirlash,
 * `defaultDay` berilsa — shu kunga yangi eslatma.
 *
 * Topshiriq muddatini (source === "task") bu yerdan TAHRIRLAB BO'LMAYDI:
 * muddat topshiriqning o'zida, `tasks` modulida o'zgaradi va u yerda
 * muddat uzaytirish so'rovi, tasdiqlash va tarix yozuvi bor. Kalendardan
 * jimgina o'zgartirish nazoratni buzardi — shuning uchun oyna foydalanuvchini
 * topshiriq sahifasiga yuboradi.
 */

const KINDS: { value: CalendarEventInput["kind"]; label: string }[] = [
  { value: "ESLATMA", label: "Eslatma" },
  { value: "YIGILISH", label: "Yig'ilish" },
  { value: "TADBIR", label: "Tadbir" },
  { value: "QABUL", label: "Fuqarolar qabuli" },
  { value: "BOSHQA", label: "Boshqa" },
]

const VISIBILITIES: { value: CalendarVisibility; label: string; hint: string }[] = [
  { value: "PRIVATE", label: "Faqat o'zim", hint: "Boshqa xodimlar ko'rmaydi" },
  { value: "ORGANIZATION", label: "Tashkilotim", hint: "Tashkilot xodimlari ko'radi" },
  { value: "EVERYONE", label: "Hamma xodimlar", hint: "Tizimdagi barcha xodimlar ko'radi" },
]

const REMINDERS: { value: number; label: string }[] = [
  { value: 0, label: "Eslatilmasin" },
  { value: 15, label: "15 daqiqa oldin" },
  { value: 60, label: "1 soat oldin" },
  { value: 180, label: "3 soat oldin" },
  { value: 1440, label: "1 kun oldin" },
  { value: 2880, label: "2 kun oldin" },
  { value: 4320, label: "3 kun oldin" },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tahrirlanayotgan yozuv (bo'lmasa — yangi) */
  item?: CalendarFeedItem | null
  /** Yangi yozuv uchun oldindan tanlangan kun (YYYY-MM-DD) */
  defaultDay?: string | null
  /** Foydalanuvchining tashkiloti — «Tashkilotim» ko'rinishi uchun */
  organizationId?: string | null
  onSaved: () => void
}

type FormState = {
  title: string
  description: string
  location: string
  kind: CalendarEventInput["kind"]
  date: string
  time: string
  endTime: string
  allDay: boolean
  visibility: CalendarVisibility
  remind: number
}

function emptyForm(day: string | null): FormState {
  const base = day || new Date().toISOString().slice(0, 10)
  return {
    title: "",
    description: "",
    location: "",
    kind: "ESLATMA",
    date: base,
    time: "09:00",
    endTime: "",
    allDay: false,
    visibility: "PRIVATE",
    remind: 60,
  }
}

function formFromItem(item: CalendarFeedItem): FormState {
  const start = new Date(item.start_at)
  const end = item.end_at ? new Date(item.end_at) : null
  const hhmm = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`

  return {
    title: item.title,
    description: item.description || "",
    location: item.location || "",
    kind: (item.kind === "TOPSHIRIQ" ? "ESLATMA" : item.kind) as CalendarEventInput["kind"],
    date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
      start.getDate(),
    ).padStart(2, "0")}`,
    time: hhmm(start),
    endTime: end ? hhmm(end) : "",
    allDay: item.all_day,
    visibility: (item.meta?.visibility as CalendarVisibility) || "PRIVATE",
    remind: item.meta?.remind_before_minutes ?? 60,
  }
}

/** `YYYY-MM-DD` + `HH:mm` → mahalliy vaqtdagi ISO satr */
function toIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number)
  const [hh, mm] = (time || "00:00").split(":").map(Number)
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0).toISOString()
}

export function CalendarEventDialog({
  open,
  onOpenChange,
  item,
  defaultDay,
  organizationId,
  onSaved,
}: Props) {
  const isTask = item?.source === "task"
  const isEdit = Boolean(item && item.source === "event")

  const [form, setForm] = useState<FormState>(() => emptyForm(defaultDay ?? null))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(item && item.source === "event" ? formFromItem(item) : emptyForm(defaultDay ?? null))
  }, [open, item, defaultDay])

  const patch = (p: Partial<FormState>) => setForm((prev) => ({ ...prev, ...p }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError("Sarlavha kiritilishi shart.")
      return
    }
    if (form.visibility === "ORGANIZATION" && !organizationId) {
      setError("Sizga tashkilot biriktirilmagani uchun «Tashkilotim» ko'rinishini tanlab bo'lmaydi.")
      return
    }
    if (form.endTime && form.endTime < form.time && !form.allDay) {
      setError("Tugash vaqti boshlanish vaqtidan oldin bo'lishi mumkin emas.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload: CalendarEventInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        kind: form.kind,
        start_at: toIso(form.date, form.allDay ? "00:00" : form.time),
        end_at: form.allDay
          ? toIso(form.date, "23:59")
          : form.endTime
            ? toIso(form.date, form.endTime)
            : null,
        all_day: form.allDay,
        visibility: form.visibility,
        organization: form.visibility === "ORGANIZATION" ? organizationId : null,
        remind_before_minutes: form.remind,
      }

      if (isEdit && item) {
        await updateCalendarEvent(rawEventId(item.id), payload)
      } else {
        await createCalendarEvent(payload)
      }

      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || "Saqlab bo'lmadi. Qayta urinib ko'ring.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!item || item.source !== "event") return
    if (!window.confirm("Eslatma o'chirilsinmi?")) return
    setDeleting(true)
    setError(null)
    try {
      await deleteCalendarEvent(rawEventId(item.id))
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || "O'chirib bo'lmadi.")
    } finally {
      setDeleting(false)
    }
  }

  /* ------------------------------------------- Topshiriq — faqat ko'rish */
  if (isTask && item) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-6 text-left">{item.title}</DialogTitle>
            <DialogDescription className="text-left">
              Bu — topshiriq muddati. Muddat topshiriq sahifasida, muddat uzaytirish
              so'rovi orqali o'zgartiriladi.
            </DialogDescription>
          </DialogHeader>

          <dl className="space-y-2.5 text-sm">
            <Row label="Muddat">
              <span className={item.meta?.is_overdue ? "font-semibold text-destructive" : undefined}>
                {formatDateShort(item.start_at)}
                {!item.all_day && `, ${hhmm(item.start_at)}`}
                {item.meta?.is_overdue && " — muddati o'tgan"}
              </span>
            </Row>
            {item.meta?.organizations?.length ? (
              <Row label="Ijrochi">{item.meta.organizations.join(", ")}</Row>
            ) : null}
            {/* Xom kod («MUDDATI_KECH») emas, odam o'qiydigan yorliq */}
            {item.meta?.status && (
              <Row label="Holat">{TASK_STATUS_LABEL[item.meta.status] ?? item.meta.status}</Row>
            )}
            {item.meta?.priority && (
              <Row label="Muhimlik">
                {PRIORITY_LABEL[item.meta.priority] ?? item.meta.priority}
              </Row>
            )}
            {item.description && <Row label="Tavsif">{item.description}</Row>}
          </dl>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            <a
              href={item.link || "#"}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Topshiriqni ochish
            </a>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-11 items-center justify-center rounded-[10px] px-4 text-sm font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-muted"
            >
              Yopish
            </button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  /* ---------------------------------------------- Eslatma — forma */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-left">
            {isEdit ? "Eslatmani tahrirlash" : "Yangi eslatma"}
          </DialogTitle>
          <DialogDescription className="text-left">
            Kalendarga belgi qo'ying — vaqti kelganda tizim bildirishnoma yuboradi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3.5">
          <Field label="Sarlavha" htmlFor="ev-title" required>
            <input
              id="ev-title"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              maxLength={300}
              required
              placeholder="Masalan: Obodonlashtirish bo'yicha yig'ilish"
              className={FIELD}
            />
          </Field>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Turi" htmlFor="ev-kind">
              <select
                id="ev-kind"
                value={form.kind}
                onChange={(e) => patch({ kind: e.target.value as CalendarEventInput["kind"] })}
                className={FIELD}
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Sana" htmlFor="ev-date" required>
              <input
                id="ev-date"
                type="date"
                value={form.date}
                onChange={(e) => patch({ date: e.target.value })}
                required
                className={FIELD}
              />
            </Field>
          </div>

          <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => patch({ allDay: e.target.checked })}
              className="h-4.5 w-4.5 rounded accent-[var(--primary)]"
            />
            Kun bo'yi
          </label>

          {!form.allDay && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Boshlanish" htmlFor="ev-time">
                <input
                  id="ev-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => patch({ time: e.target.value })}
                  className={FIELD}
                />
              </Field>
              <Field label="Tugash (ixtiyoriy)" htmlFor="ev-end">
                <input
                  id="ev-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => patch({ endTime: e.target.value })}
                  className={FIELD}
                />
              </Field>
            </div>
          )}

          <Field label="Joy (ixtiyoriy)" htmlFor="ev-loc">
            <input
              id="ev-loc"
              value={form.location}
              onChange={(e) => patch({ location: e.target.value })}
              maxLength={300}
              placeholder="Masalan: Hokimlik majlislar zali"
              className={FIELD}
            />
          </Field>

          <Field label="Izoh (ixtiyoriy)" htmlFor="ev-desc">
            <textarea
              id="ev-desc"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={3}
              className={cn(FIELD, "h-auto py-2.5")}
            />
          </Field>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Eslatma" htmlFor="ev-remind">
              <select
                id="ev-remind"
                value={form.remind}
                onChange={(e) => patch({ remind: Number(e.target.value) })}
                className={FIELD}
              >
                {REMINDERS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kim ko'radi" htmlFor="ev-vis">
              <select
                id="ev-vis"
                value={form.visibility}
                onChange={(e) => patch({ visibility: e.target.value as CalendarVisibility })}
                className={FIELD}
              >
                {VISIBILITIES.map((v) => (
                  <option
                    key={v.value}
                    value={v.value}
                    disabled={v.value === "ORGANIZATION" && !organizationId}
                  >
                    {v.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-2xs text-muted-foreground">
                {VISIBILITIES.find((v) => v.value === form.visibility)?.hint}
              </p>
            </Field>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-[10px] bg-destructive-soft px-3 py-2 text-sm text-destructive-soft-foreground"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse sm:items-center">
            <button
              type="submit"
              disabled={saving || deleting}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isEdit ? "Saqlash" : "Qo'shish"}
            </button>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-11 items-center justify-center rounded-[10px] px-4 text-sm font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-muted"
            >
              Bekor qilish
            </button>

            {isEdit && (
              <button
                type="button"
                onClick={remove}
                disabled={saving || deleting}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold text-destructive hover:bg-destructive-soft disabled:opacity-60 sm:mr-auto"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden />
                )}
                O'chirish
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------------------------------------------------- Yordamchilar */

const FIELD =
  "h-11 w-full rounded-[10px] bg-card px-3 text-sm text-foreground shadow-[inset_0_0_0_1px_var(--border)] placeholder:text-muted-foreground focus:shadow-[inset_0_0_0_1.5px_var(--primary)] focus:outline-none"

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

/** `14:30` */
function hhmm(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words text-foreground">{children}</dd>
    </div>
  )
}
