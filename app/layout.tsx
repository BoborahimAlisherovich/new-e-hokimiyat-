import type React from "react"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { I18nProvider } from "@/lib/i18n/context"
import { ThemeProvider } from "@/components/theme-provider"
import { PushNotificationManager } from "@/components/push/push-notification-manager"

/**
 * Shrift: Inter variable, public/fonts dan @font-face orqali beriladi
 * (app/globals.css ning boshida). next/font/google ishlatilmadi, chunki u
 * build vaqtida internet talab qiladi — server ichki tarmoqda bo'lishi mumkin.
 */

export const metadata: Metadata = {
  title: {
    default: "E-Hokimiyat — Xatirchi tumani",
    template: "%s · E-Hokimiyat",
  },
  description: "Topshiriqlar ijrosi va murojaatlar nazorati axborot tizimi",
  applicationName: "E-Hokimiyat",
  icons: {
    icon: "/government-icon.svg",
    apple: "/government-icon.svg",
  },
  formatDetection: { telephone: false },
}

/**
 * interactive-widget=resizes-content — mobil klaviatura ochilganda viewport
 * qayta o'lchanadi, shuning uchun chat yozish maydoni klaviatura ostida
 * qolib ketmaydi. viewportFit=cover — safe-area (notch, home indicator)
 * qiymatlari ishlashi uchun majburiy.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1020" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        {/* Asosiy shrift subseti eng boshida so'raladi — matn sakramaydi */}
        <link
          rel="preload"
          href="/fonts/inter-latin-wght-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className="min-h-dvh bg-background font-sans text-foreground antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <a
            href="#main-content"
            className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-md focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100]"
          >
            Asosiy kontentga o&apos;tish
          </a>
          <I18nProvider>
            <PushNotificationManager />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
