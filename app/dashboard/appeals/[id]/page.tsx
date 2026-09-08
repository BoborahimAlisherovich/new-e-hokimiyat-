"use client"

import { useParams } from "next/navigation"
import TelegramAppealDetail from "./telegram-detail"

export default function AppealDetailPage() {
  const params = useParams()
  const id = params.id as string

  // Telegram appeal uchun yangi komponent
  return <TelegramAppealDetail appealId={id} />
}
