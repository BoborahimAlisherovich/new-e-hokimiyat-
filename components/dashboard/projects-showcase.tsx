"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, BadgeDollarSign, Globe2, Landmark, Rocket } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getCurrentUser, getProjects } from "@/lib/api"
import { normalizeUserRole } from "@/lib/role-utils"
import type { Project, UserRole } from "@/types"

const groupMeta = {
  MAHALLIY: {
    title: "Mahalliy loyihalar",
    icon: Landmark,
    accent: "from-emerald-500 to-teal-500",
    tone: "bg-emerald-50 border-emerald-100",
  },
  XALQARO: {
    title: "Xalqaro loyihalar",
    icon: Globe2,
    accent: "from-sky-500 to-cyan-500",
    tone: "bg-sky-50 border-sky-100",
  },
  DRIVER: {
    title: "Driver loyihalar",
    icon: Rocket,
    accent: "from-amber-500 to-orange-500",
    tone: "bg-amber-50 border-amber-100",
  },
} as const

export function ProjectsShowcase() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)

  useEffect(() => {
    let active = true

    Promise.all([getProjects(), getCurrentUser().catch(() => null)])
      .then(([data, user]) => {
        if (!active) return
        setProjects(data ?? [])
        const role = normalizeUserRole(user?.role as UserRole | string | null | undefined)
        setCanManage(Boolean(role && ["HOKIM", "HOKIM_YORDAMCHISI", "ADMIN"].includes(role)))
      })
      .catch(() => {
        if (!active) return
        setProjects([])
        setCanManage(false)
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const projectGroups = useMemo(() => {
    return (Object.keys(groupMeta) as Array<keyof typeof groupMeta>).map((key) => {
      const items = projects.filter((project) => project.category === key)
      const budgets = items.map((project) => project.budget).filter(Boolean)
      return {
        key,
        ...groupMeta[key],
        total: `${items.length} ta`,
        budget: budgets[0] ?? "Belgilanmagan",
        items: items.slice(0, 3),
      }
    })
  }, [projects])

  return (
    <section id="projects-showcase" className="overflow-hidden rounded-[34px] border border-[#d9efe4] bg-[linear-gradient(180deg,#f7fbf9_0%,#eef8f2_100%)] shadow-[0_30px_80px_-46px_rgba(16,185,129,0.35)]">
      <div className="border-b border-[#d9efe4] bg-[linear-gradient(90deg,rgba(3,105,161,0.06),rgba(16,185,129,0.12),rgba(245,158,11,0.08))] px-6 py-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-700">Loyihalar portfeli</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Ochiq va vizual loyiha oynasi</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Mahalliy, xalqaro va driver loyihalar real portfel ma'lumotlari asosida ko'rsatiladi. Har bir blokda hajm, holat va joriy progress birinchi ko'rinishda chiqadi.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="rounded-full bg-white px-3 py-1 text-emerald-700 shadow-sm">{projects.length} ta loyiha</Badge>
            {canManage && (
              <Button asChild className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                <Link href="/dashboard/projects?action=create">
                  Yangi loyiha
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-full border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50">
              <Link href="/dashboard/projects">
                {canManage ? "Portfel boshqaruvi" : "Portfelni ochish"}
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-white/80 px-3 py-1">Ko'rish: barcha dashboard rollari uchun</span>
          <span className="rounded-full bg-white/80 px-3 py-1">Boshqaruv: hokim, hokim o'rinbosari, administrator</span>
        </div>
      </div>

      <div className="grid gap-5 p-6 lg:grid-cols-3">
        {projectGroups.map((group) => {
          const Icon = group.icon
          return (
            <article key={group.key} className={`rounded-[28px] border ${group.tone} bg-white/92 p-5 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.32)]`}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${group.accent}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{group.title}</h3>
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 text-slate-400" />
              </div>

              <div className="mb-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Hajmi</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{group.total}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Resurs</p>
                  <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <BadgeDollarSign className="h-4 w-4 text-emerald-600" />
                    {group.budget}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {loading && group.items.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                    Loyihalar yuklanmoqda...
                  </div>
                )}
                {!loading && group.items.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                    Hozircha bu kategoriyada loyiha yo'q.
                  </div>
                )}
                {group.items.map((item) => (
                  <div key={String(item.id)} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium leading-6 text-slate-800">{item.title}</p>
                      <Badge variant="outline" className="border-slate-200 bg-white text-[10px] uppercase tracking-[0.16em] text-slate-600">
                        {item.status_display || item.status}
                      </Badge>
                    </div>
                    {item.owner && <p className="mt-1 text-xs text-slate-500">{item.owner}</p>}
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>Progress</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white">
                        <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
