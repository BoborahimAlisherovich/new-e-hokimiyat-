"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Sidebar } from "@/components/layout/sidebar"
import { getCurrentUser } from "@/lib/api"
import { canAccessDashboardPath, getFirstAllowedDashboardPath } from "@/lib/dashboard-access"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    const syncSidebarLayout = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setIsSidebarCollapsed(mobile)
    }

    syncSidebarLayout()
    window.addEventListener("resize", syncSidebarLayout)

    return () => {
      window.removeEventListener("resize", syncSidebarLayout)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const verifyAccess = async () => {
      try {
        const user = await getCurrentUser()
        if (!mounted) return

        if (!canAccessDashboardPath(user.role, pathname)) {
          router.replace(getFirstAllowedDashboardPath(user.role))
          return
        }
      } catch {
        router.replace("/login")
        return
      } finally {
        if (mounted) {
          setIsCheckingAccess(false)
        }
      }
    }

    verifyAccess()

    return () => {
      mounted = false
    }
  }, [pathname, router])

  if (isCheckingAccess) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.10),_transparent_24%),linear-gradient(160deg,_#f6fbff_0%,_#eef7f5_52%,_#fffaf2_100%)] px-4">
        <div className="flex flex-col items-center gap-3 rounded-[28px] border border-white/80 bg-white/78 px-7 py-6 shadow-[0_26px_80px_-24px_rgba(14,165,233,0.28)] backdrop-blur-2xl">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-100 border-t-cyan-600" />
          <p className="text-sm font-medium text-slate-600">Kabinet yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.10),_transparent_26%),linear-gradient(160deg,_#f6fbff_0%,_#eef7f5_50%,_#fffaf2_100%)]">
      <Sidebar
        collapsed={isSidebarCollapsed}
        isMobile={isMobile}
        onCollapsedChange={setIsSidebarCollapsed}
      />
      <main
        id="main-content"
        className={cn(
          "relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto transition-[margin] duration-300",
          !isMobile && (isSidebarCollapsed ? "md:ml-19" : "md:ml-70")
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="absolute -top-[8%] left-[10%] hidden h-[520px] w-[520px] rounded-full bg-cyan-200/22 blur-3xl md:block animate-float-gentle" />
          <div
            className="absolute right-[8%] top-[6%] hidden h-[420px] w-[420px] rounded-full bg-emerald-200/18 blur-3xl lg:block animate-float-gentle"
            style={{ animationDelay: "1.8s" }}
          />
          <div
            className="absolute bottom-[8%] right-[16%] hidden h-[460px] w-[460px] rounded-full bg-amber-200/18 blur-3xl xl:block animate-float-gentle"
            style={{ animationDelay: "3.4s" }}
          />
          <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        </div>
        <div className="relative z-10 min-h-dvh">{children}</div>
      </main>
    </div>
  )
}
