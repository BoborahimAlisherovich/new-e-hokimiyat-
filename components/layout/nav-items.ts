import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Bell,
  CalendarDays,
  ShieldCheck,
  Bot,
  Building2,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  Map,
  MessageSquare,
  Repeat,
  Settings,
  Sparkles,
  Users,
} from "lucide-react"

import type { Translations } from "@/lib/i18n/types"
import type { UserRole } from "@/types"

/**
 * NAVIGATSIYA — YAGONA MANBA (sidebar + mobil pastki panel)
 *
 * Tuzatilgan muammolar:
 *  1. «Bildirishnomalar» sidebar'da UMUMAN yo'q edi — sahifa, `[id]`
 *     sahifasi va `loading.tsx` mavjud, marshrut barcha rollarda ruxsat
 *     etilgan, tarjimasi to'rt tilda bor, lekin `allNavItems` ro'yxatiga
 *     kiritilmagan. Telefonda esa qo'ng'iroq belgisi `md:` dan pastda
 *     yashirilgan, ya'ni butun modulga kirish nuqtasi qolmagan.
 *  2. «Sozlamalar» ro'yxatdan tashqarida, futerda qotib qolgan edi:
 *     faol holati yo'q, rol filtri yo'q.
 *  3. «AI yordamchi» va «Telegram bot» "Tahlil" bo'limiga tiqilgan edi.
 *  4. «main» bo'limi operativ ish (Topshiriqlar, Loyihalar) bilan
 *     administratsiyani (Foydalanuvchilar, Tashkilotlar) aralashtirardi.
 *  5. `adminOnly` bayrog'i o'rnatilgan, lekin filtr uni HECH QACHON
 *     o'qimasdi — o'lik metama'lumot. Endi `requiresRole` bilan
 *     birlashtirildi va haqiqatan tekshiriladi.
 *  6. «Chat» `compact` ko'rinishida — 34px balandlik va 11px matn bilan
 *     eng ko'p ishlatiladigan bo'lim vizual jihatdan pastga tushirilgan
 *     edi. Endi barcha bandlar bir xil.
 */

export type NavSection = "operations" | "communication" | "analytics" | "administration"

export interface NavItem {
  href: string
  labelKey: keyof Translations["navigation"]
  icon: LucideIcon
  section: NavSection
  /** Faqat shu rollarga ko'rinadi (bo'sh — hammaga, marshrut ruxsatiga qarab) */
  requiresRole?: UserRole[]
  /** O'qilmaganlar nishoni qaysi hisobdan olinadi */
  badge?: "chat" | "appeals" | "notifications"
}

export const NAV_ITEMS: NavItem[] = [
  // ----------------------------------------------------------- IJRO
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard, section: "operations" },
  { href: "/dashboard/tasks", labelKey: "tasks", icon: ClipboardList, section: "operations" },
  {
    href: "/dashboard/recurring-tasks",
    labelKey: "recurringTasks",
    icon: Repeat,
    section: "operations",
  },
  {
    href: "/dashboard/calendar",
    labelKey: "calendar",
    icon: CalendarDays,
    section: "operations",
  },
  {
    href: "/dashboard/appeals",
    labelKey: "appeals",
    icon: MessageSquare,
    section: "operations",
    badge: "appeals",
  },
  { href: "/dashboard/projects", labelKey: "projects", icon: FolderKanban, section: "operations" },

  // ----------------------------------------------------------- ALOQA
  {
    href: "/dashboard/chat",
    labelKey: "chat",
    icon: MessageSquare,
    section: "communication",
    badge: "chat",
  },
  {
    href: "/dashboard/notifications",
    labelKey: "notifications",
    icon: Bell,
    section: "communication",
    badge: "notifications",
  },

  // ----------------------------------------------------------- TAHLIL
  { href: "/dashboard/analytics", labelKey: "analytics", icon: BarChart3, section: "analytics" },
  { href: "/dashboard/map", labelKey: "map", icon: Map, section: "analytics" },
  {
    href: "/dashboard/ai-assistant",
    labelKey: "aiAssistant",
    icon: Sparkles,
    section: "analytics",
    requiresRole: ["HOKIM", "HOKIM_YORDAMCHISI", "ADMIN"],
  },

  // ------------------------------------------------- ADMINISTRATSIYA
  {
    href: "/dashboard/users",
    labelKey: "users",
    icon: Users,
    section: "administration",
    requiresRole: ["HOKIM", "HOKIM_YORDAMCHISI", "HOKIMLIK_MASUL", "TASHKILOT_RAHBARI", "ADMIN"],
  },
  {
    href: "/dashboard/organizations",
    labelKey: "organizations",
    icon: Building2,
    section: "administration",
    requiresRole: ["HOKIM", "HOKIM_YORDAMCHISI", "HOKIMLIK_MASUL", "ADMIN"],
  },
  {
    href: "/dashboard/telegram-bot",
    labelKey: "telegramBot",
    icon: Bot,
    section: "administration",
    requiresRole: ["HOKIM", "HOKIM_YORDAMCHISI", "ADMIN"],
  },
  { href: "/dashboard/settings", labelKey: "settings", icon: Settings, section: "administration" },
]

