// @ts-nocheck
"use client"

import React, { useState, useEffect } from "react"
import { Bell, Search, User, Settings, Zap, Menu, X, Globe, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/ui/user-avatar"
import Link from "next/link"
import { WS_BASE, getAccessToken, getNotifications, getUnreadNotificationsCount, logout, getCurrentUser } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { User as UserType } from "@/types"
import { useI18n, useTranslation } from "@/lib/i18n/context"
import { useAudioAlert } from "@/hooks/use-audio-alert"

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  const router = useRouter()
  const playAlert = useAudioAlert()
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
 const [recentNotifications, setRecentNotifications] = useState<any[]>([])
 const [currentUser, setCurrentUser] = useState<UserType | null>(null)

  const { language, setLanguage } = useI18n()
  const t = useTranslation()

 useEffect(() => {
 let isMounted = true
 let previousUnreadCount = 0
 let initialized = false
 let wsReady = false
 let ws: WebSocket | null = null

    const mapNotificationType = (type?: string) => {
      switch (type) {
        case 'TASK_ASSIGNED':
        case 'TASK_UPDATED':
        case 'TASK_COMPLETED':
        case 'TASK_OVERDUE':
        case 'MESSAGE':
        case 'SYSTEM':
          return type
        case 'TASK':
          return 'TASK_ASSIGNED'
        case 'DEADLINE':
          return 'TASK_OVERDUE'
        case 'SUCCESS':
          return 'TASK_COMPLETED'
        case 'WARNING':
          return 'TASK_UPDATED'
        case 'ERROR':
          return 'TASK_OVERDUE'
        case 'INFO':
        default:
          return 'SYSTEM'
      }
    }

    const normalizeWsNotification = (raw: any) => {
      const createdAt = raw?.created_at ?? new Date().toISOString()
      const mappedType = mapNotificationType(raw?.notification_type ?? raw?.type)
      return {
        id: raw?.id,
        user_id: raw?.user_id ?? 0,
        title: raw?.title ?? '',
        message: raw?.message ?? '',
        type: mappedType,
        is_read: Boolean(raw?.is_read),
        read_at: raw?.read_at ?? undefined,
        related_task_id: raw?.related_task_id ?? raw?.related_task ?? undefined,
        link: raw?.link,
        created_at: createdAt,
        updated_at: raw?.updated_at ?? createdAt,
      }
    }

    const loadHeaderData = async () => {
      try {
        const [user, count, list] = await Promise.all([
          getCurrentUser().catch(() => null),
          getUnreadNotificationsCount().catch(() => 0),
          getNotifications(1, 5).catch(() => []),
        ])

        if (!isMounted) return

        if (user) setCurrentUser(user)
        setUnreadCount(count)
        setRecentNotifications(list.slice(0, 5))

        if (!wsReady && initialized && count > previousUnreadCount) {
          playAlert(720, 0.16)
          window.dispatchEvent(new CustomEvent("notificationReceived", { detail: { unreadCount: count } }))
        }
        initialized = true
        previousUnreadCount = count
      } catch {}
    }

    loadHeaderData()
    const interval = window.setInterval(loadHeaderData, 15000)

    const token = getAccessToken()
    if (token) {
      try {
        const wsUrl = `${WS_BASE}/ws/notifications/?token=${token}`
        ws = new WebSocket(wsUrl)
        ws.onopen = () => { wsReady = true }
        ws.onclose = () => { wsReady = false }
        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data)
            if (payload?.type === "unread_count") {
              const count = Number(payload.count) || 0
              if (isMounted) setUnreadCount(count)
              previousUnreadCount = count
              initialized = true
              return
            }
            if (payload?.type === "notification" && payload.notification) {
              if (isMounted) {
                const normalized = normalizeWsNotification(payload.notification)
                setRecentNotifications((prev) => [normalized, ...(prev || [])].slice(0, 5))
              }
              playAlert(720, 0.16)
              window.dispatchEvent(new CustomEvent("notificationReceived", { detail: { unreadCount: previousUnreadCount + 1 } }))
            }
          } catch {}
        }
      } catch {}
    }

    return () => {
      isMounted = false
      window.clearInterval(interval)
      if (ws) { try { ws.close() } catch {} }
    }
  }, [playAlert])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Even if logout fails on backend, clear tokens and redirect
      router.push('/login')
    }
  }

    return (
      <motion.header 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-cyan-100/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.72))] backdrop-blur-2xl px-6 shadow-[0_1px_24px_-10px_rgba(14,165,233,0.20)]" 
        role="banner"
      >

      {/* Left section - Title */}
      <motion.div 
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex min-w-0 items-center gap-4 flex-1"
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-slate-900 truncate">{title}</h1>
          {description && (
            <p className="text-xs text-slate-500 truncate hidden sm:block mt-0.5">
              {description}
            </p>
          )}
        </div>
      </motion.div>

      {/* Center section - Search */}
      <motion.div 
        initial={{ y: -5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="relative hidden lg:block flex-1 max-w-md mx-6"
      >
        <div className="relative group">
          <Search className={cn(
            "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-200",
            isSearchFocused ? "text-cyan-600" : "group-hover:text-slate-600"
          )} />
          <Input 
            placeholder={t.common.search}
            className={cn(
              "w-full h-10 bg-white/80 border border-cyan-100 rounded-xl pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-400 transition-all duration-200"
            )}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            aria-label={t.common.search}
          />
        </div>
      </motion.div>

      {/* Right section - Notifications and User */}
      <motion.div 
        initial={{ x: 10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 flex-1 justify-end"
      >
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden h-9 w-9 rounded-lg hover:bg-slate-100"
        >
          <Menu className="h-5 w-5 text-slate-600" />
        </Button>

        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}

 {/* Language Selector */}
 <DropdownMenu>

            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-xl hover:bg-slate-100"
              >
                <Globe className="h-[22px] w-[22px] text-cyan-700" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 shadow-lg rounded-xl">
              <DropdownMenuLabel className="text-xs font-semibold text-slate-700 px-3 py-2">{t.common.selectLanguage}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-200" />
              <DropdownMenuItem 
                onClick={() => setLanguage('uz')}
                className={cn("px-3 py-2 text-sm cursor-pointer rounded-lg mx-1", language === 'uz' && "bg-indigo-50 text-indigo-700")}
              >
                <span className="mr-2">🇺🇿</span>
                <span>{t.settings.languageUzLatin}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLanguage('uz-cyrl')}
                className={cn("px-3 py-2 text-sm cursor-pointer rounded-lg mx-1", language === 'uz-cyrl' && "bg-indigo-50 text-indigo-700")}
              >
                <span className="mr-2">🇺🇿</span>
                <span>{t.settings.languageUzCyrl}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLanguage('ru')}
                className={cn("px-3 py-2 text-sm cursor-pointer rounded-lg mx-1", language === 'ru' && "bg-indigo-50 text-indigo-700")}
              >
                <span className="mr-2">🇷🇺</span>
                <span>{t.settings.languageRu}</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLanguage('en')}
                className={cn("px-3 py-2 text-sm cursor-pointer rounded-lg mx-1", language === 'en' && "bg-indigo-50 text-indigo-700")}
              >
                <span className="mr-2">🇬🇧</span>
                <span>{t.settings.languageEn}</span>
              </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>


 {/* Notifications */}
 <DropdownMenu>

            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-9 w-9 rounded-xl hover:bg-cyan-50 hidden md:flex"
              >
                <Bell className={cn(
                  "h-5 w-5 text-slate-700",
                  unreadCount > 0 ? "animate-pulse" : ""
                )} />
                {unreadCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-4 w-4 p-0 flex items-center justify-center bg-amber-500 text-white text-[9px] font-semibold border-2 border-white rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-white border border-slate-200 shadow-lg rounded-xl">
            <DropdownMenuLabel className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-sm text-slate-900">{t.navigation.notifications}</span>
              </div>
              <Link href="/dashboard/notifications">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                >
                  {t.common.all}
                </Button>
              </Link>
            </DropdownMenuLabel>
            <div className="max-h-64 overflow-y-auto">
              {recentNotifications.map((notification) => (
                <DropdownMenuItem 
                  key={notification.id} 
                  className="flex flex-col items-start gap-1.5 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      notification.type === "TASK_OVERDUE" ? "bg-red-500" : "bg-indigo-600"
                    )} />
                    <span className={cn(
                      "font-medium text-xs flex-1",
                      notification.type === "TASK_OVERDUE" ? "text-red-600" : "text-slate-900"
                    )}>
                      {notification.title}
                    </span>
                    {!notification.is_read && (
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <span className="text-xs text-slate-600 line-clamp-2">{notification.message}</span>
                </DropdownMenuItem>
              ))}
            </div>
            
            {recentNotifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-900 mb-1">{t.notifications.emptyTitle}</p>
                <p className="text-xs text-slate-500">{t.notifications.emptyDescription}</p>
              </div>
            )}
 </DropdownMenuContent>
 </DropdownMenu>

 {/* User Menu */}
 <DropdownMenu>

            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="h-10 w-10 rounded-xl hover:bg-slate-100 p-0"
              >
                <UserAvatar
                  firstName={currentUser?.first_name}
                  lastName={currentUser?.last_name}
                  avatarUrl={currentUser?.avatar_url}
                  size="md"
                />
              </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-lg rounded-xl">
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">
                    {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : t.common.user}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {currentUser?.email || ""}
                  </p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <Link href="/dashboard/settings?tab=profile">
              <DropdownMenuItem className="px-3 py-2 cursor-pointer hover:bg-slate-50 rounded-lg mx-1">
                <User className="w-4 h-4 text-slate-500 mr-2" />
                <span className="text-sm text-slate-700">{t.settings.profile}</span>
              </DropdownMenuItem>
            </Link>
            <Link href="/dashboard/settings">
              <DropdownMenuItem className="px-3 py-2 cursor-pointer hover:bg-slate-50 rounded-lg mx-1">
                <Settings className="w-4 h-4 text-slate-500 mr-2" />
                <span className="text-sm text-slate-700">{t.navigation.settings}</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="px-3 py-2 cursor-pointer hover:bg-red-50 rounded-lg mx-1"
            >
              <X className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-600 font-medium">{t.common.logout}</span>
            </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>

      </motion.div>

      {/* User Chat Dialog */}
    </motion.header>
  )
}
