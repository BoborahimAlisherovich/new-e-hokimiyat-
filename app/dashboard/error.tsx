"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RotateCcw } from "lucide-react"

/**
 * Dashboard xato chegarasi.
 *
 * Ilgari butun ilovada FAQAT `app/error.tsx` bor edi — dashboard ichidagi
 * har qanday render xatosi navigatsiya bilan birga butun qobiqni yo'q
 * qilardi. Endi xato faqat kontent qismini almashtiradi, sidebar va
 * pastki navigatsiya joyida qoladi.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Konsolda qoldiramiz: removeConsole ishlab chiqarishda error'ni saqlaydi
    console.error("Dashboard xatosi:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="surface max-w-md p-6 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive-soft text-destructive-soft-foreground">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold text-foreground">Sahifani ko‘rsatib bo‘lmadi</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Kutilmagan xatolik yuz berdi. Qayta urinib ko‘ring — muammo takrorlansa,
          tizim administratoriga xabar bering.
        </p>
        {error?.digest && (
          <p className="mt-3 rounded-md bg-muted px-2 py-1 font-mono text-2xs text-muted-foreground">
            {error.digest}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Asosiy sahifa
          </Link>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Qayta urinish
          </button>
        </div>
      </div>
    </div>
  )
}
