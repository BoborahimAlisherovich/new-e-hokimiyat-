"use client"

import { useTranslation } from "@/lib/i18n/context"

export default function EmptyState() {
  const t = useTranslation()
  return (
    <div className="flex items-center justify-center py-8 text-slate-600">
      {t.common.noData}
    </div>
  )
}
