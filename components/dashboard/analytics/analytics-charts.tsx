"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  LabelList,
} from "recharts"
import { useMemo } from "react"
import { useI18n } from "@/lib/i18n/context"

const STATUS_LABELS: Record<string, string> = {
  YANGI: "Yangi",
  IJRODA: "Ijroda",
  BAJARILDI: "Bajarildi",
  NAZORATDAN_YECHILDI: "Nazoratdan yechildi",
  MUDDATI_KECH: "Muddati kechikkan",
  QAYTA_IJROGA_YUBORILDI: "Qayta ijroga yuborildi",
  BAJARILMADI: "Bajarilmadi",
}

const PRIORITY_LABELS: Record<string, string> = {
  FAVQULODDA: "Favqulodda",
  YUQORI: "Yuqori",
  ODDIY: "O'rtacha",
  PAST: "Past",
}

const CATEGORY_LABELS: Record<string, string> = {
  IJTIMOIY: "Ijtimoiy",
  IQTISODIY: "Iqtisodiy",
  HUQUQIY: "Huquqiy",
  INFRASTRUKTURA: "Infrastruktura",
  TA_LIM: "Ta'lim",
  SOG_LIQNI_SAQLASH: "Sog'liqni saqlash",
  BOSHQA: "Boshqa",
}

const GENDER_LABELS: Record<string, string> = {
  male: "Erkak",
  female: "Ayol",
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6"]
const GENDER_COLORS = ["#3b82f6", "#ec4899"] // Blue for male, Pink for female
const AXIS_TICK = { fill: "#475569", fontSize: 12, fontWeight: 600 }
const VALUE_LABEL = { fill: "#334155", fontSize: 12, fontWeight: 600 }

interface AnalyticsChartsProps {
  tasks: any[]
  organizations: any[]
  appeals: any[]
}

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
      <div className="max-w-xs">{message}</div>
    </div>
  )
}

const TEXTS = {
  uz: {
    unknown: "Noma'lum",
    statusBy: "Holatlar bo'yicha",
    priorityBy: "Muhimlik bo'yicha",
    categorySlice: "Kategoriyalar kesimi",
    trend: "Topshiriqlar tendensiyasi",
    orgLoadTop6: "Tashkilotlar yuklamasi (Top 6)",
    appealsByGender: "Murojaatchilar jinsi bo'yicha",
    appealsStatus: "Murojaatlar holati",
    countLabel: "Soni",
    unit: "ta",
    noStatusData: "Topshiriqlar holati bo'yicha ma'lumot hozircha yo'q",
    noPriorityData: "Muhimlik statistikasi topshiriqlar qo'shilgach ko'rinadi",
    noCategoryData: "Kategoriya bo'yicha topshiriqlar ma'lumoti hali yo'q",
    noTrendData: "Topshiriqlar tendensiyasi topshiriqlar yaratilgach ko'rinadi",
    noOrgLoadData: "Tashkilotlar yuklamasi bo'yicha ma'lumot hozircha yo'q",
    noGenderData: "Hozircha hech qanday murojaat yuborilmagan",
    noAppealStatusData: "Murojaatlar holati statistikasi hozircha mavjud emas",
  },
  "uz-cyrl": {
    unknown: "Номаълум",
    statusBy: "Ҳолатлар бўйича",
    priorityBy: "Муҳимлик бўйича",
    categorySlice: "Категориялар кесими",
    trend: "Топшириқлар тенденцияси",
    orgLoadTop6: "Ташкилотлар юкламаси (Топ 6)",
    appealsByGender: "Мурожаатчилар жинси бўйича",
    appealsStatus: "Мурожаатлар ҳолати",
    countLabel: "Сони",
    unit: "та",
    noStatusData: "Топшириқлар ҳолати бўйича маълумот ҳозирча йўқ",
    noPriorityData: "Муҳимлик статистикаси топшириқлар қўшилгандан кейин кўринади",
    noCategoryData: "Категория бўйича топшириқлар маълумоти ҳали йўқ",
    noTrendData: "Топшириқлар тенденцияси топшириқлар яратилгандан кейин кўринади",
    noOrgLoadData: "Ташкилотлар юкламаси бўйича маълумот ҳозирча йўқ",
    noGenderData: "Ҳозирча ҳеч қандай мурожаат юборилмаган",
    noAppealStatusData: "Мурожаатлар ҳолати статистикаси ҳозирча мавжуд эмас",
  },
  ru: {
    unknown: "Неизвестно",
    statusBy: "По статусам",
    priorityBy: "По приоритету",
    categorySlice: "По категориям",
    trend: "Тенденция задач",
    orgLoadTop6: "Нагрузка организаций (Топ 6)",
    appealsByGender: "По полу заявителей",
    appealsStatus: "Статусы обращений",
    countLabel: "Количество",
    unit: "шт.",
    noStatusData: "Данные по статусам поручений пока отсутствуют",
    noPriorityData: "Статистика по приоритетам появится после добавления поручений",
    noCategoryData: "Пока нет данных по категориям поручений",
    noTrendData: "Тренд появится после создания поручений",
    noOrgLoadData: "Данные по загрузке организаций пока отсутствуют",
    noGenderData: "Пока не было ни одного обращения",
    noAppealStatusData: "Статистика по статусам обращений пока недоступна",
  },
  en: {
    unknown: "Unknown",
    statusBy: "By status",
    priorityBy: "By priority",
    categorySlice: "By category",
    trend: "Task trend",
    orgLoadTop6: "Organization load (Top 6)",
    appealsByGender: "By applicant gender",
    appealsStatus: "Appeal statuses",
    countLabel: "Count",
    unit: "pcs",
    noStatusData: "No task status data yet",
    noPriorityData: "Priority statistics will appear after tasks are added",
    noCategoryData: "There is no category-based task data yet",
    noTrendData: "Task trend will appear after tasks are created",
    noOrgLoadData: "Organization workload data is not available yet",
    noGenderData: "No appeals have been submitted yet",
    noAppealStatusData: "Appeal status statistics are not available yet",
  },
} as const

const formatShortDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" })
}

export function AnalyticsCharts({ tasks, organizations, appeals }: AnalyticsChartsProps) {
  const { language } = useI18n()
  const tr = TEXTS[language || "uz"] || TEXTS.uz

  const statusLabels = useMemo(() => ({
    ...STATUS_LABELS,
    ...(language === "uz-cyrl"
      ? {
          YANGI: "Янги",
          IJRODA: "Ижрода",
          BAJARILDI: "Бажарилди",
          NAZORATDAN_YECHILDI: "Назоратдан ечилди",
          MUDDATI_KECH: "Муддати кечиккан",
          QAYTA_IJROGA_YUBORILDI: "Қайта ижрога юборилди",
          BAJARILMADI: "Бажарилмади",
        }
      : language === "ru"
      ? {
          YANGI: "Новая",
          IJRODA: "В работе",
          BAJARILDI: "Выполнено",
          NAZORATDAN_YECHILDI: "Снято с контроля",
          MUDDATI_KECH: "Просрочено",
          QAYTA_IJROGA_YUBORILDI: "Отправлено на доработку",
          BAJARILMADI: "Не выполнено",
        }
      : language === "en"
      ? {
          YANGI: "New",
          IJRODA: "In progress",
          BAJARILDI: "Completed",
          NAZORATDAN_YECHILDI: "Released from control",
          MUDDATI_KECH: "Overdue",
          QAYTA_IJROGA_YUBORILDI: "Returned to execution",
          BAJARILMADI: "Not completed",
        }
      : {}),
  }), [language])

  const priorityLabels = useMemo(() => ({
    ...PRIORITY_LABELS,
    ...(language === "uz-cyrl"
      ? { FAVQULODDA: "Фавқулодда", YUQORI: "Юқори", ODDIY: "Ўртача", PAST: "Паст" }
      : language === "ru"
      ? { FAVQULODDA: "Критично", YUQORI: "Высокий", ODDIY: "Средний", PAST: "Низкий" }
      : language === "en"
      ? { FAVQULODDA: "Critical", YUQORI: "High", ODDIY: "Medium", PAST: "Low" }
      : {}),
  }), [language])

  const categoryLabels = useMemo(() => ({
    ...CATEGORY_LABELS,
    ...(language === "uz-cyrl"
      ? {
          IJTIMOIY: "Ижтимоий",
          IQTISODIY: "Иқтисодий",
          HUQUQIY: "Ҳуқуқий",
          INFRASTRUKTURA: "Инфратузилма",
          TA_LIM: "Таълим",
          SOG_LIQNI_SAQLASH: "Соғлиқни сақлаш",
          BOSHQA: "Бошқа",
        }
      : language === "ru"
      ? {
          IJTIMOIY: "Социальная",
          IQTISODIY: "Экономическая",
          HUQUQIY: "Правовая",
          INFRASTRUKTURA: "Инфраструктура",
          TA_LIM: "Образование",
          SOG_LIQNI_SAQLASH: "Здравоохранение",
          BOSHQA: "Другое",
        }
      : language === "en"
      ? {
          IJTIMOIY: "Social",
          IQTISODIY: "Economic",
          HUQUQIY: "Legal",
          INFRASTRUKTURA: "Infrastructure",
          TA_LIM: "Education",
          SOG_LIQNI_SAQLASH: "Healthcare",
          BOSHQA: "Other",
        }
      : {}),
  }), [language])

  const genderLabels = useMemo(() => ({
    ...GENDER_LABELS,
    ...(language === "uz-cyrl"
      ? { male: "Эркак", female: "Аёл" }
      : language === "ru"
      ? { male: "Мужчины", female: "Женщины" }
      : language === "en"
      ? { male: "Male", female: "Female" }
      : {}),
  }), [language])

  const statusData = useMemo(() => {
    const map = new Map<string, number>()
    const safeTasks = tasks || []
    safeTasks.forEach((task) => {
      const key = task.status || "UNKNOWN"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([key, value]) => ({
      name: key === "UNKNOWN" ? tr.unknown : statusLabels[key] || key,
      value,
    }))
  }, [tasks, statusLabels, tr.unknown])

  const priorityData = useMemo(() => {
    const map = new Map<string, number>()
    const safeTasks = tasks || []
    safeTasks.forEach((task) => {
      const key = task.priority || "UNKNOWN"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([key, value]) => ({
      name: key === "UNKNOWN" ? tr.unknown : priorityLabels[key] || key,
      value,
    }))
  }, [tasks, priorityLabels, tr.unknown])

  const categoryData = useMemo(() => {
    const map = new Map<string, number>()
    const safeTasks = tasks || []
    safeTasks.forEach((task) => {
      const key = task.category || "UNKNOWN"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([key, value]) => ({
      name: key === "UNKNOWN" ? tr.unknown : categoryLabels[key] || key,
      value,
    }))
  }, [tasks, categoryLabels, tr.unknown])

  // Murojaatchilar jinsi bo'yicha
  const genderData = useMemo(() => {
    const map = new Map<string, number>()
    const safeAppeals = appeals || []
    safeAppeals.forEach((appeal: any) => {
      const gender = appeal.citizenGender || appeal.telegram_user?.gender || "unknown"
      if (gender && gender !== 'unknown') {
        map.set(gender, (map.get(gender) || 0) + 1)
      }
    })

    if (map.size === 0) {
      map.set("male", 0)
      map.set("female", 0)
    }

    const data = Array.from(map.entries()).map(([key, value]) => ({
      name: genderLabels[key] || key,
      value,
      fill: key === 'male' ? GENDER_COLORS[0] : GENDER_COLORS[1],
      startAngle: key === 'male' ? 90 : -90,
      endAngle: key === 'male' ? 270 : 90,
    }))
    return data
  }, [appeals, genderLabels])

  const trendData = useMemo(() => {
    const map = new Map<string, number>()
    const safeTasks = tasks || []
    safeTasks.forEach((task) => {
      const key = task.created_at || task.createdAt || task.created || ""
      if (!key) return
      const dateKey = new Date(key).toISOString().slice(0, 10)
      map.set(dateKey, (map.get(dateKey) || 0) + 1)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([key, value]) => ({
        date: formatShortDate(key),
        value,
      }))
  }, [tasks])

  const orgData = useMemo(() => {
    const map = new Map<string, number>()
    tasks.forEach((task) => {
      const assignments = task.assigned_organizations || task.organizations || []
      if (Array.isArray(assignments) && assignments.length > 0) {
        assignments.forEach((item: any) => {
          const name = item?.organization?.name || item?.name || tr.unknown
          map.set(name, (map.get(name) || 0) + 1)
        })
      } else if (task.organization?.name) {
        const name = task.organization.name
        map.set(name, (map.get(name) || 0) + 1)
      }
    })

    if (map.size === 0 && organizations?.length) {
      organizations.forEach((org) => {
        map.set(org.name || tr.unknown, map.get(org.name) || 0)
      })
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [tasks, organizations, tr.unknown])

  // Murojaatlar holati bo'yicha
  const appealStatusData = useMemo(() => {
    const statusMap: Record<string, string> =
      language === "uz-cyrl"
        ? {
            PENDING: "Кутилмоқда",
            pending: "Кутилмоқда",
            pending_ai: "AI таҳлилида",
            pending_review: "Кўриб чиқилмоқда",
            IN_PROGRESS: "Жараёнда",
            in_progress: "Жараёнда",
            RESOLVED: "Ҳал этилди",
            resolved: "Ҳал этилди",
            REJECTED: "Рад этилди",
            rejected: "Рад этилди",
            approved: "Тасдиқланди",
            responded: "Жавоб берилди",
          }
        : language === "ru"
        ? {
            PENDING: "Ожидает",
            pending: "Ожидает",
            pending_ai: "AI анализ",
            pending_review: "На рассмотрении",
            IN_PROGRESS: "В процессе",
            in_progress: "В процессе",
            RESOLVED: "Решено",
            resolved: "Решено",
            REJECTED: "Отклонено",
            rejected: "Отклонено",
            approved: "Подтверждено",
            responded: "Ответ дан",
          }
        : language === "en"
        ? {
            PENDING: "Pending",
            pending: "Pending",
            pending_ai: "AI analysis",
            pending_review: "Under review",
            IN_PROGRESS: "In progress",
            in_progress: "In progress",
            RESOLVED: "Resolved",
            resolved: "Resolved",
            REJECTED: "Rejected",
            rejected: "Rejected",
            approved: "Approved",
            responded: "Responded",
          }
        : {
            PENDING: "Kutilmoqda",
            pending: "Kutilmoqda",
            pending_ai: "AI tahlilida",
            pending_review: "Ko'rib chiqilmoqda",
            IN_PROGRESS: "Jarayonda",
            in_progress: "Jarayonda",
            RESOLVED: "Hal etildi",
            resolved: "Hal etildi",
            REJECTED: "Rad etildi",
            rejected: "Rad etildi",
            approved: "Tasdiqlandi",
            responded: "Javob berildi",
          }
    const statusColors: Record<string, string> = {
      'Kutilmoqda': '#f59e0b',
      'AI tahlilida': '#8b5cf6',
      "Ko'rib chiqilmoqda": '#3b82f6',
      'Jarayonda': '#06b6d4',
      'Hal etildi': '#10b981',
      'Rad etildi': '#ef4444',
      'Tasdiqlandi': '#10b981',
      'Javob berildi': '#10b981',
    }
    const map = new Map<string, number>()
    appeals.forEach((appeal: any) => {
      const key = appeal.status || 'PENDING'
      const label = statusMap[key] || (key === "UNKNOWN" ? tr.unknown : key)
      map.set(label, (map.get(label) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ 
      name, 
      value, 
      fill: statusColors[name] || '#8b5cf6' 
    }))
  }, [appeals, language, tr.unknown])

  const hasChartValues = (data: Array<{ value: number }>) => data.some((item) => item.value > 0)

  return (
    <section className="animate-slide-up" style={{ animationDelay: "300ms" }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)]">
          <CardHeader>
            <CardTitle className="text-lg bg-clip-text text-transparent">{tr.statusBy}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {hasChartValues(statusData) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="statusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" tick={AXIS_TICK} interval={0} angle={-15} height={60} />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="value" fill="url(#statusGradient)" radius={[8, 8, 0, 0]}>
                    <LabelList dataKey="value" position="top" {...VALUE_LABEL} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmptyState message={tr.noStatusData} />}
          </CardContent>
        </Card>

        <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)]">
          <CardHeader>
            <CardTitle className="text-lg bg-clip-text text-transparent">{tr.priorityBy}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {hasChartValues(priorityData) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    innerRadius={65}
                    paddingAngle={4}
                    animationBegin={0}
                    animationDuration={800}
                    label={({ name, value }) => `${name} ${value}`}
                    labelLine={false}
                  >
                    {priorityData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <ChartEmptyState message={tr.noPriorityData} />}
          </CardContent>
        </Card>

        <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)]">
          <CardHeader>
            <CardTitle className="text-lg bg-clip-text text-transparent">{tr.categorySlice}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {hasChartValues(categoryData) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="categoryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="name" tick={AXIS_TICK} interval={0} angle={-10} height={50} />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="value" fill="url(#categoryGradient)" radius={[8, 8, 0, 0]}>
                    <LabelList dataKey="value" position="top" {...VALUE_LABEL} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmptyState message={tr.noCategoryData} />}
          </CardContent>
        </Card>

        <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)]">
          <CardHeader>
            <CardTitle className="text-lg bg-clip-text text-transparent">{tr.trend}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {hasChartValues(trendData) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#ec4899" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="date" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} />
                  <Tooltip cursor={{ stroke: "#e2e8f0" }} />
                  <Line type="monotone" dataKey="value" stroke="url(#trendGradient)" strokeWidth={3} dot={{ r: 4, fill: "#8b5cf6" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <ChartEmptyState message={tr.noTrendData} />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)]">
          <CardHeader>
            <CardTitle className="text-lg bg-clip-text text-transparent">{tr.orgLoadTop6}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {hasChartValues(orgData) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orgData} layout="vertical" margin={{ left: 40, right: 36, top: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="orgGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={AXIS_TICK} width={180} />
                  <Tooltip cursor={{ fill: "#f1f5f9" }} />
                  <Bar dataKey="value" fill="url(#orgGradient)" radius={[0, 8, 8, 0]}>
                    <LabelList dataKey="value" position="right" {...VALUE_LABEL} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmptyState message={tr.noOrgLoadData} />}
          </CardContent>
        </Card>

        {/* Murojaatchilar jinsi bo'yicha */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{tr.appealsByGender}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {hasChartValues(genderData) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={genderData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    startAngle={180}
                    endAngle={-180}
                    outerRadius={100} 
                    innerRadius={60}
                    paddingAngle={0}
                    label={({ cx, cy, index, name, percent, value, fill }) => {
                      const x = index === 0 ? cx - 140 : cx + 140
                      const y = cy
                      
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill={fill}
                          textAnchor={index === 0 ? 'end' : 'start'} 
                          dominantBaseline="middle"
                          style={{ fontSize: '16px', fontWeight: 700 }}
                        >
                          {`${name} ${value} (${(percent * 100).toFixed(0)}%)`}
                        </text>
                      )
                    }}
                    labelLine={false}
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} ${tr.unit}`, tr.countLabel]} />
                </PieChart>
              </ResponsiveContainer>
            ) : <ChartEmptyState message={tr.noGenderData} />}
          </CardContent>
        </Card>

        {/* Murojaatlar holati */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{tr.appealsStatus}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {hasChartValues(appealStatusData) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appealStatusData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="name" tick={AXIS_TICK} interval={0} angle={-10} height={50} />
                  <YAxis tick={AXIS_TICK} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {appealStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    <LabelList dataKey="value" position="top" {...VALUE_LABEL} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <ChartEmptyState message={tr.noAppealStatusData} />}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
