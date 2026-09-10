"use client"

/* =============================================================================
   e-HOKIMIYAT — XATIRCHI TUMANI · OMMAVIY LANDING SAHIFA
   -----------------------------------------------------------------------------
   Bitta fayl, bitta default eksport: `EHokimiyatLanding`.
   Ichida navbar, qahramon bo'lim, kirish modali, imkoniyatlar, Telegram
   CTA, OneID, xavfsizlik va futer — barchasi bir xil dizayn tilida.

   DIZAYN TILI (butun fayl bo'ylab qat'iy)
   ---------------------------------------
   1. CHEGARA YO'Q. Elementlar oq karta + och fon kontrasti va juda
      yumshoq, tarqoq soya bilan ajratiladi. `border-gray-*`, `border-2`
      ishlatilmaydi. Faqat quyuq fon ustidagi shisha panellarda juda
      nozik `white/10` chegara bo'ladi — u chegara emas, yorug'lik qirrasi.
   2. BO'SHLIQ KO'P. Bo'lim ritmi py-24 / sm:py-32, karta ichi p-8,
      panjara oralig'i gap-6 / gap-8.
   3. TIPOGRAFIKA IERARXIYASI:
        mikro-yorliq  → 11px, semibold, uppercase, tracking-[0.16em], muted
        sarlavha      → semibold, tight tracking, text-balance
        raqam         → yirik, semibold, tabular-nums
        matn          → 15-17px, leading-7/8, muted-foreground
   4. AKSENT o'lchovli: faqat CTA, faol holat va muhim ikonkalarda.
   5. SHISHA (glassmorphism) faqat suratning ustida — quyuq fon bor joyda.
      Och bo'limlarda shisha ishlatilmaydi (u yerda oq karta + soya).
   6. RADIUS bir xil: karta 24px (rounded-3xl), ikonka 16px (rounded-2xl),
      tugma 16px (rounded-2xl), yirik panel 36px.

   ROSTGO'YLIK
   -----------
   Sahifada o'ylab chiqarilgan statistika, foiz yoki rasmiy iqtibos YO'Q.
   Raqamlar faqat tizim tuzilishiga tegishli (mahallalar soni, sohalar
   soni, tillar soni). Interfeys namunalari «namuna» deb belgilangan.
   OneID belgisi — rasmiy logotip emas, o'rin egallovchi belgi
   (`public/oneid.svg` qo'yilganda almashtiriladi).
============================================================================= */

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion"
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Bot,
  Camera,
  Check,
  ClipboardCheck,
  Eye,
  EyeOff,
  FileCheck2,
  Fingerprint,
  Globe2,
  History,
  Landmark,
  Lock,
  LogIn,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Timer,
  User,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { login } from "@/lib/api/auth.api"
import { getAccessToken } from "@/lib/api/client"

/* ==========================================================================
   O'ZGARMASLAR
   ========================================================================== */

/** Fuqarolar murojaatini qabul qiluvchi Telegram bot */
export const TELEGRAM_BOT = "Xatirchi_Murojaatbot"
export const TELEGRAM_URL = `https://t.me/${TELEGRAM_BOT}`

/** OneID kirish manzili. Sozlanmagan bo'lsa tugma holatni rostgo'y aytadi. */
const ONEID_URL = process.env.NEXT_PUBLIC_ONEID_URL ?? ""

const NAV = [
  { href: "#qanday", label: "Qanday ishlaydi" },
  { href: "#imkoniyat", label: "Imkoniyatlar" },
  { href: "#murojaat", label: "Murojaat yuborish" },
  { href: "#ishonch", label: "Xavfsizlik" },
]

/** Yumshoq, tarqoq soya — och bo'limlardagi karta uchun */
const CARD =
  "rounded-3xl bg-card shadow-[0_1px_2px_rgba(13,21,36,0.04),0_14px_40px_-18px_rgba(13,21,36,0.14)]"
const CARD_HOVER =
  "transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(13,21,36,0.05),0_26px_60px_-22px_rgba(13,21,36,0.22)]"
/** Och fonli, chegarasiz ichki blok (oq bo'lim ustida) */
const TILE = "rounded-3xl bg-background"

/* ==========================================================================
   KICHIK YORDAMCHILAR
   ========================================================================== */

/** Ko'rinish maydoniga kirganda bir marta ochiladigan blok */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

function MicroLabel({
  children,
  onDark = false,
}: {
  children: React.ReactNode
  onDark?: boolean
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.16em]",
        onDark ? "text-[#9db0d9]" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  )
}

/**
 * BO'LIM SARLAVHASI — landing sahifasi uchun YAGONA manba.
 *
 * Ilgari har bo'lim o'zicha yozilgan edi:
 *   HowItWorks    32/42px · MicroLabel · mt-4 / mt-5
 *   Features      32/42px · markazlangan
 *   TelegramCta   34/46px · pill chip eyebrow · mt-7
 *   OneIdSection  30/36px · yalang'och MicroLabel · mt-4
 *   Trust         sarlavhasiz · mt-3
 *
 * Ya'ni UCH xil sarlavha o'lchami, UCH xil eyebrow uslubi va TO'RT xil
 * vertikal ritm. Sahifa bo'ylab aylantirilganda har bo'lim boshqa
 * hujjatdan ko'chirilganday ko'rinardi.
 *
 * Endi bitta shkala:
 *   eyebrow  11px · uppercase · tracking 0.16em
 *   title    30px -> 42px (sm) · bitta o'lcham, barcha bo'limlarda
 *   lead     17px / leading-8
 * va bitta ritm: eyebrow -> title (mt-4) -> lead (mt-5).
 *
 * `title` ATAYLAB ixtiyoriy: «Xavfsizlik» bo'limida sarlavha yo'q
 * (foydalanuvchi talabi bilan olib tashlangan), faqat eyebrow va bir
 * qatorli izoh. Sarlavha bo'lmasa lead eyebrow'ga yaqinlashadi (mt-3).
 *
 * Quyuq panelda (`tone="dark"`) eyebrow pill ko'rinishiga o'tadi —
 * ilgari bu TelegramCta ichida alohida yozilgan edi.
 */
