import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, Building, Shield, UserCheck } from "lucide-react"

interface UserStatsProps {
  total: number
  active: number
  inactive: number
  organizations: number
}

export function UserStats({ total, active, inactive, organizations }: UserStatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Jami foydalanuvchilar</p>
              <p className="text-2xl font-bold text-slate-900">{total}</p>
            </div>
            <UserCheck className="h-8 w-8 text-slate-500" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Faol foydalanuvchilar</p>
              <p className="text-2xl font-bold text-green-600">{active}</p>
            </div>
            <Shield className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Nofaol foydalanuvchilar</p>
              <p className="text-2xl font-bold text-red-600">{inactive}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/95 backdrop-blur-xl border-slate-200 shadow-lg rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Tashkilotlar</p>
              <p className="text-2xl font-bold text-blue-600">{organizations}</p>
            </div>
            <Building className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
