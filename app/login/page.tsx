"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, Shield } from "lucide-react"

import { cn } from "@/lib/utils"
import { useI18n, useTranslation } from "@/lib/i18n/context"
import type { Language } from "@/lib/i18n/types"
import { login } from "@/lib/api/auth.api"

/**
 * KIRISH SAHIFASI
 *
 * Tuzatilgan nuqsonlar:
 *  1. Sahifa `<form>` EMAS edi — divlar va `<Button onClick>`. Shu
 *     sababli ENTER bilan kirish ishlamasdi, `name` atributlari yo'q edi
 *     va brauzer/parol menejeri avtomatik to'ldirishi buzilgan edi.
 *     Davlat portalining kirish nuqtasida bu jiddiy nuqson.
 *  2. Login maydoni `text-center text-xl` edi — erkin matnli hisob nomi
 *     uchun noto'g'ri; `placeholder:text-gray-300` kontrasti 1.50:1.
 *  3. Login uzunligini `length / 12` bo'yicha to'ldiradigan "progress"
 *     chizig'i bor edi — ma'nosiz vizual signal.
 *  4. Xato matni `role="alert"` siz edi — ekran o'quvchi e'lon qilmasdi.
 *  5. `min-h-screen` + `overflow-hidden`: iPhone SE (667px) da karta
 *     ikki tomondan kesilib qolardi va scroll qilishning imkoni yo'q edi.
 *     Endi `min-h-dvh` va scroll.
 *  6. Shartlar havolalari `dangerouslySetInnerHTML` bilan `href="#"` ga
 *     ishora qilardi.
 *  7. Ranglar indigo/violet edi — saytdagi beshta raqib palitradan biri.
 *  8. GSAP kirish animatsiyalari va `animate-ping` halqalari olib tashlandi.
 */

const LANGUAGES: { code: Language; short: string; name: string }[] = [
  { code: "uz", short: "UZ", name: "O‘zbekcha" },
  { code: "uz-cyrl", short: "ЎЗ", name: "Ўзбекча" },
  { code: "ru", short: "RU", name: "Русский" },
  { code: "en", short: "EN", name: "English" },
]

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslation()
  const { language, setLanguage } = useI18n()

  const [loginValue, setLoginValue] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return

    const value = loginValue.trim()
    if (!value) {
      setError(t.auth?.enterLogin ?? "Loginni kiriting")
      return
    }
    if (!password) {
      setError(t.auth?.enterPassword ?? "Parolni kiriting")
      return
    }

    setError("")
    setBusy(true)

    try {
      // login() tokenlarni o'zi saqlaydi
      await login({ login: value, password })
      router.replace("/dashboard")
    } catch (err: any) {
      const statusCode = err?.status
      if (statusCode === 404) {
        setError(
          t.auth?.userNotFound ??
            "Foydalanuvchi topilmadi. Administrator bilan bog‘laning.",
        )
      } else if (statusCode === 401) {
        setError(
          t.auth?.invalidCredentials ??
            "Login yoki parol xato. Qayta urinib ko‘ring.",
        )
      } else if (statusCode === 429) {
        setError("Juda ko‘p urinish. Bir necha daqiqadan so‘ng qayta urinib ko‘ring.")
      } else {
        setError(err?.message || "Xatolik yuz berdi. Qayta urinib ko‘ring.")
      }
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background lg:flex-row">
      {/* Chap: brend paneli — kichik ekranda faqat ingichka sarlavha */}
      <section className="relative hidden overflow-hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
        <Image
          src="/xatirchi-login.png"
          alt=""
          fill
          priority
          sizes="46vw"
          className="object-cover"
        />
        {/* Matn o'qilishi uchun qatlam — token rangi ustida */}
        <div
          className="absolute inset-0 bg-[color-mix(in_srgb,var(--primary)_78%,#000521)] opacity-[0.86]"
          aria-hidden
        />
        <div className="relative z-10 p-10">
          <span className="inline-flex items-center gap-2.5 text-primary-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Shield className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight">e-Hokimiyat</span>
              <span className="block text-xs opacity-85">Xatirchi tumani hokimligi</span>
            </span>
          </span>
        </div>

        <div className="relative z-10 p-10">
          <h2 className="max-w-md text-3xl font-bold leading-tight tracking-tight text-primary-foreground text-balance">
            {t.auth?.heroTitle ?? "Topshiriqlar ijrosi va murojaatlar nazorati"}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-primary-foreground/85">
            {t.auth?.heroSubtitle ??
              "Qog‘oz va messenjerlar o‘rniga barcha ish bir tizimda: topshiriq berish, ijroni kuzatish, hisobot va tahlil."}
          </p>
        </div>
      </section>

      {/* O'ng: forma */}
      <section className="flex flex-1 flex-col">
        {/* Til tanlash */}
        <div className="flex items-center justify-between gap-2 p-4">
          <span className="inline-flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-4.5 w-4.5" aria-hidden />
            </span>
            <span className="text-md font-bold tracking-tight text-foreground">
              e-Hokimiyat
            </span>
          </span>

          <div
            role="group"
            aria-label={t.common?.selectLanguage ?? "Til tanlash"}
            className="ml-auto flex items-center gap-0.5 rounded-md bg-muted p-0.5"
          >
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLanguage(l.code)}
                aria-pressed={language === l.code}
                title={l.name}
                className={cn(
                  "h-9 min-w-9 rounded-sm px-2 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  language === l.code
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.short}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-8">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t.auth?.loginTitle ?? "Tizimga kirish"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.auth?.loginSubtitle ?? "Login va parolingizni kiriting"}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive-soft-foreground"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {error}
                </p>
              )}

              <div>
                <label
                  htmlFor="login"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t.auth?.loginLabel ?? "Login"}
                </label>
                <input
                  id="login"
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
                  aria-invalid={Boolean(error)}
                  placeholder={t.auth?.loginPlaceholder ?? "Masalan: a.karimov"}
                  className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t.auth?.passwordLabel ?? "Parol"}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    aria-invalid={Boolean(error)}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-md border border-input bg-card px-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? (t.auth?.hidePassword ?? "Parolni yashirish")
                        : (t.auth?.showPassword ?? "Parolni ko‘rsatish")
                    }
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {t.common?.loading ?? "Yuklanmoqda…"}
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" aria-hidden />
                    {t.auth?.loginButton ?? "Kirish"}
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-xs leading-5 text-muted-foreground">
              {t.auth?.needHelp ??
                "Login yoki parolni bilmasangiz, tizim administratoriga murojaat qiling."}
            </p>
          </div>
        </div>

        <footer className="border-t border-border px-4 py-3">
          <p className="text-center text-xs text-muted-foreground">
            Xatirchi tumani hokimligi · e-Hokimiyat
          </p>
        </footer>
      </section>
    </main>
  )
}
