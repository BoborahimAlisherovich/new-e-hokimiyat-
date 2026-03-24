"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BellRing, BriefcaseBusiness, ClipboardList, FolderKanban, Sparkles } from "lucide-react"
import { getCurrentUser } from "@/lib/api"
import { canAccessDashboardPath } from "@/lib/dashboard-access"
import { normalizeUserRole } from "@/lib/role-utils"
import type { UserRole } from "@/types"

const ribbonItems = [
  {
    title: "Topshiriqlar nazorati",
    description: "Ijro, muddat va qayta yuborilgan vazifalarni bir joydan boshqaring.",
    href: "/dashboard/tasks",
    icon: ClipboardList,
    tone: "from-cyan-500/18 to-cyan-100/70",
    badge: "Tezkor",
  },
  {
    title: "Loyihalar portfeli",
    description: "Mahalliy, xalqaro va driver yo'nalishlar bo'yicha tashabbuslarni ko'ring.",
    href: "/dashboard/projects",
    icon: FolderKanban,
    tone: "from-emerald-500/18 to-emerald-100/70",
    badge: "Yangi blok",
  },
  {
    title: "Murojaatlar oqimi",
    description: "Fuqarolar murojaatlari, baholar va javob dinamikasini kuzating.",
    href: "/dashboard/appeals",
    icon: BriefcaseBusiness,
    tone: "from-amber-400/24 to-amber-100/75",
    badge: "Nazorat",
  },
  {
    title: "Bildirishnomalar",
    description: "Har bir o'zgarish va eslatmani yuqori ustuvorlikda ko'rib boring.",
    href: "/dashboard/notifications",
    icon: BellRing,
    tone: "from-rose-500/18 to-rose-100/70",
    badge: "Jonli",
  },
]

export function DashboardQuickRibbon() {
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    getCurrentUser()
      .then((user) => setUserRole(normalizeUserRole(user?.role)))
      .catch(() => setUserRole(null))
  }, [])

  const visibleItems = useMemo(() => {
    return ribbonItems.filter((item) => canAccessDashboardPath(userRole, item.href))
  }, [userRole])

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,250,252,0.86))] p-6 shadow-[0_28px_70px_-40px_rgba(14,165,233,0.42)] backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            <Sparkles className="h-3.5 w-3.5" />
            Boshqaruv lentasi
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Asosiy ish yo'nalishlari birinchi ekraning o'zida turadi</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Topshiriqlar, loyihalar va murojaatlar bo'yicha tezkor kirishlar kunlik boshqaruvni soddalashtiradi.
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
                Ochish
              </Button>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
