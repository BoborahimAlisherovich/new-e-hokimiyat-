import { cn } from "@/lib/utils"
import { forwardRef } from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  variant?: "default" | "filled" | "outlined"
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, variant = "default", ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              // Base styles
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              
              // Variants
              {
                default: "border-border",
                filled: "border-transparent bg-muted",
                outlined: "border-2 border-border bg-transparent",
              }[variant],
              
              // With left icon
              leftIcon && "pl-10",
              
              // With right icon
              rightIcon && "pr-10",
              
              // Error state
              error && "border-destructive focus-visible:ring-destructive",
              
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {helperText && (
          <p className={cn("text-xs text-muted-foreground", error && "text-destructive")}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

// Export the component
export { Input }
