"use client"

import {
  ArrowLeft, CheckCircle2, FileText, Building2, Calendar,
  Flag, Users, Paperclip, Loader2, AlertCircle
} from "lucide-react"
import type { TaskFormData } from "@/app/dashboard/tasks/new/page"

type Step5Props = {
  data: TaskFormData
  onBack: () => void
  onSaveDraft: () => void
  onSubmit: () => void
  isSubmitting: boolean
}

const PRIORITY_CONFIG = {
  LOW:    { label: "Past",        bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500" },
  MEDIUM: { label: "O'rta",       bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  HIGH:   { label: "Yuqori",      bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  URGENT: { label: "Shoshilinch", bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500" },
}

const CATEGORY_LABELS: Record<string, string> = {
  INFRASTRUCTURE: "Obodonlashtirish",
  EDUCATION: "Ta'lim",
  HEALTHCARE: "Sog'liqni saqlash",
  CONSTRUCTION: "Qurilish",
  OTHER: "Boshqa",
}

const ORG_NAMES: Record<string, string> = {
  "1": "Maktab bo'limi",
  "2": "Sog'liqni saqlash bo'limi",
  "3": "Obodonlashtirish boshqarmasi",
  "4": "Elektr tarmoqlari",
  "5": "Qurilish bo'limi",
  "6": "Suv ta'minoti bo'limi",
  "7": "IIB",
  "8": "Soliq inspeksiyasi",
}

const EMP_NAMES: Record<string, string> = {
  "e1": "Olimov Jasur",
  "e2": "Karimova Dilnoza",
  "e3": "Rahmonov Sardor",
  "e4": "Toshmatov Alisher",
}

export function Step5Confirm({ data, onBack, onSaveDraft, onSubmit, isSubmitting }: Step5Props) {
  const priority = PRIORITY_CONFIG[data.priority]

  const formatDate = (d: string) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" })
  }

  // Completeness check
  const checks = [
    { ok: !!data.title.trim(),          label: "Topshiriq nomi" },
    { ok: !!data.description.trim(),    label: "Tavsif" },
    { ok: !!data.primaryOrganization,   label: "Asosiy tashkilot" },
    { ok: !!data.startDate,             label: "Boshlanish sanasi" },
    { ok: !!data.endDate,               label: "Yakuniy muddat" },
  ]
  const allOk = checks.every(c => c.ok)

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="mb-7">
        <h2 className="text-xl font-bold text-slate-900">Tasdiqlash</h2>
        <p className="mt-1 text-sm text-slate-500">
          Barcha ma'lumotlarni ko'rib chiqing
        </p>
      </div>

      {/* Completeness warning */}
      {!allOk && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-bold text-amber-800">Ba'zi maydonlar to'ldirilmagan</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {checks.filter(c => !c.ok).map(c => (
                <span key={c.label} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="space-y-3">

        {/* ─── Asosiy ma'lumotlar ─── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <FileText className="h-4 w-4 text-blue-500" />
            <span className="text-[13px] font-bold uppercase tracking-wide text-slate-500">Asosiy ma'lumotlar</span>
          </div>
          <div className="divide-y divide-slate-100">
            <SummaryRow label="Topshiriq nomi">
              <span className="font-semibold text-slate-900">{data.title || <Empty />}</span>
            </SummaryRow>
            <SummaryRow label="Tavsif">
              <span className="text-slate-700 line-clamp-3">{data.description || <Empty />}</span>
            </SummaryRow>
            {data.category && (
              <SummaryRow label="Kategoriya">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  {CATEGORY_LABELS[data.category] || data.category}
                </span>
              </SummaryRow>
            )}
          </div>
        </div>

        {/* ─── Tashkilotlar ─── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <Building2 className="h-4 w-4 text-indigo-500" />
            <span className="text-[13px] font-bold uppercase tracking-wide text-slate-500">Tashkilotlar</span>
          </div>
          <div className="divide-y divide-slate-100">
            <SummaryRow label="Asosiy mas'ul">
              <span className="font-semibold text-slate-900">
                {ORG_NAMES[data.primaryOrganization] || <Empty />}
              </span>
            </SummaryRow>
            {data.partnerOrganizations.length > 0 && (
              <SummaryRow label="Hamkorlar">
                <div className="flex flex-wrap gap-1.5">
                  {data.partnerOrganizations.map(id => (
                    <span key={id} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      {ORG_NAMES[id] || id}
                    </span>
                  ))}
                </div>
              </SummaryRow>
            )}
            {data.responsibleEmployee && (
              <SummaryRow label="Mas'ul xodim">
                <span className="text-slate-700">{EMP_NAMES[data.responsibleEmployee] || data.responsibleEmployee}</span>
              </SummaryRow>
            )}
          </div>
        </div>

        {/* ─── Muddat ─── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
            <Calendar className="h-4 w-4 text-amber-500" />
            <span className="text-[13px] font-bold uppercase tracking-wide text-slate-500">Muddat va ustuvorlik</span>
          </div>
          <div className="divide-y divide-slate-100">
            <SummaryRow label="Muddat">
              <span className="font-semibold text-slate-900">
                {data.startDate && data.endDate
                  ? `${formatDate(data.startDate)} → ${formatDate(data.endDate)}`
                  : <Empty />}
              </span>
            </SummaryRow>
            <SummaryRow label="Ustuvorlik">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${priority.bg} ${priority.text}`}>
                <span className={`h-2 w-2 rounded-full ${priority.dot}`} />
                {priority.label}
              </span>
            </SummaryRow>
            {data.controlType && (
              <SummaryRow label="Nazorat">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  {data.controlType}
                </span>
              </SummaryRow>
            )}
          </div>
        </div>

        {/* ─── Fayllar ─── */}
        {(data.files.length > 0 || data.additionalNotes) && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
              <Paperclip className="h-4 w-4 text-violet-500" />
              <span className="text-[13px] font-bold uppercase tracking-wide text-slate-500">Qo'shimcha</span>
            </div>
            <div className="divide-y divide-slate-100">
              {data.files.length > 0 && (
                <SummaryRow label="Fayllar">
                  <span className="font-semibold text-slate-700">{data.files.length} ta fayl</span>
                </SummaryRow>
              )}
              {data.additionalNotes && (
                <SummaryRow label="Izoh">
                  <span className="text-slate-700">{data.additionalNotes}</span>
                </SummaryRow>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── ACTION BUTTONS ─── */}
      {/* Prominent, easy to tap, clear visual hierarchy */}
      <div className="mt-8 space-y-3">
        {/* Primary: SUBMIT — biggest, most prominent */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !allOk}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Yuborilmoqda...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span>Topshiriqni yuborish</span>
            </>
          )}
        </button>

        {/* Secondary row: back + draft */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border-2 border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Qoralama saqlash
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-full shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:w-36">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function Empty() {
  return <span className="italic text-slate-300">Kiritilmagan</span>
}
