// @ts-nocheck
"use client"

import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import {
  LayoutGrid,
  CheckSquare2,
  Users2,
  Building,
  Bell,
  BarChart4,
  FileCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageCircle,
  MessageSquare,
  Shield,
  UserCog,
  Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser, getUnreadChatCount, getUnreadNotificationsCount } from "@/lib/api"
import type { User, UserRole } from "@/types"

// Role-based menu configuration based on texnik topshiriq.txt
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  // Hokim - full access to everything
  HOKIM: [
    '/dashboard',
    '/dashboard/tasks',
    '/dashboard/users',
    '/dashboard/organizations',
    '/dashboard/notifications',
    '/dashboard/appeals',
    '/dashboard/analytics',
    '/dashboard/chat',
    '/dashboard/telegram-bot',
    '/dashboard/settings',
  ],
  // Hokimlik mas'uli - can add users, orgs, create tasks
  HOKIMLIK_MASUL: [
    '/dashboard',
    '/dashboard/tasks',
    '/dashboard/users',
    '/dashboard/organizations',
    '/dashboard/notifications',
    '/dashboard/appeals',
    '/dashboard/analytics',
    '/dashboard/chat',
    '/dashboard/telegram-bot',
    '/dashboard/settings',
  ],
  // Tashkilot rahbari - can add tashkilot mas'uli, view tasks, upload reports
  TASHKILOT_RAHBAR: [
    '/dashboard',
    '/dashboard/tasks',
    '/dashboard/users',
    '/dashboard/notifications',
    '/dashboard/appeals',
    '/dashboard/chat',
    '/dashboard/settings',
  ],
  // Tashkilot mas'uli - can only execute tasks and upload reports
  TASHKILOT_MASUL: [
    '/dashboard',
    '/dashboard/tasks',
    '/dashboard/notifications',
    '/dashboard/chat',
    '/dashboard/settings',
  ],
  // Admin - technical admin, full access
  ADMIN: [
    '/dashboard',
    '/dashboard/tasks',
    '/dashboard/users',
    '/dashboard/organizations',
    '/dashboard/notifications',
    '/dashboard/appeals',
    '/dashboard/analytics',
    '/dashboard/chat',
    '/dashboard/telegram-bot',
    '/dashboard/settings',
  ],
}

