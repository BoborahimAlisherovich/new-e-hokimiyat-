"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState, useCallback, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Users, CheckCircle2, Clock, AlertCircle, Search, TrendingUp, BarChart3 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/lib/i18n/context"

// Til bo'yicha tarjimalar
const translations = {
  uz: {
    title: "Hatirchi tumani qishloqlar kesimi",
    villages: "ta qishloq",
    interactiveMap: "Interaktiv xarita",
    completed: "bajarildi",
    totalAppeals: "Jami murojaatlar",
    resolved: "Hal etilgan",
    inProgress: "Bajarilmoqda",
    pending: "Kutilmoqda",
    villagesList: "Qishloqlar ro'yxati",
    searchPlaceholder: "Qishloq nomi bo'yicha qidirish...",
    selectedVillage: "Tanlangan qishloq",
    total: "Jami",
    villageNotFound: "Qishloq topilmadi",
    noData: "Ma'lumot topilmadi",
    selectVillage: "Xaritadan qishloqni tanlang"
  },
  "uz-cyrl": {
    title: "Ҳатирчи тумани қишлоқлар кесими",
    villages: "та қишлоқ",
    interactiveMap: "Интерактив харита",
    completed: "бажарилди",
    totalAppeals: "Жами мурожаатлар",
    resolved: "Ҳал этилган",
    inProgress: "Бажарилмоқда",
    pending: "Кутилмоқда",
    villagesList: "Қишлоқлар рўйхати",
    searchPlaceholder: "Қишлоқ номи бўйича қидириш...",
    selectedVillage: "Танланган қишлоқ",
    total: "Жами",
    villageNotFound: "Қишлоқ топилмади",
    noData: "Маълумот топилмади",
    selectVillage: "Харитадан қишлоқни танланг"
  },
  ru: {
    title: "Разбивка по сёлам района Хатирчи",
    villages: "сёл",
    interactiveMap: "Интерактивная карта",
    completed: "выполнено",
    totalAppeals: "Всего обращений",
    resolved: "Решено",
    inProgress: "В процессе",
    pending: "Ожидает",
    villagesList: "Список сёл",
    searchPlaceholder: "Поиск по названию села...",
    selectedVillage: "Выбранное село",
    total: "Всего",
    villageNotFound: "Село не найдено",
    noData: "Данные не найдены",
    selectVillage: "Выберите село на карте"
  },
  en: {
    title: "Hatirchi district villages breakdown",
    villages: "villages",
    interactiveMap: "Interactive map",
    completed: "completed",
    totalAppeals: "Total appeals",
    resolved: "Resolved",
    inProgress: "In progress",
    pending: "Pending",
    villagesList: "Villages list",
    searchPlaceholder: "Search by village name...",
    selectedVillage: "Selected village",
    total: "Total",
    villageNotFound: "Village not found",
    noData: "No data found",
    selectVillage: "Select a village from the map"
  }
}

// Kirill → Lotin konvertatsiya xaritasi
const cyrillicToLatin: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'x', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh',
  'ъ': "'", 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  'ў': "o'", 'қ': 'q', 'ғ': "g'", 'ҳ': 'h',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
  'Ж': 'J', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
  'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
  'Ф': 'F', 'Х': 'X', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sh',
  'Ъ': "'", 'Ы': 'I', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
  'Ў': "O'", 'Қ': 'Q', 'Ғ': "G'", 'Ҳ': 'H'
}

// Kirilldan lotinga o'girish
const convertToLatin = (text: string): string => {
  return text.split('').map(char => cyrillicToLatin[char] ?? char).join('')
}

// Birinchi harfni katta qilish
const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Til bo'yicha nom formatlash
const formatVillageName = (name: string, language: string): string => {
  // API dan kelgan nom kirillcha
  if (language === 'uz') {
    // O'zbekcha (lotin) - konvertatsiya qilish
    return capitalize(convertToLatin(name).replace(/-/g, ' '))
  }
  // Kirill tillari uchun (uz-cyrl, ru) - asl nom
  return capitalize(name.replace(/-/g, ' '))
}

interface VillageStats {
  total: number
  resolved: number
  inProgress: number
  pending: number
}

interface VillageFeature {
  id: string
  name: string
  originalName: string // API dan kelgan asl nom
  path: string
  stats: VillageStats
}

interface MapPathItem {
  id: string
  name: string
  path: string
}

const getPercent = (value: number, total: number) => {
  if (!total) return 0
  return (value / total) * 100
}

const EMPTY_STATS: VillageStats = {
  total: 0,
  resolved: 0,
  inProgress: 0,
  pending: 0,
}

