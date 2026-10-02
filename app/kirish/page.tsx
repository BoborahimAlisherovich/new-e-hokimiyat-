"use client"

/* =============================================================================
   /kirish — XODIMLAR UCHUN KIRISH SAHIFASI
   -----------------------------------------------------------------------------
   Oddiy, tinch dizayn (Untitled UI «Welcome back» maketi asosida):
   bitta oq karta, ikki yarim — chapda forma, o'ngda och panel va bitta
   mavhum shakl (yarim doira + xira aks). 3D sahna YO'Q — `three` paketi
   bu sahifaga kerak emas. (Bo'ri sahnasi `components/auth/wolf-scene.tsx`
   da saqlanib qoldi, kerak bo'lsa qayta ulanadi.)

   Forma haqiqiy `login()` API bilan ishlaydi. Sessiya bor bo'lsa sahifa
   darhol /dashboard ga o'tadi.

   «Eslab qolish» — faqat LOGINNI brauzerda saqlaydi (parol saqlanmaydi).
   «Parolni unutdingizmi?» — tizimda o'z-o'zidan tiklash yo'q, shuning uchun
   rostgo'y izoh: administrator tiklaydi.
============================================================================= */

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, Eye, EyeOff, Landmark, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useI18n, useTranslation } from "@/lib/i18n/context"
import type { Language } from "@/lib/i18n/types"
import { login } from "@/lib/api/auth.api"
import { getAccessToken } from "@/lib/api/client"

const LANGUAGES: { code: Language; short: string; name: string }[] = [
  { code: "uz", short: "UZ", name: "O‘zbekcha" },
  { code: "uz-cyrl", short: "ЎЗ", name: "Ўзбекча" },
  { code: "ru", short: "RU", name: "Русский" },
  { code: "en", short: "EN", name: "English" },
]

const REMEMBER_KEY = "ehokimiyat.kirish.login"

