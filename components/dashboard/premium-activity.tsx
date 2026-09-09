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
      className={cn( "rounded-[28px] border border-border bg-card shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)]",
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
            {title && <span className="text-sm font-medium text-foreground">{title}</span>}
            {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
          </div>
        )}
        <div
          className={cn( "rounded-[22px] border px-4 py-3 shadow-sm",
            isRight
              ? "bg-primary border-border text-white"
              : "bg-background border-border text-secondary-foreground",
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
      <div className="rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-soft-foreground">
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
  tone = "bg-primary-soft text-primary-soft-foreground",
}: {
  icon: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  meta?: React.ReactNode
  tone?: string
}) {
  return (
    <div className="flex gap-3 rounded-[22px] border border-border bg-card p-4">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {description && <div className="text-sm leading-6 text-muted-foreground">{description}</div>}
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
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
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-muted", className)}>
      <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 320px" unoptimized />
    </div>
  )
}

export function PremiumSideCard({
  icon: Icon,
  title,
  children,
  accent = "via-white bg-info",
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
  accent?: string
}) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-border bg-card shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)]">
      <div className={cn("border-b border-border px-5 py-4", accent)}>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-card p-2.5 shadow-sm ring-1 ring-border">
            <Icon className="h-4 w-4 text-secondary-foreground" />
          </div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
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
      className={cn( "flex w-full items-center gap-3 rounded-[20px] border border-border bg-background px-4 py-3 text-left text-sm font-medium text-secondary-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      <span className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-border">
        <Icon className="h-4 w-4" />
      </span>
      <span>{children}</span>
    </button>
  )
}

export function PremiumAttachmentItem({
  href,
  onClick,
  icon: Icon,
  title,
  meta,
  actionLabel = "Ochish",
}: {
  href?: string
  onClick?: () => void
  icon: LucideIcon
  title: string
  meta?: string
  actionLabel?: string
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-[20px] border border-border bg-background p-3 transition hover:bg-muted">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-muted-foreground shadow-sm ring-1 ring-border">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
      </div>
      <span className="text-xs font-medium text-primary">{actionLabel}</span>
    </div>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left">
        {content}
      </button>
    )
  }

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
    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-background px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold text-foreground", valueClassName)}>{value}</span>
    </div>
  )
}

export function PremiumInfoCard({
  icon: Icon,
  title,
  subtitle,
  children,
  accent = "via-white bg-info",
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
    <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)]">
      <div className={cn("border-b border-border px-5 py-4", accent)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-card p-2.5 shadow-sm ring-1 ring-border">
              <Icon className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
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
    <div className="flex items-start gap-3 rounded-[22px] border border-border bg-background p-4">
      <div className="rounded-2xl bg-white p-2.5 text-muted-foreground shadow-sm ring-1 ring-border">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <div className={cn("mt-1 text-sm font-medium text-foreground", valueClassName)}>{value}</div>
      </div>
    </div>
  )
}

export function PremiumCallout({
  title,
  description,
  tone = "border-border bg-success-soft",
  titleClassName = "text-success",
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
      {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
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
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
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
    <div className={cn("rounded-[20px] border border-border bg-background p-3", className)}>
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
      className={cn( "flex w-full items-center gap-3 rounded-[18px] border px-3 py-2.5 text-left transition",
        selected
          ? "border-border-strong bg-primary-soft text-primary-soft-foreground"
          : "border-border bg-white text-secondary-foreground hover:bg-background",
      )}
    >
      <span
        className={cn( "flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold",
          selected ? "border-ring bg-primary text-primary-foreground" : "border-border-strong text-transparent",
        )}
      >
        ✓
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  )
}
