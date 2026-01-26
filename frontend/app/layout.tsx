// @ts-nocheck
import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { I18nProvider } from "@/lib/i18n/context"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: "Топшириқлар Бошқарув Тизими",
  description: "Туман ҳокимлиги топшириқлар бошқарув тизими - вазифалар, ижро назорати, аналитика",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 shadow-md"
          >
            Асосий контентга ўтиш
          </a>
          <I18nProvider>
            {children}
            <Analytics />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
