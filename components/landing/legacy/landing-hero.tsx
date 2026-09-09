"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"
import { ArrowRight, ChevronDown, Landmark, LogIn, Menu, Send, X } from "lucide-react"

import { cn } from "@/lib/utils"

export const TELEGRAM_BOT = "Xatirchi_Murojaatbot"
export const TELEGRAM_URL = `https://t.me/${TELEGRAM_BOT}`

const NAV = [
  { href: "#qanday", label: "Qanday ishlaydi" },
  { href: "#imkoniyat", label: "Imkoniyatlar" },
  { href: "#murojaat", label: "Murojaat yuborish" },
  { href: "#ishonch", label: "Xavfsizlik" },
]

/**
 * QAHRAMON BO'LIM — AYLANTIRIB OCHILADIGAN SURAT
 *
 * Fon — hokimiyat binosining haqiqiy surati (public/xatirchi-login.png).
 *
 * Yondashuv: surat QUYUQLASHTIRILMAYDI. Butun rasmni qoraytirish
 * binoni ko'rinmas qilib qo'yardi, shuning uchun:
 *   1. `.hero-tint` — juda yengil umumiy tonlash (navbar va pastki
 *      chiziq ostida matn o'qilishi uchun);
 *   2. `.hero-scrim` — faqat MATN turgan tomonga qo'yiladigan gradient
 *      (desktopda chapdan, mobilda pastdan). Rasm markazi ochiq qoladi.
 *
 * Aylantirilganda (useScroll):
 *   - matn yuqoriga siljib so'nadi,
 *   - ikkala parda ham shaffoflashadi,
 *   - surat parallaks bilan siljib, masshtabi 1.0 ga qaytadi
 *     → bino to'liq, to'siqsiz ko'rinadi.
 *
 * Buning uchun bo'lim balandligi ekrandan katta (`h-[120dvh]`), ichida
 * esa `sticky` blok turadi: shu qo'shimcha bo'shliq aylantirish
 * "ochilishi" uchun joy beradi. Tashqi konteynerda `overflow-hidden`
 * BO'LMASLIGI kerak — aks holda `sticky` ishlamaydi.
 */
