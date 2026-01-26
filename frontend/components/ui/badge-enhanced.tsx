import { cn } from "@/lib/utils"
import { forwardRef } from "react"

export interface StatusBadgeProps {
  status: "success" | "warning" | "error" | "info" | "pending" | "active" | "inactive"
  size?: "sm" | "md" | "lg"
  variant?: "default" | "outline" | "dot"
  children: React.ReactNode
  className?: string
}

const statusColors = {
  success: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  error: "bg-red-100 text-red-800 border-red-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
  pending: "bg-orange-100 text-orange-800 border-orange-200",
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-gray-100 text-gray-800 border-gray-200",
}

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, size = "md", variant = "default", children, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center rounded-full font-medium",
          
          // Status colors
          statusColors[status],
          
          // Sizes
          {
            sm: "px-2 py-0.5 text-xs",
            md: "px-2.5 py-1 text-sm",
            lg: "px-3 py-1.5 text-base",
          }[size],
          
          // Variants
          {
            default: "",
            outline: "border bg-background",
            dot: "w-2 h-2 rounded-full p-0",
          }[variant],
          
          className
        )}
        {...props}
      >
        {variant !== "dot" && children}
      </span>
    )
  }
)

StatusBadge.displayName = "StatusBadge"

export interface PriorityBadgeProps {
  priority: "low" | "medium" | "high" | "urgent"
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
  className?: string
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800 border-gray-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
}

const PriorityBadge = forwardRef<HTMLSpanElement, PriorityBadgeProps>(
  ({ priority, size = "md", children, className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full font-medium",
          priorityColors[priority],
          {
            sm: "px-2 py-0.5 text-xs",
            md: "px-2.5 py-1 text-sm",
            lg: "px-3 py-1.5 text-base",
          }[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
)

PriorityBadge.displayName = "PriorityBadge"

export { StatusBadge, PriorityBadge }
