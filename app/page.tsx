import type { Metadata } from "next"

import EHokimiyatLanding from "@/components/landing/e-hokimiyat-landing"

/**
 * / — OMMAVIY SAHIFA
 *
 * Ilgari bu fayl `redirect("/dashboard")` dan iborat edi: saytning
 * ommaviy yuzi bo'lmagan, fuqaro esa to'g'ridan-to'g'ri login ekraniga
 * tushib qolardi. Endi ildiz manzil landing sahifani ko'rsatadi.
 *
 * Landing butunlay bitta faylda: `components/landing/e-hokimiyat-landing.tsx`.
 */

export const metadata: Metadata = {
  title: "Xalq dardi – davlat e'tiborida",
  description:
    "Xatirchi tumani hokimligining raqamli platformasi. Murojaatingizni Telegram bot orqali yuboring: raqam oladi, mas'ul tashkilotga yo'naltiriladi, muddati nazoratga olinadi va natijasi isbot bilan tasdiqlanadi.",
  keywords: [
    "Xatirchi tumani",
    "hokimlik",
    "murojaat",
    "ariza yuborish",
    "e-hokimiyat",
    "Navoiy viloyati",
  ],
  openGraph: {
    title: "e-Hokimiyat — Xatirchi tumani",
    description:
      "Murojaatlar bitta aqlli tizimda: qabul, yo'naltirish, muddat nazorati va isbot bilan tasdiqlash.",
    type: "website",
    locale: "uz_UZ",
    images: [{ url: "/xatirchi-login.png", width: 1024, height: 1024 }],
  },
}

export default function HomePage() {
  return <EHokimiyatLanding />
}
