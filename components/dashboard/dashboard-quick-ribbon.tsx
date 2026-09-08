"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BellRing, BriefcaseBusiness, ClipboardList, FolderKanban, Sparkles } from "lucide-react"
import { getCurrentUser } from "@/lib/api"
import { canAccessDashboardPath } from "@/lib/dashboard-access"
import { useI18n } from "@/lib/i18n/context"
import { normalizeUserRole } from "@/lib/role-utils"
import type { UserRole } from "@/types"

const ribbonText = {
  uz: {
    eyebrow: "Boshqaruv lentasi",
    title: "Asosiy ish yo'nalishlari birinchi ekranning o'zida turadi",
    description: "Topshiriqlar, loyihalar va murojaatlar bo'yicha tezkor kirishlar kundalik boshqaruvni soddalashtiradi.",
    open: "Ochish",
    items: [
      ["Topshiriqlar nazorati", "Ijro, muddat va qayta yuborilgan vazifalarni bir joydan boshqaring.", "Tezkor"],
      ["Loyihalar portfeli", "Mahalliy, xalqaro va driver yo'nalishlar bo'yicha tashabbuslarni ko'ring.", "Yangi blok"],
      ["Murojaatlar oqimi", "Fuqarolar murojaatlari, baholar va javob dinamikasini kuzating.", "Nazorat"],
      ["Bildirishnomalar", "Har bir o'zgarish va eslatmani yuqori ustuvorlikda ko'rib boring.", "Jonli"],
    ],
  },
  "uz-cyrl": {
    eyebrow: "Бошқарув лентаси",
    title: "Асосий иш йўналишлари биринчи экраннинг ўзида туради",
    description: "Топшириқлар, лойиҳалар ва мурожаатлар бўйича тезкор киришлар кундалик бошқарувни соддалаштиради.",
    open: "Очиш",
    items: [
      ["Топшириқлар назорати", "Ижро, муддат ва қайта юборилган вазифаларни бир жойдан бошқаринг.", "Тезкор"],
      ["Лойиҳалар портфели", "Маҳаллий, халқаро ва драйвер йўналишлар бўйича ташаббусларни кўринг.", "Янги блок"],
      ["Мурожаатлар оқими", "Фуқаролар мурожаатлари, баҳолар ва жавоб динамикасини кузатинг.", "Назорат"],
      ["Билдиришномалар", "Ҳар бир ўзгариш ва эслатмани юқори устуворликда кўриб боринг.", "Жонли"],
    ],
  },
  ru: {
    eyebrow: "Панель управления",
    title: "Ключевые направления работы доступны прямо на первом экране",
    description: "Быстрый доступ к поручениям, проектам и обращениям упрощает ежедневную работу.",
    open: "Открыть",
    items: [
      ["Контроль поручений", "Управляйте исполнением, сроками и возвращенными задачами из одного места.", "Быстро"],
      ["Портфель проектов", "Просматривайте инициативы по местным, международным и драйверным направлениям.", "Новый блок"],
      ["Поток обращений", "Следите за обращениями граждан, оценками и динамикой ответов.", "Контроль"],
      ["Уведомления", "Держите в фокусе каждое изменение и напоминание с высоким приоритетом.", "Онлайн"],
    ],
  },
  en: {
    eyebrow: "Control ribbon",
    title: "Key workstreams are available right on the first screen",
    description: "Quick access to tasks, projects, and appeals simplifies daily operations.",
    open: "Open",
    items: [
      ["Task control", "Manage execution, deadlines, and returned work from one place.", "Fast"],
      ["Project portfolio", "Review local, international, and driver initiatives in one view.", "New block"],
      ["Appeals flow", "Track citizen appeals, ratings, and response dynamics.", "Control"],
      ["Notifications", "Keep every change and reminder in view with high priority.", "Live"],
    ],
  },
} as const

const ribbonItems = [
  { href: "/dashboard/tasks", icon: ClipboardList, tone: "from-cyan-500/18 to-cyan-100/70" },
  { href: "/dashboard/projects", icon: FolderKanban, tone: "from-emerald-500/18 to-emerald-100/70" },
  { href: "/dashboard/appeals", icon: BriefcaseBusiness, tone: "from-amber-400/24 to-amber-100/75" },
  { href: "/dashboard/notifications", icon: BellRing, tone: "from-rose-500/18 to-rose-100/70" },
]

export function DashboardQuickRibbon() {
  const { language } = useI18n()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const content = ribbonText[language]

  useEffect(() => {
    getCurrentUser()
      .then((user) => setUserRole(normalizeUserRole(user?.role)))
      .catch(() => setUserRole(null))
  }, [])

  const visibleItems = useMemo(() => {
    return ribbonItems
      .map((item, index) => {
        const [title, description, badge] = content.items[index]
        return { ...item, title, description, badge }
      })
      .filter((item) => canAccessDashboardPath(userRole, item.href))
  }, [content.items, userRole])

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,250,252,0.86))] p-6 shadow-[0_28px_70px_-40px_rgba(14,165,233,0.42)] backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            <Sparkles className="h-3.5 w-3.5" />
            {content.eyebrow}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{content.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {content.description}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-[26px] border border-white/80 bg-white/80 p-5 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-36px_rgba(8,145,178,0.35)]"
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.tone}`}>
                <Icon className="h-5 w-5 text-slate-700" />
              </div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-800">{item.title}</h3>
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[10px] uppercase tracking-[0.18em] text-slate-600">
                  {item.badge}
                </Badge>
              </div>
              <p className="min-h-[72px] text-sm leading-6 text-slate-600">{item.description}</p>
              <Button variant="ghost" className="mt-3 h-auto px-0 text-sm font-semibold text-cyan-700 hover:bg-transparent hover:text-cyan-800">
                {content.open}
              </Button>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
