import { AlertCircle, Building, Shield, UserCheck } from "lucide-react"

interface UserStatsProps {
  total: number
  active: number
  inactive: number
  organizations: number
}

export function UserStats({ total, active, inactive, organizations }: UserStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Jami foydalanuvchilar</p>
            <p className="text-2xl font-semibold text-slate-800">{total}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-100">
            <UserCheck className="h-5 w-5 text-slate-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Faol foydalanuvchilar</p>
            <p className="text-2xl font-semibold text-emerald-600">{active}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50">
            <Shield className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Nofaol foydalanuvchilar</p>
            <p className="text-2xl font-semibold text-red-600">{inactive}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Tashkilotlar</p>
            <p className="text-2xl font-semibold text-blue-600">{organizations}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50">
            <Building className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  )
}
