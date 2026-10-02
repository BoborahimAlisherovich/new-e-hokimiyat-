"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error boundary:", error)
  }, [error])

  return (
    <html lang="uz">
      <body className="min-h-dvh bg-background text-foreground">
        <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 p-6">
          <h1 className="text-2xl font-semibold">Kutilmagan xatolik</h1>
          <p className="text-sm text-muted-foreground">
            Sahifa yuklanishida xatolik yuz berdi. Qayta urinib ko‘ring yoki bosh sahifaga qayting.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reset}>
              Qayta urinish
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/">Bosh sahifa</Link>
            </Button>
          </div>
        </main>
      </body>
    </html>
  )
}

