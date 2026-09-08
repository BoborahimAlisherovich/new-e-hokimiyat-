"use client"

import { Header } from "@/components/layout/header"
import { TaskWizard, AiCreateLink } from "@/components/dashboard/tasks/create/task-wizard"

/**
 * /dashboard/tasks/new — YANGI TOPSHIRIQ
 *
 * Ilgari bu sahifa mock ma'lumotlar ustiga qurilgan 5 qadamli prototip edi
 * va har «Yuborish» bosilganda HTTP 400 qaytarardi (`organization` va
 * `due_date` yuborardi, backend `organizations` va `deadline` kutadi).
 * Endi bitta, ishlaydigan oqim: components/dashboard/tasks/create/task-wizard.tsx
 */
export default function NewTaskPage() {
  return (
    <>
      <Header
        title="Yangi topshiriq"
        description="Topshiriqni to‘ldirib, tashkilotga yuboring"
        actions={<AiCreateLink />}
      />
      <div className="p-4 sm:p-6">
        <TaskWizard />
      </div>
    </>
  )
}
