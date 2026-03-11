// @ts-nocheck
"use client"

import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
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
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getCurrentUser, getUnreadChatCount, getUnreadNotificationsCount } from "@/lib/api"
import type { User, UserRole } from "@/types"
import { useTranslation } from "@/lib/i18n/context"
import { canAccessDashboardPath, isDashboardNavItemActive } from "@/lib/dashboard-access"

export function Sidebar() {
  const t = useTranslation()
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
    
    // Refresh quickly when header detects a new notification
    const handleNotificationReceived = () => fetchUnreadCounts()
    window.addEventListener('notificationReceived', handleNotificationReceived)
    
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
      window.removeEventListener('notificationReceived', handleNotificationReceived)
      clearInterval(interval)
    }
  }, [])

  // Get user role - default to TASHKILOT_MASUL for minimal access
  const userRole = currentUser?.role || 'TASHKILOT_MASUL'

  const roleLabels: Record<UserRole, string> = {
    HOKIM: t.roles.HOKIM,
    HOKIM_YORDAMCHISI: t.roles.HOKIM_YORDAMCHISI,
    HOKIMLIK_MASUL: t.roles.HOKIMLIK_MASUL,
    TASHKILOT_RAHBAR: t.roles.TASHKILOT_RAHBAR,
    TASHKILOT_RAHBARI: t.roles.TASHKILOT_RAHBAR,
    TASHKILOT_MASUL: t.roles.TASHKILOT_MASUL,
    ADMIN: t.roles.ADMIN,
  }

  // Check if user can access a path
  const canAccess = (path: string) => canAccessDashboardPath(userRole, path)

  // All navigation items
  const allNavItems = [
    {
      title: t.navigation.dashboard,
      href: "/dashboard",
      icon: LayoutGrid,
      section: "main"
    },
    {
      title: t.navigation.tasks,
      href: "/dashboard/tasks",
      icon: CheckSquare2,
      section: "main"
    },
    {
      title: t.navigation.users,
      href: "/dashboard/users",
      icon: Users2,
      adminOnly: true,
      section: "main"
    },
    {
      title: t.navigation.organizations,
      href: "/dashboard/organizations",
      icon: Building,
      adminOnly: true,
      section: "main"
    },
    {
      title: t.navigation.notifications,
      href: "/dashboard/notifications",
      icon: Bell,
      badge: unreadNotificationsCount,
      section: "communication"
    },
    {
      title: t.navigation.appeals,
      href: "/dashboard/appeals",
      icon: MessageCircle,
      section: "communication"
    },
    {
      title: t.navigation.chat,
      href: "/dashboard/chat",
      icon: MessageSquare,
      badge: unreadChatCount,
      section: "communication"
    },
    {
      title: t.navigation.aiAssistant,
      href: "/dashboard/ai-assistant",
      icon: Sparkles,
      section: "analytics",
      requiresRole: ['HOKIM', 'HOKIM_YORDAMCHISI', 'HOKIMLIK_MASUL', 'ADMIN']
    },
    {
      title: t.navigation.analytics,
      href: "/dashboard/analytics",
      icon: BarChart4,
      adminOnly: true,
      section: "analytics"
    },
    {
      title: t.navigation.telegramBot,
      href: "/dashboard/telegram-bot",
      icon: Bot,
      adminOnly: true,
      section: "analytics"
    },
  ]

  // Filter navItems based on user role
  const navItems = allNavItems.filter(item => {
    // Check if user can access the path
    if (!canAccess(item.href)) return false
    
    // Check role-specific requirements
    if (item.requiresRole && !item.requiresRole.includes(userRole)) return false
    
    return true
  })

  // Group items by section
  const mainItems = navItems.filter(item => item.section === "main")
  const communicationItems = navItems.filter(item => item.section === "communication")
  const analyticsItems = navItems.filter(item => item.section === "analytics")

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
          className="fixed left-4 top-4 z-50 h-11 w-11 rounded-2xl border border-sky-100/80 bg-white/90 shadow-[0_12px_30px_-18px_rgba(14,165,233,0.55)] backdrop-blur"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "flex h-screen flex-col bg-gradient-to-b from-white/96 via-sky-50/60 to-white/92 text-slate-800 border-r border-sky-100/60 transition-all duration-300 shadow-[8px_0_40px_-20px_rgba(14,165,233,0.18)] backdrop-blur-2xl",
          isMobile ? "fixed inset-y-0 left-0 z-50 transform" : "relative",
          collapsed 
            ? (isMobile ? "-translate-x-full w-[280px]" : "w-20") 
            : "w-[280px]"
        )}
      >
      
      {/* Header */}
      <div className="relative z-10 flex h-20 items-center justify-between border-b border-cyan-100/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.42))] px-5 backdrop-blur-2xl">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(236,254,255,0.88))] shadow-[0_16px_32px_-18px_rgba(14,165,233,0.35)]">
              <Image src="/government-icon.svg" alt="Logo" width={32} height={32} className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-900">{t.sidebar.appName}</h1>
              <p className="text-[11px] text-slate-500 leading-tight">{t.sidebar.appDescription}</p>
            </div>
          </Link>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-9 w-9 rounded-xl border border-white/60 bg-white/60 transition-all duration-200 hover:bg-white"
        >
          <ChevronLeft className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-200",
            collapsed ? "rotate-180" : ""
          )} />
        </Button>
      </div>

      {/* Collapsed Logo */}
      {collapsed && (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center py-5"
        >
          <Link href="/dashboard">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(236,254,255,0.88))] shadow-[0_16px_32px_-18px_rgba(14,165,233,0.35)]">
              <Image src="/government-icon.svg" alt="Logo" width={30} height={30} className="h-7.5 w-7.5 hover:scale-105 transition-transform" />
            </div>
          </Link>
        </motion.div>
      )}

      {/* Navigation */}
      <nav
        className="relative z-10 flex-1 px-4 py-5 overflow-y-auto"
        role="navigation"
        aria-label={t.navigation.mainMenu}
      >
        {/* Main Section */}
        {!collapsed && mainItems.length > 0 && (
          <div className="mb-7">
            <p className="mb-3 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              {t.navigation.mainSection}
            </p>
            <div className="space-y-3">
              {mainItems.map((item, index) => (
                <NavItem key={item.href} item={item} isActive={isDashboardNavItemActive(item.href, pathname)} collapsed={collapsed} index={index} />
              ))}
            </div>
          </div>
        )}

        {collapsed && mainItems.length > 0 && (
          <div className="space-y-3 mb-4">
            {mainItems.map((item, index) => (
              <NavItem key={item.href} item={item} isActive={isDashboardNavItemActive(item.href, pathname)} collapsed={collapsed} index={index} />
            ))}
          </div>
        )}

        {/* Communication Section */}
        {!collapsed && communicationItems.length > 0 && (
          <div className="mb-7">
            <p className="mb-3 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t.navigation.communicationSection}
            </p>
            <div className="space-y-3">
              {communicationItems.map((item, index) => (
                <NavItem key={item.href} item={item} isActive={isDashboardNavItemActive(item.href, pathname)} collapsed={collapsed} index={index + mainItems.length} />
              ))}
            </div>
          </div>
        )}

        {collapsed && communicationItems.length > 0 && (
          <>
            <div className="h-px bg-indigo-100/50 my-4" />
            <div className="space-y-3 mb-4">
              {communicationItems.map((item, index) => (
                <NavItem key={item.href} item={item} isActive={isDashboardNavItemActive(item.href, pathname)} collapsed={collapsed} index={index + mainItems.length} />
              ))}
            </div>
          </>
        )}

        {/* Analytics Section */}
        {!collapsed && analyticsItems.length > 0 && (
          <div>
            <p className="mb-3 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {t.navigation.analyticsSection}
            </p>
            <div className="space-y-3">
              {analyticsItems.map((item, index) => (
                <NavItem key={item.href} item={item} isActive={isDashboardNavItemActive(item.href, pathname)} collapsed={collapsed} index={index + mainItems.length + communicationItems.length} />
              ))}
            </div>
          </div>
        )}

        {collapsed && analyticsItems.length > 0 && (
          <>
            <div className="h-px bg-indigo-100/50 my-4" />
            <div className="space-y-3">
              {analyticsItems.map((item, index) => (
                <NavItem key={item.href} item={item} isActive={isDashboardNavItemActive(item.href, pathname)} collapsed={collapsed} index={index + mainItems.length + communicationItems.length} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-cyan-100/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.50))] px-4 py-4 backdrop-blur-2xl">
        {/* User Profile */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "group relative flex items-center gap-3 rounded-2xl border border-white/75 bg-white/72 p-3 transition-all duration-200 hover:border-cyan-200/70 hover:shadow-[0_18px_36px_-28px_rgba(14,165,233,0.42)] backdrop-blur-sm",
            collapsed && "justify-center p-2"
          )}
        >
          <UserAvatar
            firstName={currentUser?.first_name}
            lastName={currentUser?.last_name}
            avatarUrl={(currentUser as any)?.avatar_url}
            size="md"
          />
          
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : t.common.user}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-50 to-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-800 ring-1 ring-cyan-100/80">
                  {currentUser?.role ? roleLabels[currentUser.role] : ""}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Settings */}
        <Link href="/dashboard/settings" className="block mt-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-white/90 hover:shadow-[0_16px_30px_-24px_rgba(14,165,233,0.35)]",
              collapsed && "justify-center px-2"
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-cyan-50 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Settings className="h-4.5 w-4.5 transition-transform duration-200 group-hover:rotate-90" />
            </div>
            
            {!collapsed && (
              <span className="transition-colors duration-200">
                {t.navigation.settings}
              </span>
            )}
          </motion.div>
        </Link>
      </div>
    </motion.div>
    </>
  )
}