function SectionHead({
  label,
  labelIcon: LabelIcon,
  title,
  lead,
  align = "start",
  tone = "light",
  className,
}: {
  label: string
  labelIcon?: React.ComponentType<{ className?: string }>
  title?: React.ReactNode
  lead?: React.ReactNode
  align?: "start" | "center"
  tone?: "light" | "dark"
  className?: string
}) {
  const dark = tone === "dark"
  const center = align === "center"

  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center", className)}>
      {dark ? (
        <p
          className={cn(
            "inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3.5 py-2",
            "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#bcd0f7]",
          )}
        >
          {LabelIcon && <LabelIcon className="h-3.5 w-3.5" aria-hidden />}
          {label}
        </p>
      ) : (
        <p
          className={cn(
            "flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
            center && "justify-center",
          )}
        >
          {LabelIcon && <LabelIcon className="h-3.5 w-3.5" aria-hidden />}
          {label}
        </p>
      )}

      {title && (
        <h2
          className={cn(
            "mt-4 text-[30px] font-semibold leading-[1.14] tracking-[-0.028em] text-balance",
            "sm:text-[42px] sm:leading-[1.08] sm:tracking-[-0.032em]",
            dark ? "text-white" : "text-foreground",
          )}
        >
          {title}
        </h2>
      )}

      {lead && (
        <p
          className={cn(
            title ? "mt-5" : "mt-3",
            "text-[17px] leading-8 text-pretty",
            dark ? "text-[#c3d3f2]" : "text-muted-foreground",
          )}
        >
          {lead}
        </p>
      )}
    </div>
  )
}

/**
 * OneID belgisi.
 * DIQQAT: rasmiy OneID logotipi EMAS — neytral shakl va so'z belgisi.
 * Rasmiy logotipni `public/oneid.svg` ga qo'ying va bu komponentni
 * `<Image src="/oneid.svg" … />` bilan almashtiring.
 */
function OneIdMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-white/92 px-1.5 py-0.5 text-[11px] font-black tracking-tight text-[#0a2050]",
        className,
      )}
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden>
        <rect x="1" y="3" width="14" height="10" rx="2.5" fill="currentColor" opacity="0.18" />
        <circle cx="5.6" cy="8" r="2" fill="currentColor" />
        <rect x="9" y="6.4" width="4.6" height="1.3" rx="0.65" fill="currentColor" />
        <rect x="9" y="8.9" width="3.2" height="1.3" rx="0.65" fill="currentColor" />
      </svg>
      OneID
    </span>
  )
}

/* ==========================================================================
   1. SHISHA NAVBAR
   ========================================================================== */