export default function KirishPage() {
  const router = useRouter()
  const t = useTranslation()
  const { language, setLanguage } = useI18n()

  const [loginValue, setLoginValue] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [oneIdNote, setOneIdNote] = useState(false)
  const [forgotNote, setForgotNote] = useState(false)
  const loginRef = useRef<HTMLInputElement | null>(null)

  /* Sessiya bor — kabinetga; saqlangan login bo'lsa — maydonga */
  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/dashboard")
      return
    }
    try {
      const saved = localStorage.getItem(REMEMBER_KEY)
      if (saved) {
        setLoginValue(saved)
        setRemember(true)
      }
    } catch {
      /* localStorage yopiq bo'lishi mumkin — jim o'tamiz */
    }
  }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const value = loginValue.trim()
    if (!value) {
      setError(t.auth?.enterLogin ?? "Loginni kiriting")
      loginRef.current?.focus()
      return
    }
    if (!password) {
      setError(t.auth?.enterPassword ?? "Parolni kiriting")
      return
    }
    setError("")
    setBusy(true)
    try {
      await login({ login: value, password })
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, value)
        else localStorage.removeItem(REMEMBER_KEY)
      } catch {
        /* ixtiyoriy */
      }
      router.replace("/dashboard")
    } catch (err: any) {
      const code = err?.status
      if (code === 404) setError(t.auth?.userNotFound ?? "Foydalanuvchi topilmadi. Administrator bilan bog‘laning.")
      else if (code === 401) setError(t.auth?.authError ?? "Login yoki parol xato. Qayta urinib ko‘ring.")
      else if (code === 429) setError("Juda ko‘p urinish. Bir necha daqiqadan so‘ng qayta urinib ko‘ring.")
      else setError(err?.message || (t.auth?.genericError ?? "Xatolik yuz berdi. Qayta urinib ko‘ring."))
      setBusy(false)
    }
  }

  const FIELD =
    "h-11 w-full rounded-lg bg-card px-3.5 text-[15px] text-foreground placeholder:text-muted-foreground shadow-[0_1px_2px_rgba(13,21,36,0.05),0_0_0_1px_var(--border)] transition-shadow focus:shadow-[0_0_0_2px_var(--primary)] focus-visible:outline-none disabled:opacity-60"

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-sunken p-3 sm:p-6 lg:p-10">
      <div className="grid w-full max-w-[1120px] overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgba(13,21,36,0.04),0_40px_100px_-50px_rgba(13,21,36,0.3)] lg:min-h-[min(760px,88dvh)] lg:grid-cols-2">
        {/* ---------- CHAP: FORMA ---------- */}
        <section className="flex flex-col p-6 sm:p-10 lg:p-12">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Landmark className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-foreground">e-Hokimiyat</span>
          </Link>

          <div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-12 lg:py-16">
            <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[30px]">
              Xush kelibsiz
            </h1>
            <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
              Xodimlar uchun kirish. Login va parolingizni kiriting.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-lg bg-destructive-soft px-3.5 py-3 text-sm font-medium text-destructive-soft-foreground"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {error}
                </p>
              )}

              <div>
                <label htmlFor="k-login" className="mb-1.5 block text-[13px] font-medium text-foreground">
                  {t.auth?.loginLabel ?? "Login"}
                </label>
                <input
                  id="k-login"
                  ref={loginRef}
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
                  aria-invalid={Boolean(error) || undefined}
                  placeholder="Loginni kiriting"
                  className={FIELD}
                />
              </div>

              <div>
                <label htmlFor="k-password" className="mb-1.5 block text-[13px] font-medium text-foreground">
                  {t.auth?.passwordLabel ?? "Parol"}
                </label>
                <div className="relative">
                  <input
                    id="k-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    aria-invalid={Boolean(error) || undefined}
                    placeholder="••••••••"
                    className={cn(FIELD, "pr-12")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? (t.auth?.hidePassword ?? "Parolni yashirish") : (t.auth?.showPassword ?? "Parolni ko‘rsatish")}
                    className="absolute right-0 top-0 flex h-11 w-12 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[13px] font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  Loginni eslab qolish
                </label>
                <button
                  type="button"
                  onClick={() => setForgotNote((v) => !v)}
                  aria-expanded={forgotNote}
                  className="min-h-11 text-[13px] font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Parolni unutdingizmi?
                </button>
              </div>
              {forgotNote && (
                <p role="status" className="rounded-lg bg-info-soft px-3.5 py-2.5 text-[13px] leading-5 text-info-soft-foreground">
                  Parolni tizim administratori tiklaydi — hokimlik IT xizmatiga murojaat qiling.
                </p>
              )}

              <div className="space-y-3 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-semibold text-primary-foreground shadow-[0_12px_30px_-12px_rgb(51_102_255_/_0.55)] transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      {t.auth?.checking ?? "Tekshirilmoqda…"}
                    </>
                  ) : (
                    t.auth?.submit ?? "Kirish"
                  )}
                </button>

                {/* OneID — hozircha ulanmagan; bosilsa rostgo'y izoh */}
                <button
                  type="button"
                  onClick={() => setOneIdNote((v) => !v)}
                  aria-expanded={oneIdNote}
                  className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg bg-card text-[15px] font-semibold text-foreground shadow-[0_0_0_1px_var(--border)] transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <OneIdMark />
                  OneID orqali kirish
                </button>
                {oneIdNote && (
                  <p role="status" className="rounded-lg bg-info-soft px-3.5 py-2.5 text-[13px] leading-5 text-info-soft-foreground">
                    OneID ulanishi hozircha sozlanmagan. Login va parol orqali kiring.
                  </p>
                )}
              </div>
            </form>

            <p className="mt-8 text-center text-[13px] leading-6 text-muted-foreground">
              Hisobingiz yo‘qmi?{" "}
              <span className="font-semibold text-primary">Administratorga murojaat qiling</span>
            </p>
          </div>

          <p className="text-[12px] text-muted-foreground">© Xatirchi tumani hokimligi {new Date().getFullYear()}</p>
        </section>

        {/* ---------- O'NG: OCH PANEL + MAVHUM SHAKL ---------- */}
        <section
          className="relative hidden items-center justify-center bg-background lg:flex"
          aria-hidden
        >
          <div
            role="group"
            aria-label={t.common?.selectLanguage ?? "Til tanlash"}
            className="absolute right-5 top-5 flex items-center gap-0.5 rounded-lg bg-card p-1 shadow-[0_1px_2px_rgba(13,21,36,0.06)]"
          >
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                aria-pressed={language === l.code}
                title={l.name}
                className={cn(
                  "h-8 min-w-8 rounded-md px-2 text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  language === l.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.short}
              </button>
            ))}
          </div>

          {/* Yarim doira + xira aks — maketdagi shakl, sayt ko'ki bilan */}
          <div className="relative h-[280px] w-[280px]">
            <div className="absolute left-0 top-0 h-[140px] w-[280px] overflow-hidden">
              <div className="h-[280px] w-[280px] rounded-full bg-primary" />
            </div>
            <div className="absolute left-0 top-[140px] h-[140px] w-[280px] overflow-hidden [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent_85%)]">
              <div className="-mt-[140px] h-[280px] w-[280px] rounded-full bg-primary blur-2xl" />
            </div>
            <div className="absolute left-[-16px] top-[139px] h-px w-[312px] bg-background" />
          </div>
        </section>
      </div>

      {/* Telefonda til tanlash — karta ostida */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 lg:hidden">
        <div
          role="group"
          aria-label={t.common?.selectLanguage ?? "Til tanlash"}
          className="flex items-center gap-0.5 rounded-lg bg-card p-1 shadow-[0_2px_10px_rgba(13,21,36,0.1)]"
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              aria-pressed={language === l.code}
              className={cn(
                "h-9 min-w-9 rounded-md px-2 text-[11px] font-bold",
                language === l.code ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {l.short}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

/** OneID belgisi — RASMIY LOGOTIP EMAS, neytral so'z belgisi. */
function OneIdMark() {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-primary-soft px-1.5 py-0.5 text-[11px] font-black tracking-tight text-primary-soft-foreground">
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
