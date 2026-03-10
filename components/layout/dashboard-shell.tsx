"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { getCurrentUser } from "@/lib/api"
import { canAccessDashboardPath, getFirstAllowedDashboardPath } from "@/lib/dashboard-access"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)

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
      <div className="flex h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_45%),linear-gradient(160deg,_#f7fbff_0%,_#eef4ff_55%,_#f8fafc_100%)]">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-6 py-5 shadow-[0_20px_60px_-20px_rgba(37,99,235,0.18)] backdrop-blur-xl">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-sky-100 border-t-sky-600" />
          <p className="text-sm font-medium text-slate-600">Kabinet yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.08),_transparent_22%),linear-gradient(160deg,_#f7fbff_0%,_#eef4ff_55%,_#f8fafc_100%)]">
      <Sidebar />
      <main id="main-content" className="relative flex-1 overflow-y-auto">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-[8%] left-[10%] h-[520px] w-[520px] rounded-full bg-sky-200/20 blur-3xl animate-float-gentle" />
          <div
            className="absolute right-[8%] top-[6%] h-[420px] w-[420px] rounded-full bg-blue-200/20 blur-3xl animate-float-gentle"
            style={{ animationDelay: "1.8s" }}
          />
          <div
            className="absolute bottom-[8%] right-[16%] h-[460px] w-[460px] rounded-full bg-emerald-200/14 blur-3xl animate-float-gentle"
            style={{ animationDelay: "3.4s" }}
          />
          <div className="absolute inset-0 bg-grid-pattern opacity-35" />
        </div>
        <div className="relative z-10 min-h-full">{children}</div>
      </main>
    </div>
  )
}