function GlassNav({
  onLogin,
  hasSession,
}: {
  onLogin: () => void
  hasSession: boolean
}) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "glass-strong border-b border-white/10"
          : "border-b border-transparent",
      )}
      aria-label="Asosiy navigatsiya"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-18 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
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
            className="hidden h-11 items-center gap-2 rounded-xl bg-[#030b1f]/62 px-4 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-[#030b1f]/78 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex"
          >
            <Send className="h-4 w-4" aria-hidden />
            Ariza yuborish
          </a>

          <button
            type="button"
            onClick={onLogin}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#0a2050] shadow-[0_12px_34px_-14px_rgba(3,11,31,0.8)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#030b1f]/62 text-white backdrop-blur-md transition-colors hover:bg-[#030b1f]/78 lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong overflow-hidden border-t border-white/10 lg:hidden"
          >
            <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex h-12 items-center rounded-lg px-2 text-sm font-medium text-[#cfdcf7] transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-12 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-white"
                >
                  <Send className="h-4 w-4" aria-hidden />
                  Telegram orqali ariza yuborish
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

/* ==========================================================================
   2. QAHRAMON BO'LIM — AYLANTIRIB OCHILADIGAN SURAT
   --------------------------------------------------------------------------
   Surat butunlay qoraytirilmaydi: umumiy tonlash yengil (`.hero-tint`),
   matn ostiga esa markazlashtirilgan `.hero-scrim` qo'yiladi. Pastga
   aylantirilganda ikkala parda ham so'nadi va bino to'liq ochiladi.
   Buning uchun bo'lim balandligi ekrandan katta, ichida `sticky` qatlam.
   ========================================================================== */

/* Ilgari bu yerda suratning ustida suzib turadigan to'rtta shisha karta
   (24/7, 70 mahalla, 3 til, Isbot) va pastda faktlar qatori bor edi.
   Foydalanuvchi talabi bilan olib tashlandi: qahramon bo'limda faqat
   sarlavha va harakat tugmalari qoladi, bino to'sib qo'yilmaydi.
   O'sha to'rt fakt endi «Faktlar» bo'limida (HowItWorks dan keyin). */

function Hero({
  onLogin,
}: {
  onLogin: () => void
}) {
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLElement | null>(null)

  /* PARALLAKS — nima o'zgardi va nima uchun.
   *
   * Ilgari global `scrollY` va qattiq piksel chegaralari ishlatilgan edi
   * (`[0, 460]`, `[0, 1100]` …). Ikki muammo bor edi:
   *
   *  1. Piksel viewport balandligiga moslashmaydi. 667px'li telefonda
   *     460px — ekranning deyarli hammasi, 1100px'li monitorda esa
   *     uchdan biri. Ya'ni effekt har qurilmada boshqa tezlikda
   *     tugardi.
   *  2. Silliqlash yo'q: `scrollY` to'g'ridan-to'g'ri transformga
   *     ulangani uchun trekpad va telefonda titrash sezilardi.
   *
   * Endi `useScroll({ target })` hero elementining O'ZIGA bog'langan
   * 0 -> 1 normallashgan progress beradi (viewport'dan mustaqil), va
   * `useSpring` uni silliqlaydi.
   *
   * Chuqurlik uchta qatlam bilan hosil qilinadi — bu asl parallaks:
   *   surat   sekin pastga suriladi va zoom'dan chiqadi
   *   tonlash o'rtada, shaffoflik bilan
   *   matn    TESKARI yo'nalishda va TEZROQ ketadi
   * Fon bilan matn tezligi farqi — ko'z chuqurlikni shundan sezadi.
   */
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })

  /* Silliqlash: qattiq emas, aks holda «suzuvchi» hissi paydo bo'ladi.
     restDelta — mikro-yangilanishlarni to'xtatadi (bekorga repaint yo'q). */
  const p = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.35,
    restDelta: 0.0005,
  })

  /* Surat: 12% pastga + zoom'dan chiqish. Konteyner viewport'dan baland
     (h-[120%], -top-[10%]) — shuning uchun surish chetni ochib
     qo'ymaydi. */
  const imageY = useTransform(p, [0, 1], ["0%", "12%"])
  const imageScale = useTransform(p, [0, 0.85], [1.14, 1.0])

  /* Scrim matn ostida — u matndan oldin ketishi kerak, aks holda matn
     yo'qolgach ham qorayib turadi. */
  const scrimOpacity = useTransform(p, [0, 0.5], [1, 0])
  const tintOpacity = useTransform(p, [0, 0.72], [1, 0.24])

  /* Matn: tezroq va yuqoriga — surat bilan tezlik farqi chuqurlik beradi. */
  const contentY = useTransform(p, [0, 1], ["0%", "-26%"])
  const contentOpacity = useTransform(p, [0, 0.42], [1, 0])
  const hintOpacity = useTransform(p, [0, 0.14], [1, 0])

  const fade = (delay: number) =>
    reduce
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3 },
        }
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
        }

  const scrollStyle = reduce
    ? {}
    : { opacity: contentOpacity, y: contentY, willChange: "transform, opacity" }

  return (
    <header ref={heroRef} id="top" className="relative h-[120dvh] lg:h-[145dvh]">
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        {/* Fon surati — eng sekin qatlam.
            Konteyner viewport'dan baland va yuqoriga chiqarilgan:
            surish paytida chetlar ochilib qolmaydi. */}
        <motion.div
          className="absolute -top-[10%] left-0 -z-20 h-[120%] w-full"
          style={
            reduce
              ? {}
              : { y: imageY, scale: imageScale, willChange: "transform" }
          }
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

        {/* ---- MARKAZIY KOMPOZITSIYA + SUZUVCHI SHISHA KARTALAR ---- */}
        {/* Matn — eng tez qatlam, teskari yo'nalishda */}
        <motion.div style={scrollStyle} className="relative h-[100dvh]">
          <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-6 pb-10 pt-20 text-center sm:pb-8 sm:pt-24 lg:max-w-4xl">
            <motion.p
              {...fade(0.05)}
              className="inline-flex items-center gap-2 rounded-full bg-[#030b1f]/62 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e6eeff] backdrop-blur-md"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf]" aria-hidden />
              Raqamli hokimiyat platformasi
            </motion.p>

            <motion.h1
              {...fade(0.14)}
              className="mt-6 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-white text-balance [text-shadow:0_2px_34px_rgba(3,11,31,0.8)] sm:mt-7 sm:text-[54px] sm:leading-[1.06] sm:tracking-[-0.035em] lg:text-[68px]"
            >
              Xalq dardi –{" "}
              <span className="text-gradient-sky">davlat e’tiborida.</span>
            </motion.h1>

            <motion.p
              {...fade(0.24)}
              className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-[#dbe6ff] text-pretty [text-shadow:0_1px_18px_rgba(3,11,31,0.9)] sm:mt-6 sm:text-[17px] sm:leading-8"
            >
              Xatirchi tumani aholisining murojaatlari endi yanada tez va
              shaffof hal etiladi. Barcha jarayonlar bitta aqlli tizimda.
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
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#030b1f]/62 px-7 text-[15px] font-semibold text-white backdrop-blur-md transition-colors duration-300 hover:bg-[#030b1f]/78 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                Xodimlar uchun kirish
              </button>
            </motion.div>

                {/* Pastga ishora — birinchi harakatdan keyin darhol so'nadi,
                aks holda foydalanuvchi allaqachon aylantirayotganda ham
                «pastga aylantiring» deb turadi. */}
            <motion.div
              style={reduce ? {} : { opacity: hintOpacity }}
              className="scroll-hint absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
              aria-hidden
            >
              <span className="text-[11px] font-medium tracking-wide text-white/65">
                suratni ochish uchun pastga aylantiring
              </span>
              <span className="flex h-8 w-5 items-start justify-center rounded-full bg-white/15 pt-1.5 backdrop-blur-sm">
                <span className="dot h-1.5 w-1.5 rounded-full bg-white/85" />
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </header>
  )
}