const buildFeaturesFromPaths = (items: MapPathItem[], language: string): VillageFeature[] =>
  items.map((item) => {
    return {
      id: item.id || item.name,
      name: formatVillageName(item.name, language),
      originalName: item.name,
      path: item.path,
      stats: EMPTY_STATS,
    }
  })

// Memoized village list item
const VillageListItem = memo(function VillageListItem({ 
  village, 
  isSelected, 
  onClick,
  maxTotal
}: { 
  village: VillageFeature
  isSelected: boolean
  onClick: () => void
  maxTotal: number
}) {
  const completionRate = village.stats.total > 0 
    ? Math.round((village.stats.resolved / village.stats.total) * 100) 
    : 0

  return (
    <motion.button
      type="button"
      className={cn(
        "w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-200",
        isSelected
          ? "border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-md"
          : "border-transparent bg-white/60 hover:bg-white hover:shadow-sm hover:border-indigo-100/40",
      )}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            completionRate >= 70 ? "bg-emerald-500" :
            completionRate >= 40 ? "bg-amber-500" : "bg-red-500"
          )} />
          <span className={cn(
            "font-medium",
            isSelected ? "text-emerald-700" : "text-slate-700"
          )}>
            {village.name}
          </span>
        </div>
        <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
          {village.stats.total}
        </Badge>
      </div>
      
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-indigo-50/50">
          <div 
            className="bg-emerald-500 transition-all duration-500" 
            style={{ width: `${getPercent(village.stats.resolved, village.stats.total)}%` }} 
          />
          <div 
            className="bg-amber-500 transition-all duration-500" 
            style={{ width: `${getPercent(village.stats.inProgress, village.stats.total)}%` }} 
          />
          <div 
            className="bg-blue-500 transition-all duration-500" 
            style={{ width: `${getPercent(village.stats.pending, village.stats.total)}%` }} 
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            {village.stats.resolved}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            {village.stats.inProgress}
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-blue-500" />
            {village.stats.pending}
          </span>
        </div>
      </div>
    </motion.button>
  )
})

// Memoized map path
const MapPath = memo(function MapPath({
  village,
  isSelected,
  onMouseMove,
  onMouseLeave,
  onClick
}: {
  village: VillageFeature
  isSelected: boolean
  onMouseMove: (event: React.MouseEvent<SVGPathElement>, village: VillageFeature) => void
  onMouseLeave: () => void
  onClick: (event: React.MouseEvent<SVGPathElement>, village: VillageFeature) => void
}) {
  const completionRate = village.stats.total > 0 
    ? (village.stats.resolved / village.stats.total) * 100 
    : 0

  const getFillClass = () => {
    if (isSelected) return "fill-emerald-400/90"
    if (completionRate >= 70) return "fill-emerald-200/70"
    if (completionRate >= 40) return "fill-amber-200/70"
    return "fill-red-200/70"
  }

  return (
    <path
      d={village.path}
      className={cn(
        "stroke-slate-400/50 stroke-[1.5px] transition-all duration-300 cursor-pointer",
        getFillClass(),
        isSelected
          ? "stroke-emerald-600 stroke-[2.5px] drop-shadow-lg"
          : "hover:stroke-emerald-500 hover:stroke-[2px] hover:fill-emerald-300/80",
      )}
      onMouseMove={(e) => onMouseMove(e, village)}
      onMouseLeave={onMouseLeave}
      onClick={(e) => onClick(e, village)}
    />
  )
})

