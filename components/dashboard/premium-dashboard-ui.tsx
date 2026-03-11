"use client"

import type { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export interface PremiumStatItem {
  label: string
  value: string | number
  icon: LucideIcon
  gradient: string
  bgGradient: string
  iconBg: string
  textColor: string
  borderColor: string
  hint?: string
}

export function PremiumStatsGrid({ items }: { items: PremiumStatItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => {
        const Icon = item.icon

        return (
          <motion.div
            key={item.label}
            data-gsap-card
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.35 }}
            className={cn(
              "group relative overflow-hidden rounded-[24px] border shadow-[0_18px_45px_-32px_rgba(15,23,42,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-32px_rgba(14,165,233,0.26)]",
              "bg-gradient-to-br backdrop-blur-xl",
              item.bgGradient,
              item.borderColor,
            )}
          >
            <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", item.gradient)} />
            <div className={cn("absolute -right-5 -top-5 h-24 w-24 rounded-full opacity-15 blur-2xl transition-opacity duration-500 group-hover:opacity-30 bg-gradient-to-br", item.gradient)} />

            <div className="relative p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className={cn("mt-1.5 text-3xl font-bold tracking-tight", item.textColor)}>{item.value}</p>
                  {item.hint && (
                    <p className="mt-1 text-xs font-medium text-slate-500">{item.hint}</p>
                  )}
                </div>
                <div className={cn("rounded-2xl p-3 shadow-sm transition-transform duration-300 group-hover:scale-110", item.iconBg)}>
                  <Icon className={cn("h-6 w-6", item.textColor)} />
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export function PremiumFilterShell({
  icon: Icon,
  title,
  description,
  accentClassName,
  badge,
  clearAction,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  accentClassName: string
  badge?: React.ReactNode
  clearAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <motion.div
      data-gsap-card
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-[26px] border border-white/70 bg-white/78 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl"
    >
      <div className={cn("border-b border-cyan-100/50 p-4", accentClassName)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/85 p-2.5 shadow-sm ring-1 ring-white/80">
              <Icon className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>
          {(badge || clearAction) && (
            <div className="flex flex-wrap items-center gap-2">
              {badge}
              {clearAction}
            </div>
          )}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  )
}

export function PremiumCountBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border px-2.5 py-1 text-xs shadow-sm", className)}
    >
      {children}
    </Badge>
  )
}

export function PremiumTableShell({
  icon: Icon,
  title,
  countLabel,
  accentClassName,
  children,
}: {
  icon: LucideIcon
  title: string
  countLabel?: string
  accentClassName: string
  children: React.ReactNode
}) {
  return (
    <motion.div
      data-gsap-card
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-[26px] border border-white/70 bg-white/78 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl"
    >
      <div className={cn("flex items-center justify-between border-b border-cyan-100/50 px-4 py-3", accentClassName)}>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-slate-700" />
          <span className="font-medium text-slate-800">{title}</span>
        </div>
        {countLabel && <span className="text-sm text-slate-500">{countLabel}</span>}
      </div>
      {children}
    </motion.div>
  )
}

export function PremiumEmptyState({
  icon: Icon,
  title,
  description,
  tone = "from-slate-100 to-slate-200 text-slate-500",
}: {
  icon: LucideIcon
  title: string
  description: string
  tone?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className={cn("mb-5 rounded-[22px] bg-gradient-to-br p-5 shadow-inner", tone)}>
        <Icon className="h-10 w-10" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-700">{title}</h3>
      <p className="max-w-sm text-sm text-slate-500">{description}</p>
    </motion.div>
  )
}
