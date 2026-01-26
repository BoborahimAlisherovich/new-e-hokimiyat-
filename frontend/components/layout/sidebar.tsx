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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getCurrentUser } from "@/lib/api"
import type { User } from "@/types"

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

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
    getCurrentUser()
      .then((user) => isMounted && setCurrentUser(user))
      .catch(() => {})
    
    return () => {
      isMounted = false
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  const navItems = [
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
    },
    {
      title: "Ташкилотлар",
      href: "/dashboard/organizations",
      icon: Building,
    },
    {
      title: "Билдиришномалар",
      href: "/dashboard/notifications",
      icon: Bell,
    },
    {
      title: "Мурожаатлар",
      href: "/dashboard/appeals",
      icon: MessageCircle,
    },
    {
      title: "Аналитика",
      href: "/dashboard/analytics",
      icon: BarChart4,
    },
  ]

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
      <div className="relative z-10 flex h-28 items-start justify-between border-b border-sidebar-border/50 bg-gradient-to-r from-white/80 via-gray-50/70 to-slate-50/80 backdrop-blur-md transition-all duration-300 pt-8">
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
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors duration-150",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                
                {!collapsed && (
                  <span className={cn(
                    "truncate transition-colors duration-150",
                    isActive ? "font-semibold" : "text-sm"
                  )}>
                    {item.title}
                  </span>
                )}
                
                {/* Active indicator */}
                {isActive && !collapsed && (
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
                {currentUser ? currentUser.email : "email@example.com"}
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
