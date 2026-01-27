"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Shield,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  MapPin,
  Building2,
  Sparkles,
  ArrowRight,
  Fingerprint,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTranslation } from "@/lib/i18n/context"
import { login, setAccessToken, setRefreshToken } from "@/lib/api"

type LoginStep =
  | "initial"
  | "checking"
  | "oneid_redirect"
  | "success"
  | "error"

export default function LoginPage() {
  const t = useTranslation()
  const router = useRouter()
  const [step, setStep] = useState<LoginStep>("initial")
  const [pnfl, setPnfl] = useState("")
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handlePnflCheck = async () => {
    if (!/^\d{14}$/.test(pnfl)) {
      setError("PNFL 14 ta raqamdan iborat bo'lishi kerak")
      return
    }

    setError("")
    setStep("checking")

    try {
      const response = await login({ pnfl })
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

  const handleOneIdLogin = () => {
    handlePnflCheck()
  }

  const resetForm = () => {
    setStep("initial")
    setPnfl("")
    setError("")
  }

  const termsHtml = t.auth.agreeToTerms
    .replace(
      "{terms}",
      `<a href="#" class="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">${t.auth.termsOfService}</a>`
    )
    .replace(
      "{policy}",
      `<a href="#" class="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">${t.auth.privacyPolicy}</a>`
    )

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Side - Image Section */}
      <div className="hidden lg:flex lg:w-[55%] relative">
        {/* Full Background Image */}
        <Image
          src="/xatirchi-login.png"
          alt="Xatirchi tumani"
          fill
          className="object-cover"
          priority
        />
        
        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 relative">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-100/40 to-blue-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-100/30 to-emerald-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className={`w-full max-w-md relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-gray-900">E-Hokimiyat</h2>
                <p className="text-sm text-emerald-600 font-medium">Xatirchi tumani</p>
              </div>
            </div>
          </div>

          {/* Form Header */}
          <div className="text-center lg:text-left mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-4">
              <Shield className="h-3.5 w-3.5" />
              Xavfsiz kirish
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              Xush kelibsiz!
            </h1>
            <p className="text-gray-500 text-base">
              Tizimga kirish uchun PNFL raqamingizni kiriting
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-200/50 p-7 sm:p-9 border border-gray-100/80">
            {step === "initial" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="pnfl" className="text-gray-700 font-semibold text-sm flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-emerald-600" />
                    PNFL (Shaxsiy raqam)
                  </Label>
                  <div className="relative">
                    <Input
                      id="pnfl"
                      value={pnfl}
                      onChange={(e) =>
                        setPnfl(e.target.value.replace(/\D/g, "").slice(0, 14))
                      }
                      maxLength={14}
                      placeholder="• • • • • • • • • • • • • •"
                      className="h-14 text-center text-xl tracking-[0.3em] font-mono bg-gray-50/50 border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl transition-all duration-300 placeholder:text-gray-300 placeholder:tracking-[0.2em]"
                    />
                    {pnfl.length === 14 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-in zoom-in duration-200" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400">
                      {pnfl.length}/14 ta raqam
                    </p>
                    {error && (
                      <p className="text-xs text-red-500 font-medium">{error}</p>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(pnfl.length / 14) * 100}%` }}
                    />
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-base font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all duration-300 group"
                  onClick={handlePnflCheck}
                  disabled={pnfl.length !== 14}
                >
                  <span>Tizimga kirish</span>
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-xs text-gray-400 uppercase tracking-wider">yoki</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-14 text-base font-medium border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700 rounded-xl transition-all duration-300 group"
                  onClick={() => setStep("oneid_redirect")}
                  disabled={pnfl.length !== 14}
                >
                  <Image src="/oneid-logo.svg" alt="OneID" width={20} height={20} className="mr-2" onError={(e) => e.currentTarget.style.display = 'none'} />
                  <span>OneID orqali kirish</span>
                  <ExternalLink className="ml-2 h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </Button>

                <p
                  className="text-xs text-gray-400 text-center leading-relaxed pt-2"
                  dangerouslySetInnerHTML={{ __html: termsHtml }}
                />
              </div>
            )}

            {step === "checking" && (
              <div className="flex flex-col items-center py-14">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                  <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
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

            {step === "oneid_redirect" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-emerald-800 font-medium text-sm">PNFL tasdiqlandi</p>
                    <p className="text-emerald-600 text-xs">OneID tizimiga yo'naltirilmoqdasiz</p>
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-base font-semibold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-300"
                  onClick={handleOneIdLogin}
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  OneID ga o'tish
                </Button>

                <Button 
                  variant="ghost" 
                  className="w-full text-gray-500 hover:text-gray-700 rounded-xl" 
                  onClick={resetForm}
                >
                  ← Orqaga qaytish
                </Button>
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
                  <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
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
          <div className="mt-8 text-center space-y-1">
            <p className="text-xs text-gray-400">
              O'zbekiston Respublikasi Raqamli texnologiyalar vazirligi
            </p>
            <p className="text-xs text-gray-300">
              E-Hokimiyat tizimi v2.0 • 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
