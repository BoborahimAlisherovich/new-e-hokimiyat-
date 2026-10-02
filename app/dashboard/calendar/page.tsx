"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  MapPin,
  Plus,
} from "lucide-react"

import { Header } from "@/components/layout/header"
import {
  AgendaRow,
  CalendarAgenda,
  CalendarMonthGrid,
  MONTH_NAMES,
  groupByDay,
  startOfWeek,
  timeLabel,
  ymd,
} from "@/components/dashboard/calendar/calendar-grid"
import { CalendarEventDialog } from "@/components/dashboard/calendar/event-dialog"
import { cn } from "@/lib/utils"
import { getCurrentUser } from "@/lib/api/auth.api"
import {
  getCalendarFeed,
  getUpcomingCalendarItems,
  type CalendarFeedItem,
} from "@/lib/api/calendar.api"

/**
 * KALENDAR
 * ========
 *
 * DashStack «Calender» maketi asosida. Ikki ustun:
 *
 *   CHAP  — «+ Yangi eslatma» tugmasi va «Yaqin kunlarda» ro'yxati
 *   O'NG  — Bugun · ‹ Oktabr 2026 › · Kun/Hafta/Oy · to'r
 *
 * Kalendarda IKKI XIL yozuv bor va ular bir xil ko'rinadi:
 *
 *   1. TOPSHIRIQ MUDDATI — avtomatik. Har bir topshiriq o'z muddati
 *      kuniga «Tekshiriladi: …» deb tushadi. Bu yozuvni kalendardan
 *      o'chirib yoki ko'chirib bo'lmaydi: muddat topshiriqning o'zida,
 *      muddat uzaytirish so'rovi orqali o'zgaradi.
 *
 *   2. QO'LDA QO'YILGAN ESLATMA — foydalanuvchi yaratadi, tahrirlaydi
 *      va o'chiradi; belgilangan vaqtdan oldin bildirishnoma keladi.
 *
 * TELEFONDA: to'r saqlanadi (7 ustun har doim ko'rinadi), lekin katak
 * ichida tasma emas — rangli nuqtalar. Kun tanlanganda uning yozuvlari
 * to'r ostida ro'yxat bo'lib chiqadi. Shu tarzda 320px da ham gorizontal
 * siljish nolga teng.
 */

type ViewMode = "month" | "week" | "day"

