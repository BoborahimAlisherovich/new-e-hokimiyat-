"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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

  const handlePnflCheck = async () => {
    if (!/^\d{14}$/.test(pnfl)) {
      setError("PNFL 14 ta raqamdan iborat bo'lishi kerak")
      return
    }

    setError("")
    setStep("checking")

    try {
      // Call Django API to check PNFL and login
      const response = await login({ pnfl })
      
      // Store tokens
      setAccessToken(response.access)
      setRefreshToken(response.refresh)
      
      // Store user info
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.user))
      }
      
      setStep("success")
      
      // Redirect to dashboard after success animation
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
    // In production, this would redirect to OneID
    // For now, we'll simulate the login
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
      `<a href="#" class="text-primary hover:underline">${t.auth.termsOfService}</a>`
    )
    .replace(
      "{policy}",
      `<a href="#" class="text-primary hover:underline">${t.auth.privacyPolicy}</a>`
    )

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 flex items-center justify-center p-4">
      {/* Background blur */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-emerald-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-blue-400/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Card className="bg-card/95 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border-0">
          <CardHeader className="text-center space-y-4 p-8 pb-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              {t.auth.systemName}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {t.auth.systemDescription}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 p-8 pt-4">
            {step === "initial" && (
              <>
                <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-700 dark:text-blue-300">
                    {t.auth.loginWithOneId}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="pnfl" className="text-foreground">{t.auth.pnflLabel}</Label>
                  <Input
                    id="pnfl"
                    value={pnfl}
                    onChange={(e) =>
                      setPnfl(
                        e.target.value.replace(/\D/g, "").slice(0, 14)
                      )
                    }
                    maxLength={14}
                    placeholder="31234567890123"
                    className="text-center text-lg tracking-widest font-mono"
                  />
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {pnfl.length}/14 ta raqam kiritildi
                  </p>
                </div>

                <Button
                  className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700"
                  onClick={handlePnflCheck}
                  disabled={pnfl.length !== 14}
                >
                  <Shield className="mr-2 h-5 w-5" />
                  {t.auth.check}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      yoki
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-12 text-base bg-transparent"
                  onClick={() => setStep("oneid_redirect")}
                  disabled={pnfl.length !== 14}
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  OneID orqali kirish
                </Button>

                <p
                  className="text-xs text-muted-foreground text-center leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: termsHtml }}
                />
              </>
            )}

            {step === "checking" && (
              <div className="flex flex-col items-center py-10">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                  <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-blue-100" />
                </div>
                <p className="mt-6 text-muted-foreground font-medium">
                  {t.auth.checking}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ma'lumotlar tekshirilmoqda...
                </p>
              </div>
            )}

            {step === "oneid_redirect" && (
              <>
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    PNFL tasdiqlandi. OneID tizimiga yo'naltirilmoqdasiz.
                  </AlertDescription>
                </Alert>

                <Button
                  className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700"
                  onClick={handleOneIdLogin}
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  {t.auth.loginWithOneId}
                </Button>

                <Button 
                  variant="ghost" 
                  className="w-full" 
                  onClick={resetForm}
                >
                  {t.auth.differentPnfl}
                </Button>
              </>
            )}

            {step === "error" && (
              <>
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error || t.auth.userNotFound}
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button 
                    className="w-full h-12" 
                    onClick={resetForm}
                  >
                    {t.auth.retry}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Muammo davom etsa, administrator bilan bog'laning
                  </p>
                </div>
              </>
            )}

            {step === "success" && (
              <div className="flex flex-col items-center py-10">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <p className="mt-6 text-lg font-semibold text-foreground">
                  {t.auth.success}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Bosh sahifaga yo'naltirilmoqdasiz...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            O'zbekiston Respublikasi Raqamli texnologiyalar vazirligi
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            E-Hokimiyat tizimi v1.0
          </p>
        </div>
      </div>
    </div>
  )
}
