import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"

interface VillageStats {
  total: number
  resolved: number
  inProgress: number
  pending: number
}

interface VillageFeature {
  id: string
  name: string
  path: string
  stats: VillageStats
}

interface MapPathItem {
  id: string
  name: string
  path: string
}

const getFillColor = () => "fill-emerald-200/60"

const hashString = (value: string) =>
  value.split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10000, 7)

const buildStats = (seed: number): VillageStats => {
  const normalized = Math.abs(seed) || 1
  const total = 40 + (normalized % 260)
  const resolved = Math.floor(total * (0.48 + (normalized % 17) / 100))
  const inProgress = Math.floor(total * (0.2 + (normalized % 11) / 100))
  const pending = Math.max(0, total - resolved - inProgress)
  return { total, resolved, inProgress, pending }
}

const buildFeaturesFromPaths = (items: MapPathItem[]): VillageFeature[] =>
  items.map((item) => {
    const seed = hashString(item.name)
    return {
      id: item.id || item.name,
      name: item.name,
      path: item.path,
      stats: buildStats(seed),
    }
  })

export function VillageAnalytics() {
  const [villages, setVillages] = useState<VillageFeature[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    village: VillageFeature
  } | null>(null)

  useEffect(() => {
    let mounted = true
    fetch("/api/hatirchi-map")
      .then((response) => response.json())
      .then((payload) => {
        if (!mounted) return
        const rawItems = Array.isArray(payload?.data) ? (payload.data as MapPathItem[]) : []
        const mapped = buildFeaturesFromPaths(rawItems)
        setVillages(mapped)
        setSelectedId(mapped[0]?.id ?? null)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const maxTotal = useMemo(() => Math.max(0, ...villages.map((v) => v.stats.total)), [villages])
  const selectedVillage = villages.find((v) => v.id === selectedId) || null

  const aggregated = useMemo(() => {
    return villages.reduce(
      (acc, v) => {
        acc.total += v.stats.total
        acc.resolved += v.stats.resolved
        acc.inProgress += v.stats.inProgress
        acc.pending += v.stats.pending
        return acc
      },
      { total: 0, resolved: 0, inProgress: 0, pending: 0 },
    )
  }, [villages])

  return (
    <section className="animate-slide-up" style={{ animationDelay: "600ms" }}>
      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Hatirchi tumani qishloqlar kesimi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-4">
            <div className="relative rounded-2xl border border-border bg-white/70 p-4 shadow-sm">
              <svg viewBox="0 0 838 400" className="w-full h-[360px]">
                {villages.map((village) => {
                  const isSelected = village.id === selectedId
                  return (
                    <path
                      key={village.id}
                      d={village.path}
                      className={cn(
                        "stroke-emerald-900/30 stroke-[2px] transition-all duration-200",
                        getFillColor(),
                        isSelected
                          ? "stroke-emerald-700 fill-emerald-300/80"
                          : "hover:stroke-emerald-600 hover:fill-emerald-300/80",
                      )}
                      onMouseMove={(event) => {
                        const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
                        if (!rect) return
                        setTooltip({
                          x: event.clientX - rect.left,
                          y: event.clientY - rect.top,
                          village,
                        })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={(event) => {
                        setSelectedId(village.id)
                        const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
                        if (!rect) return
                        setTooltip({
                          x: event.clientX - rect.left,
                          y: event.clientY - rect.top,
                          village,
                        })
                      }}
                    />
                  )
                })}
              </svg>
              {tooltip && (
                <div
                  className="pointer-events-none absolute z-10 min-w-[180px] rounded-xl border border-border bg-white/95 p-3 text-xs shadow-lg"
                  style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
                >
                  <p className="text-sm font-semibold text-foreground">{tooltip.village.name}</p>
                  <div className="mt-1 space-y-0.5 text-muted-foreground">
                    <div>Жами: {tooltip.village.stats.total}</div>
                    <div>Ҳал этилган: {tooltip.village.stats.resolved}</div>
                    <div>Бажарилмоқда: {tooltip.village.stats.inProgress}</div>
                    <div>Кутилмоқда: {tooltip.village.stats.pending}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border border-border bg-white/80">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Жами мурожаатлар</p>
                  <p className="text-2xl font-semibold text-foreground">{aggregated.total}</p>
                </CardContent>
              </Card>
              <Card className="border border-border bg-white/80">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Ҳал этилган</p>
                  <p className="text-2xl font-semibold text-emerald-600">{aggregated.resolved}</p>
                </CardContent>
              </Card>
              <Card className="border border-border bg-white/80">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Бажарилмоқда</p>
                  <p className="text-2xl font-semibold text-amber-600">{aggregated.inProgress}</p>
                </CardContent>
              </Card>
              <Card className="border border-border bg-white/80">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Кутилмоқда</p>
                  <p className="text-2xl font-semibold text-blue-600">{aggregated.pending}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border border-border bg-white/80">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm text-muted-foreground">Танланган қишлоқ</p>
                {selectedVillage ? (
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">{selectedVillage.name}</p>
                    <div className="text-sm text-muted-foreground">Жами: {selectedVillage.stats.total}</div>
                    <div className="text-sm text-emerald-600">Ҳал этилган: {selectedVillage.stats.resolved}</div>
                    <div className="text-sm text-amber-600">Бажарилмоқда: {selectedVillage.stats.inProgress}</div>
                    <div className="text-sm text-blue-600">Кутилмоқда: {selectedVillage.stats.pending}</div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Маълумот топилмади</p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border bg-white/80">
              <CardContent className="p-4">
                <div className="space-y-2">
                  {villages.map((village) => (
                    <button
                      key={village.id}
                      type="button"
                      className={cn(
                        "w-full text-left rounded-lg border px-3 py-2 text-sm transition",
                        village.id === selectedId
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-border hover:bg-muted",
                      )}
                      onClick={() => setSelectedId(village.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{village.name}</span>
                        <span className="text-muted-foreground">{village.stats.total}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ҳал этилган: {village.stats.resolved} • Бажарилмоқда: {village.stats.inProgress}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
