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
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-primary border-t-transparent",
            {
              sm: "h-4 w-4",
              md: "h-6 w-6",
              lg: "h-8 w-8",
            }[size]
          )}
        />
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
        className="h-4 bg-muted rounded animate-pulse"
        style={{
          animationDelay: `${i * 0.1}s`,
        }}
      />
    ))}
  </div>
)

export interface LoadingCardProps {
  title?: string
  description?: string
  className?: string
}

const LoadingCard = ({ title, description, className }: LoadingCardProps) => (
  <div className={cn("p-6 text-center", className)}>
    <div className="animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-4" />
      {title && <div className="h-6 bg-muted rounded w-1/2 mx-auto mb-2" />}
      {description && <div className="h-4 bg-muted rounded w-2/3 mx-auto" />}
    </div>
  </div>
)

export { LoadingSpinner, LoadingSkeleton, LoadingCard }
