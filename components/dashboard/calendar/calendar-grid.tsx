"use client"

import type React from "react"
import { memo, useMemo } from "react"
import { AlertTriangle, MapPin } from "lucide-react"

import { cn } from "@/lib/utils"
import type { CalendarFeedItem } from "@/lib/api/calendar.api"

/**
 * KALENDAR TO'RI — DashStack «Calender» ekrani bo'yicha
 * ====================================================
 *
 *   Dushanba…Yakshanba sarlavha qatori
 *   6 × 7 katak; kun raqami YUQORI O'NGDA (Figma shunday)
 *   Joriy oyga kirmagan kunlar — chiziqli naqsh bilan so'ndirilgan
 *   Bugungi kun — ko'k doira ichida
 *   Yozuvlar — chap chekkasi qalin rangli tasma
 *
 * NEGA CHIZIQLI NAQSH GRADIYENT HISOBLANMAYDI
 * -------------------------------------------
 * Loyiha standarti «gradiyent yo'q» deydi, chunki gradiyent ustidagi
 * matn kontrastini o'lchab bo'lmaydi. Bu yerda matn YO'Q: naqsh faqat
 * bo'sh katakni «bu oyga tegishli emas» deb belgilaydi va uning ikki
 * rangi ham `--muted` va `--card` tokenlaridan olinadi.
 *
 * NEGA BIR NECHA KUNLIK YOZUV BO'YLAB TASMA CHIZILMAYDI
 * ----------------------------------------------------
 * Figma'da uzun tadbir bir necha katakni kesib o'tadi. Buni to'g'ri
 * qilish uchun kataklar ustida mutlaq joylashgan qatlam va har
 * hafta uchun qayta hisob kerak — u telefonda sinadi va ekran
 * o'quvchisi uchun tartibsiz bo'ladi. Shuning uchun ko'p kunlik
 * yozuv O'ZI TEGISHLI HAR BIR KUNDA ko'rsatiladi: ma'lumot bir xil,
 * xatti-harakat esa oldindan aytib bo'ladigan.
 */

export const WEEKDAY_LABELS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"] as const
export const WEEKDAY_LABELS_FULL = [
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
  "Yakshanba",
] as const

export const MONTH_NAMES = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
] as const

/* ------------------------------------------------------------ SANA UTIL */

export function ymd(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${m}-${d}`
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const shift = (d.getDay() + 6) % 7 // dushanba = 0
  d.setDate(d.getDate() - shift)
  return d
}

/** Oy ko'rinishi uchun 42 kun (6 hafta) — qator soni sakramaydi */
export function monthMatrix(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

/** Yozuvlarni kun bo'yicha guruhlaydi. Ko'p kunlik yozuv har kunga tushadi. */
export function groupByDay(items: CalendarFeedItem[]): Map<string, CalendarFeedItem[]> {
  const map = new Map<string, CalendarFeedItem[]>()

  const push = (key: string, item: CalendarFeedItem) => {
    const list = map.get(key)
    if (list) list.push(item)
    else map.set(key, [item])
  }

  for (const item of items) {
    const start = new Date(item.start_at)
    if (Number.isNaN(start.getTime())) continue

    const end = item.end_at ? new Date(item.end_at) : null
    if (!end || Number.isNaN(end.getTime()) || end <= start) {
      push(ymd(start), item)
      continue
    }

    // Ko'p kunlik — lekin cheksiz emas: 60 kundan uzun yozuv butun
    // kalendarni to'ldirib yuborardi.
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    for (let guard = 0; cursor <= end && guard < 60; guard += 1) {
      push(ymd(cursor), item)
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.start_at.localeCompare(b.start_at))
  }
  return map
}

export function timeLabel(value: string, allDay?: boolean): string {
  if (allDay) return "Kun bo'yi"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

/* ========================================================== OY KO'RINISHI */

type MonthGridProps = {
  year: number
  month: number
  itemsByDay: Map<string, CalendarFeedItem[]>
  selectedDay: string | null
  onSelectDay: (day: string) => void
  onOpenItem: (item: CalendarFeedItem) => void
}

export const CalendarMonthGrid = memo(function CalendarMonthGrid({
  year,
  month,
  itemsByDay,
  selectedDay,
  onSelectDay,
  onOpenItem,
}: MonthGridProps) {
  const days = useMemo(() => monthMatrix(year, month), [year, month])
  const todayKey = ymd(new Date())

  return (
    /*
      TO'R CHIZIQLARI — «gap-px + fon» usuli
      ======================================
      Ilgari har katakda `border-r border-b` va `-mr-px -mb-px` turardi.
      Manfiy chekka kataklarni bir-birining ustiga tortadi va KEYINGI
      katakning oq foni oldingisining chegara chizig'ini bosib qo'yardi —
      shuning uchun ekranda chiziqlar deyarli ko'rinmasdi.

      Endi ota element chiziq rangida bo'yalgan, kataklar orasida esa 1px
      bo'shliq qoldirilgan. Chiziq — bu ORQA FON, ya'ni uni hech narsa
      bosa olmaydi: hamma yerda bir xil qalinlikda, uzluksiz va Figmadagi
      kabi to'liq to'r bo'lib chiqadi.
    */
    <div className="bg-border">
      {/* Hafta kunlari sarlavhasi */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className="bg-surface-sunken px-1 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-2 sm:py-3"
          >
            <abbr title={WEEKDAY_LABELS_FULL[i]} className="no-underline">
              {label}
            </abbr>
          </div>
        ))}
      </div>

      {/* Kataklar — `mt-px` sarlavha ostidagi chiziqni beradi */}
      <div className="mt-px grid grid-cols-7 gap-px">
        {days.map((date) => {
          const key = ymd(date)
          const inMonth = date.getMonth() === month
          const isToday = key === todayKey
          const isSelected = key === selectedDay
          const dayItems = itemsByDay.get(key) ?? []

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              aria-label={`${date.getDate()} ${MONTH_NAMES[date.getMonth()]} — ${dayItems.length} ta yozuv`}
              aria-pressed={isSelected}
              className={cn(
                "relative flex min-h-[68px] flex-col p-1 text-left transition-colors sm:min-h-[104px] sm:p-1.5",
                "focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                inMonth ? "bg-card hover:bg-muted" : "cal-outside",
                isSelected && "z-10 bg-primary-soft hover:bg-primary-soft",
              )}
            >
              {/* Kun raqami — yuqori o'ngda (Figmadagi kabi) */}
              <span
                className={cn(
                  "ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums sm:h-7 sm:w-7 sm:text-sm",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : inMonth
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {date.getDate()}
              </span>

              {/* Telefonda — nuqtalar; planshet va undan kattada — tasmalar */}
              {dayItems.length > 0 && (
                <>
                  <span className="mt-1 flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                    {dayItems.slice(0, 4).map((item) => (
                      <span
                        key={item.id}
                        className={cn("h-1.5 w-1.5 rounded-full border", item.tone)}
                      />
                    ))}
                    {dayItems.length > 4 && (
                      <span className="text-[9px] font-bold leading-none text-muted-foreground">
                        +{dayItems.length - 4}
                      </span>
                    )}
                  </span>

                  <span className="mt-1 hidden w-full flex-col gap-1 sm:flex">
                    {dayItems.slice(0, 3).map((item) => (
                      <EventBar key={item.id} item={item} onOpen={onOpenItem} />
                    ))}
                    {dayItems.length > 3 && (
                      <span className="px-1 text-2xs font-semibold text-muted-foreground">
                        +{dayItems.length - 3} ta yana
                      </span>
                    )}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
})

/**
 * Katak ichidagi tasma. `<button>` ichida `<button>` bo'lmasligi uchun
 * `<span role="button">` — HTML qoidasi buzilsa, klaviatura navigatsiyasi
 * brauzerlarda turlicha sinadi.
 */
function EventBar({
  item,
  onOpen,
}: {
  item: CalendarFeedItem
  onOpen: (item: CalendarFeedItem) => void
}) {
  const overdue = Boolean(item.meta?.is_overdue)
  return (
    <span
      role="button"
      tabIndex={0}
      title={`${timeLabel(item.start_at, item.all_day)} · ${item.title}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(item)
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return
        e.preventDefault()
        e.stopPropagation()
        onOpen(item)
      }}
      className={cn(
        "flex w-full items-center gap-1 overflow-hidden rounded-[4px] border border-l-[3px] px-1.5 py-0.5 text-left text-2xs font-semibold",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        item.tone,
      )}
    >
      {overdue && <AlertTriangle className="h-2.5 w-2.5 shrink-0" aria-hidden />}
      <span className="truncate">{item.title}</span>
    </span>
  )
}

