self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  if (!event.data) return

  let payload = {}
  try {
    payload = event.data.json()
  } catch (error) {
    payload = { title: "Bildirishnoma", body: event.data.text() }
  }

  const title = payload.title || "Yangi bildirishnoma"
  const options = {
    body: payload.body || "",
    icon: "/government-icon.svg",
    badge: "/government-icon.svg",
    data: {
      url: payload.url || "/dashboard/notifications",
      notification: payload.data || null,
    },
    tag: payload.tag || "ehokimiyat-notification",
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || "/dashboard/notifications"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    })
  )
})
