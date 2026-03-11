import { cn } from "@/lib/utils"
import { forwardRef } from "react"

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = "md", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-center", className)}
        {...props}
      >
        <div className="relative">
          <div
            className={cn(
              "rounded-full bg-gradient-to-r from-cyan-100 via-emerald-100 to-amber-100 blur-sm",
              {
                sm: "h-5 w-5",
                md: "h-7 w-7",
                lg: "h-10 w-10",
              }[size]
            )}
          />
          <div
            className={cn(
              "absolute inset-0 animate-spin rounded-full border-2 border-cyan-500/25 border-t-cyan-600 border-r-emerald-500",
              {
                sm: "h-4 w-4",
                md: "h-6 w-6",
                lg: "h-8 w-8",
              }[size]
            )}
          />
        </div>
      </div>
    )
  }
)

LoadingSpinner.displayName = "LoadingSpinner"

export interface LoadingSkeletonProps {
  lines?: number
  className?: string
}

const LoadingSkeleton = ({ lines = 3, className }: LoadingSkeletonProps) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="relative h-4 overflow-hidden rounded-full bg-slate-100"
        style={{
          animationDelay: `${i * 0.1}s`,
        }}
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white to-transparent opacity-70" />
      </div>
    ))}
  </div>
)

export interface LoadingCardProps {
  title?: string
  description?: string
  className?: string
}

const LoadingCard = ({ title, description, className }: LoadingCardProps) => (
  <div className={cn("rounded-[24px] border border-white/70 bg-white/78 p-6 text-center shadow-[0_18px_44px_-30px_rgba(14,165,233,0.22)] backdrop-blur-xl", className)}>
    <div className="space-y-3 animate-pulse">
      <div className="mx-auto h-4 w-3/4 rounded-full bg-slate-100" />
      {title && <div className="mx-auto h-6 w-1/2 rounded-full bg-slate-100" />}
      {description && <div className="mx-auto h-4 w-2/3 rounded-full bg-slate-100" />}
    </div>
  </div>
)

export { LoadingSpinner, LoadingSkeleton, LoadingCard }
