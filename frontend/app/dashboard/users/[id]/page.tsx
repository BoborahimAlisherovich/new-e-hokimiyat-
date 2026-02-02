"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Mail, Phone, Building2, Calendar, Shield, Edit } from "lucide-react"
import { getUserById } from "@/lib/api"
import { useParams } from "next/navigation"
import { useState, useEffect } from "react"

export default function UserDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getUserById(id)
      .then((data) => {
        if (!mounted) return
        setUser(data)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [id])

  if (loading) {
    return (
      <>
        <Header title="Foydalanuvchi ma'lumotlari" description="Foydalanuvchi tafsilotlari" />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Yuklanmoqda...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Header title="Foydalanuvchi topilmadi" description="Foydalanuvchi ma'lumotlari topilmadi" />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg text-muted-foreground">Foydalanuvchi topilmadi</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Foydalanuvchi ma'lumotlari" description={`${user.firstName} ${user.lastName} - Foydalanuvchi tafsilotlari`} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Back Button */}
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Orqaga qaytish
              </Button>
            </div>

            {/* User Info Card */}
            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {user.firstName} {user.lastName} {user.middleName}
                      </h2>
                      <p className="text-muted-foreground">{user.position}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>Email</span>
                        </div>
                        <p className="text-foreground">{user.email}</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>Telefon</span>
                        </div>
                        <p className="text-foreground">{user.phone}</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>ПНФЛ</span>
                        </div>
                        <p className="text-foreground">{user.pnfl}</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>Tashkilot</span>
                        </div>
                        <p className="text-foreground">{user.organization?.name || 'Tashkilot belgilanmagan'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                      <Badge className="bg-primary/10 text-primary px-3 py-1">
                        {user.role}
                      </Badge>
                      <Badge className={user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                        {user.status === 'ACTIVE' ? 'Aktiv' : 'Nofaol'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Button className="flex-1">
                    <Edit className="h-4 w-4 mr-2" />
                    Tahrirlash
                  </Button>
                  <Button variant="outline">
                    <Shield className="h-4 w-4 mr-2" />
                    Xavfsizlik
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
