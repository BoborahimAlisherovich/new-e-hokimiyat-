"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { setAccessToken, setRefreshToken } from "@/lib/api"
import { parseOneIDCallback } from "@/lib/api/oneid"

export default function LoginCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL parametrlarini olish
        const success = searchParams.get('success')
        const access = searchParams.get('access')
        const refresh = searchParams.get('refresh')
        const error = searchParams.get('error')

        if (success === 'true' && access && refresh) {
          // Muvaffaqiyatli login
          setAccessToken(access)
          setRefreshToken(refresh)
          
          // Foydalanuvchi ma'lumotlarini olish
          const userResponse = await fetch('/api/auth/me/', {
            headers: {
              'Authorization': `Bearer ${access}`
            }
          })
          
          if (userResponse.ok) {
            const userData = await userResponse.json()
            if (typeof window !== 'undefined') {
              localStorage.setItem('user', JSON.stringify(userData))
            }
          }
          
          setStatus('success')
          setMessage('Tizimga muvaffaqiyatli kirdingiz!')
          
          // Dashboardga yo'naltirish
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        } else {
          // Xatolik
          setStatus('error')
          setMessage(error || 'Login jarayonida xatolik yuz berdi')
          
          // Login sahifasiga qaytarish
          setTimeout(() => {
            router.push('/login')
          }, 3000)
        }
      } catch (error) {
        console.error('Callback xatolik:', error)
        setStatus('error')
        setMessage('Noma\'lum xatolik yuz berdi')
        
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white/70 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-200/30 p-8 border border-white/60 ring-1 ring-indigo-100/20">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {status === 'loading' && (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-400/30">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              </div>
            )}
            
            {status === 'success' && (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
              </div>
            )}
            
            {status === 'error' && (
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <XCircle className="h-8 w-8 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {status === 'loading' && 'Tekshirilmoqda...'}
              {status === 'success' && 'Muvaffaqiyatli!'}
              {status === 'error' && 'Xatolik yuz berdi'}
            </h1>
            
            <p className="text-gray-600 mb-6">
              {status === 'loading' && 'Iltimos, biroz kuting...'}
              {status === 'success' && message}
              {status === 'error' && message}
            </p>

            {/* Additional Info */}
            {status === 'error' && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-amber-700">
                  Avtomatik ravishda login sahifasiga yo'naltirilasiz...
                </p>
              </div>
            )}
            
            {status === 'success' && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 mb-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-sm text-emerald-700">
                  Dashboardga yo'naltirilmoqda...
                </p>
              </div>
            )}
          </div>

          {/* Manual Redirect Buttons */}
          <div className="mt-6 space-y-3">
            {status === 'error' && (
              <button
                onClick={() => router.push('/login')}
                className="w-full h-12 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white rounded-xl shadow-lg transition-all duration-300 font-medium"
              >
                Login sahifasiga qaytish
              </button>
            )}
            
            {status === 'success' && (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-lg transition-all duration-300 font-medium"
              >
                Dashboardga o'tish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
