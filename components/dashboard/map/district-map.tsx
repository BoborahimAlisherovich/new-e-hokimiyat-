"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { List, Map as MapIcon, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { getMapLabels, villageName } from "@/lib/i18n/map-labels"
import { searchKey } from "@/lib/translit"
import {
  availableMetrics,
  getVillageStats,
  type VillageMetric,
  type VillageStats,
  type VillageStatsMap,
} from "@/lib/api/map.api"
import {
  CHOROPLETH_RAMP,
  NO_DATA_FILL,
  buildColorScale,
  buildFills,
  loadGeometry,
  type ColorScale,
  type VillageGeometry,
  type VillageShape,
} from "./map-data"

/**
 * XATIRCHI TUMANI INTERAKTIV XARITASI
 * ===================================
 *
 * Ilgari xarita `online-mahalla.uz` saytining saqlangan HTML nusxasidan
 * (1.41 MB) server tomonda regex bilan sug'urilgan 69 ta SVG yo'ldan
 * iborat edi: har so'rovda 1.21 MiB JSON, 32 630 vertex, keshsiz. Brauzer
 * shuni DOM'ga yozishga urinib qotib qolardi.
 *
 * Endi geometriya build vaqtida soddalashtirilib (Visvalingam 10%,
 * 5 kasr, TopoJSON umumiy yoylari) tayyor SVG yo'llariga aylantirilgan:
 * `public/geo/xatirchi-villages.paths.json` — 60 KB, `immutable` keshda.
 *
 * PERFORMANS QOIDALARI (buzilmasin):
 *  1. Hover va tooltip React'ni QAYTA RENDER QILMAYDI. Bitta delegatsiya
 *     qilingan `pointermove` ishlovchisi `event.target.dataset.code` ni
 *     o'qiydi va DOM'ga to'g'ridan-to'g'ri yozadi. Ilgari har mousemove'da
 *     `getBoundingClientRect()` + `setState` chaqirilardi (60-120 Hz).
 *  2. SVG o'lchamlari mount va resize'da BIR MARTA o'lchanadi.
 *  3. Tooltip joylashuvi `requestAnimationFrame` ichida `translate3d` bilan.
 *  4. `transition` faqat `fill` va `stroke` uchun. `transition-all` va
 *     yo'llarda CSS `filter`/`drop-shadow` — qat'iy taqiqlangan.
 */

type Props = {
  /** Sarlavha va tavsifni ko'rsatish (analitika sahifasida kerak emas) */
  showHeading?: boolean
  className?: string
  defaultMetric?: VillageMetric
}

