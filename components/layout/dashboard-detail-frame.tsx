"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface DetailStat {
  label: string
  value: string | number
  icon: LucideIcon
  tone: string
}

interface DashboardDetailFrameProps {
  eyebrow: string
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  stats?: DetailStat[]
  badges?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function DashboardDetailFrame({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Orqaga",
  stats = [],
  badges,
  actions,
  children,
  className,
}: DashboardDetailFrameProps) {
  return (
    <div className={cn("relative px-2.5 py-2.5 sm:px-3 sm:py-3", className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-200/24 to-transparent blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-gradient-to-bl from-emerald-200/18 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-gradient-to-tr from-amber-200/16 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-3">
        <section className="grid gap-3 2xl:grid-cols-[1.45fr_1fr]">
          <div
            data-gsap-card
            className="relative overflow-hidden rounded-[22px] border border-white/70 bg-[linear-gradient(135deg,rgba(6,182,212,0.96),rgba(13,148,136,0.92))] p-3.5 text-white shadow-[0_24px_60px_-30px_rgba(13,148,136,0.58)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_34%)]" />
            <div className="pointer-events-none absolute -right-10 top-0 h-24 w-24 rounded-full border border-white/15" />
            <div className="relative space-y-3">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2.5">
                  <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-50/90">
                    {eyebrow}
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold tracking-tight text-white sm:text-[24px]">
                      {title}
                    </h1>
                    {description && (
                      <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-cyan-50/85">
                        {description}
                      </p>
                    )}
                  </div>
                  {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {backHref && (
                    <Button
                      asChild
                      variant="secondary"
                      className="border-white/20 bg-white/10 text-white shadow-none hover:bg-white/18"
                    >
                      <Link href={backHref}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {backLabel}
                      </Link>
                    </Button>
                  )}
                  {actions}
                </div>
              </div>
            </div>
          </div>

          {stats.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-1">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  data-gsap-card
                  className={cn(
                    "rounded-[18px] border border-white/75 bg-gradient-to-br p-3 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.22)] backdrop-blur-xl",
                    stat.tone,
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                        {stat.value}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/75 p-2 shadow-sm ring-1 ring-white/80">
                      <stat.icon className="h-4 w-4 text-slate-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {children}
      </div>
    </div>
  )
}