/* ==========================================================================
   3. KIRISH MODALI — «XODIMLAR UCHUN KIRISH»
   --------------------------------------------------------------------------
   Alohida sahifaga o'tilmaydi. Escape bilan yopiladi, TAB modal ichida
   aylanadi, fon skrolli bloklanadi, fokus birinchi maydonga beriladi.
   Kirish haqiqiy API orqali: `login({ login, password })`.
   ========================================================================== */

function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const reduce = useReducedMotion()

  const [loginValue, setLoginValue] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [oneIdNote, setOneIdNote] = useState(false)

  const firstFieldRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), a[href]",
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    const t = window.setTimeout(() => firstFieldRef.current?.focus(), 120)

    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
      window.clearTimeout(t)
    }
  }, [open, onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return

    const value = loginValue.trim()
    if (!value) return setError("Loginni kiriting")
    if (!password) return setError("Parolni kiriting")

    setError("")
    setBusy(true)
    try {
      await login({ login: value, password })
      router.replace("/dashboard")
    } catch (err: any) {
      const code = err?.status
      if (code === 404) setError("Foydalanuvchi topilmadi. Administrator bilan bog‘laning.")
      else if (code === 401) setError("Login yoki parol xato.")
      else if (code === 429) setError("Juda ko‘p urinish. Bir necha daqiqadan so‘ng urinib ko‘ring.")
      else setError(err?.message || "Xatolik yuz berdi. Qayta urinib ko‘ring.")
      setBusy(false)
    }
  }

  const FIELD =
    "h-12 w-full rounded-xl bg-white/[0.07] text-sm text-white placeholder:text-[#6b81b0] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] transition-shadow focus:bg-white/[0.1] focus:shadow-[inset_0_0_0_1.5px_rgba(77,134,255,0.85)] focus-visible:outline-none disabled:opacity-60"

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Xiralashgan fon */}
          <div
            className="absolute inset-0 bg-[#030b1f]/70 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.97 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="glass-strong relative z-10 w-full max-w-md overflow-hidden rounded-t-3xl pb-safe shadow-[0_50px_140px_-30px_rgba(3,11,31,0.95)] sm:rounded-3xl sm:pb-0"
          >
            {/* Yuqoridagi nur */}
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-[#4d86ff]/28 blur-3xl"
              aria-hidden
            />

            <div className="relative p-6 sm:p-7">
              <button
                type="button"
                onClick={onClose}
                aria-label="Yopish"
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl text-[#a9bde4] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>

              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4d86ff] to-[#2dd4bf] text-[#030b1f]">
                <ShieldCheck className="h-6 w-6" aria-hidden />
              </span>

              <h2
                id="login-modal-title"
                className="mt-4 text-xl font-bold tracking-tight text-white"
              >
                Xodimlar uchun kirish
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#a9bde4]">
                Tizimga faqat vakolatli xodimlar kiradi. Fuqarolar murojaatni
                Telegram bot orqali yuboradi.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
                {error && (
                  <p
                    role="alert"
                    className="flex items-start gap-2 rounded-xl bg-rose-500/14 px-3 py-2.5 text-sm font-medium text-rose-100 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.3)]"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {error}
                  </p>
                )}

                <div>
                  <label
                    htmlFor="lm-login"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-[#a9bde4]"
                  >
                    Login
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f95c4]"
                      aria-hidden
                    />
                    <input
                      id="lm-login"
                      ref={firstFieldRef}
                      name="username"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                      value={loginValue}
                      onChange={(e) => setLoginValue(e.target.value)}
                      disabled={busy}
                      placeholder="a.karimov"
                      className={cn(FIELD, "pl-10 pr-3")}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="lm-password"
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-[#a9bde4]"
                  >
                    Parol
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f95c4]"
                      aria-hidden
                    />
                    <input
                      id="lm-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                      placeholder="••••••••"
                      className={cn(FIELD, "pl-10 pr-12")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                      className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center rounded-xl text-[#7f95c4] transition-colors hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7aa7ff] via-[#4d86ff] to-[#2dd4bf] text-sm font-bold text-[#030b1f] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff] disabled:translate-y-0 disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#030b1f]/30 border-t-[#030b1f]" />
                      Tekshirilmoqda…
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" aria-hidden />
                      Kirish
                    </>
                  )}
                </button>
              </form>

              {/* Ajratgich */}
              <div className="my-5 flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-white/14" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7f95c4]">
                  yoki
                </span>
                <span className="h-px flex-1 bg-white/14" />
              </div>

              {/* OneID — manzil sozlangan bo'lsa havola, aks holda rostgo'y izoh */}
              {ONEID_URL ? (
                <a
                  href={ONEID_URL}
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-white/[0.06] text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] transition-colors hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
                >
                  <OneIdMark />
                  OneID orqali kirish
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setOneIdNote(true)}
                    className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-white/[0.06] text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] transition-colors hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
                  >
                    <OneIdMark />
                    OneID orqali kirish
                  </button>
                  {oneIdNote && (
                    <p
                      role="status"
                      className="mt-2 rounded-xl bg-[#4d86ff]/12 px-3 py-2 text-xs leading-5 text-[#bcd0f7]"
                    >
                      OneID ulanishi sozlanmoqda. Hozircha login va parol orqali
                      kiring.
                    </p>
                  )}
                </>
              )}

              <p className="mt-4 text-center text-[11px] leading-5 text-[#7f95c4]">
                Login yoki parolni bilmasangiz — tizim administratoriga murojaat
                qiling.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ==========================================================================
   4. QANDAY ISHLAYDI — TO'RT QADAM + NAMUNA
   ========================================================================== */

