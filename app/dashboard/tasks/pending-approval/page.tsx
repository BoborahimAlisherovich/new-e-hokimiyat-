"use client"

import { Header } from "@/components/layout/header"
import { ApprovalQueue } from "@/components/dashboard/tasks/approval-queue"

/**
 * /dashboard/tasks/pending-approval — «TASDIQLASHDA»
 *
 * Hokim tasdig'ini kutayotgan bajarilgan topshiriqlar alohida navbat
 * sifatida. TZ talabi: «bajarilgan topshiriq, ya'ni hokimga tasdiqlashda,
 * deb alohida turishi kerak».
 */
export default function PendingApprovalPage() {
  return (
    <>
      <Header
        title="Tasdiqlashda"
        description="Hisobot topshirilgan topshiriqlarni nazoratdan yechish yoki qayta ijroga yuborish"
      />
      <div className="p-4 pb-24 sm:p-6 sm:pb-6">
        <ApprovalQueue />
      </div>
    </>
  )
}
