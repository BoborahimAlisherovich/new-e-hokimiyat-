"use client"

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"

import { PremiumStatsGrid, type PremiumStatItem } from "@/components/dashboard/premium-dashboard-ui"

/**
 * Topshiriqlar ko'rsatkichlari.
 *
 * Muhim o'zgarish: ilgari «Bajarildi» soni backend'da BAJARILDI va
 * NAZORATDAN_YECHILDI ni birga qo'shardi — ya'ni hokim nechta ish uning
 * tasdig'ini kutayotganini ko'rishning imkoni yo'q edi. Endi
 * «Tasdiqlashda» alohida plita va u bosiladigan: to'g'ridan-to'g'ri
 * tasdiqlash navbatiga olib boradi.
 */

export type TaskStatsProps = {
  total: number
  pending: number
  inProgress: number
  /** Hisobot topshirilgan, hokim tasdig'ini kutmoqda */
  awaitingApproval: number
  /** Nazoratdan yechilgan (yakunlangan) */
  completed: number
  overdue?: number
  returned?: number
  /** Tasdiqlash navbatiga havola ko'rsatilsinmi (faqat hokim uchun) */
  canApprove?: boolean
}

export function TaskStats({
  total,
  pending,
  inProgress,
  awaitingApproval,
  completed,
  overdue = 0,
  returned = 0,
  canApprove = false,
}: TaskStatsProps) {
  const items: PremiumStatItem[] = [
    {
      label: "Jami topshiriq",
      value: total,
      icon: ClipboardList,
      tone: "neutral",
    },
    {
      label: "Yangi",
      value: pending,
      icon: Loader2,
      tone: "primary",
    },
    {
      label: "Ijroda",
      value: inProgress,
      icon: Loader2,
      tone: "warning",
      hint: returned > 0 ? `${returned} ta qayta ijroda` : undefined,
    },
    {
      label: "Tasdiqlashda",
      value: awaitingApproval,
      icon: ShieldCheck,
      tone: "info",
      hint: awaitingApproval > 0 ? "Hokim tasdig‘ini kutmoqda" : "Navbat bo‘sh",
      href: canApprove && awaitingApproval > 0 ? "/dashboard/tasks/pending-approval" : undefined,
    },
    {
      label: "Nazoratdan yechildi",
      value: completed,
      icon: CheckCircle2,
      tone: "success",
      hint: total > 0 ? `${Math.round((completed / total) * 100)}% yakunlangan` : undefined,
    },
    {
      label: "Muddati kechikkan",
      value: overdue,
      icon: AlertTriangle,
      tone: overdue > 0 ? "danger" : "neutral",
    },
  ]

  return <PremiumStatsGrid items={items} columns={3} />
}

/** Faqat qayta ijroga yuborilganlar uchun kichik plita (kerak bo'lsa) */
export function ReturnedStat({ value }: { value: number }) {
  return (
    <PremiumStatsGrid
      columns={2}
      items={[
        {
          label: "Qayta ijroga yuborilgan",
          value,
          icon: RotateCcw,
          tone: "warning",
        },
      ]}
    />
  )
}