const STEPS = [
  {
    icon: Send,
    n: "01",
    t: "Murojaat yuborasiz",
    d: "Telegram bot orqali kunning istalgan vaqtida. Matn, foto, video yoki hujjat biriktirasiz — murojaatingiz darhol raqam oladi.",
  },
  {
    icon: Sparkles,
    n: "02",
    t: "Tizim saralaydi",
    d: "Sun'iy intellekt murojaatni o'qib, qaysi sohaga tegishli ekanini aniqlaydi va ustuvorlik darajasini belgilaydi.",
  },
  {
    icon: ClipboardCheck,
    n: "03",
    t: "Tashkilot ijroga oladi",
    d: "Mas'ul tashkilotga yo'naltiriladi va muddat belgilanadi. Muddat tugashiga oz qolganda tizim o'zi eslatadi.",
  },
  {
    icon: FileCheck2,
    n: "04",
    t: "Natija tasdiqlanadi",
    d: "Ijrochi ishni foto va hujjat bilan isbotlaydi, hokim tasdiqlaydi. Siz javobni olib, xizmatni baholaysiz.",
  },
]

const TRACKER = [
  { t: "Qabul qilindi", s: "Telegram bot · 09:14", done: true },
  { t: "Sohaga yo'naltirildi", s: "Energetika · 09:15", done: true },
  { t: "Ijroda", s: "Tuman elektr tarmoqlari", done: true },
  { t: "Isbot yuklandi", s: "3 foto · tasdiq kutilmoqda", done: false },
]

