// @ts-nocheck
"use client"

import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
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
  Repeat,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getCurrentUser, getUnreadChatCount, getUnreadNotificationsCount } from "@/lib/api"
import type { User, UserRole } from "@/types"

// Role-based menu configuration based on texnik topshiriq.txt
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  // Hokim - full access to everything except telegram-bot (admin only)
  HOKIM: [
    '/dashboard',
    '/dashboard/tasks',
    '/dashboard/recurring-tasks',
    '/dashboard/users',
    '/dashboard/organizations',
    '/dashboard/notifications',
    '/dashboard/appeals',
    '/dashboard/analytics',
    '/dashboard/chat',
    '/dashboard/ai-assistant',
    '/dashboard/settings',
  ],
  // Hokim yordamchisi - similar to Hokim but cannot close tasks
  HOKIM_YORDAMCHISI: [
    '/dashboard',
    '/dashboard/tasks',
    '/dashboard/recurring-tasks',
    '/dashboard/users',
    '/dashboard/organizations',
    '/dashboard/notifications',
    '/dashboard/appeals',
    '/dashboard/analytics',
    '/dashboard/chat',
    '/dashboard/ai-assistant',
    '/dashboard/settings',
  ],
  // Hokimlik mas'uli - can add users, orgs, create tasks (NO AI Assistant)
  HOKIMLIK_MASUL: [
    '/dashboard',
    '/dashboard/tasks',
    '/dashboard/recurring-tasks',
    '/dashboard/users',
    '/dashboard/organizations',
    '/dashboard/notifications',
    '/dashboard/appeals',
    '/dashboard/analytics',
    '/dashboard/chat',
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
  // Admin - technical admin, full access including telegram-bot
  ADMIN: [
    '/dashboard',
    '/dashboard/tasks',
    '/dashboard/recurring-tasks',
    '/dashboard/users',
    '/dashboard/organizations',
    '/dashboard/notifications',
    '/dashboard/appeals',
    '/dashboard/analytics',
    '/dashboard/chat',
    '/dashboard/ai-assistant',
    '/dashboard/telegram-bot',
    '/dashboard/settings',
  ],
}