// Navigation Item Component
function NavItem({ item, isActive, collapsed, index }: { 
  item: any
  isActive: boolean
  collapsed: boolean
  index: number
}) {
  const hasBadge = item.badge && item.badge > 0
  const Icon = item.icon

  const content = (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-[18px] px-3 py-2.5 transition-all duration-200",
        collapsed ? "h-12 justify-center" : "h-12",
        isActive
          ? "border border-cyan-400/20 bg-[linear-gradient(135deg,#0f766e,#0891b2)] text-white shadow-[0_18px_34px_-20px_rgba(8,145,178,0.70)]"
          : "border border-transparent text-slate-600 hover:border-white/80 hover:bg-white/85 hover:shadow-[0_18px_34px_-24px_rgba(14,165,233,0.28)] hover:text-cyan-800"
      )}
      whileHover={{ scale: collapsed ? 1.05 : 1.01 }}
      whileTap={{ scale: 0.98 }}
      role="menuitem"
      aria-current={isActive ? "page" : undefined}
    >
      {isActive && (
        <>
          <div className="pointer-events-none absolute left-0 top-2 h-8 w-1 rounded-r-full bg-white/85" />
          <div className="pointer-events-none absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.18),transparent_34%)]" />
        </>
      )}
      {!isActive && (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[linear-gradient(135deg,rgba(236,254,255,0.72),rgba(240,253,250,0.92),rgba(255,251,235,0.82))]" />
      )}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
            isActive
              ? "bg-white/14 ring-1 ring-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
              : "bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(236,254,255,0.82))] ring-1 ring-cyan-100/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] group-hover:scale-105 group-hover:bg-[linear-gradient(135deg,rgba(236,254,255,0.98),rgba(236,253,245,0.88))]"
          )}
        >
          <Icon className={cn(
            "h-[18px] w-[18px] transition-colors duration-200",
            isActive ? "text-white" : "text-cyan-700 group-hover:text-emerald-700"
          )} />
        </div>
        {collapsed && hasBadge && (
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 text-[11px] font-bold text-white ring-2 ring-white shadow-sm"
          >
            {item.badge > 9 ? '9+' : item.badge}
          </motion.span>
        )}
      </div>
      
      {!collapsed && (
        <>
          <span className={cn(
            "relative z-10 flex-1 truncate text-[15px] font-medium transition-colors duration-200",
            isActive ? "text-white" : "text-slate-700"
          )}>
            {item.title}
          </span>
          
          {hasBadge && (
            <Badge 
              className="ml-auto h-[19px] min-w-[28px] px-2 text-[12px] font-semibold bg-red-500 text-white hover:bg-red-600 border-0 rounded-full shadow-sm"
            >
              {item.badge > 99 ? '99+' : item.badge}
            </Badge>
          )}
        </>
      )}
    </motion.div>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={item.href}>{content}</Link>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={12}
          className="rounded-xl border border-cyan-100/70 bg-white/96 px-3 py-2 text-slate-700 shadow-[0_20px_40px_-24px_rgba(14,165,233,0.35)]"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.title}</span>
            {hasBadge && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return <Link href={item.href}>{content}</Link>
}