export const NAV_SECTIONS: { key: NavSection; labelKey: keyof Translations["navigation"] }[] = [
  { key: "operations", labelKey: "operationsSection" },
  { key: "communication", labelKey: "communicationSection" },
  { key: "analytics", labelKey: "analyticsSection" },
  { key: "administration", labelKey: "administrationSection" },
]

/**
 * YON MENYU TARTIBI (Frappe/ERPNext uslubi)
 *
 * Uppercase bo'lim yorliqlari o'rniga uch qavat:
 *   flat   — asosiy ish bandlari, tekis ro'yxat (Bildirishnomalar bu yerda
 *            yo'q: u tepadagi tezkor amallar qatorida, Qidiruv yonida);
 *   groups — ochiladigan guruhlar (chevron bilan), ichidagi bandlar
 *            chapdan surilgan;
 *   tail   — eng pastda alohida turadigan bandlar (Sozlamalar).
 *
 * Bu faqat TARTIB: qaysi band ko'rinishi hali ham NAV_ITEMS dagi
 * `requiresRole` va marshrut ruxsati bilan hal qilinadi — sidebar shu
 * ro'yxatlardan faqat ruxsat etilganlarini oladi.
 */
export interface SidebarGroup {
  key: string
  labelKey: keyof Translations["navigation"]
  icon: LucideIcon
  hrefs: readonly string[]
}

export const SIDEBAR_LAYOUT: {
  flat: readonly string[]
  groups: readonly SidebarGroup[]
  tail: readonly string[]
} = {
  flat: [
    "/dashboard",
    "/dashboard/tasks",
    "/dashboard/calendar",
    "/dashboard/recurring-tasks",
    "/dashboard/appeals",
    "/dashboard/projects",
    "/dashboard/chat",
  ],
  groups: [
    {
      key: "analytics",
      labelKey: "analyticsSection",
      icon: BarChart3,
      hrefs: ["/dashboard/analytics", "/dashboard/map", "/dashboard/ai-assistant"],
    },
    {
      key: "administration",
      labelKey: "administrationSection",
      icon: ShieldCheck,
      hrefs: ["/dashboard/users", "/dashboard/organizations", "/dashboard/telegram-bot"],
    },
  ],
  tail: ["/dashboard/settings"],
}

/**
 * Mobil pastki panel — beshta eng ko'p ishlatiladigan yo'nalish.
 * Telefonda sidebar drawer ortida, shuning uchun asosiy bo'limlar
 * doim ko'rinib turishi kerak.
 */
export const BOTTOM_NAV_HREFS = [
  "/dashboard",
  "/dashboard/tasks",
  "/dashboard/appeals",
  "/dashboard/chat",
  "/dashboard/notifications",
] as const

/** Eng aniq mos keladigan bandni topadi (`/dashboard` faqat aynan mos) */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}