// Role labels for display
const ROLE_LABELS: Record<UserRole, string> = {
  HOKIM: 'Hokim',
  HOKIM_YORDAMCHISI: 'Hokim yordamchisi',
  HOKIMLIK_MASUL: 'Hokimlik mas\'uli',
  TASHKILOT_RAHBAR: 'Tashkilot rahbari',
  TASHKILOT_MASUL: 'Tashkilot mas\'uli',
  ADMIN: 'Texnik admin',
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
      title: "Bosh sahifa",
      href: "/dashboard",
      icon: LayoutGrid,
      section: "main"
    },
    {
      title: "Topshiriqlar",
      href: "/dashboard/tasks",
      icon: CheckSquare2,
      section: "main"
    },
    {
      title: "Takrorlanuvchi",
      href: "/dashboard/recurring-tasks",
      icon: Repeat,
      adminOnly: true,
      section: "main"
    },
    {
      title: "Foydalanuvchilar",
      href: "/dashboard/users",
      icon: Users2,
      adminOnly: true,
      section: "main"
    },
    {
      title: "Tashkilotlar",
      href: "/dashboard/organizations",
      icon: Building,
      adminOnly: true,
      section: "main"
    },
    {
      title: "Bildirishnomalar",
      href: "/dashboard/notifications",
      icon: Bell,
      badge: unreadNotificationsCount,
      section: "communication"
    },
    {
      title: "Murojaatlar",
      href: "/dashboard/appeals",
      icon: MessageCircle,
      section: "communication"
    },
    {
      title: "Chat",
      href: "/dashboard/chat",
      icon: MessageSquare,
      badge: unreadChatCount,
      section: "communication"
    },
    {
      title: "AI Yordamchi",
      href: "/dashboard/ai-assistant",
      icon: Sparkles,
      section: "analytics",
      requiresRole: ['HOKIM', 'HOKIM_YORDAMCHISI', 'ADMIN'] // Only for Hokim, Hokim yordamchisi, and Admin
    },
    {
      title: "Analitika",
      href: "/dashboard/analytics",
      icon: BarChart4,
      adminOnly: true,
      section: "analytics"
    },
    {
      title: "Telegram Bot",
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
          className="fixed top-4 left-4 z-50 shadow-md h-10 w-10 rounded-full border border-border/50 bg-white/80 backdrop-blur"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "flex h-screen flex-col bg-[#F8FAFC] text-slate-800 border-r border-slate-200/80 transition-all duration-300 shadow-sm",
          isMobile ? "fixed inset-y-0 left-0 z-50 transform" : "relative",
          collapsed 
            ? (isMobile ? "-translate-x-full w-[280px]" : "w-20") 
            : "w-[280px]"
        )}
      >
      
      {/* Header */}
      <div className="relative z-10 flex h-20 items-center justify-between px-5 border-b border-slate-200/60 bg-white/50">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <motion.div 
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <span className="font-bold text-base">EH</span>
            </motion.div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-slate-900">e-Hokimiyat</h1>
              <p className="text-[11px] text-slate-500 leading-tight">Gov Management System</p>
            </div>
          </Link>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-white"
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
            <motion.div 
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <span className="font-bold text-base">EH</span>
            </motion.div>
          </Link>
        </motion.div>
      )}

      {/* Navigation */}
      <nav
        className="relative z-10 flex-1 px-4 py-5 overflow-y-auto"
        role="navigation"
        aria-label="Asosiy menyu"
      >
        {/* Main Section */}
        {!collapsed && mainItems.length > 0 && (
          <div className="mb-7">
            <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-3 px-2">
              Asosiy
            </p>
            <div className="space-y-3">
              {mainItems.map((item, index) => (
                <NavItem key={item.href} item={item} isActive={pathname === item.href} collapsed={collapsed} index={index} />
              ))}
            </div>
          </div>
        )}

        {collapsed && mainItems.length > 0 && (
          <div className="space-y-3 mb-4">
            {mainItems.map((item, index) => (
              <NavItem key={item.href} item={item} isActive={pathname === item.href} collapsed={collapsed} index={index} />
            ))}
          </div>
        )}

        {/* Communication Section */}
        {!collapsed && communicationItems.length > 0 && (
          <div className="mb-7">
            <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-3 px-2">
              Aloqa
            </p>
            <div className="space-y-3">
              {communicationItems.map((item, index) => (
                <NavItem key={item.href} item={item} isActive={pathname === item.href} collapsed={collapsed} index={index + mainItems.length} />
              ))}
            </div>
          </div>
        )}

        {collapsed && communicationItems.length > 0 && (
          <>
            <div className="h-px bg-slate-200 my-4" />
            <div className="space-y-3 mb-4">
              {communicationItems.map((item, index) => (
                <NavItem key={item.href} item={item} isActive={pathname === item.href} collapsed={collapsed} index={index + mainItems.length} />
              ))}
            </div>
          </>
        )}

        {/* Analytics Section */}
        {!collapsed && analyticsItems.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-3 px-2">
              Tahlil
            </p>
            <div className="space-y-3">
              {analyticsItems.map((item, index) => (
                <NavItem key={item.href} item={item} isActive={pathname === item.href} collapsed={collapsed} index={index + mainItems.length + communicationItems.length} />
              ))}
            </div>
          </div>
        )}

        {collapsed && analyticsItems.length > 0 && (
          <>
            <div className="h-px bg-slate-200 my-4" />
            <div className="space-y-3">
              {analyticsItems.map((item, index) => (
                <NavItem key={item.href} item={item} isActive={pathname === item.href} collapsed={collapsed} index={index + mainItems.length + communicationItems.length} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200/80 bg-white/50 px-4 py-4">
        {/* User Profile */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "group relative flex items-center gap-3 rounded-xl p-3 bg-white border border-slate-200/60 transition-all duration-200 hover:shadow-sm",
            collapsed && "justify-center p-2"
          )}
        >
          <Avatar className="h-9 w-9 ring-2 ring-blue-100">
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xs font-semibold">
              {currentUser ? `${currentUser.first_name[0]}${currentUser.last_name[0]}`.toUpperCase() : "AK"}
            </AvatarFallback>
          </Avatar>
          
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Foydalanuvchi"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {currentUser?.role ? ROLE_LABELS[currentUser.role] : ""}
              </p>
            </div>
          )}
        </motion.div>

        {/* Settings */}
        <Link href="/dashboard/settings" className="block mt-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-white hover:shadow-sm",
              collapsed && "justify-center px-2"
            )}
          >
            <Settings className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
            
            {!collapsed && (
              <span className="transition-colors duration-200">
                Sozlamalar
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
  
  return (
    <Link href={item.href}>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className={cn(
          "group relative flex items-center gap-3 rounded-[11px] px-3 py-2.5 transition-all duration-200",
          collapsed ? "h-11 justify-center" : "h-11",
          isActive
            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
            : "text-slate-700 hover:bg-[#EEF2FF] hover:shadow-sm"
        )}
        whileHover={{ scale: collapsed ? 1.05 : 1.01 }}
        whileTap={{ scale: 0.98 }}
        role="menuitem"
        aria-current={isActive ? "page" : undefined}
      >
        <div className="relative flex-shrink-0">
          <item.icon className={cn(
            "h-[21px] w-[21px] transition-colors duration-200",
            isActive ? "text-white" : "text-slate-500 group-hover:text-blue-600"
          )} />
          {/* Badge for collapsed state */}
          {collapsed && hasBadge && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white ring-2 ring-[#F8FAFC] shadow-sm"
            >
              {item.badge > 9 ? '9+' : item.badge}
            </motion.span>
          )}
        </div>
        
        {!collapsed && (
          <>
            <span className={cn(
              "truncate text-[15px] flex-1 font-medium transition-colors duration-200",
              isActive ? "text-white" : "text-slate-700"
            )}>
              {item.title}
            </span>
            
            {/* Badge for expanded state */}
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
    </Link>
  )
}