export default function CalendarPage() {
  const router = useRouter()

  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [mode, setMode] = useState<ViewMode>("month")
  const [selectedDay, setSelectedDay] = useState<string>(() => ymd(new Date()))

  const [items, setItems] = useState<CalendarFeedItem[]>([])
  const [upcoming, setUpcoming] = useState<CalendarFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarFeedItem | null>(null)

  const reqIdRef = useRef(0)

  /* ------------------------------------------------- Ko'rinadigan oraliq */
  const range = useMemo(() => {
    if (mode === "day") {
      const d = new Date(selectedDay)
      const key = Number.isNaN(d.getTime()) ? ymd(today) : selectedDay
      return { from: key, to: key }
    }
    if (mode === "week") {
      const base = new Date(selectedDay)
      const start = startOfWeek(Number.isNaN(base.getTime()) ? today : base)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { from: ymd(start), to: ymd(end) }
    }
    // Oy: ko'rinadigan 42 kunning hammasi (oldingi/keyingi oy quyruqlari bilan)
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = startOfWeek(first)
    const end = new Date(start)
    end.setDate(start.getDate() + 41)
    return { from: ymd(start), to: ymd(end) }
  }, [mode, cursor, selectedDay, today])

  /* ---------------------------------------------------------- Yuklash */
  const load = useCallback(async () => {
    const id = ++reqIdRef.current
    setLoading(true)
    setError(null)
    try {
      const feed = await getCalendarFeed({ from: range.from, to: range.to })
      if (id !== reqIdRef.current) return
      setItems(feed?.items ?? [])
    } catch (err: any) {
      if (id !== reqIdRef.current) return
      setItems([])
      setError(err?.message || "Kalendarni yuklab bo'lmadi.")
    } finally {
      if (id === reqIdRef.current) setLoading(false)
    }
  }, [range.from, range.to])

  useEffect(() => {
    void load()
  }, [load])

  // Chap panel va foydalanuvchi — bir marta
  useEffect(() => {
    let alive = true
    void getCurrentUser()
      .then((me: any) => {
        if (alive) setOrganizationId(me?.organization?.id ?? me?.organization_id ?? null)
      })
      .catch(() => undefined)
    void getUpcomingCalendarItems(14)
      .then((list) => {
        if (alive) setUpcoming(list)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  const refresh = useCallback(() => {
    void load()
    void getUpcomingCalendarItems(14)
      .then(setUpcoming)
      .catch(() => undefined)
  }, [load])

  const itemsByDay = useMemo(() => groupByDay(items), [items])
  const selectedItems = itemsByDay.get(selectedDay) ?? []

  /* -------------------------------------------------------- Harakatlar */
  const openItem = useCallback((item: CalendarFeedItem) => {
    setEditing(item)
    setDialogOpen(true)
  }, [])

  const openNew = useCallback((day?: string) => {
    if (day) setSelectedDay(day)
    setEditing(null)
    setDialogOpen(true)
  }, [])

  const step = useCallback(
    (direction: 1 | -1) => {
      if (mode === "month") {
        setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1))
        return
      }
      const base = new Date(selectedDay)
      const start = Number.isNaN(base.getTime()) ? new Date() : base
      start.setDate(start.getDate() + direction * (mode === "week" ? 7 : 1))
      setSelectedDay(ymd(start))
      setCursor(new Date(start.getFullYear(), start.getMonth(), 1))
    },
    [mode, selectedDay],
  )

  const goToday = useCallback(() => {
    const now = new Date()
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDay(ymd(now))
  }, [])

  const headingLabel = useMemo(() => {
    if (mode === "month") return `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`
    const base = new Date(selectedDay)
    const d = Number.isNaN(base.getTime()) ? new Date() : base
    if (mode === "day") {
      return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
    }
    const start = startOfWeek(d)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const sameMonth = start.getMonth() === end.getMonth()
    return sameMonth
      ? `${start.getDate()}–${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`
      : `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`
  }, [mode, cursor, selectedDay])

  const agendaDays = useMemo(() => {
    const base = new Date(selectedDay)
    const d = Number.isNaN(base.getTime()) ? new Date() : base
    if (mode === "day") return [d]
    const start = startOfWeek(d)
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(start)
      x.setDate(start.getDate() + i)
      return x
    })
  }, [mode, selectedDay])

  /* ------------------------------------------------------------- RENDER */
  return (
    <>
      <Header
        title="Kalendar"
        description="Topshiriq muddatlari va eslatmalar"
      />

      <div className="p-4 pb-20 sm:p-6 sm:pb-6">
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-5">
          {/* ================================================== CHAP PANEL */}
          <aside className="order-2 space-y-4 lg:order-1">
            <button
              type="button"
              onClick={() => openNew()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-[15px] font-semibold text-primary-foreground shadow-[0_1px_2px_rgb(51_102_255_/_0.28),0_10px_24px_-10px_rgb(51_102_255_/_0.55)] transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Plus className="h-5 w-5" aria-hidden />
              Yangi eslatma
            </button>

            <section className="overflow-hidden rounded-[14px] bg-card shadow-[inset_0_0_0_1px_var(--border)]">
              <h2 className="px-4 pt-4 pb-2 text-md font-semibold text-foreground">
                Yaqin kunlarda
              </h2>

              {upcoming.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  Keyingi ikki haftada belgilangan muddat yoki eslatma yo'q.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {upcoming.slice(0, 6).map((item) => {
                    const isTask = item.source === "task"
                    const Icon = isTask ? ClipboardList : CalendarCheck2
                    const orgs = item.meta?.organizations?.join(", ")

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openItem(item)}
                          className="row-link flex w-full gap-3 px-4 py-3 text-left"
                        >
                          {/*
                            Figma'da bu yerda odam avatari turadi. Bizda
                            yozuvning egasi emas, TURI muhim — muddatmi
                            yoki eslatmami — shuning uchun avatar o'rnida
                            yozuv rangidagi belgi.
                          */}
                          <span
                            aria-hidden
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                              item.tone,
                            )}
                          >
                            <Icon className="h-[18px] w-[18px]" />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {item.title}
                            </span>
                            <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                              {new Date(item.start_at).toLocaleDateString("uz-UZ", {
                                day: "numeric",
                                month: "long",
                              })}
                              {!item.all_day && ` · ${timeLabel(item.start_at)}`}
                            </span>
                            {orgs && (
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {orgs}
                              </span>
                            )}
                            {item.location && (
                              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                                <span className="truncate">{item.location}</span>
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="p-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/tasks")}
                  className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-primary-soft px-4 text-sm font-semibold text-primary-soft-foreground hover:brightness-[0.97]"
                >
                  Barcha topshiriqlar
                </button>
              </div>
            </section>
          </aside>

          {/* =================================================== O'NG PANEL */}
          <section className="order-1 overflow-hidden rounded-[14px] bg-card shadow-[inset_0_0_0_1px_var(--border)] lg:order-2">
            {/* Boshqaruv qatori */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3 sm:px-5">
              <button
                type="button"
                onClick={goToday}
                className="inline-flex h-10 items-center rounded-[10px] px-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Bugun
              </button>

              <div className="mx-auto flex items-center gap-1 sm:gap-2">
                <NavCircle label="Oldingi" onClick={() => step(-1)}>
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </NavCircle>
                <h2 className="min-w-[150px] text-center text-md font-semibold text-foreground sm:min-w-[190px] sm:text-lg">
                  {headingLabel}
                </h2>
                <NavCircle label="Keyingi" onClick={() => step(1)}>
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </NavCircle>
              </div>

              {/*
                «+ Eslatma» — kalendar plitasining O'ZIDA. Chap paneldagi
                katta tugma telefonda to'rdan pastda qolib ketardi: kunni
                tanlab, keyin eslatma qo'shish uchun sahifani teskari
                aylantirishga to'g'ri kelardi.
              */}
              <button
                type="button"
                onClick={() => openNew(selectedDay)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-primary-soft px-3 text-sm font-semibold text-primary-soft-foreground transition-colors hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Plus className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Eslatma</span>
                <span className="sr-only sm:hidden">Eslatma qo'shish</span>
              </button>

              <div
                role="tablist"
                aria-label="Kalendar ko'rinishi"
                className="flex items-center gap-1 rounded-[10px] bg-surface-sunken p-1"
              >
                {(
                  [
                    ["day", "Kun"],
                    ["week", "Hafta"],
                    ["month", "Oy"],
                  ] as [ViewMode, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => setMode(value)}
                    className={cn(
                      "inline-flex h-9 items-center rounded-[8px] px-3 text-sm font-semibold transition-colors",
                      mode === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mazmun */}
            {error ? (
              <div role="alert" className="px-6 py-14 text-center">
                <p className="text-md font-semibold text-foreground">Kalendarni yuklab bo'lmadi</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>

                {/*
                  Server 500 qaytarganda eng ko'p uchraydigan sabab —
                  kalendar jadvallari bazada yo'q, ya'ni migratsiya
                  qilinmagan. Buni aytmasak, foydalanuvchi «Qayta urinish»
                  ni cheksiz bosib o'tiradi.
                */}
                {error.includes("500") && (
                  <div className="mx-auto mt-4 max-w-md rounded-[10px] bg-warning-soft px-4 py-3 text-left">
                    <p className="text-sm font-semibold text-warning-soft-foreground">
                      Ehtimoliy sabab: baza yangilanmagan
                    </p>
                    <p className="mt-1 text-sm text-warning-soft-foreground">
                      Serverda quyidagi buyruqni bajaring, keyin qayta urining:
                    </p>
                    <code className="mt-2 block rounded-md bg-card px-2.5 py-1.5 font-mono text-xs text-foreground">
                      cd backend &amp;&amp; python manage.py migrate
                    </code>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-4 inline-flex h-11 items-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
                >
                  Qayta urinish
                </button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-20 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                <span className="text-sm">Yuklanmoqda…</span>
              </div>
            ) : mode === "month" ? (
              <CalendarMonthGrid
                year={cursor.getFullYear()}
                month={cursor.getMonth()}
                itemsByDay={itemsByDay}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                onOpenItem={openItem}
              />
            ) : (
              <CalendarAgenda
                days={agendaDays}
                itemsByDay={itemsByDay}
                onOpenItem={openItem}
                onAddOnDay={openNew}
              />
            )}
          </section>
        </div>

        {/* ------------------------- Tanlangan kun (oy ko'rinishida, telefonda) */}
        {mode === "month" && !loading && !error && (
          <section className="mt-4 overflow-hidden rounded-[14px] bg-card shadow-[inset_0_0_0_1px_var(--border)] sm:hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h2 className="text-md font-semibold text-foreground">
                {new Date(selectedDay).toLocaleDateString("uz-UZ", {
                  day: "numeric",
                  month: "long",
                  weekday: "long",
                })}
              </h2>
              <button
                type="button"
                onClick={() => openNew(selectedDay)}
                aria-label="Shu kunga eslatma qo'shish"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary-soft text-primary-soft-foreground"
              >
                <Plus className="h-4.5 w-4.5" aria-hidden />
              </button>
            </div>

            {selectedItems.length === 0 ? (
              <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                Bu kunda yozuv yo'q.
              </p>
            ) : (
              <ul className="space-y-2 p-3">
                {selectedItems.map((item) => (
                  <li key={item.id}>
                    <AgendaRow item={item} onOpen={openItem} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <CalendarEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
        defaultDay={selectedDay}
        organizationId={organizationId}
        onSaved={refresh}
      />
    </>
  )
}

function NavCircle({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  )
}
