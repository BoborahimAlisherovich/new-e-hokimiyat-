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
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
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
