"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import gsap from "gsap"
import {
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Building2,
  ArrowRight,
  Fingerprint,
  Eye,
  EyeOff,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/lib/i18n/context"
import { login, setAccessToken, setRefreshToken } from "@/lib/api"

type LoginStep =
  | "initial"
  | "checking"
  | "success"
  | "error"

export default function LoginPage() {
  const t = useTranslation()
  const router = useRouter()
  const [step, setStep] = useState<LoginStep>("initial")
  const [loginValue, setLoginValue] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
  // GSAP refs
  const pageRef = useRef<HTMLDivElement>(null)
  const leftSideRef = useRef<HTMLDivElement>(null)
  const rightSideRef = useRef<HTMLDivElement>(null)
  const formCardRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const orbsRef = useRef<HTMLDivElement>(null)

  // GSAP entrance animation
  useEffect(() => {
    if (!pageRef.current) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })

      // Animate floating orbs
      if (orbsRef.current) {
        const orbs = orbsRef.current.querySelectorAll('.login-orb')
        gsap.set(orbs, { scale: 0, opacity: 0 })
        tl.to(orbs, {
          scale: 1,
          opacity: 1,
          duration: 1.2,
          stagger: 0.15,
          ease: "elastic.out(1, 0.5)",
        }, 0)
        
        // Continuous floating
        orbs.forEach((orb, i) => {
          gsap.to(orb, {
            y: `random(-60, 60)`,
            x: `random(-40, 40)`,
            scale: `random(0.85, 1.15)`,
            duration: `random(8, 14)`,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            delay: i * 0.3,
          })
        })
      }

      // Left side image reveal
      if (leftSideRef.current) {
        tl.from(leftSideRef.current, {
          clipPath: "inset(0 100% 0 0)",
          duration: 1,
          ease: "power4.inOut",
        }, 0.2)
      }

      // Header entrance
      if (headerRef.current) {
        tl.from(headerRef.current.children, {
          y: 30,
          opacity: 0,
          duration: 0.7,
          stagger: 0.1,
        }, 0.5)
      }

      // Form card entrance
      if (formCardRef.current) {
        tl.from(formCardRef.current, {
          y: 40,
          opacity: 0,
          scale: 0.96,
          duration: 0.8,
        }, 0.7)
      }

      // Footer entrance
      if (footerRef.current) {
        tl.from(footerRef.current, {
          y: 20,
          opacity: 0,
          duration: 0.5,
        }, 1)
      }
    }, pageRef)

    return () => ctx.revert()
  }, [])

  const handleLogin = async () => {
    if (!loginValue.trim()) {
      setError("Loginni kiriting")
      return
    }

    if (!password) {
      setError("Parolni kiriting")
      return
    }

    setError("")
    setStep("checking")

    try {
      const response = await login({ login: loginValue.trim(), password })
      setAccessToken(response.access)
      setRefreshToken(response.refresh)
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.user))
      }
      
      setStep("success")
      setTimeout(() => {
        router.push("/dashboard")
      }, 1000)
    } catch (err: any) {
      setStep("error")
      if (err.status === 404) {
        setError(t.auth.userNotFound || "Foydalanuvchi topilmadi. Iltimos, administrator bilan bog'laning.")
      } else if (err.status === 401) {
        setError("Autentifikatsiya xatosi. Iltimos, qayta urinib ko'ring.")
      } else {
        setError(err.message || "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
      }
    }
  }

  const resetForm = () => {
    setStep("initial")
    setLoginValue("")
    setPassword("")
    setError("")
  }

  const termsHtml = t.auth.agreeToTerms
    .replace(
      "{terms}",
      `<a href="#" class="text-blue-600 hover:text-blue-700 underline underline-offset-2">${t.auth.termsOfService}</a>`
    )
    .replace(
      "{policy}",
      `<a href="#" class="text-blue-600 hover:text-blue-700 underline underline-offset-2">${t.auth.privacyPolicy}</a>`
    )

  return (
    <div ref={pageRef} className="min-h-screen flex overflow-hidden relative">
      {/* Left Side - Image Section */}
      <div ref={leftSideRef} className="hidden lg:flex lg:w-[55%] relative">
        {/* Full Background Image */}
        <Image
          src="/xatirchi-login.png"
          alt="Xatirchi tumani"
          fill
          className="object-cover"
          priority
        />
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/30 via-transparent to-transparent" />
      </div>

      {/* Right Side - Login Form */}
      <div ref={rightSideRef} className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-8 lg:p-12 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50/50" />
        
        {/* Floating orbs */}
        <div ref={orbsRef} className="absolute inset-0 pointer-events-none">
          <div className="login-orb absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-indigo-300/25 to-blue-200/20 blur-3xl" />
          <div className="login-orb absolute bottom-[-15%] left-[-10%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-violet-300/20 to-purple-200/15 blur-3xl" />
          <div className="login-orb absolute top-[40%] left-[-5%] w-[250px] h-[250px] rounded-full bg-gradient-to-br from-cyan-300/15 to-teal-200/10 blur-3xl" />
          <div className="login-orb absolute bottom-[30%] right-[5%] w-[200px] h-[200px] rounded-full bg-gradient-to-br from-amber-300/12 to-orange-200/8 blur-3xl" />
        </div>
        
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-gray-900">E-Hokimiyat</h2>
                <p className="text-sm text-indigo-600 font-medium">Xatirchi tumani</p>
              </div>
            </div>
          </div>

          {/* Form Header */}
          <div ref={headerRef} className="text-center lg:text-left mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-violet-100 text-indigo-700 text-xs font-semibold mb-4 border border-indigo-200/50">
              <Shield className="h-3.5 w-3.5" />
              Xavfsiz kirish
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Xush kelibsiz!
            </h1>
            <p className="text-gray-500 text-base">
              Tizimga kirish uchun login va parolni kiriting
            </p>
          </div>

          {/* Login Card */}
          <div ref={formCardRef} className="bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-200/30 p-7 sm:p-9 border border-white/60 ring-1 ring-indigo-100/20">
            {step === "initial" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="login" className="text-gray-700 font-semibold text-sm flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-blue-600" />
                    Login
                  </Label>
                  <div className="relative">
                    <Input
                      id="login"
                      value={loginValue}
                      onChange={(e) => setLoginValue(e.target.value)}
                    placeholder="Login"
                      className="h-14 text-center text-xl font-medium bg-indigo-50/30 border-2 border-indigo-200/60 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl transition-all duration-300 placeholder:text-gray-300"
                    />
                    {loginValue.trim() && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="h-5 w-5 text-blue-500 animate-in zoom-in duration-200" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end items-center">
                    {error && (
                      <p className="text-xs text-red-500 font-medium">{error}</p>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-400 via-violet-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.min((loginValue.trim().length / 12) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="password" className="text-gray-700 font-semibold text-sm flex items-center gap-2">
                    Parol
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Parol"
                      className="h-14 bg-indigo-50/30 border-2 border-indigo-200/60 pr-12 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-indigo-600 transition hover:bg-indigo-100"
                      aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-base font-semibold bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_auto] hover:bg-[position:right_center] text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-500 group disabled:cursor-not-allowed disabled:opacity-100 disabled:shadow-indigo-300/20 disabled:from-indigo-400 disabled:via-violet-500 disabled:to-indigo-400"
                  onClick={handleLogin}
                  disabled={!loginValue.trim() || !password}
                >
                  <span>Tizimga kirish</span>
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                {!loginValue.trim() || !password ? (
                  <p className="text-center text-xs font-medium text-indigo-500/80">
                    Kirish uchun login va parolni to'ldiring
                  </p>
                ) : null}

                <p
                  className="text-xs text-gray-400 text-center leading-relaxed pt-2"
                  dangerouslySetInnerHTML={{ __html: termsHtml }}
                />
              </div>
            )}

            {step === "checking" && (
              <div className="flex flex-col items-center py-14">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-400/30">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                </div>
                <p className="mt-8 text-gray-800 font-semibold text-lg">
                  Tekshirilmoqda...
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Iltimos, biroz kuting
                </p>
              </div>
            )}

            {step === "error" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                  <div className="h-10 w-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                    <XCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-red-800 font-medium text-sm">Xatolik yuz berdi</p>
                    <p className="text-red-600 text-xs">{error || t.auth.userNotFound}</p>
                  </div>
                </div>

                <Button 
                  className="w-full h-14 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white rounded-xl shadow-lg transition-all duration-300" 
                  onClick={resetForm}
                >
                  Qayta urinish
                </Button>
                <p className="text-xs text-center text-gray-400">
                  Muammo davom etsa, administrator bilan bog'laning
                </p>
              </div>
            )}

            {step === "success" && (
              <div className="flex flex-col items-center py-14">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                  <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </div>
                </div>
                <p className="mt-8 text-xl font-bold text-gray-900">
                  Muvaffaqiyatli!
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Bosh sahifaga yo'naltirilmoqdasiz...
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div ref={footerRef} className="mt-8 text-center space-y-1">
            <p className="text-xs text-gray-400">
              O'zbekiston Respublikasi Raqamli texnologiyalar vazirligi
            </p>
            <p className="text-xs text-gray-300">
              Aura group tomonidan ishlab chiqildi
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