export function Hero({
  onLogin,
  hasSession = false,
}: {
  onLogin: () => void
  /** Brauzerda amaldagi token bor — «Kirish» o'rniga «Kabinet» ko'rsatiladi */
  hasSession?: boolean
}) {
  const reduce = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const { scrollY } = useScroll()

  // Aylantirish oynasi ~0-560px: shu masofada surat to'liq ochiladi
  const scrimOpacity = useTransform(scrollY, [0, 460], [1, 0])
  const tintOpacity = useTransform(scrollY, [0, 560], [1, 0.28])
  const imageY = useTransform(scrollY, [0, 1100], [0, 150])
  const imageScale = useTransform(scrollY, [0, 700], [1.08, 1.0])
  const contentOpacity = useTransform(scrollY, [0, 340], [1, 0])
  const contentY = useTransform(scrollY, [0, 420], [0, -60])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const fade = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
        }

  /* Harakat kamaytirilgan bo'lsa — hech narsa siljimaydi */
  const scrollStyle = reduce
    ? {}
    : { opacity: contentOpacity, y: contentY }

  return (
    <header className="relative h-[120dvh] lg:h-[145dvh]">
      {/* -------------------------------------------------------- NAVBAR */}
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "glass-strong border-b border-white/10" : "border-b border-transparent",
        )}
        aria-label="Asosiy navigatsiya"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-18 sm:px-6 lg:px-8">
          <a href="#" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d86ff] to-[#2dd4bf] text-[#030b1f]">
              <Landmark className="h-5 w-5" aria-hidden />
            </span>
            <span className="leading-tight [text-shadow:0_1px_10px_rgba(3,11,31,0.55)]">
              <span className="block text-[15px] font-extrabold tracking-tight text-white">
                e-Hokimiyat
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#cfdcf7]">
                Xatirchi tumani
              </span>
            </span>
          </a>

          <div className="mx-auto hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition-colors [text-shadow:0_1px_10px_rgba(3,11,31,0.6)] hover:bg-white/12 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-11 items-center gap-2 rounded-xl border border-white/25 bg-[#030b1f]/45 px-4 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-[#030b1f]/65 sm:inline-flex"
            >
              <Send className="h-4 w-4" aria-hidden />
              Ariza yuborish
            </a>

            <button
              type="button"
              onClick={onLogin}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#0a2050] shadow-[0_10px_30px_-12px_rgba(3,11,31,0.7)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              <span className="hidden min-[400px]:inline">
                {hasSession ? "Kabinetga o‘tish" : "Tizimga kirish"}
              </span>
              <span className="min-[400px]:hidden">
                {hasSession ? "Kabinet" : "Kirish"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Menyu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#030b1f]/45 text-white backdrop-blur-md transition-colors hover:bg-[#030b1f]/65 lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="glass-strong border-t border-white/10 lg:hidden">
            <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex h-12 items-center rounded-lg px-2 text-sm font-medium text-[#cfdcf7] hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* --------------------------------------- YOPISHIB TURADIGAN QATLAM */}
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        {/* Surat — parallaks bilan */}
        <motion.div
          className="absolute inset-0 -z-20"
          style={reduce ? {} : { y: imageY, scale: imageScale }}
        >
          <Image
            src="/xatirchi-login.png"
            alt="Xatirchi tumani hokimligi binosi"
            fill
            priority
            quality={92}
            sizes="100vw"
            className="object-cover object-[center_58%] lg:object-[center_42%]"
          />
        </motion.div>

        {/* Yengil umumiy tonlash */}
        <motion.div
          className="hero-tint absolute inset-0 -z-10"
          style={reduce ? {} : { opacity: tintOpacity }}
          aria-hidden
        />
        {/* Matn ostidagi scrim — aylantirilganda butunlay ketadi */}
        <motion.div
          className="hero-scrim grain absolute inset-0 -z-10"
          style={reduce ? {} : { opacity: scrimOpacity }}
          aria-hidden
        />

        {/* ------------------------------------------------------ KONTENT
            Markaziy kompozitsiya: bino simmetrik, shuning uchun matn ham
            o'rtada — o'q markaziy portal va gerb bilan bir chiziqda. */}
        <motion.div
          style={scrollStyle}
          className="relative mx-auto flex h-[100dvh] max-w-3xl flex-col items-center justify-center px-6 pb-10 pt-20 text-center sm:pb-8 sm:pt-24 lg:max-w-4xl"
        >
          <motion.p
            {...fade(0.05)}
            className="inline-flex items-center gap-2 rounded-full bg-[#030b1f]/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d5e2fb] backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf]" aria-hidden />
            Raqamli hokimiyat platformasi
          </motion.p>

          <motion.h1
            {...fade(0.14)}
            className="mt-6 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-white text-balance [text-shadow:0_2px_34px_rgba(3,11,31,0.8)] sm:mt-7 sm:text-[54px] sm:tracking-[-0.035em] sm:leading-[1.06] lg:text-[68px]"
          >
            Xalq dardi —{" "}
            <span className="text-gradient-sky">davlat e&apos;tiborida.</span>
          </motion.h1>

          <motion.p
            {...fade(0.24)}
            className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-[#dbe6ff] text-pretty [text-shadow:0_1px_18px_rgba(3,11,31,0.9)] sm:mt-6 sm:text-[17px] sm:leading-8"
          >
            Xatirchi tumani aholisining murojaatlari endi bitta aqlli tizimda:
            qabul qilinadi, tegishli tashkilotga yo&apos;naltiriladi, muddati
            nazoratga olinadi va natijasi{" "}
            <strong className="font-semibold text-white">isbot bilan</strong>{" "}
            tasdiqlanadi.
          </motion.p>

          <motion.div
            {...fade(0.34)}
            className="mt-8 flex w-full flex-col items-center gap-3 sm:mt-10 sm:w-auto sm:flex-row"
          >
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#7aa7ff] via-[#4d86ff] to-[#2dd4bf] px-8 text-[15px] font-semibold text-[#030b1f] shadow-[0_20px_60px_-16px_rgba(77,134,255,0.9)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
            >
              <Send className="h-[18px] w-[18px]" aria-hidden />
              Ariza yuborish
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden
              />
            </a>
            <a
              href="#qanday"
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#030b1f]/45 px-7 text-[15px] font-semibold text-white backdrop-blur-md transition-colors duration-300 hover:bg-[#030b1f]/70 sm:w-auto"
            >
              Qanday ishlaydi
              <ChevronDown className="h-4 w-4" aria-hidden />
            </a>
          </motion.div>

          {/* Faktlar — markazda, chegarasiz, faqat nozik ajratgich */}
          <motion.dl
            {...fade(0.46)}
            className="mt-9 grid w-full grid-cols-2 gap-y-5 sm:mt-16 sm:grid-cols-4 sm:gap-y-7"
          >
            {[
              { v: "70", l: "mahalla va qishloq" },
              { v: "20", l: "faoliyat sohasi" },
              { v: "24/7", l: "murojaat qabuli" },
              { v: "3", l: "til: o'zbek, rus, ingliz" },
            ].map((f, i) => (
              <div
                key={f.l}
                className={cn(
                  "px-3 text-center",
                  i > 0 && "sm:border-l sm:border-white/15",
                )}
              >
                <dt className="sr-only">{f.l}</dt>
                <dd>
                  <span className="block text-[24px] font-semibold tracking-tight text-white tabular-nums [text-shadow:0_1px_18px_rgba(3,11,31,0.8)] sm:text-[32px]">
                    {f.v}
                  </span>
                  <span className="mt-1 block text-[11.5px] font-medium leading-5 text-[#bcd0f7] [text-shadow:0_1px_14px_rgba(3,11,31,0.9)]">
                    {f.l}
                  </span>
                </dd>
              </div>
            ))}
          </motion.dl>

          {/* Pastga ishora — «suratni ochish» taklifi */}
          <div
            className="scroll-hint absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
            aria-hidden
          >
            <span className="text-[11px] font-medium tracking-wide text-white/65">
              suratni ochish uchun pastga aylantiring
            </span>
            <span className="flex h-8 w-5 items-start justify-center rounded-full bg-white/15 pt-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
            </span>
          </div>
        </motion.div>
      </div>
    </header>
  )
}
