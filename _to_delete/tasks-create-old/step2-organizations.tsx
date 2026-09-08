"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2, Check, User, Users } from "lucide-react"
import type { TaskFormData } from "@/app/dashboard/tasks/new/page"

type Step2Props = {
  data: TaskFormData
  onUpdate: (updates: Partial<TaskFormData>) => void
  onNext: () => void
  onBack: () => void
}

// Mock data — replace with API calls
const ORGANIZATIONS = [
  { id: "1", name: "Maktab bo'limi", short: "MB", color: "bg-blue-500" },
  { id: "2", name: "Sog'liqni saqlash bo'limi", short: "SS", color: "bg-green-500" },
  { id: "3", name: "Obodonlashtirish boshqarmasi", short: "OB", color: "bg-orange-500" },
  { id: "4", name: "Elektr tarmoqlari", short: "ET", color: "bg-yellow-500" },
  { id: "5", name: "Qurilish bo'limi", short: "QB", color: "bg-purple-500" },
  { id: "6", name: "Suv ta'minoti bo'limi", short: "ST", color: "bg-cyan-500" },
  { id: "7", name: "IIB", short: "IIB", color: "bg-red-500" },
  { id: "8", name: "Soliq inspeksiyasi", short: "SI", color: "bg-slate-500" },
]

const EMPLOYEES = [
  { id: "e1", name: "Olimov Jasur", position: "Bosh mutaxassis", avatar: "OJ" },
  { id: "e2", name: "Karimova Dilnoza", position: "Bo'lim boshlig'i", avatar: "KD" },
  { id: "e3", name: "Rahmonov Sardor", position: "Mutaxassis", avatar: "RS" },
  { id: "e4", name: "Toshmatov Alisher", position: "Katta mutaxassis", avatar: "TA" },
]

export function Step2Organizations({ data, onUpdate, onNext, onBack }: Step2Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.primaryOrganization) {
      return
    }
    onNext()
  }

  const handlePartnerToggle = (orgId: string) => {
    if (orgId === data.primaryOrganization) return
    const current = data.partnerOrganizations || []
    if (current.includes(orgId)) {
      onUpdate({ partnerOrganizations: current.filter(id => id !== orgId) })
    } else {
      onUpdate({ partnerOrganizations: [...current, orgId] })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-xl font-bold text-slate-900">Mas'ul tashkilotlar</h2>
        <p className="mt-1 text-sm text-slate-500">Asosiy va hamkor tashkilotlarni belgilang</p>
      </div>

      <div className="space-y-7">
        {/* === ASOSIY MAS'UL TASHKILOT === */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span className="text-[13px] font-bold uppercase tracking-wide text-slate-600">
              Asosiy mas'ul tashkilot <span className="text-red-500">*</span>
            </span>
          </div>

          {/* Tap-to-select grid — big touch targets */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {ORGANIZATIONS.map(org => {
              const isSelected = data.primaryOrganization === org.id
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => onUpdate({ primaryOrganization: org.id })}
                  className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition-all duration-200 active:scale-95 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-sm shadow-blue-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {/* Avatar circle */}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${org.color}`}>
                    {org.short}
                  </div>
                  <span className={`text-[12px] font-medium leading-tight ${isSelected ? "text-blue-700" : "text-slate-700"}`}>
                    {org.name}
                  </span>
                  {/* Check badge */}
                  {isSelected && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* === HAMKOR TASHKILOTLAR === */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-[13px] font-bold uppercase tracking-wide text-slate-600">
              Hamkor tashkilotlar
            </span>
            {data.partnerOrganizations.length > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                {data.partnerOrganizations.length} ta
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {ORGANIZATIONS.filter(o => o.id !== data.primaryOrganization).map(org => {
              const isPartner = data.partnerOrganizations?.includes(org.id)
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handlePartnerToggle(org.id)}
                  className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center transition-all duration-200 active:scale-95 ${
                    isPartner
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${org.color} ${isPartner ? "opacity-100" : "opacity-60"}`}>
                    {org.short}
                  </div>
                  <span className={`text-[12px] font-medium leading-tight ${isPartner ? "text-indigo-700" : "text-slate-600"}`}>
                    {org.name}
                  </span>
                  {isPartner && (
                    <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* === MAS'UL XODIM === */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            <span className="text-[13px] font-bold uppercase tracking-wide text-slate-600">
              Mas'ul xodim
            </span>
          </div>
          <div className="space-y-2">
            {EMPLOYEES.map(emp => {
              const isSelected = data.responsibleEmployee === emp.id
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => onUpdate({ responsibleEmployee: emp.id })}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-200 active:scale-[0.99] ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {emp.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isSelected ? "text-blue-800" : "text-slate-800"}`}>
                      {emp.name}
                    </p>
                    <p className="text-xs text-slate-500">{emp.position}</p>
                  </div>
                  {isSelected && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
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
          disabled={!data.primaryOrganization}
          className="flex-1 sm:flex-none sm:min-w-[160px] rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Keyingisi
        </button>
      </div>
    </form>
  )
}
