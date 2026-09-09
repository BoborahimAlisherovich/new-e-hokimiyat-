"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  firstName?: string
  lastName?: string
  avatarUrl?: string | null
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  showOnline?: boolean
  isOnline?: boolean
}

const sizeClasses = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
  xl: "h-16 w-16",
}

const textSizeClasses = {
  xs: "text-[9px]",
  sm: "text-xs",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-lg",
}

const onlineDotSizes = {
  xs: "w-1.5 h-1.5 border",
  sm: "w-2 h-2 border-[1.5px]",
  md: "w-2.5 h-2.5 border-2",
  lg: "w-3 h-3 border-2",
  xl: "w-3.5 h-3.5 border-2",
}

export function UserAvatar({
  firstName = "",
  lastName = "",
  avatarUrl,
  size = "md",
  className,
  showOnline = false,
  isOnline = false,
}: UserAvatarProps) {
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?"

  return (
    <div className="relative inline-flex flex-shrink-0">
      <Avatar className={cn(sizeClasses[size], "ring-2 ring-blue-100/50", className)}>
        {avatarUrl && (
          <AvatarImage
            src={avatarUrl}
            alt={`${firstName} ${lastName}`}
            className="object-cover"
          />
        )}
        <AvatarFallback
          className={cn(
            "bg-primary text-primary-foreground font-semibold",
            textSizeClasses[size]
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {showOnline && isOnline && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full bg-green-500 border-white",
            onlineDotSizes[size]
          )}
        />
      )}
    </div>
  )
}
