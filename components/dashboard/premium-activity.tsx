"use client"

import Image from "next/image"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function PremiumActivityCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/70 bg-white/78 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PremiumMessageBubble({
  align = "left",
  title,
  meta,
  children,
  footer,
}: {
  align?: "left" | "right"
  title?: React.ReactNode
  meta?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const isRight = align === "right"

  return (
    <div className={cn("flex gap-3", isRight && "flex-row-reverse")}>
      <div className="min-w-0 max-w-[78%] space-y-1.5">
        {(title || meta) && (
          <div className={cn("flex items-center gap-2", isRight && "justify-end")}>
            {title && <span className="text-sm font-medium text-slate-800">{title}</span>}
            {meta && <span className="text-xs text-slate-500">{meta}</span>}
          </div>
        )}
        <div
          className={cn(
            "rounded-[22px] border px-4 py-3 shadow-sm",
            isRight
              ? "border-cyan-200 bg-gradient-to-br from-cyan-500 to-teal-500 text-white"
              : "border-slate-200 bg-gradient-to-br from-slate-50 to-white text-slate-700",
          )}
        >
          {children}
        </div>
        {footer && <div className={cn("flex", isRight ? "justify-end" : "justify-start")}>{footer}</div>}
      </div>
    </div>
  )
}

export function PremiumSystemNote({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex justify-center">
      <div className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
        {children}
      </div>
    </div>
  )
}

export function PremiumTimelineItem({
  icon: Icon,
  title,
  description,
  meta,
  tone = "bg-cyan-100 text-cyan-700",
}: {
  icon: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  meta?: React.ReactNode
  tone?: string
}) {
  return (
    <div className="flex gap-3 rounded-[22px] border border-slate-100 bg-white/70 p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        {description && <div className="text-sm leading-6 text-slate-500">{description}</div>}
        {meta && <div className="text-xs text-slate-400">{meta}</div>}
      </div>
    </div>
  )
}

export function PremiumImagePreview({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/70 bg-slate-100", className)}>
      <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 320px" unoptimized />
    </div>
  )
}

export function PremiumSideCard({
  icon: Icon,
  title,
  children,
  accent = "from-cyan-50 via-white to-cyan-50/30",
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
  accent?: string
}) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-white/70 bg-white/78 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
      <div className={cn("border-b border-cyan-100/70 bg-gradient-to-r px-5 py-4", accent)}>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/85 p-2.5 shadow-sm ring-1 ring-white/80">
            <Icon className="h-4 w-4 text-slate-700" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-800">{title}</h3>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function PremiumActionButton({
  icon: Icon,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  icon: LucideIcon
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      <span className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
        <Icon className="h-4 w-4" />
      </span>
      <span>{children}</span>
    </button>
  )
}

export function PremiumAttachmentItem({
  href,
  icon: Icon,
  title,
  meta,
  actionLabel = "Ochish",
}: {
  href?: string
  icon: LucideIcon
  title: string
  meta?: string
  actionLabel?: string
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/80 p-3 transition hover:bg-slate-100/90">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-100">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{title}</p>
        {meta && <p className="truncate text-xs text-slate-500">{meta}</p>}
      </div>
      <span className="text-xs font-medium text-cyan-700">{actionLabel}</span>
    </div>
  )

  if (!href) return content

  return (
    <a href={href} target="_blank" rel="noreferrer" className="block">
      {content}
    </a>
  )
}

export function PremiumInsightMetric({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: React.ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-slate-50 px-3 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={cn("font-semibold text-slate-800", valueClassName)}>{value}</span>
    </div>
  )
}

export function PremiumInfoCard({
  icon: Icon,
  title,
  subtitle,
  children,
  accent = "from-cyan-50 via-white to-cyan-50/30",
  headerExtra,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  children: React.ReactNode
  accent?: string
  headerExtra?: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/78 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
      <div className={cn("border-b border-cyan-100/70 bg-gradient-to-r px-5 py-4", accent)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white/85 p-2.5 shadow-sm ring-1 ring-white/80">
              <Icon className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-slate-800">{title}</h3>
              {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {headerExtra}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function PremiumInfoItem({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  valueClassName?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-[22px] border border-slate-200 bg-slate-50/75 p-4">
      <div className="rounded-2xl bg-white p-2.5 text-slate-600 shadow-sm ring-1 ring-slate-100">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <div className={cn("mt-1 text-sm font-medium text-slate-800", valueClassName)}>{value}</div>
      </div>
    </div>
  )
}

export function PremiumCallout({
  title,
  description,
  tone = "border-emerald-200 bg-emerald-50",
  titleClassName = "text-emerald-700",
  children,
}: {
  title: string
  description?: React.ReactNode
  tone?: string
  titleClassName?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn("rounded-[24px] border p-4", tone)}>
      <p className={cn("text-sm font-semibold", titleClassName)}>{title}</p>
      {description && <div className="mt-1 text-sm text-slate-600">{description}</div>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}

export function PremiumFormLayout({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("grid gap-4 py-2", className)}>{children}</div>
}

export function PremiumFieldGroup({
  label,
  hint,
  children,
}: {
  label: React.ReactNode
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

export function PremiumFieldSurface({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-[20px] border border-slate-200 bg-slate-50/80 p-3", className)}>
      {children}
    </div>
  )
}

export function PremiumChoiceItem({
  selected,
  onClick,
  children,
}: {
  selected?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[18px] border px-3 py-2.5 text-left transition",
        selected
          ? "border-cyan-300 bg-cyan-50 text-cyan-800"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold",
          selected ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 text-transparent",
        )}
      >
        ✓
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  )
}
