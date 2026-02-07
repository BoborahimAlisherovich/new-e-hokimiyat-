"use client"

import { useTranslation } from "@/lib/i18n/context"
import { ClipboardList, Clock, Loader2, CheckCircle2 } from "lucide-react"

type TaskStatsProps = {
  total: number
  pending: number
  inProgress: number
  completed: number
}

export function TaskStats({ total, pending, inProgress, completed }: TaskStatsProps) {
  const t = useTranslation()
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{t.dashboard.totalTasks}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{total}</p>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg">
            <ClipboardList className="h-5 w-5 text-slate-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{t.task.statuses.NEW}</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pending}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{t.task.statuses.IN_PROGRESS}</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{inProgress}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <Loader2 className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{t.task.statuses.COMPLETED}</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{completed}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
      </div>
    </div>
  )
}
