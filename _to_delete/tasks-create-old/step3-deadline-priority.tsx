"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, X, Zap, TrendingUp, AlertTriangle, Clock } from "lucide-react"
import type { TaskFormData } from "@/app/dashboard/tasks/new/page"
import { useState } from "react"

type Step3Props = {
  data: TaskFormData
  onUpdate: (updates: Partial<TaskFormData>) => void
  onNext: () => void
  onBack: () => void
}

// Smart date presets — reduce typing, just tap!
const DATE_PRESETS = [
  { label: "3 kun", days: 3 },
  { label: "1 hafta", days: 7 },
  { label: "2 hafta", days: 14 },
  { label: "1 oy", days: 30 },
  { label: "3 oy", days: 90 },
]

const PRIORITIES = [
  {
    value: "LOW" as const,
    label: "Past",
    desc: "Oddiy topshiriq",
    icon: TrendingUp,
    color: "border-green-200 bg-green-50 text-green-700",
    activeColor: "border-green-500 bg-green-100 ring-green-500",
    iconColor: "text-green-500",
    dot: "bg-green-500",
  },
  {
    value: "MEDIUM" as const,
    label: "O'rta",
    desc: "Odatiy",
    icon: Clock,
    color: "border-yellow-200 bg-yellow-50 text-yellow-700",
    activeColor: "border-yellow-500 bg-yellow-100 ring-yellow-500",
    iconColor: "text-yellow-500",
    dot: "bg-yellow-500",
  },
  {
    value: "HIGH" as const,
    label: "Yuqori",
    desc: "Muhim",
    icon: TrendingUp,
    color: "border-orange-200 bg-orange-50 text-orange-700",
    activeColor: "border-orange-500 bg-orange-100 ring-orange-500",
    iconColor: "text-orange-500",
    dot: "bg-orange-500",
  },
  {
    value: "URGENT" as const,
    label: "Shoshilinch",
    desc: "Darhol!",
    icon: Zap,
    color: "border-red-200 bg-red-50 text-red-700",
    activeColor: "border-red-500 bg-red-100 ring-red-500",
    iconColor: "text-red-500",
    dot: "bg-red-500",
  },
]

const CONTROL_TYPES = [
  { value: "DAILY", label: "Kunlik" },
  { value: "WEEKLY", label: "Haftalik" },
  { value: "MONTHLY", label: "Oylik" },
  { value: "MILESTONE", label: "Bosqichli" },
  { value: "FINAL", label: "Yakuniy" },
]

export function Step3DeadlinePriority({ data, onUpdate, onNext, onBack }: Step3Props) {
  const [newReportDate, setNewReportDate] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.startDate || !data.endDate) return
    onNext()
  }

  const today = new Date().toISOString().split("T")[0]

  const applyPreset = (days: number) => {
    const start = today
    const end = new Date(Date.now() + days * 86400000).toISOString().split("T")[0]
    onUpdate({ startDate: start, endDate: end })
  }

  const addReportDate = () => {
    if (newReportDate && !data.interimReportDates.includes(newReportDate)) {
      onUpdate({ interimReportDates: [...data.interimReportDates, newReportDate].sort() })
      setNewReportDate("")
    }
  }

  const removeReportDate = (date: string) => {
    onUpdate({ interimReportDates: data.interimReportDates.filter(d => d !== date) })
  }

  const formatDateDisplay = (d: string) => {
    if (!d) return ""
    const dt = new Date(d)
    return dt.toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-xl font-bold text-slate-900">Muddat va ustuvorlik</h2>
        <p className="mt-1 text-sm text-slate-500">Tez-tez bosib tanlang — minimal yozish</p>
      </div>

      <div className="space-y-8">

        {/* === USTUVORLIK (first = most important for mayor) === */}
        <div>
          <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600">
            Ustuvorlik darajasi <span className="text-red-500">*</span>
          </p>
          {/* 2-column grid for big tap targets */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRIORITIES.map(p => {
              const Icon = p.icon
              const isActive = data.priority === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onUpdate({ priority: p.value })}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 py-4 px-2 text-center transition-all duration-200 active:scale-95 ${
                    isActive
                      ? `${p.activeColor} ring-2 ring-offset-1`
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />
                  <span className={`text-sm font-bold ${isActive ? "" : "text-slate-700"}`}>
                    {p.label}
                  </span>
                  <span className="text-[11px] text-slate-400">{p.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* === MUDDAT (Smart presets + manual) === */}
        <div>
          <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600">
            Muddat <span className="text-red-500">*</span>
          </p>

          {/* Quick preset buttons — ONE TAP to set deadline */}
          <div className="mb-4 flex flex-wrap gap-2">
            {DATE_PRESETS.map(p => {
              const endDate = new Date(Date.now() + p.days * 86400000).toISOString().split("T")[0]
              const isActive = data.startDate === today && data.endDate === endDate
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.days)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
                    isActive
                      ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Date inputs side by side */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Boshlanish</label>
              <input
                type="date"
                value={data.startDate}
                onChange={e => onUpdate({ startDate: e.target.value })}
                min={today}
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] font-semibold text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">Tugash</label>
              <input
                type="date"
                value={data.endDate}
                onChange={e => onUpdate({ endDate: e.target.value })}
                min={data.startDate || today}
                className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] font-semibold text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                required
              />
            </div>
          </div>

          {/* Date summary pill */}
          {data.startDate && data.endDate && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              <span>📅</span>
              <span>{formatDateDisplay(data.startDate)} → {formatDateDisplay(data.endDate)}</span>
            </div>
          )}
        </div>

        {/* === NAZORAT TURI === */}
        <div>
          <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600">Nazorat turi</p>
          <div className="flex flex-wrap gap-2">
            {CONTROL_TYPES.map(ct => {
              const isActive = data.controlType === ct.value
              return (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => onUpdate({ controlType: isActive ? "" : ct.value })}
                  className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                    isActive
                      ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {ct.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* === ORALIQ HISOBOT MUDDATLARI (optional, collapsible feel) === */}
        <div>
          <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-slate-600">
            Oraliq hisobotlar
            <span className="ml-2 text-[11px] font-normal normal-case text-slate-400">(ixtiyoriy)</span>
          </p>
          <div className="flex gap-2">
            <input
              type="date"
              value={newReportDate}
              onChange={e => setNewReportDate(e.target.value)}
              min={data.startDate || today}
              max={data.endDate}
              className="flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
            <button
              type="button"
              onClick={addReportDate}
              disabled={!newReportDate}
              className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {data.interimReportDates.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.interimReportDates.map(date => (
                <div
                  key={date}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
                >
                  <span>{formatDateDisplay(date)}</span>
                  <button type="button" onClick={() => removeReportDate(date)} className="text-slate-400 hover:text-red-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-10 flex justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </button>
        <button
          type="submit"
          disabled={!data.startDate || !data.endDate}
          className="flex-1 sm:flex-none sm:min-w-[160px] rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Keyingisi
        </button>
      </div>
    </form>
  )
}