/* ================================================= HAFTA / KUN KO'RINISHI */

type AgendaProps = {
  days: Date[]
  itemsByDay: Map<string, CalendarFeedItem[]>
  onOpenItem: (item: CalendarFeedItem) => void
  onAddOnDay?: (day: string) => void
}

/**
 * Hafta va kun ko'rinishi — soat to'ri emas, KUNLIK RO'YXAT.
 *
 * Soat to'ri (08:00…20:00 chiziqlari) chiroyli ko'rinadi, lekin bu
 * tizimda yozuvlarning aksariyati muddat — ya'ni kun bo'yi amal
 * qiladigan belgi. Ularni soat chizig'iga qadash yolg'on aniqlik
 * berardi. Ro'yxat esa telefonda ham bir xil ishlaydi.
 */
export function CalendarAgenda({ days, itemsByDay, onOpenItem, onAddOnDay }: AgendaProps) {
  const todayKey = ymd(new Date())

  return (
    <ul className="divide-y divide-border">
      {days.map((date) => {
        const key = ymd(date)
        const items = itemsByDay.get(key) ?? []
        const isToday = key === todayKey

        return (
          <li key={key} className="flex gap-3 p-4 sm:gap-5 sm:p-5">
            <div className="w-14 shrink-0 text-center sm:w-16">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {WEEKDAY_LABELS[(date.getDay() + 6) % 7]}
              </p>
              <p
                className={cn(
                  "mx-auto mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold tabular-nums",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                )}
              >
                {date.getDate()}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              {items.length === 0 ? (
                <div className="flex h-full min-h-[44px] items-center gap-3">
                  <p className="text-sm text-muted-foreground">Yozuv yo'q</p>
                  {onAddOnDay && (
                    <button
                      type="button"
                      onClick={() => onAddOnDay(key)}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      + Eslatma qo'shish
                    </button>
                  )}
                </div>
              ) : (
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.id}>
                      <AgendaRow item={item} onOpen={onOpenItem} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function AgendaRow({
  item,
  onOpen,
}: {
  item: CalendarFeedItem
  onOpen: (item: CalendarFeedItem) => void
}) {
  const overdue = Boolean(item.meta?.is_overdue)
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-[8px] border border-l-[4px] px-3 py-2 text-left transition-[filter]",
        "hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        item.tone,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {overdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          <span className="truncate text-sm font-semibold">{item.title}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-2xs opacity-80">
          <span className="tabular-nums">{timeLabel(item.start_at, item.all_day)}</span>
          {item.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              {item.location}
            </span>
          )}
          {item.meta?.organizations?.length ? (
            <span className="truncate">{item.meta.organizations.join(", ")}</span>
          ) : null}
        </span>
      </span>
    </button>
  )
}
