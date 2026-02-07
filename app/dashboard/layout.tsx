// @ts-nocheck
import type React from "react"
import { Sidebar } from "@/components/layout/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main
        id="main-content"
        className="flex-1 overflow-y-auto"
      >
        {children}
      </main>
    </div>
  )
}
