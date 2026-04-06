"use client"

import {
  getPushPublicKey,
  subscribePushNotifications,
  unsubscribePushNotifications,
} from "@/lib/api"

export const PUSH_SETTINGS_EVENT = "ehokimiyat:push-settings-changed"

export type PushPermissionState = NotificationPermission | "unsupported"

export type PushSyncOptions = {
  interactive?: boolean
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
}

export function getPushPermissionState(): PushPermissionState {
  if (!isPushSupported() || typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported"
  }

  return Notification.permission
}

export async function registerPushServiceWorker() {
  if (!isPushSupported()) {
    throw new Error("Brauzer push bildirishnomalarni qo'llab-quvvatlamaydi")
  }

  const registration = await navigator.serviceWorker.register("/sw.js")
  await navigator.serviceWorker.ready
  return registration
}

export async function enablePushNotifications(options: PushSyncOptions = {}) {
  const interactive = options.interactive ?? true

  if (!isPushSupported()) {
    throw new Error("Brauzer push bildirishnomalarni qo'llab-quvvatlamaydi")
  }

  let permission = getPushPermissionState()
  if (permission === "unsupported") {
    throw new Error("Brauzer push bildirishnomalarni qo'llab-quvvatlamaydi")
  }

  if (permission === "default" && interactive) {
    permission = await Notification.requestPermission()
  }

  if (permission === "denied") {
    throw new Error("Brauzer bildirishnomalari bloklangan. Brauzer sozlamalaridan ruxsat bering")
  }

  if (permission !== "granted") {
    if (interactive) {
      throw new Error("Brauzer bildirishnoma ruxsatini bermadi")
    }
    return null
  }

  const { public_key, configured } = await getPushPublicKey()
  if (!configured || !public_key) {
    throw new Error("Push server hali sozlanmagan")
  }

  const registration = await registerPushServiceWorker()
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(public_key),
    })
  }

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Push subscription ma'lumotlarini olishning imkoni bo'lmadi")
  }

  await subscribePushNotifications({
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    user_agent: navigator.userAgent,
  })

  return subscription
}

export async function disablePushNotifications() {
  if (!isPushSupported()) return

  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()

  if (subscription) {
    const endpoint = subscription.endpoint
    await unsubscribePushNotifications(endpoint)
    await subscription.unsubscribe()
    return
  }

  await unsubscribePushNotifications()
}

export async function syncPushSubscription(enabled: boolean, options: PushSyncOptions = {}) {
  if (!enabled) {
    await disablePushNotifications()
    return false
  }

  const subscription = await enablePushNotifications(options)
  return Boolean(subscription)
}

export function emitPushSettingsChanged(enabled: boolean) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(PUSH_SETTINGS_EVENT, { detail: { enabled } }))
}
