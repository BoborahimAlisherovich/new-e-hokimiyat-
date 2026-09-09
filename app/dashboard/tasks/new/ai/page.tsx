"use client"

import Link from "next/link"
import { Pencil } from "lucide-react"

import { Header } from "@/components/layout/header"
import { AiTaskCreator } from "@/components/dashboard/tasks/create/ai-task-creator"

/**
 * /dashboard/tasks/new/ai — AI ORQALI TOPSHIRIQ YARATISH
 *
 * AI faqat taklif qiladi: yaratish tugmasi formani to'ldirilgan holda
 * ochadi, topshiriq esa odam tasdiqlagandan keyin yuboriladi.
 *
 * Tugma chegarasiz: sirt kontrasti va yumshoq soya bilan ajratiladi —
 * saytning qolgan qismidagi kabi.
 */
export default function AiNewTaskPage() {
  return (
    <>
      <Header
        title="AI orqali topshiriq yaratish"
        description="Ovoz bilan aytib bering — AI maydonlarni to‘ldiradi"
        actions={
          <Link
            href="/dashboard/tasks/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-card px-4 text-sm font-semibold text-foreground shadow-[0_1px_2px_rgba(13,21,36,0.04),0_8px_24px_-14px_rgba(13,21,36,0.16)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Qo‘lda to‘ldirish
          </Link>
        }
      />
      <div className="p-4 sm:p-6">
        <AiTaskCreator />
      </div>
    </>
  )
}
