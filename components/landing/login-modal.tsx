"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { AlertCircle, Eye, EyeOff, Lock, LogIn, ShieldCheck, User, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { login } from "@/lib/api/auth.api"

/** OneID kirish manzili. Sozlanmagan bo'lsa tugma tushuntirish beradi. */
export const ONEID_URL = process.env.NEXT_PUBLIC_ONEID_URL ?? ""

/**
 * XODIMLAR UCHUN KIRISH — MODAL
 *
 * Landing sahifasidan alohida sahifaga o'tilmaydi: navbar'dagi «Tizimga
 * kirish» tugmasi shu modalni ochadi. Kirish muvaffaqiyatli bo'lsa
 * to'g'ridan-to'g'ri /dashboard ga o'tadi.
 *
 * Fuqarolar bu yerdan kirmaydi — ular Telegram bot orqali murojaat
 * yuboradi. Shuning uchun sarlavha ataylab «Xodimlar uchun».
 */
export function LoginModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const reduce = useReducedMotion()

  const [loginValue, setLoginValue] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [oneIdNote, setOneIdNote] = useState(false)

  const firstFieldRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  /* Escape, fon skrollini bloklash, fokusni maydonga berish */
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      // Oddiy fokus tutqichi: TAB modal ichida aylanadi
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href]',
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 120)

    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
      window.clearTimeout(t)
    }
  }, [open, onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return

    const value = loginValue.trim()
    if (!value) return setError("Loginni kiriting")
    if (!password) return setError("Parolni kiriting")

    setError("")
    setBusy(true)
    try {
      await login({ login: value, password })
      router.replace("/dashboard")
    } catch (err: any) {
      const code = err?.status
      if (code === 404) setError("Foydalanuvchi topilmadi. Administrator bilan bog‘laning.")
      else if (code === 401) setError("Login yoki parol xato.")
      else if (code === 429) setError("Juda ko‘p urinish. Bir necha daqiqadan so‘ng urinib ko‘ring.")
      else setError(err?.message || "Xatolik yuz berdi. Qayta urinib ko‘ring.")
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Fon */}
          <div
            className="absolute inset-0 bg-[#030b1f]/75 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl border border-white/12 bg-[#061436] pb-safe shadow-[0_40px_120px_-30px_rgba(3,11,31,0.9)] sm:rounded-3xl sm:pb-0"
          >
            {/* Yuqoridagi nur */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[#4d86ff]/28 blur-3xl"
              aria-hidden
            />

            <div className="relative p-6 sm:p-7">
              <button
                type="button"
                onClick={onClose}
                aria-label="Yopish"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl text-[#a9bde4] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>

              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4d86ff] to-[#2dd4bf] text-[#030b1f]">
                <ShieldCheck className="h-6 w-6" aria-hidden />
              </span>

              <h2
                id="login-modal-title"
                className="mt-4 text-xl font-bold tracking-tight text-white"
              >
                Xodimlar uchun kirish
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#a9bde4]">
                Tizimga faqat vakolatli xodimlar kiradi. Fuqarolar murojaatni
                Telegram bot orqali yuboradi.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                {error && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/12 px-3 py-2.5 text-sm font-medium text-rose-200"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {error}
                  </p>
                )}

                <div>
                  <label
                    htmlFor="lm-login"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-[#a9bde4]"
                  >
                    Login
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f95c4]"
                      aria-hidden
                    />
                    <input
                      id="lm-login"
                      ref={firstFieldRef}
                      name="username"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                      value={loginValue}
                      onChange={(e) => setLoginValue(e.target.value)}
                      disabled={busy}
                      placeholder="a.karimov"
                      className="h-12 w-full rounded-xl border border-white/14 bg-white/[0.06] pl-10 pr-3 text-sm text-white placeholder:text-[#6b81b0] transition-colors focus:border-[#4d86ff]/70 focus:bg-white/[0.09] focus-visible:outline-none disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lm-password"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-[#a9bde4]"
                  >
                    Parol
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f95c4]"
                      aria-hidden
                    />
                    <input
                      id="lm-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                      placeholder="••••••••"
                      className="h-12 w-full rounded-xl border border-white/14 bg-white/[0.06] pl-10 pr-12 text-sm text-white placeholder:text-[#6b81b0] transition-colors focus:border-[#4d86ff]/70 focus:bg-white/[0.09] focus-visible:outline-none disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                      className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-xl text-[#7f95c4] transition-colors hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4.5 w-4.5" aria-hidden />
                      ) : (
                        <Eye className="h-4.5 w-4.5" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className={cn(
                    "group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-bold text-[#030b1f] transition-transform",
                    "bg-gradient-to-r from-[#7aa7ff] via-[#4d86ff] to-[#2dd4bf]",
                    "hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff] disabled:translate-y-0 disabled:opacity-60",
                  )}
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#030b1f]/30 border-t-[#030b1f]" />
                      Tekshirilmoqda…
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" aria-hidden />
                      Kirish
                    </>
                  )}
                </button>
              </form>

              {/* Ajratgich */}
              <div className="my-5 flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-white/12" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7f95c4]">
                  yoki
                </span>
                <span className="h-px flex-1 bg-white/12" />
              </div>

              {/* OneID.
                  Manzil `NEXT_PUBLIC_ONEID_URL` da bo'lsa — havola.
                  Bo'lmasa 404 ga olib bormaslik uchun holatni rostgo'y
                  ko'rsatadi. */}
              {ONEID_URL ? (
                <a
                  href={ONEID_URL}
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-white/16 bg-white/[0.05] text-sm font-semibold text-white transition-colors hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
                >
                  <OneIdMark />
                  OneID orqali kirish
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setOneIdNote(true)}
                    className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-white/16 bg-white/[0.05] text-sm font-semibold text-white transition-colors hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
                  >
                    <OneIdMark />
                    OneID orqali kirish
                  </button>
                  {oneIdNote && (
                    <p
                      role="status"
                      className="mt-2 rounded-xl border border-[#4d86ff]/25 bg-[#4d86ff]/10 px-3 py-2 text-xs leading-5 text-[#bcd0f7]"
                    >
                      OneID ulanishi sozlanmoqda. Hozircha login va parol orqali kiring.
                    </p>
                  )}
                </>
              )}

              <p className="mt-4 text-center text-[11px] leading-5 text-[#7f95c4]">
                Login yoki parolni bilmasangiz — tizim administratoriga murojaat qiling.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * OneID belgisi.
 *
 * DIQQAT: bu rasmiy OneID logotipi EMAS — neytral shakl va so'z belgisi.
 * Rasmiy logotipni `public/oneid.svg` ga qo'ying va shu komponentni
 * `<Image src="/oneid.svg" .../>` ga almashtiring.
 */
export function OneIdMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-black tracking-tight text-[#0a2050]",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
        <rect x="1" y="3" width="14" height="10" rx="2.5" fill="currentColor" opacity="0.18" />
        <circle cx="5.6" cy="8" r="2" fill="currentColor" />
        <rect x="9" y="6.4" width="4.6" height="1.3" rx="0.65" fill="currentColor" />
        <rect x="9" y="8.9" width="3.2" height="1.3" rx="0.65" fill="currentColor" />
      </svg>
      OneID
    </span>
  )
}
