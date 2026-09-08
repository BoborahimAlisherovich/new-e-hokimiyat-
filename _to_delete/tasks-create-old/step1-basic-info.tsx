"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import type { TaskFormData } from "@/app/dashboard/tasks/new/page"

type Step1Props = {
  data: TaskFormData
  onUpdate: (updates: Partial<TaskFormData>) => void
  onNext: () => void
}

export function Step1BasicInfo({ data, onUpdate, onNext }: Step1Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.title.trim() || !data.description.trim()) {
      alert("Iltimos, barcha majburiy maydonlarni to'ldiring")
      return
    }
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Asosiy ma'lumotlar</h2>
        <p className="mt-1 text-sm text-slate-500">
          Topshiriq nomi, tavsifi va asosiy parametrlarni kiriting
        </p>
      </div>

      <div className="space-y-5">
        {/* Topshiriq nomi */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">
              Topshiriq nomi <span className="text-red-500">*</span>
            </label>
            <span className="text-xs font-medium text-slate-400">
              {data.title.length}/200
            </span>
          </div>
          <input
            type="text"
            value={data.title}
            onChange={(e) => onUpdate({ title: e.target.value.slice(0, 200) })}
            placeholder="Topshiriq nomini kiriting..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-[15px] text-slate-900 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300"
            required
          />
        </div>

        {/* Topshiriq tavsifi */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">
              Topshiriq tavsifi <span className="text-red-500">*</span>
            </label>
            <span className="text-xs font-medium text-slate-400">
              {data.description.length}/3000
            </span>
          </div>
          <textarea
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value.slice(0, 3000) })}
            placeholder="Topshiriq haqida batafsil yozing..."
            rows={5}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-[15px] text-slate-900 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 hover:border-slate-300"
            required
          />
        </div>

        {/* Kategoriya va Taglar (Reference UI bo'yicha yondashuv) */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Topshiriq kategoriyasi */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-slate-700 uppercase tracking-wide">
              Kategoriya <span className="text-red-500">*</span>
            </label>
            <select
              value={data.category}
              onChange={(e) => onUpdate({ category: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-[15px] text-slate-900 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300"
              required
            >
              <option value="">Kategoriyani tanlang</option>
              <option value="INFRASTRUCTURE">Obodonlashtirish</option>
              <option value="EDUCATION">Ta'lim</option>
              <option value="HEALTHCARE">Sog'liqni saqlash</option>
              <option value="CONSTRUCTION">Qurilish</option>
              <option value="OTHER">Boshqa</option>
            </select>
          </div>

          {/* Taglar */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-slate-700 uppercase tracking-wide">
              Taglar
            </label>
            <div className="flex min-h-[50px] flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 hover:border-slate-300">
              <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-600">
                Yo'llar <button type="button" className="ml-1 text-blue-400 hover:text-blue-600">×</button>
              </span>
              <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-600">
                Qurilish <button type="button" className="ml-1 text-blue-400 hover:text-blue-600">×</button>
              </span>
              <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-400 hover:border-blue-500 hover:text-blue-500">
                +
              </button>
            </div>
          </div>
        </div>

        {/* AI Yordamchi Banner */}
        <div className="mt-6 flex items-start justify-between rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              ✨
            </div>
            <div>
              <h4 className="text-sm font-bold text-indigo-900">AI yordamchidan taklif</h4>
              <p className="mt-1 text-sm text-indigo-700/80">
                Topshiriqni yanada aniqroq va tushunarli qilish uchun AI yordamchidan foydalaning.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" className="shrink-0 border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
            ✨ AI bilan yaxshilash
          </Button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-end gap-3 pt-6 mt-8">
        <Button
          type="submit"
          className="h-12 w-full sm:w-auto rounded-xl bg-blue-600 px-8 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-700 hover:shadow-blue-500/40"
        >
          Keyingisi
        </Button>
      </div>
    </form>
  )
}
