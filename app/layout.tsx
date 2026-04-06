// @ts-nocheck
import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { I18nProvider } from "@/lib/i18n/context"
import { ThemeProvider } from "@/components/theme-provider"
import { PerformanceGuard } from "@/components/performance-guard"
import { PushNotificationManager } from "@/components/push/push-notification-manager"

export const metadata: Metadata = {
  title: "E-Hokimiyat",
  description: "Murojaatlar ijrosi va ijro nazorati axborot tizimi",
  generator: "v0.app",
  icons: {
    icon: "/government-icon.svg",
    apple: "/government-icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 shadow-md"
          >
            Асосий контентга ўтиш
          </a>
          <I18nProvider>
            <PerformanceGuard />
            <PushNotificationManager />
            {children}
          </I18nProvider>
          <a
            href="https://www.flaticon.com/free-icons/government"
            title="government icons"
            className="sr-only"
          >
            Government icons created by Freepik - Flaticon
          </a>
        </ThemeProvider>
      </body>
    </html>
  )
}
