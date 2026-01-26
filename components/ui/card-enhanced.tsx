import { cn } from "@/lib/utils"
import { forwardRef } from "react"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated"
  padding?: "none" | "sm" | "md" | "lg"
  hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", hover = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "rounded-xl border transition-all duration-300",
          
          // Variants
          {
            default: "bg-card/95 backdrop-blur-xl border-border shadow-md",
            glass: "bg-white/10 backdrop-blur-2xl border-white/20 shadow-xl",
            elevated: "bg-card shadow-lg border-border/50",
          }[variant],
          
          // Padding
          {
            none: "p-0",
            sm: "p-4",
            md: "p-6",
            lg: "p-8",
          }[padding],
          
          // Hover effects
          hover && "hover:shadow-xl hover:scale-102 hover:border-border/80",
          
          className
        )}
        {...props}
      />
    )
  }
)

Card.displayName = "Card"

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
)

CardHeader.displayName = "CardHeader"

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
)

CardTitle.displayName = "CardTitle"

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)

CardDescription.displayName = "CardDescription"

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  )
)

CardContent.displayName = "CardContent"

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
)

CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
