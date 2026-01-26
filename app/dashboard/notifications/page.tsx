"use client"

import { Header } from "@/components/layout/header"
import { type Notification } from "@/types"
import { getNotifications } from "@/lib/api"
import { useEffect, useState } from "react"
import { NotificationActions } from "@/components/dashboard/notifications/notification-actions"
import { NotificationList } from "@/components/dashboard/notifications/notification-list"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const loadNotifications = async () => {
      try {
        const list = await getNotifications()
        if (!mounted) return
        setNotifications(list || [])
        setError(null)
      } catch (err) {
        console.error("Bildirishnomalarni yuklashda xatolik:", err)
        setError("Bildirishnomalarni yuklashda xatolik yuz berdi")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadNotifications()
    return () => {
      mounted = false
    }
  }, [])

  const filteredNotifications = filter === "all" ? notifications : notifications.filter((n) => !n.is_read)

  const markAsRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const deleteNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <>
      <Header title="Bildirishnomalar" description="Barcha xabarlar va ogohlantirishlar" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-200/15 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-purple-200/10 to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/3 left-1/2 w-48 h-48 bg-gradient-to-br from-cyan-200/8 to-transparent rounded-full blur-lg" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        </div>
        
        <div className="relative z-10 p-6 space-y-6">
          {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <NotificationActions
            filter={filter}
            onFilterChange={setFilter}
            totalCount={notifications.length}
            unreadCount={unreadCount}
            onMarkAllAsRead={markAllAsRead}
          />
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Yuklanmoqda...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Qayta urinish
            </button>
          </div>
        ) : (
          <NotificationList
            notifications={filteredNotifications}
            onMarkAsRead={markAsRead}
            onDelete={deleteNotification}
          />
        )}
        </div>
      </div>
    </>
  )
}