function HowItWorks() {
  return (
    <section id="qanday" className="scroll-mt-24 bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <SectionHead
            label="Murojaat yo'li"
            title={
              <>
                To&apos;rt qadam — va murojaatingiz{" "}
                <span className="text-primary">nazoratda</span>
              </>
            }
            lead="Har bir bosqich vaqti bilan qayd etiladi. Murojaat yo'qolib qolishi yoki e'tibordan chetda qolishi mumkin emas."
          />
        </Reveal>

        <ol className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            /* <li> to'g'ridan-to'g'ri <ol> ichida — ekran o'quvchi buni
               ro'yxat deb tanishi uchun. Animatsiya <li> ichida. */
            <li key={s.n} className="h-full">
              <Reveal delay={i * 0.07} className="h-full">
                <div className={cn(CARD, CARD_HOVER, "flex h-full flex-col p-8")}>
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                      <s.icon className="h-[22px] w-[22px]" aria-hidden />
                    </span>
                    <span className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground/70 tabular-nums">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="mt-7 text-lg font-semibold tracking-[-0.01em] text-foreground">
                    {s.t}
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                    {s.d}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        {/* Namuna: murojaat holati fuqaroga shunday ko'rinadi */}
        <Reveal delay={0.1}>
          <div className={cn(CARD, "mx-auto mt-8 max-w-md p-8")}>
            <div className="flex items-center justify-between gap-3">
              <MicroLabel>Murojaat holati</MicroLabel>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                namuna
              </span>
            </div>

            <p className="mt-5 font-mono text-sm font-semibold text-foreground">
              № XT-2026-000412
            </p>
            <p className="mt-1.5 text-[15px] leading-7 text-muted-foreground">
              «Ko&apos;cha yorug&apos;ligi ishlamaydi — mahalla markazi»
            </p>

            <ol className="mt-7 space-y-5">
              {TRACKER.map((step, i, arr) => (
                <li key={step.t} className="flex gap-4">
                  <span className="relative flex flex-col items-center">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full",
                        step.done
                          ? "bg-success-soft text-success-soft-foreground"
                          : "bg-primary-soft text-primary-soft-foreground",
                      )}
                    >
                      {step.done ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
                      )}
                    </span>
                    {i < arr.length - 1 && (
                      <span className="mt-1.5 h-6 w-px bg-border" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 pb-0.5">
                    <span className="block text-[15px] font-semibold text-foreground">
                      {step.t}
                    </span>
                    <span className="block text-[13px] text-muted-foreground">
                      {step.s}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <p className="mt-7 flex items-start gap-2.5 text-[13px] leading-6 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              Har bir bosqich vaqti bilan yozib boriladi — jarayon tarixi
              o&apos;chirilmaydi.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ==========================================================================
   4b. FAKTLAR — ilgari qahramon bo'limdagi shisha kartalarda edi
   ========================================================================== */

const FACTS = [
  { icon: Timer, v: "24/7", l: "Murojaat qabuli", d: "Bot kechasi ham javob beradi" },
  { icon: MapIcon, v: "70", l: "Mahalla va qishloq", d: "Bitta interaktiv xaritada" },
  { icon: Camera, v: "Isbot", l: "Bilan yopiladi", d: "Foto va hujjat, keyin hokim tasdig'i" },
  { icon: Globe2, v: "3 til", l: "O'zbek, rus, ingliz", d: "Bot ham, tizim ham bir tilda" },
]

function Facts() {
  return (
    <section className="bg-card py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Eyebrow — plitalar kontekstsiz suzib turmasligi uchun.
            Sarlavha ataylab qo'shilmadi: bu fakt tasmasi, alohida
            bo'lim emas. */}
        <Reveal>
          <SectionHead label="Qisqacha ma'lumot" />
        </Reveal>

        <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <Reveal key={f.v} delay={i * 0.06}>
              <div className={cn(TILE, "flex h-full items-start gap-4 p-6")}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                  <f.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <dt className="sr-only">{f.l}</dt>
                  <dd>
                    <span className="block text-[26px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
                      {f.v}
                    </span>
                    <span className="mt-1.5 block text-[14px] font-medium text-foreground">{f.l}</span>
                    <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">{f.d}</span>
                  </dd>
                </div>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ==========================================================================
   5. IMKONIYATLAR VA TAHLIL
   ========================================================================== */

const FEATURES = [
  {
    icon: Timer,
    t: "Muddat nazorati",
    d: "Har bir topshiriqda aniq muddat bor. Tugashiga oz qolganda tizim eslatadi, kechiksa alohida belgilanadi va rahbariyat ro'yxatiga tushadi.",
    tone: "warning" as const,
  },
  {
    icon: Camera,
    t: "Isbot bilan yopiladi",
    d: "«Bajarildi» deb yozish yetarli emas: foto, video yoki hujjat yuklanadi. Hokim ko'rib tasdiqlagandan keyin ish yopiladi.",
    tone: "success" as const,
  },
  {
    icon: Eye,
    t: "Shaffof jarayon",
    d: "Murojaat qaysi tashkilotda, qanday holatda turgani ko'rinib turadi. Raqam bo'yicha holatni o'zingiz tekshirasiz.",
    tone: "info" as const,
  },
  {
    icon: Sparkles,
    t: "Sun'iy intellekt",
    d: "Murojaatlarni saralaydi, takrorlanganini aniqlaydi, kechikkanlarni ajratadi va rahbariyat uchun kunlik xulosa tayyorlaydi.",
    tone: "violet" as const,
  },
  {
    icon: MapIcon,
    t: "Qishloqlar kesimi",
    d: "70 mahalla va qishloq bo'yicha interaktiv xarita: qaysi hududda muammo ko'p to'planganini bir qarashda ko'rish mumkin.",
    tone: "primary" as const,
  },
  {
    icon: Globe2,
    t: "Uch tilda",
    d: "O'zbek (lotin va kirill), rus va ingliz tillari. Bot ham, tizim ham bir xil tilda gaplashadi.",
    tone: "neutral" as const,
  },
]

const TONES: Record<string, string> = {
  warning: "bg-warning-soft text-warning-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  violet: "bg-[var(--st-tekshiruvda-bg)] text-[var(--st-tekshiruvda-fg)]",
  primary: "bg-primary-soft text-primary-soft-foreground",
  neutral: "bg-muted text-muted-foreground",
}

function Features() {
  return (
    <section id="imkoniyat" className="scroll-mt-24 bg-card py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <SectionHead
            align="center"
            label="Tizim imkoniyatlari"
            title="Murojaatdan natijagacha — bitta tizimda"
            lead="Qabul, yo'naltirish, muddat nazorati va isbot bilan tasdiqlash — har bir bosqich ko'rinib turadi va vaqti bilan qayd etiladi."
          />
        </Reveal>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 0.07}>
              <article
                className={cn(
                  TILE,
                  "h-full p-8 transition-[transform,background-color] duration-300 hover:-translate-y-1 hover:bg-surface-sunken",
                )}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    TONES[f.tone],
                  )}
                >
                  <f.icon className="h-[22px] w-[22px]" aria-hidden />
                </span>
                <h3 className="mt-7 text-lg font-semibold tracking-[-0.01em] text-foreground">
                  {f.t}
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                  {f.d}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   6. TELEGRAM CTA — ASOSIY CHAQIRIQ
   ========================================================================== */

const TOPICS = [
  "Ko'cha yorug'ligi",
  "Ichimlik suvi",
  "Yo'l va ko'prik",
  "Gaz ta'minoti",
  "Ta'lim",
  "Tibbiyot",
  "Obodonlashtirish",
  "Ijtimoiy yordam",
]

function TelegramCta() {
  return (
    <section id="murojaat" className="scroll-mt-24 bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <div className="landing relative overflow-hidden rounded-[36px] bg-[#061436] px-8 py-14 shadow-[0_60px_140px_-60px_rgba(6,20,54,0.9)] sm:px-12 sm:py-20 lg:px-16">
            <div
              className="halo pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#4d86ff]/28 blur-3xl"
              aria-hidden
            />
            <div
              className="halo pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#2dd4bf]/20 blur-3xl"
              style={{ animationDelay: "3.5s" }}
              aria-hidden
            />

            <div className="relative grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="max-w-2xl">
                {/* Ilgari bu yerda sarlavha alohida yozilgan edi (34/46px,
                    mt-7) — sahifadagi boshqa bo'limlardan bir qadam katta.
                    Endi umumiy SectionHead: chaqiruv o'z panelining quyuq
                    foni, gradient matni va katta tugmalari bilan ajralib
                    turadi, shrift o'lchami bilan emas. */}
                <SectionHead
                  tone="dark"
                  labelIcon={Bot}
                  label="Telegram bot · bepul · 24/7"
                  title={
                    <>
                      Hurmatli Xatirchiliklar,{" "}
                      <span className="text-gradient-sky">
                        muammolaringizni ayting!
                      </span>
                    </>
                  }
                  lead="Qaysi masala bo'lsa ham yozing — murojaatingiz raqam oladi, mas'ul tashkilotga yo'naltiriladi va muddati nazoratga tushadi. Javobni Telegram orqali olasiz."
                />

                <ul className="mt-8 flex flex-wrap gap-2.5">
                  {TOPICS.map((topic) => (
                    <li
                      key={topic}
                      className="rounded-full bg-white/[0.07] px-3.5 py-2 text-[13px] font-medium text-[#cfdcf7]"
                    >
                      {topic}
                    </li>
                  ))}
                </ul>

                <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <a
                    href={TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex h-16 items-center justify-center gap-3 rounded-2xl bg-white px-8 text-[16px] font-semibold text-[#0a2050] shadow-[0_24px_70px_-24px_rgba(255,255,255,0.45)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d86ff] to-[#2dd4bf] text-white">
                      <Send className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    Telegram orqali ariza yuborish
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden
                    />
                  </a>
                  <p className="font-mono text-[13px] text-[#93a9d6]">@{TELEGRAM_BOT}</p>
                </div>
              </div>

              {/* Telefon ko'rinishi — bot bilan suhbat namunasi */}
              <div className="relative mx-auto hidden w-[264px] lg:block" aria-hidden>
                <div className="rounded-[38px] bg-[#030b1f] p-3 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)]">
                  <div className="overflow-hidden rounded-[30px] bg-[#0a1730]">
                    <div className="flex items-center gap-2.5 px-4 py-3.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#4d86ff] to-[#2dd4bf] text-[#030b1f]">
                        <Landmark className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-semibold text-white">
                          Xatirchi Murojaat
                        </span>
                        <span className="block text-[10px] text-[#2dd4bf]">bot</span>
                      </span>
                    </div>

                    <div className="space-y-2.5 px-4 pb-5">
                      <p className="max-w-[86%] rounded-[18px] rounded-bl-md bg-white/[0.07] px-3.5 py-2.5 text-[11.5px] leading-5 text-[#dbe6ff]">
                        Assalomu alaykum! Murojaatingizni yozing yoki foto
                        yuboring.
                      </p>
                      <p className="ml-auto max-w-[86%] rounded-[18px] rounded-br-md bg-[#3f6bff] px-3.5 py-2.5 text-[11.5px] leading-5 text-white">
                        Ko&apos;chamizda chiroq yonmaydi
                      </p>
                      <p className="max-w-[92%] rounded-[18px] rounded-bl-md bg-white/[0.07] px-3.5 py-2.5 text-[11.5px] leading-5 text-[#dbe6ff]">
                        Qabul qilindi ✅ Raqam:{" "}
                        <span className="font-mono">XT-2026-000412</span>
                        <br />
                        Energetika sohasiga yo&apos;naltirildi.
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-center text-[10px] uppercase tracking-[0.2em] text-[#5f74a1]">
                  namuna
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ==========================================================================
   7. ONEID ORQALI RO'YXATDAN O'TISH
   ========================================================================== */

function OneIdSection() {
  const [note, setNote] = useState(false)

  return (
    <section className="bg-card py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <div
            className={cn(
              TILE,
              "grid items-center gap-12 p-8 sm:p-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16",
            )}
          >
            <div className="max-w-xl">
              <SectionHead
                label="Yagona identifikatsiya"
                title="OneID orqali ro'yxatdan o'tish"
                lead="Davlat xizmatlarining yagona identifikatsiya tizimi orqali shaxsingizni tasdiqlang. Shundan so'ng murojaatlaringiz bitta shaxsiy kabinetda to'planadi."
              />

              <ul className="mt-8 space-y-4">
                {[
                  "Shaxsni bir marta tasdiqlaysiz — keyin qayta ma'lumot kiritish shart emas",
                  "Murojaatlar tarixi va javoblar bir joyda saqlanadi",
                  "PNFL to'liq ko'rinmaydi — tizimda faqat oxirgi 4 raqami saqlanadi",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex gap-3.5 text-[15px] leading-7 text-foreground"
                  >
                    <ShieldCheck
                      className="mt-1 h-[18px] w-[18px] shrink-0 text-success"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full">
              {ONEID_URL ? (
                <a
                  href={ONEID_URL}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground shadow-[0_18px_44px_-18px_var(--primary)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <OneIdMark className="bg-white text-[#0a2050]" />
                  OneID bilan boshlash
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setNote(true)}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground shadow-[0_18px_44px_-18px_var(--primary)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <OneIdMark className="bg-white text-[#0a2050]" />
                  OneID bilan boshlash
                </button>
              )}

              {note && !ONEID_URL && (
                <p
                  role="status"
                  className="mt-4 rounded-2xl bg-info-soft px-4 py-3 text-[13px] leading-6 text-info-soft-foreground"
                >
                  OneID ulanishi sozlanmoqda. Hozircha murojaatni Telegram bot
                  orqali yuborishingiz mumkin — u ham to&apos;liq nazoratga
                  olinadi.
                </p>
              )}

              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-card text-[15px] font-semibold text-foreground shadow-[0_1px_2px_rgba(13,21,36,0.04),0_10px_28px_-14px_rgba(13,21,36,0.16)] transition-transform duration-300 hover:-translate-y-0.5"
              >
                <Send className="h-4 w-4" aria-hidden />
                Telegram orqali davom etish
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ==========================================================================
   8. XAVFSIZLIK VA ISHONCH
   ========================================================================== */

const TRUST = [
  {
    icon: Lock,
    t: "Rolli huquqlar",
    d: "Har bir xodim faqat o'z vakolatidagi ma'lumotni ko'radi. Oltita rol, har biri aniq chegara bilan.",
  },
  {
    icon: History,
    t: "Audit jurnali",
    d: "Kim nima o'zgartirgani vaqti bilan yozib boriladi. Jarayon tarixini o'chirish imkoni yo'q.",
  },
  {
    icon: Fingerprint,
    t: "Shaxsiy ma'lumot himoyasi",
    d: "PNFL to'liq ko'rsatilmaydi — faqat oxirgi 4 raqami. Yuklangan fayllar turi va hajmi tekshiriladi.",
  },
  {
    icon: BellRing,
    t: "Avtomatik ogohlantirish",
    d: "Yangi topshiriq, yaqinlashgan muddat va kechikish bo'yicha bildirishnoma o'zi keladi.",
  },
  {
    icon: BarChart3,
    t: "Ochiq hisobot",
    d: "Tashkilotlar reytingi, sohalar kesimi va oxirgi 30 kunlik dinamika — raqamlar bilan.",
  },
  {
    icon: MessageSquare,
    t: "Yozishmalar tizim ichida",
    d: "Xodimlar muloqoti va topshiriq bo'yicha izohlar tizimda saqlanadi — yo'qolib ketmaydi.",
  },
]

function Trust() {
  return (
    <section id="ishonch" className="scroll-mt-24 bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          {/* Bu bo'limda sarlavha ATAYLAB yo'q — foydalanuvchi talabi
              bilan olib tashlangan. SectionHead `title` bermasa lead
              eyebrow'ga yaqinlashadi (mt-3), ritm buzilmaydi. */}
          <SectionHead
            label="Xavfsizlik"
            lead="Tizim ma'lumotni qanday himoya qiladi — qisqacha:"
          />
        </Reveal>

        <div className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.map((item, i) => (
            <Reveal key={item.t} delay={(i % 3) * 0.06}>
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-primary shadow-[0_1px_2px_rgba(13,21,36,0.04),0_10px_28px_-16px_rgba(13,21,36,0.2)]">
                  <item.icon className="h-[22px] w-[22px]" aria-hidden />
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-[-0.01em] text-foreground">
                  {item.t}
                </h3>
                <p className="mt-2.5 text-[15px] leading-7 text-muted-foreground">
                  {item.d}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   9. FUTER
   ========================================================================== */

function Footer({ onLogin }: { onLogin: () => void }) {
  return (
    <footer className="landing bg-[#030b1f] pb-safe text-[#93a9d6]">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="max-w-sm">
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4d86ff] to-[#2dd4bf] text-[#030b1f]">
                <Landmark className="h-5 w-5" aria-hidden />
              </span>
              <span className="leading-tight">
                <span className="block text-[15px] font-semibold tracking-tight text-white">
                  e-Hokimiyat
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em]">
                  Xatirchi tumani
                </span>
              </span>
            </span>
            <p className="mt-6 text-[14px] leading-7">
              Topshiriqlar ijrosi va fuqarolar murojaatlari nazorati axborot
              tizimi. Murojaatlar Telegram bot orqali qabul qilinadi va bitta
              tizimda nazoratga olinadi.
            </p>
          </div>

          <nav aria-label="Fuqarolar uchun">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
              Fuqarolar uchun
            </h2>
            <ul className="mt-6 space-y-4 text-[14px]">
              <li>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 transition-colors hover:text-white"
                >
                  Ariza yuborish
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              </li>
              <li>
                <a href="#qanday" className="transition-colors hover:text-white">
                  Murojaat qanday ko&apos;riladi
                </a>
              </li>
              <li>
                <a href="#murojaat" className="transition-colors hover:text-white">
                  Qaysi masalalar bo&apos;yicha yozish mumkin
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Xodimlar uchun">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
              Xodimlar uchun
            </h2>
            <ul className="mt-6 space-y-4 text-[14px]">
              <li>
                <button
                  type="button"
                  onClick={onLogin}
                  className="transition-colors hover:text-white"
                >
                  Tizimga kirish
                </button>
              </li>
              <li>
                <a href="#imkoniyat" className="transition-colors hover:text-white">
                  Tizim imkoniyatlari
                </a>
              </li>
              <li>
                <a href="#ishonch" className="transition-colors hover:text-white">
                  Xavfsizlik talablari
                </a>
              </li>
            </ul>
            {/* TODO(hokimlik): rasmiy manzil, telefon va ishonch telefonini
                shu yerga qo'shish kerak. Taxminiy raqam ataylab yozilmadi. */}
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-3 pt-8 text-[12px] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Xatirchi tumani hokimligi. Barcha
            huquqlar himoyalangan.
          </p>
          <p className="font-mono text-[#5f74a1]">@{TELEGRAM_BOT}</p>
        </div>
      </div>
    </footer>
  )
}

/* ==========================================================================
   YAKUNIY YIG'MA — DEFAULT EKSPORT
   ========================================================================== */

export default function EHokimiyatLanding() {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  /* Token faqat brauzerda o'qiladi — SSR bilan farq bo'lmasligi uchun
     effektda tekshiriladi. */
  useEffect(() => {
    setHasSession(Boolean(getAccessToken()))
  }, [])

  const handleLogin = useCallback(() => {
    if (hasSession) {
      router.push("/dashboard")
      return
    }
    setModalOpen(true)
  }, [hasSession, router])

  const closeModal = useCallback(() => setModalOpen(false), [])

  return (
    <div className="landing min-h-dvh bg-background">
      <a
        href="#qanday"
        className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[110]"
      >
        Asosiy kontentga o&apos;tish
      </a>

      <GlassNav onLogin={handleLogin} hasSession={hasSession} />

      <Hero onLogin={handleLogin} />

      <main>
        <HowItWorks />
        <Facts />
        <Features />
        <TelegramCta />
        <OneIdSection />
        <Trust />
      </main>

      <Footer onLogin={handleLogin} />

      <LoginModal open={modalOpen} onClose={closeModal} />
    </div>
  )
}
