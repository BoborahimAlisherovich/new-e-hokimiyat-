import { Archive, Calendar, MessageSquare, TrendingUp } from "lucide-react"
import { Stats } from "@/types"

interface AppealStatsProps {
  stats: Stats
}

export function AppealStats({ stats }: AppealStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Jami murojaatlar</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg">
            <MessageSquare className="h-5 w-5 text-slate-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Kutilmoqda</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.pending}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Jarayonda</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.inProgress}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Hal etilgan</p>
            <p className="text-2xl font-bold text-teal-600 mt-1">{stats.resolved}</p>
          </div>
          <div className="p-3 bg-teal-50 rounded-lg">
            <Archive className="h-5 w-5 text-teal-600" />
          </div>
        </div>
      </div>
    </div>
  )
}