export function VillageAnalytics() {
  const { language } = useI18n()
  const t = translations[language as keyof typeof translations] || translations.uz
  
  const [rawData, setRawData] = useState<MapPathItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [villagePage, setVillagePage] = useState(1)
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
        setRawData(rawItems)
        // Birinchi kirganda hech qaysi qishloq tanlanmagan bo'lsin
        // setSelectedId(rawItems[0].id || rawItems[0].name)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  // Til o'zgarganda qishloq nomlari yangilanadi
  const villages = useMemo(() => {
    return buildFeaturesFromPaths(rawData, language)
  }, [rawData, language])

  const maxTotal = useMemo(() => Math.max(0, ...villages.map((v) => v.stats.total)), [villages])
  const selectedVillage = villages.find((v) => v.id === selectedId) || null

  const filteredVillages = useMemo(() => {
    if (!searchQuery.trim()) return villages
    const query = searchQuery.toLowerCase()
    return villages.filter(v => 
      v.name.toLowerCase().includes(query) ||
      v.originalName.toLowerCase().includes(query)
    )
  }, [villages, searchQuery])

  const villagesPerPage = 10
  const totalVillagePages = Math.max(1, Math.ceil(filteredVillages.length / villagesPerPage))
  const currentVillagePage = Math.min(villagePage, totalVillagePages)
  const paginatedVillages = useMemo(() => {
    const start = (currentVillagePage - 1) * villagesPerPage
    return filteredVillages.slice(start, start + villagesPerPage)
  }, [currentVillagePage, filteredVillages])

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

  const overallCompletionRate = aggregated.total > 0 
    ? Math.round((aggregated.resolved / aggregated.total) * 100) 
    : 0

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGPathElement>, village: VillageFeature) => {
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      village,
    })
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  const handlePathClick = useCallback((event: React.MouseEvent<SVGPathElement>, village: VillageFeature) => {
    setSelectedId(village.id)
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    setTooltip({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      village,
    })
  }, [])

  return (
    <motion.section 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{t.title}</h2>
            <p className="text-sm text-slate-500">{villages.length} {t.villages} • {t.interactiveMap}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
          <TrendingUp className="w-3 h-3 mr-1" />
          {overallCompletionRate}% {t.completed}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="relative overflow-hidden">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-white/50 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-200/80">
                  <BarChart3 className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">{t.totalAppeals}</p>
                  <p className="text-2xl font-bold text-slate-700">{aggregated.total.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="relative overflow-hidden">
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-200/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium">{t.resolved}</p>
                  <p className="text-2xl font-bold text-emerald-700">{aggregated.resolved.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="relative overflow-hidden">
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-200/80">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-amber-600 font-medium">{t.inProgress}</p>
                  <p className="text-2xl font-bold text-amber-700">{aggregated.inProgress.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="relative overflow-hidden">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-200/80">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">{t.pending}</p>
                  <p className="text-2xl font-bold text-blue-700">{aggregated.pending.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content - Interaktiv xarita + Tanlangan qishloq (bitta blok) */}
      <div className="space-y-6">
        <Card className="bg-white/90 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                {t.interactiveMap}
              </CardTitle>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  {selectedVillage ? selectedVillage.name : t.selectVillage}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-row gap-6">
              {/* Chap: Xarita */}
              <div className="flex-1 min-w-0 relative rounded-xl border border-indigo-100/40 bg-gradient-to-br from-slate-50 to-white p-4 shadow-inner">
                <svg viewBox="0 0 838 400" className="w-full h-[400px]">
                <defs>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/>
                  </filter>
                </defs>
                {villages.map((village) => (
                  <MapPath
                    key={village.id}
                    village={village}
                    isSelected={village.id === selectedId}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={handlePathClick}
                  />
                ))}
              </svg>

              {/* Tooltip */}
              <AnimatePresence>
                {tooltip && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="pointer-events-none absolute z-20 min-w-[200px] rounded-xl border border-indigo-100/40 bg-white/98 p-4 shadow-xl backdrop-blur-sm"
                    style={{ left: tooltip.x + 16, top: tooltip.y + 16 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-emerald-100">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="font-semibold text-slate-800">{tooltip.village.name}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">{t.total}</span>
                        <Badge variant="secondary">{tooltip.village.stats.total}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {t.resolved}
                        </span>
                        <span className="font-medium text-emerald-700">{tooltip.village.stats.resolved}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-amber-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {t.inProgress}
                        </span>
                        <span className="font-medium text-amber-700">{tooltip.village.stats.inProgress}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {t.pending}
                        </span>
                        <span className="font-medium text-blue-700">{tooltip.village.stats.pending}</span>
                      </div>
                    </div>
                    {/* Mini progress */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-indigo-50/50">
                        <div className="bg-emerald-500" style={{ width: `${getPercent(tooltip.village.stats.resolved, tooltip.village.stats.total)}%` }} />
                        <div className="bg-amber-500" style={{ width: `${getPercent(tooltip.village.stats.inProgress, tooltip.village.stats.total)}%` }} />
                        <div className="bg-blue-500" style={{ width: `${getPercent(tooltip.village.stats.pending, tooltip.village.stats.total)}%` }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Legend */}
              <div className="absolute bottom-2 left-2 flex gap-3 text-xs bg-white/90 rounded-lg px-3 py-2 shadow-sm border border-slate-100">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-emerald-300" />
                  <span className="text-slate-600">≥70%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-amber-300" />
                  <span className="text-slate-600">40-70%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-300" />
                  <span className="text-slate-600">&lt;40%</span>
                </div>
              </div>
            </div>

              {/* O'ng: Tanlangan qishloq ma'lumotlari */}
              <div className="w-[400px] shrink-0 h-fit">
                <div className="pb-3">
                  <div className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-500" />
                    {t.selectedVillage}
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {selectedVillage ? (
                    <motion.div
                      key={selectedVillage.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-emerald-500 text-white shadow-lg">
                            <MapPin className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-emerald-800">{selectedVillage.name}</p>
                            <p className="text-sm text-emerald-600">{t.selectedVillage}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-indigo-100/40">
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-4 h-4 text-slate-600" />
                            <span className="text-xs text-slate-500 font-medium">{t.total}</span>
                          </div>
                          <p className="text-3xl font-bold text-slate-700">{selectedVillage.stats.total}</p>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs text-emerald-600 font-medium">{t.resolved}</span>
                          </div>
                          <p className="text-3xl font-bold text-emerald-700">{selectedVillage.stats.resolved}</p>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="text-xs text-amber-600 font-medium">{t.inProgress}</span>
                          </div>
                          <p className="text-3xl font-bold text-amber-700">{selectedVillage.stats.inProgress}</p>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-blue-600 font-medium">{t.pending}</span>
                          </div>
                          <p className="text-3xl font-bold text-blue-700">{selectedVillage.stats.pending}</p>
                        </motion.div>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-indigo-100/40">
                        <p className="text-sm font-medium text-slate-600 mb-3">{t.completed}</p>
                        <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-indigo-50/50 mb-3">
                          <motion.div className="bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${getPercent(selectedVillage.stats.resolved, selectedVillage.stats.total)}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                          <motion.div className="bg-amber-500" initial={{ width: 0 }} animate={{ width: `${getPercent(selectedVillage.stats.inProgress, selectedVillage.stats.total)}%` }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }} />
                          <motion.div className="bg-blue-500" initial={{ width: 0 }} animate={{ width: `${getPercent(selectedVillage.stats.pending, selectedVillage.stats.total)}%` }} transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }} />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="flex items-center gap-1 text-emerald-600">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            {t.resolved} ({Math.round(getPercent(selectedVillage.stats.resolved, selectedVillage.stats.total))}%)
                          </span>
                          <span className="flex items-center gap-1 text-amber-600">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            {t.inProgress} ({Math.round(getPercent(selectedVillage.stats.inProgress, selectedVillage.stats.total))}%)
                          </span>
                          <span className="flex items-center gap-1 text-blue-600">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            {t.pending} ({Math.round(getPercent(selectedVillage.stats.pending, selectedVillage.stats.total))}%)
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm opacity-80">{t.completed}</p>
                            <p className="text-3xl font-bold">{Math.round(getPercent(selectedVillage.stats.resolved, selectedVillage.stats.total))}%</p>
                          </div>
                          <div className="p-3 rounded-xl bg-white/20">
                            <TrendingUp className="w-8 h-8" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                      <div className="p-4 rounded-full bg-indigo-50/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <MapPin className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 mb-2">{t.noData}</p>
                      <p className="text-sm text-slate-400">{t.selectVillage}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Qishloqlar ro'yxati - scrolling-siz, hammasi ko'rinadi */}
        <Card className="bg-white/90 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                {t.villagesList}
              </CardTitle>
              <span className="text-sm text-slate-500">{villages.length} {t.villages}</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setVillagePage(1)
                }}
                className="pl-9 h-9 bg-indigo-50/30 border-indigo-100/40 focus:bg-white text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {paginatedVillages.length > 0 ? (
                paginatedVillages.map((village) => (
                  <VillageListItem
                    key={village.id}
                    village={village}
                    isSelected={village.id === selectedId}
                    onClick={() => setSelectedId(village.id)}
                    maxTotal={maxTotal}
                  />
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-slate-500">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{t.villageNotFound}</p>
                </div>
              )}
            </div>
            {filteredVillages.length > villagesPerPage && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  {(currentVillagePage - 1) * villagesPerPage + 1}-{Math.min(currentVillagePage * villagesPerPage, filteredVillages.length)} / {filteredVillages.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVillagePage((prev) => Math.max(1, prev - 1))}
                    disabled={currentVillagePage === 1}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-50"
                  >
                    Oldingi
                  </button>
                  <span className="text-xs font-medium text-slate-600">
                    {currentVillagePage} / {totalVillagePages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVillagePage((prev) => Math.min(totalVillagePages, prev + 1))}
                    disabled={currentVillagePage === totalVillagePages}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:opacity-50"
                  >
                    Keyingi
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.section>
  )
}
