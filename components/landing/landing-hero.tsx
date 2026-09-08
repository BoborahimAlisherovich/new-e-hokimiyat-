"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Landmark,
  LogIn,
  Menu,
  Send,
  ShieldCheck,
  X,
} from "lucide-react"

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
 * QAHRAMON BO'LIM
 *
 * Fon — hokimiyat binosining haqiqiy surati (public/xatirchi-login.png,
 * 1024x1024). Surat kunduzgi va pastki qismi juda yorqin, shuning uchun
 * matn o'qilishi `.hero-veil` dagi uch qatlamli gradient bilan
 * ta'minlanadi (chapdan quyuq, pastdan quyuq, o'ngdan yengil).
 *
 * Ustidagi barcha oq matn kontrasti >= 4.5:1 — gradientning eng yengil
 * joyida ham matn joylashmaydi.
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

  return (
    <header className="relative isolate min-h-[100dvh] overflow-hidden">
      {/* ------------------------------------------------------------ FON */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/xatirchi-login.png"
          alt="Xatirchi tumani hokimligi binosi"
          fill
          priority
          quality={92}
          sizes="100vw"
          className="scale-[1.06] object-cover object-[center_60%] lg:object-[center_38%]"
          // Mobilda kadr pastroqdan olinadi: rasm 1:1 va tepasi ochiq osmon,
          // shuning uchun telefonda bino ekranning yuqori qismini to'ldiradi.
        />
      </div>
      <div className="hero-veil grain absolute inset-0 -z-10" aria-hidden />

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
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight text-white">
                e-Hokimiyat
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a9bde4]">
                Xatirchi tumani
              </span>
            </span>
          </a>

          <div className="mx-auto hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#cfdcf7] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
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
              className="hidden h-11 items-center gap-2 rounded-xl border border-white/18 bg-white/[0.07] px-4 text-sm font-semibold text-white transition-colors hover:bg-white/[0.13] sm:inline-flex"
            >
              <Send className="h-4 w-4" aria-hidden />
              Ariza yuborish
            </a>

            <button
              type="button"
              onClick={onLogin}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#0a2050] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10 lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobil menyu */}
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

      {/* ------------------------------------------------------- KONTENT */}
      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-end px-4 pb-10 pt-28 sm:px-6 sm:pb-14 lg:px-8 lg:pb-20">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          {/* Chap: sarlavha */}
          <div className="max-w-2xl">
            <motion.p
              {...fade(0.05)}
              className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#bcd0f7]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf]" aria-hidden />
              Raqamli hokimiyat platformasi
            </motion.p>

            <motion.h1
              {...fade(0.14)}
              className="mt-5 text-4xl font-extrabold leading-[1.06] tracking-[-0.03em] text-white text-balance sm:text-5xl lg:text-[64px]"
            >
              Xalq dardi —{" "}
              <span className="text-gradient-sky">davlat e&apos;tiborida.</span>
            </motion.h1>

            <motion.p
              {...fade(0.24)}
              className="mt-5 max-w-xl text-[15px] leading-7 text-[#c3d3f2] sm:text-base sm:leading-8"
            >
              Xatirchi tumani aholisining murojaatlari endi bitta aqlli tizimda:
              qabul qilinadi, tegishli tashkilotga yo&apos;naltiriladi, muddati
              nazoratga olinadi va natijasi <strong className="font-semibold text-white">isbot bilan</strong> tasdiqlanadi.
            </motion.p>

            <motion.div {...fade(0.34)} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#7aa7ff] via-[#4d86ff] to-[#2dd4bf] px-6 text-[15px] font-bold text-[#030b1f] shadow-[0_18px_50px_-16px_rgba(77,134,255,0.7)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Send className="h-[18px] w-[18px]" aria-hidden />
                Ariza yuborish
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </a>
              <a
                href="#qanday"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.06] px-6 text-[15px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]"
              >
                Qanday ishlaydi
                <ChevronDown className="h-4 w-4" aria-hidden />
              </a>
            </motion.div>
          </div>

          {/* O'ng: shisha karta — murojaat yo'li (NAMUNA) */}
          <motion.aside
            {...fade(0.44)}
            className="glass-strong hidden rounded-3xl p-5 lg:block"
            aria-label="Murojaat yo‘li namunasi"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#bcd0f7]">
                Murojaat yo&apos;li
              </p>
              <span className="rounded-md bg-white/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#cfdcf7]">
                namuna
              </span>
            </div>

            <p className="mt-3 font-mono text-[13px] font-semibold text-white">
              № XT-2026-000412
            </p>
            <p className="mt-1 text-xs leading-5 text-[#a9bde4]">
              «Buğirdoq MFY — ko&apos;cha yorug&apos;ligi ishlamaydi»
            </p>

            <ol className="mt-4 space-y-3">
              {[
                { t: "Qabul qilindi", s: "Telegram bot · 09:14", done: true },
                { t: "Sohaga yo'naltirildi", s: "Energetika · 09:15", done: true },
                { t: "Ijroda", s: "Tuman elektr tarmoqlari", done: true },
                { t: "Isbot yuklandi", s: "3 foto · tasdiq kutilmoqda", done: false },
              ].map((step, i) => (
                <li key={step.t} className="flex gap-3">
                  <span className="relative flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full",
                        step.done ? "bg-[#2dd4bf]" : "border-2 border-[#4d86ff] bg-transparent",
                      )}
                    >
                      {step.done && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#03231f]" aria-hidden />
                      )}
                    </span>
                    {i < 3 && <span className="mt-1 h-5 w-px bg-white/20" aria-hidden />}
                  </span>
                  <span className="min-w-0 pb-0.5">
                    <span className="block text-[13px] font-semibold text-white">{step.t}</span>
                    <span className="block text-[11px] text-[#93a9d6]">{step.s}</span>
                  </span>
                </li>
              ))}
            </ol>

            <p className="mt-4 flex items-start gap-1.5 border-t border-white/12 pt-3 text-[11px] leading-5 text-[#93a9d6]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2dd4bf]" aria-hidden />
              Har bir bosqich vaqti bilan yozib boriladi — jarayon tarixi
              o&apos;chirilmaydi.
            </p>
          </motion.aside>
        </div>

        {/* Faktlar chizig'i */}
        <motion.dl
          {...fade(0.54)}
          className="glass-strong mt-10 grid grid-cols-2 divide-white/12 rounded-2xl sm:mt-12 sm:grid-cols-4 sm:divide-x"
        >
          {[
            { v: "70", l: "mahalla va qishloq" },
            { v: "20", l: "faoliyat sohasi" },
            { v: "24/7", l: "murojaat qabuli" },
            { v: "3", l: "til: o'zbek, rus, ingliz" },
          ].map((f) => (
            <div key={f.l} className="px-4 py-4 text-center sm:px-5">
              <dt className="sr-only">{f.l}</dt>
              <dd>
                <span className="block text-2xl font-extrabold tracking-tight text-white tabular-nums sm:text-3xl">
                  {f.v}
                </span>
                <span className="mt-0.5 block text-[11px] font-medium leading-4 text-[#a9bde4]">
                  {f.l}
                </span>
              </dd>
            </div>
          ))}
        </motion.dl>

        {/* Pastga ishora */}
        <div
          className="scroll-hint pointer-events-none mt-8 hidden justify-center lg:flex"
          aria-hidden
        >
          <span className="flex h-9 w-5 items-start justify-center rounded-full border border-white/25 pt-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
          </span>
        </div>
      </div>
    </header>
  )
}
