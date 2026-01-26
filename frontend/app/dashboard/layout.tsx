// @ts-nocheck
import type React from "react"
import { Sidebar } from "@/components/layout/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 overflow-y-auto bg-gradient-to-br from-transparent via-transparent/50 to-transparent/30"
      >
        <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-8 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