export function DistrictMap({
  showHeading = true,
  className,
  defaultMetric = "total",
}: Props) {
  const { language: locale } = useI18n()
  const L = useMemo(() => getMapLabels(locale), [locale])

  const [geometry, setGeometry] = useState<VillageGeometry | null>(null)
  const [stats, setStats] = useState<VillageStatsMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [statsMissing, setStatsMissing] = useState(false)
  const [metric, setMetric] = useState<VillageMetric>(defaultMetric)
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useState<"map" | "list">("map")
  const [query, setQuery] = useState("")

  const svgRef = useRef<SVGSVGElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const tipNameRef = useRef<HTMLSpanElement | null>(null)
  const tipValueRef = useRef<HTMLSpanElement | null>(null)
  const rectRef = useRef<DOMRect | null>(null)
  const rafRef = useRef<number | null>(null)
  const hoverRef = useRef<string | null>(null)
  const pendingRef = useRef<{ x: number; y: number } | null>(null)

  const nf = useMemo(() => new Intl.NumberFormat("uz-UZ"), [])

  /* -------------------------------------------------------- Ma'lumot yuklash */
  useEffect(() => {
    let alive = true

    /* Geometriya va statistika ALOHIDA yuklanadi.
     *
     * Ilgari ikkisi `Promise.all` da edi: statistika bo'lmasa yoki so'rov
     * bekor qilinsa, xarita ham chizilmasdi. Talab esa aniq — xarita
     * murojaat bo'lsa ham, bo'lmasa ham chizilishi kerak. Endi geometriya
     * kelishi bilan xarita chiziladi; statistika keyin kelib faqat rang
     * va raqamlarni qo'shadi. */
    loadGeometry()
      .then((geo) => {
        if (alive) setGeometry(geo)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    getVillageStats()
      .then((st) => {
        if (!alive) return
        setStats(st)
        setStatsMissing(st === null)
      })
      .catch(() => {
        if (alive) setStatsMissing(true)
      })

    return () => {
      alive = false
    }
  }, [])

  /* ------------------------------------------------- SVG o'lchamini keshlash */
  const measure = useCallback(() => {
    rectRef.current = svgRef.current?.getBoundingClientRect() ?? null
  }, [])

  useEffect(() => {
    if (!geometry) return
    measure()
    const onResize = () => measure()
    window.addEventListener("resize", onResize, { passive: true })
    window.addEventListener("scroll", onResize, { passive: true })
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onResize)
    }
  }, [geometry, measure])

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  /* ------------------------------------------------------------- Choropleth */
  const villages = geometry?.villages ?? []

  /**
   * Backend hozir faqat murojaat raqamlarini beradi (Task modelida
   * qishloq o'lchovi yo'q). Shuning uchun tanlagichda faqat javobda
   * HAQIQATAN mavjud ko'rsatkichlar chiqadi — nol qiymatni ma'lumot
   * sifatida ko'rsatmaymiz.
   */
  const metrics = useMemo(() => {
    const found = availableMetrics(stats)
    return found.length > 0 ? found : [defaultMetric]
  }, [stats, defaultMetric])

  useEffect(() => {
    if (!metrics.includes(metric)) setMetric(metrics[0])
  }, [metrics, metric])

  const scale: ColorScale | null = useMemo(() => {
    if (!stats) return null
    const values = villages.map((v) => stats[v.code]?.[metric] ?? 0)
    return buildColorScale(values)
  }, [stats, villages, metric])

  const fills = useMemo(
    () => buildFills(villages, stats, metric, scale),
    [villages, stats, metric, scale],
  )

  const byCode = useMemo(() => {
    const m = new Map<string, VillageShape>()
    for (const v of villages) m.set(v.code, v)
    return m
  }, [villages])

  /* --------------------------------------------------------------- Qidiruv */
  const matches = useMemo(() => {
    const q = searchKey(query.trim())
    if (!q) return null
    const set = new Set<string>()
    for (const v of villages) {
      if (
        searchKey(v.name_latn).includes(q) ||
        searchKey(v.name_cyrl).includes(q) ||
        v.code.includes(q)
      ) {
        set.add(v.code)
      }
    }
    return set
  }, [query, villages])

  /* -------------------------------------- Hover: React render'siz ishlaydi */
  const paintTip = useCallback(() => {
    rafRef.current = null
    const tip = tipRef.current
    const pos = pendingRef.current
    const code = hoverRef.current
    if (!tip) return

    if (!code || !pos) {
      tip.dataset.show = "0"
      return
    }
    const v = byCode.get(code)
    if (!v) {
      tip.dataset.show = "0"
      return
    }

    if (tipNameRef.current) {
      tipNameRef.current.textContent = villageName(v, locale)
    }
    if (tipValueRef.current) {
      const s = stats?.[code]
      const v = s?.[metric]
      tipValueRef.current.textContent = v != null
        ? `${metricLabel(L, metric)}: ${nf.format(v)}`
        : L.noData
    }

    // Konteyner chetlaridan chiqib ketmasligi uchun cheklaymiz
    const r = rectRef.current
    const w = tip.offsetWidth || 180
    const h = tip.offsetHeight || 48
    let x = pos.x + 14
    let y = pos.y - h - 10
    if (r) {
      if (x + w > r.width) x = pos.x - w - 14
      if (y < 0) y = pos.y + 16
    }

    tip.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
    tip.dataset.show = "1"
  }, [byCode, locale, stats, metric, L, nf])

  const setHover = useCallback(
    (code: string | null, clientX?: number, clientY?: number) => {
      const svg = svgRef.current
      if (!svg) return

      if (hoverRef.current && hoverRef.current !== code) {
        svg
          .querySelector<SVGPathElement>(`[data-code="${hoverRef.current}"]`)
          ?.removeAttribute("data-hover")
      }
      hoverRef.current = code
      if (code) {
        svg.querySelector<SVGPathElement>(`[data-code="${code}"]`)?.setAttribute("data-hover", "1")
      }

      if (code && clientX !== undefined && clientY !== undefined) {
        if (!rectRef.current) measure()
        const r = rectRef.current
        pendingRef.current = r
          ? { x: clientX - r.left, y: clientY - r.top }
          : { x: clientX, y: clientY }
      } else {
        pendingRef.current = null
      }

      if (rafRef.current === null) rafRef.current = requestAnimationFrame(paintTip)
    },
    [measure, paintTip],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      // Sensorli qurilmada hover yo'q — faqat tanlash ishlaydi
      if (e.pointerType === "touch") return
      const code = (e.target as SVGElement | null)?.getAttribute?.("data-code") ?? null
      setHover(code, e.clientX, e.clientY)
    },
    [setHover],
  )

  const onPointerLeave = useCallback(() => setHover(null), [setHover])

  const onSelect = useCallback((code: string) => {
    setSelected((prev) => (prev === code ? null : code))
  }, [])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGGElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return
      const code = (e.target as SVGElement | null)?.getAttribute?.("data-code")
      if (!code) return
      e.preventDefault()
      onSelect(code)
    },
    [onSelect],
  )

  /* ------------------------------------------------------------------ RENDER */

  if (loading) {
    return (
      <section className={cn("surface overflow-hidden", className)}>
        <div className="p-4">
          <div className="h-[420px] animate-pulse rounded-lg bg-muted" aria-busy="true">
            <span className="sr-only">{L.loading}</span>
          </div>
        </div>
      </section>
    )
  }

  if (!geometry || villages.length === 0) {
    return (
      <section className={cn("surface overflow-hidden", className)}>
        <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
          <MapIcon className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-md font-semibold text-foreground">{L.title}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{L.statsUnavailable}</p>
        </div>
      </section>
    )
  }

  const selectedVillage = selected ? byCode.get(selected) : undefined
  const selectedStats = selected ? stats?.[selected] : undefined

  const listRows = (matches ? villages.filter((v) => matches.has(v.code)) : villages)
    .slice()
    .sort((a, b) => (stats?.[b.code]?.[metric] ?? 0) - (stats?.[a.code]?.[metric] ?? 0))

  return (
    <section className={cn("surface animate-fade-in overflow-hidden", className)}>
      {/* ------------------------------------------------------------ Sarlavha */}
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        {showHeading ? (
          <div className="min-w-0">
            <h2 className="truncate text-md font-semibold text-foreground">{L.title}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {villages.length} {L.villages}
              {statsMissing ? ` · ${L.statsUnavailable}` : ""}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {villages.length} {L.villages}
            {statsMissing ? ` · ${L.statsUnavailable}` : ""}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Qidiruv */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={L.searchPlaceholder}
              aria-label={L.searchPlaceholder}
              className="h-11 w-full min-w-[180px] rounded-md border border-input bg-card pl-8.5 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-56"
            />
          </div>

          {/* Ko'rsatkich tanlash */}
          <label className="sr-only" htmlFor="map-metric">
            {L.metric}
          </label>
          <select
            id="map-metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value as VillageMetric)}
            className="h-11 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {metrics.map((m) => (
              <option key={m} value={m}>
                {metricLabel(L, m)}
              </option>
            ))}
          </select>

          {/* Xarita / ro'yxat */}
          <div
            role="group"
            aria-label={`${L.mapToggle} / ${L.listToggle}`}
            className="flex h-11 items-center gap-0.5 rounded-md bg-muted p-0.5"
          >
            <ToggleBtn active={view === "map"} onClick={() => setView("map")} icon={MapIcon}>
              {L.mapToggle}
            </ToggleBtn>
            <ToggleBtn active={view === "list"} onClick={() => setView("list")} icon={List}>
              {L.listToggle}
            </ToggleBtn>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------- XARITA
          Chapda xarita, o'ngda tanlangan mahalla statistikasi. Kichik
          ekranda panel xarita ostiga tushadi. */}
      {view === "map" && (
        <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_312px]">
          <div className="min-w-0">
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox={geometry.viewBox}
              role="group"
              aria-label={L.title}
              className="block h-auto w-full select-none"
              style={{ maxHeight: "min(72vh, 620px)" }}
            >
              <g
                onPointerMove={onPointerMove}
                onPointerLeave={onPointerLeave}
                onKeyDown={onKeyDown}
              >
                {villages.map((v) => {
                  const s = stats?.[v.code]
                  const dimmed = matches ? !matches.has(v.code) : false
                  return (
                    <path
                      key={v.code}
                      d={v.d}
                      data-code={v.code}
                      data-selected={selected === v.code ? "1" : undefined}
                      data-dimmed={dimmed ? "1" : undefined}
                      className="map-shape"
                      fill={fills[v.code] ?? NO_DATA_FILL}
                      tabIndex={0}
                      role="button"
                      aria-pressed={selected === v.code}
                      aria-label={`${villageName(v, locale)} — ${metricLabel(L, metric)}: ${
                        s?.[metric] != null ? nf.format(s[metric] as number) : L.noData
                      }`}
                      onClick={() => onSelect(v.code)}
                      onFocus={(e) => {
                        // Klaviatura bilan o'tilganda tooltip shakl markazida
                        const box = (e.target as SVGPathElement).getBoundingClientRect()
                        setHover(v.code, box.left + box.width / 2, box.top + box.height / 2)
                      }}
                      onBlur={() => setHover(null)}
                    />
                  )
                })}
              </g>
            </svg>

            {/* Tooltip — React render'idan tashqarida boshqariladi */}
            <div
              ref={tipRef}
              data-show="0"
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-10 max-w-[220px] rounded-md border border-border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md transition-opacity duration-100 data-[show='0']:opacity-0 data-[show='1']:opacity-100"
            >
              <span ref={tipNameRef} className="block text-xs font-semibold" />
              <span ref={tipValueRef} className="block text-2xs tabular-nums text-muted-foreground" />
            </div>
          </div>

          {/* Legenda */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              {metricLabel(L, metric)}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-2xs tabular-nums text-muted-foreground">
                {scale ? nf.format(scale.min) : "0"}
              </span>
              <div className="flex overflow-hidden rounded-xs border border-border">
                {CHOROPLETH_RAMP.map((c, i) => (
                  <span
                    key={i}
                    className="h-3.5 w-7"
                    style={{ background: c }}
                    aria-hidden
                  />
                ))}
              </div>
              <span className="text-2xs tabular-nums text-muted-foreground">
                {scale ? nf.format(scale.max) : "0"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-3.5 w-7 rounded-xs border border-border"
                style={{ background: NO_DATA_FILL }}
                aria-hidden
              />
              <span className="text-2xs text-muted-foreground">{L.legendNoData}</span>
            </div>
          </div>
          </div>

          {/* ------------------------------------------------ YON PANEL
              Talab: mahalla bosilganda o'ng tomonda maydon, aholi soni,
              murojaatlar va hal etilganlar soni chiqadi. */}
          <VillagePanel
            L={L}
            nf={nf}
            name={selectedVillage ? villageName(selectedVillage, locale) : null}
            stats={selectedStats}
            onClose={() => setSelected(null)}
          />
        </div>
      )}

      {/* --------------------------------------------------------------- RO'YXAT
          Sensorli va klaviatura foydalanuvchilari uchun bir xil ma'lumot —
          davlat portalida majburiy. */}
      {view === "list" && (
        <div className="scroll-x">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{L.title}</caption>
            <thead>
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {L.village}
                </th>
                {metrics.map((m) => (
                  <th
                    key={m}
                    scope="col"
                    className="whitespace-nowrap px-3 py-2.5 text-right text-2xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {metricLabel(L, m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="contain-list">
              {listRows.length === 0 && (
                <tr>
                  <td colSpan={metrics.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                    {L.villageNotFound}
                  </td>
                </tr>
              )}
              {listRows.map((v) => {
                // EMPTY_VILLAGE_STATS ISHLATILMAYDI: ma'lumot yo'q qishloqda
                // nol ko'rsatish uni haqiqiy nol bilan aralashtirib yuboradi.
                const s = stats?.[v.code]
                return (
                  <tr
                    key={v.code}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(v.code)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onSelect(v.code)
                      }
                    }}
                    className={cn(
                      "row-link border-t border-border",
                      selected === v.code && "bg-accent",
                    )}
                  >
                    <th scope="row" className="px-4 py-2.5 text-left font-medium text-foreground">
                      {villageName(v, locale)}
                    </th>
                    {metrics.map((m) => (
                      <td
                        key={m}
                        className={cn(
                          "px-3 py-2.5 text-right tabular-nums",
                          m === metric ? "font-semibold text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {typeof s?.[m] === "number" ? nf.format(s[m] as number) : "—"}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ro'yxat ko'rinishida tanlangan qishloq uchun ham shu panel */}
      {view === "list" && selectedVillage && (
        <div className="border-t border-border p-3 sm:p-4">
          <VillagePanel
            L={L}
            nf={nf}
            name={villageName(selectedVillage, locale)}
            stats={selectedStats}
            onClose={() => setSelected(null)}
          />
        </div>
      )}

      {/* .map-shape uslublari app/globals.css da (@layer components) —
          styled-jsx ishlatilmadi: u har renderda uslub inject qiladi. */}
    </section>
  )
}

/* ------------------------------------------------------------- YON PANEL */

/**
 * Tanlangan mahalla statistikasi.
 *
 * To'rt ko'rsatkich: maydoni, aholi soni, murojaatlar soni va hal
 * etilganlar soni. Maydon/aholi `BotRegion` da saqlanadi va to'ldirilmagan
 * bo'lishi mumkin — bunda "—" chiqadi va pastda izoh beriladi. Nol
 * ko'rsatish xato bo'lardi: u "aholi yo'q" degan ma'noni beradi.
 */
function VillagePanel({
  L,
  nf,
  name,
  stats,
  onClose,
}: {
  L: ReturnType<typeof getMapLabels>
  nf: Intl.NumberFormat
  name: string | null
  stats: VillageStats | undefined
  onClose: () => void
}) {
  if (!name) {
    return (
      <aside className="flex flex-col items-center justify-center gap-3 rounded-lg bg-background px-5 py-10 text-center lg:min-h-[420px]">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
          <MapIcon className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-sm font-medium text-foreground">{L.selectVillage}</p>
        <p className="max-w-[220px] text-xs leading-5 text-muted-foreground">{L.clickHint}</p>
      </aside>
    )
  }

  const appealsTotal = stats?.appeals_total
  const appealsClosed = stats?.appeals_closed
  const area = stats?.area_km2
  const population = stats?.population

  const rows: { label: string; value: string; hint?: string }[] = [
    {
      label: L.area,
      value: typeof area === "number" ? `${nf.format(area)} km²` : "—",
    },
    {
      label: L.population,
      value:
        typeof population === "number" ? `${nf.format(population)} ${L.people}` : "—",
    },
    {
      label: L.appealsTotal,
      value: typeof appealsTotal === "number" ? nf.format(appealsTotal) : "0",
    },
    {
      label: L.appealsResolved,
      value: typeof appealsClosed === "number" ? nf.format(appealsClosed) : "0",
      hint:
        typeof appealsTotal === "number" && appealsTotal > 0 && typeof appealsClosed === "number"
          ? `${Math.round((appealsClosed / appealsTotal) * 100)}%`
          : undefined,
    },
  ]

  const passportEmpty = typeof area !== "number" && typeof population !== "number"

  return (
    <aside
      className="rounded-lg bg-background p-4 lg:min-h-[420px]"
      role="region"
      aria-label={L.selectedVillage}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            {L.selectedVillage}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-tight text-foreground">{name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={L.close}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg bg-card p-3 shadow-xs">
            <dt className="truncate text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              {r.label}
            </dt>
            <dd className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold leading-none tabular-nums text-foreground">
                {r.value}
              </span>
              {r.hint && (
                <span className="text-2xs font-semibold text-success">{r.hint}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {passportEmpty && (
        <p className="mt-3 rounded-lg bg-info-soft px-3 py-2 text-2xs leading-5 text-info-soft-foreground">
          {L.passportEmpty}
        </p>
      )}
    </aside>
  )
}

/* ------------------------------------------------------------- Yordamchilar */

function ToggleBtn({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "bg-card text-foreground shadow-xs"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{children}</span>
    </button>
  )
}

function metricLabel(L: ReturnType<typeof getMapLabels>, m: VillageMetric): string {
  switch (m) {
    case "total":
      return L.total
    case "in_progress":
      return L.inProgress
    case "awaiting_approval":
      return L.awaitingApproval
    case "closed":
      return L.closed
    case "overdue":
      return L.overdue
    case "appeals_total":
      return L.appealsTotal
    case "appeals_open":
      return L.appealsOpen
    case "appeals_closed":
      return "Yopilgan murojaat"
    default:
      return m
  }
}

export default DistrictMap
