"use client"

import { useEffect } from "react"
import { getAccessToken } from "@/lib/api"
import { PUSH_SETTINGS_EVENT, syncPushSubscription } from "@/lib/push-notifications"

function readPushSetting() {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem("notifications")
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return Boolean(parsed?.push)
  } catch {
    return false
  }
}

export function PushNotificationManager() {
  useEffect(() => {
    const sync = async (enabled: boolean) => {
      if (!getAccessToken()) return
      try {
        await syncPushSubscription(enabled, { interactive: false })
      } catch (error) {
        console.error("Push sync error:", error)
      }
    }

    void sync(readPushSetting())

    const handleSettingsChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>
      void sync(Boolean(customEvent.detail?.enabled))
    }

    window.addEventListener(PUSH_SETTINGS_EVENT, handleSettingsChange)
    return () => {
      window.removeEventListener(PUSH_SETTINGS_EVENT, handleSettingsChange)
    }
  }, [])

  return null
}
