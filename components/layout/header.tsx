// @ts-nocheck
"use client"

import React, { useState, useEffect } from "react"
import { Bell, Search, User, Settings, Zap, Menu, X, Globe } from "lucide-react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { getNotifications, getUnreadNotificationsCount, logout, getCurrentUser } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { User as UserType } from "@/types"

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
  const router = useRouter()
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [currentLang, setCurrentLang] = useState<'uz' | 'ru' | 'en'>('uz')

  useEffect(() => {
    setMounted(true)
    let isMounted = true
    
    // Fetch current user
    getCurrentUser()
      .then((user) => isMounted && setCurrentUser(user))
      .catch(() => {})
    
    // Fetch notifications
    getUnreadNotificationsCount()
      .then((c) => isMounted && setUnreadCount(c))
      .catch(() => {})
    getNotifications()
      .then((list) => isMounted && setRecentNotifications(list.slice(0, 5)))
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

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
      <header className="sticky top-0 z-50 flex min-h-20 items-center justify-between border-b border-border/60 bg-white/75 backdrop-blur-2xl transition-all duration-300 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.4)] backdrop-saturate-150 px-4 md:px-6 py-3" role="banner">

      {/* Left section - Title */}
      <div className="flex min-w-0 items-center gap-4 md:gap-6 animate-slide-up flex-1">
        <div className="relative">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-primary/20">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground break-words">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground break-words hidden sm:block">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Center section - Search */}
      <div className="relative hidden md:block flex-1 max-w-lg mx-6">
        <div className={cn(
          "relative group transition-all duration-300",
          isSearchFocused ? "scale-105" : ""
        )}>
          <Search className={cn(
            "absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-all duration-250",
            isSearchFocused ? "text-emerald-600 scale-110" : "group-hover:text-gray-600"
          )} />
          <Input 
            placeholder="Қидируш..." 
            className={cn(
              "w-full h-12 bg-white/60 backdrop-blur-sm border-2 border-emerald-200/50 rounded-xl px-12 pr-4 text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:border-emerald-500 transition-all duration-250"
            )}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            aria-label="Қидируш"
          />
        </div>
      </div>

      {/* Right section - Notifications and User */}
      <div className="flex items-center gap-4 flex-1 justify-end">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden relative z-20 h-10 w-10 transition-all duration-250 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg"
        >
          <Menu className="h-5 w-5 text-gray-600" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300" />
        </Button>

        {/* Language Selector */}
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative z-20 h-10 w-10 transition-all duration-250 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg"
              >
                <Globe className="h-5 w-5 text-gray-600 transition-all duration-250" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-xl">
              <DropdownMenuLabel className="text-sm font-semibold text-gray-700">Тил танлаш</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setCurrentLang('uz')}
                className={cn("flex items-center gap-2 p-2 cursor-pointer", currentLang === 'uz' && "bg-emerald-50 text-emerald-600")}
              >
                <span className="text-lg">🇺🇿</span>
                <span>O'zbekcha</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setCurrentLang('ru')}
                className={cn("flex items-center gap-2 p-2 cursor-pointer", currentLang === 'ru' && "bg-emerald-50 text-emerald-600")}
              >
                <span className="text-lg">🇷🇺</span>
                <span>Русский</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setCurrentLang('en')}
                className={cn("flex items-center gap-2 p-2 cursor-pointer", currentLang === 'en' && "bg-emerald-50 text-emerald-600")}
              >
                <span className="text-lg">🇬🇧</span>
                <span>English</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}


        {/* Notifications */}
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative z-20 h-10 w-10 transition-all duration-250 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg hidden md:flex"
              >
                <Bell className={cn(
                  "h-5 w-5 text-gray-600 transition-all duration-250",
                  unreadCount > 0 ? "animate-pulse" : ""
                )} />
                {unreadCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-6 w-6 rounded-full p-0 text-[10px] flex items-center justify-center bg-emerald-600 text-white shadow-sm">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96 bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-xl">
            <DropdownMenuLabel className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-gray-900">Билдиришномалар</span>
              </div>
              <Link href="/dashboard/notifications">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-0 text-xs text-emerald-600 hover:text-emerald-700 transition-all duration-250"
                >
                  Барчасини кўриш
                </Button>
              </Link>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-64 overflow-y-auto">
              {recentNotifications.map((notification, index) => (
                <DropdownMenuItem 
                  key={notification.id} 
                  className="flex flex-col items-start gap-3 p-3 transition-all duration-250 hover:bg-emerald-50"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      notification.type === "task_overdue" ? "bg-red-500" : "bg-emerald-600"
                    )} />
                    <span className={cn(
                      "font-medium text-sm",
                      notification.type === "task_overdue" ? "text-red-600" : "text-gray-900"
                    )}>
                      {notification.title}
                    </span>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-emerald-600 rounded-full ml-auto animate-pulse"></div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{notification.description}</span>
                </DropdownMenuItem>
              ))}
            </div>
            
            {recentNotifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Янги билдиришномалар йўқ</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  Ҳозирча ҳеч қандай билдиришномалар мавжуд эмас.
                </p>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        )}

        {/* User Menu */}
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative z-20 h-10 w-10 transition-all duration-250 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg"
              >
                <Avatar className="h-8 w-8 ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-transparent">
                  <AvatarFallback className="bg-emerald-600 text-white text-sm font-semibold">
                    {currentUser ? `${currentUser.first_name[0]}${currentUser.last_name[0]}`.toUpperCase() : "АК"}
                  </AvatarFallback>
                </Avatar>
              </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-white/90 backdrop-blur-xl border border-gray-200/50 shadow-xl">
            <DropdownMenuLabel className="flex items-center gap-3 p-4">
              <User className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-gray-900">{currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Фойдаланувчи"}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/dashboard/settings?tab=profile">
              <DropdownMenuItem className="flex items-center gap-3 p-3 transition-all duration-250 hover:bg-emerald-50 cursor-pointer">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">Профил</span>
              </DropdownMenuItem>
            </Link>
            <Link href="/dashboard/settings">
              <DropdownMenuItem className="flex items-center gap-3 p-3 transition-all duration-250 hover:bg-emerald-50 cursor-pointer">
                <Settings className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">Созламалар</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="flex items-center gap-3 p-3 transition-all duration-250 hover:bg-red-50 cursor-pointer"
            >
              <X className="w-4 h-4 text-red-500" />
              <span className="text-red-600">Чиқиш</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>

      {/* User Chat Dialog */}
    </header>
  )
}
