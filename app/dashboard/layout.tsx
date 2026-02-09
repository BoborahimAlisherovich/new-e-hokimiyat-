// @ts-nocheck
import type React from "react"
import { Sidebar } from "@/components/layout/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-[#f5f7ff] via-[#eef0fb] to-[#f0ecff]">
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 overflow-y-auto relative"
      >
        {/* Animated gradient mesh background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Primary indigo blob - top left */}
          <div className="absolute -top-[5%] left-[15%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-indigo-300/20 via-violet-200/12 to-transparent blur-3xl animate-float-gentle animate-morph" />
          {/* Cyan blob - top right */}
          <div className="absolute top-[5%] right-[5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-200/15 via-blue-200/10 to-transparent blur-3xl animate-float-gentle animate-morph" style={{ animationDelay: '2s' }} />
          {/* Purple blob - center left */}
          <div className="absolute top-[45%] -left-[5%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-purple-200/12 via-pink-100/8 to-transparent blur-3xl animate-float-gentle" style={{ animationDelay: '4s' }} />
          {/* Emerald blob - bottom right */}
          <div className="absolute bottom-[5%] right-[15%] w-[550px] h-[550px] rounded-full bg-gradient-to-br from-emerald-200/10 via-teal-100/8 to-transparent blur-3xl animate-float-gentle animate-morph" style={{ animationDelay: '6s' }} />
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-grid-pattern opacity-40" />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
