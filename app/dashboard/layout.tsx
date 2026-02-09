// @ts-nocheck
import type React from "react"
import { Sidebar } from "@/components/layout/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-[#f0f4ff] via-[#eef0fb] to-[#f5f0ff]">
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 overflow-y-auto relative"
      >
        {/* Subtle animated gradient mesh */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-200/20 to-cyan-200/10 blur-3xl animate-float-gentle" />
          <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-violet-200/15 to-purple-200/10 blur-3xl animate-float-gentle" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[50%] left-[5%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-emerald-200/10 to-teal-200/8 blur-3xl animate-float-gentle" style={{ animationDelay: '4s' }} />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