// Role labels for display
const ROLE_LABELS: Record<UserRole, string> = {
  HOKIM: 'Ҳоким',
  HOKIMLIK_MASUL: 'Ҳокимлик масъули',
  TASHKILOT_RAHBAR: 'Ташкилот раҳбари',
  TASHKILOT_MASUL: 'Ташкилот масъули',
  ADMIN: 'Техник админ',
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setCollapsed(true)
      } else {
        setCollapsed(false)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    
    // Fetch current user
    let isMounted = true
    const fetchUser = () => {
      getCurrentUser()
        .then((user) => isMounted && setCurrentUser(user))
        .catch(() => {})
    }
    fetchUser()
    
    // Listen for user profile updates
    const handleUserUpdated = () => fetchUser()
    window.addEventListener('userUpdated', handleUserUpdated)
    
    // Listen for chat read events
    const handleChatRead = () => fetchUnreadCounts()
    window.addEventListener('chatRead', handleChatRead)
    
    // Fetch unread counts
    const fetchUnreadCounts = async () => {
      try {
        const [chatCount, notifCount] = await Promise.all([
          getUnreadChatCount().catch(() => 0),
          getUnreadNotificationsCount().catch(() => 0),
        ])
        if (isMounted) {
          setUnreadChatCount(chatCount)
          setUnreadNotificationsCount(notifCount)
        }
      } catch (e) {}
    }
    
    fetchUnreadCounts()
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000)
    
    return () => {
      isMounted = false
      window.removeEventListener("resize", handleResize)
      window.removeEventListener('userUpdated', handleUserUpdated)
      window.removeEventListener('chatRead', handleChatRead)
      clearInterval(interval)
    }
  }, [])

  // Get user role - default to TASHKILOT_MASUL for minimal access
  const userRole = currentUser?.role || 'TASHKILOT_MASUL'
  const allowedPaths = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.TASHKILOT_MASUL

  // Check if user can access a path
  const canAccess = (path: string) => allowedPaths.includes(path)

  // All navigation items
  const allNavItems = [
    {
      title: "Бош саҳифа",
      href: "/dashboard",
      icon: LayoutGrid,
    },
    {
      title: "Топшириқлар",
      href: "/dashboard/tasks",
      icon: CheckSquare2,
    },
    {
      title: "Фойдаланувчилар",
      href: "/dashboard/users",
      icon: Users2,
      adminOnly: true,
    },
    {
      title: "Ташкилотлар",
      href: "/dashboard/organizations",
      icon: Building,
      adminOnly: true,
    },
    {
      title: "Билдиришномалар",
      href: "/dashboard/notifications",
      icon: Bell,
      badge: unreadNotificationsCount,
    },
    {
      title: "Мурожаатлар",
      href: "/dashboard/appeals",
      icon: MessageCircle,
    },
    {
      title: "Чат",
      href: "/dashboard/chat",
      icon: MessageSquare,
      badge: unreadChatCount,
    },
    {
      title: "Аналитика",
      href: "/dashboard/analytics",
      icon: BarChart4,
      adminOnly: true,
    },
    {
      title: "Телеграм Бот",
      href: "/dashboard/telegram-bot",
      icon: Bot,
      adminOnly: true,
    },
  ]

  // Filter navItems based on user role
  const navItems = allNavItems.filter(item => canAccess(item.href))

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobile && !collapsed && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Mobile Toggle Trigger */}
      {isMobile && collapsed && (
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setCollapsed(false)}
          className="fixed top-4 left-4 z-50 shadow-md h-10 w-10 rounded-full border border-border/50 bg-white/80 backdrop-blur"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <div
        className={cn(
          "flex h-screen flex-col bg-white/70 backdrop-blur-2xl text-sidebar-foreground border-r border-sidebar-border/60 transition-all duration-300 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.5)]",
          isMobile ? "fixed inset-y-0 left-0 z-50 transform" : "relative",
          collapsed 
            ? (isMobile ? "-translate-x-full w-72" : "w-20") 
            : "w-72"
        )}
      >
      
      {/* Header */}
      <div className="relative z-10 flex h-28 items-start justify-between border-b border-sidebar-border/60 bg-white/70 backdrop-blur-md transition-all duration-300 pt-8">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 px-4 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-primary-foreground shadow-sm">
              <span className="font-bold text-sm">ЭХ</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">e-hokimiyat</h1>
              <p className="text-xs text-muted-foreground mt-1">Murojaatlar ijrosi va ijro nazorati axborot tizimi</p>
            </div>
          </Link>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="mx-2 h-8 w-8 rounded-md transition-all duration-200 hover:bg-muted hover:text-primary"
        >
          <ChevronLeft className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            collapsed ? "rotate-180" : ""
          )} />
        </Button>
      </div>

      {/* Collapsed Logo */}
      {collapsed && (
        <div className="flex justify-center py-4">
          <Link href="/dashboard" className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary text-primary-foreground shadow-sm hover:opacity-80 transition-opacity">
            <span className="font-bold text-sm">ЭХ</span>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="relative z-10 flex-1 space-y-6 px-3 py-6"
        role="navigation"
        aria-label="Асосий меню"
      >
        {navItems.map((item, index) => {
          const isActive = pathname === item.href
          const hasBadge = item.badge && item.badge > 0
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-4 text-sm font-medium transition-all duration-150 ease-in-out",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-3"
                )}
                role="menuitem"
                aria-current={isActive ? "page" : undefined}
              >
                <div className="relative">
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-colors duration-150",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  {/* Badge for collapsed state */}
                  {collapsed && hasBadge && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                
                {!collapsed && (
                  <>
                    <span className={cn(
                      "truncate transition-colors duration-150 flex-1",
                      isActive ? "font-semibold" : "text-sm"
                    )}>
                      {item.title}
                    </span>
                    
                    {/* Badge for expanded state */}
                    {hasBadge && (
                      <Badge 
                        className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 border-0"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </>
                )}
                
                {/* Active indicator */}
                {isActive && !collapsed && !hasBadge && (
                  <div className="ml-auto">
                    <div className="w-2 h-2 bg-white rounded-full opacity-90"></div>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border bg-sidebar/95 px-3 py-3">
        {/* User Profile */}
        <div className={cn(
          "group relative flex items-center gap-3 rounded-lg p-3 bg-muted/70 transition-all duration-150 hover:bg-muted",
          collapsed && "justify-center"
        )}>
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              {currentUser ? `${currentUser.first_name[0]}${currentUser.last_name[0]}`.toUpperCase() : "АК"}
            </AvatarFallback>
          </Avatar>
          
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">
                {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Фойдалнувчи"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {currentUser?.role ? ROLE_LABELS[currentUser.role] : ""}
              </p>
            </div>
          )}
        </div>

        {/* Settings */}
        <Link href="/dashboard/settings" className="block mt-3">
          <div
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-3"
            )}
          >
            <Settings className="h-4 w-4 transition-transform duration-150 group-hover:rotate-90" />
            
            {!collapsed && (
              <span className="transition-colors duration-250">
                Созламалар
              </span>
            )}
          </div>
        </Link>
      </div>
    </div>
    </>
  )
}
