"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { getAccessToken } from "@/lib/api/client"
import { Hero } from "./landing-hero"
import { LoginModal } from "./login-modal"
import {
  Features,
  Footer,
  HowItWorks,
  OneIdSection,
  TelegramCta,
  Trust,
} from "./landing-sections"

/**
 * OMMAVIY LANDING SAHIFA
 *
 * Ilgari `app/page.tsx` shunchaki `/dashboard` ga yo'naltirardi — ya'ni
 * saytning ommaviy yuzi yo'q edi va fuqaro uchun hech qanday kirish
 * nuqtasi mavjud emasdi.
 *
 * Endi: fuqaro uchun Telegram bot orqali murojaat yuborish, xodimlar
 * uchun esa modal orqali kirish. Alohida /login sahifasi ham ishlab
 * turadi (to'g'ridan-to'g'ri havola bo'yicha kelganlar uchun).
 */
export function LandingPage() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  // Token faqat brauzerda o'qiladi — SSR bilan farq bo'lmasligi uchun
  // effektda tekshiriladi.
  useEffect(() => {
    setHasSession(Boolean(getAccessToken()))
  }, [])

  const handleLogin = useCallback(() => {
    if (hasSession) {
      router.push("/dashboard")
      return
    }
    setModalOpen(true)
  }, [hasSession, router])

  return (
    <div className="landing min-h-dvh bg-background">
      <a
        href="#qanday"
        className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[110]"
      >
        Asosiy kontentga o&apos;tish
      </a>

      <Hero onLogin={handleLogin} hasSession={hasSession} />

      <main>
        <HowItWorks />
        <Features />
        <TelegramCta />
        <OneIdSection />
        <Trust />
      </main>

      <Footer onLogin={handleLogin} />

      <LoginModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

export default LandingPage
