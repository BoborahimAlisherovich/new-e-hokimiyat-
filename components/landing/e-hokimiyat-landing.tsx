"use client"

/* =============================================================================
   e-HOKIMIYAT — XATIRCHI TUMANI · OMMAVIY LANDING SAHIFA (v2)
   -----------------------------------------------------------------------------
   Bitta default eksport: `EHokimiyatLanding`. Ma'lumotlar `landing-data.ts` da.

   NIMA O'ZGARDI (v1 → v2)
   ------------------------
   • So'z KAM, shrift KATTA. Har bo'limda bitta fikr, markazda, 40–96px.
     Uzun tushuntirishlar olib tashlandi — davlat sayti «hujjat» emas,
     yo'l ko'rsatuvchi bo'lishi kerak.
   • Aylantirilganda animatsiya: so'zlar birma-bir ko'tariladi (Statement),
     kartalar pastdan chiqadi (Reveal), hero parallaks saqlandi.
   • RAHBARIYAT — Hukumat portalidagi rasmiy ro'yxat, bir qatorda avtomatik
     suriladigan karusel. Rasmlar SVG `feConvolveMatrix` bilan
     tiniqlashtiriladi (`.sharpen`).
   • DAVLAT XIZMATLARI — ikki qator: yuqorisi o'ngga, pasti chapga suriladi.
   • «Saytga kirish» endi modal emas — alohida `/kirish` sahifasi
     (Three.js bo'ri va Humo). Modal kodi butunlay olib tashlandi.
   • OneID bo'limi olib tashlandi: ulanish sozlanmagan, sahifada
     ishlamaydigan tugma turishi rostgo'ylikka zid.

   ROSTGO'YLIK
   -----------
   Statistika, foiz, iqtibos YO'Q. Rahbariyat va aloqa ma'lumotlari faqat
   gov.uz/oz/xatirchi dan; manba havolasi sahifada ko'rinadi. Rasmiy
   logotiplar ishlatilmaydi.

   DIZAYN
   ------
   Chegara yo'q (fon kontrasti + yumshoq soya), radius 24/28px, tokenlar.
   Xom ranglar faqat quyuq hero/futer/CTA panellarida (landing uchun
   CLAUDE.md ruxsat beradi). Sensorli nishon ≥ 44px. Gorizontal siljish 0:
   marquee va karusel `overflow-hidden` konteynerda.
============================================================================= */

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion"
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Clock3,
  ExternalLink,
  Globe2,
  History,
  Landmark,
  Lock,
  LogIn,
  Mail,
  MapPin,
  Menu,
  Phone,
  Send,
  ShieldCheck,
  Timer,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { getAccessToken } from "@/lib/api/client"
import {
  DAVLAT_SAYTLARI_1,
  DAVLAT_SAYTLARI_2,
  HOKIMLIK,
  RAHBARIYAT,
  RAHBARIYAT_MANBA,
  type GovSite,
  type Rahbar,
} from "./landing-data"

/* ==========================================================================
   O'ZGARMASLAR
   ========================================================================== */

/** Fuqarolar murojaatini qabul qiluvchi Telegram bot */
export const TELEGRAM_BOT = "Xatirchi_Murojaatbot"
export const TELEGRAM_URL = `https://t.me/${TELEGRAM_BOT}`

const NAV = [
  { href: "#qanday", label: "Qanday ishlaydi" },
  { href: "#rahbariyat", label: "Rahbariyat" },
  { href: "#murojaat", label: "Murojaat" },
  { href: "#xizmatlar", label: "Davlat xizmatlari" },
]

const CARD =
  "rounded-[28px] bg-card shadow-[0_1px_2px_rgba(13,21,36,0.04),0_18px_50px_-24px_rgba(13,21,36,0.16)]"
const EASE = [0.16, 1, 0.3, 1] as const

/* ==========================================================================
   YORDAMCHILAR
   ========================================================================== */

/** Ko'rinish maydoniga kirganda bir marta ochiladigan blok */
function Reveal({
  children,
  delay = 0,
  className,
  y = 44,
  once = false,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  y?: number
  /** true — faqat bir marta; default: har safar ko'rinishga kirganda qaytadan */
  once?: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.15 }}
      transition={{ duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/**
 * KATTA GAP — so'zlar birma-bir ko'tarilib chiqadi.
 * Har so'z `overflow-hidden` qobiqda: pastdan «pardadan» chiqqanday.
 */
function Statement({
  text,
  accent,
  className,
  size = "lg",
}: {
  text: string
  /** Aksent rangda chiqadigan so'zlar (kichik harfda solishtiriladi) */
  accent?: string[]
  className?: string
  size?: "lg" | "xl"
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLParagraphElement | null>(null)
  /* MUHIM: kuzatuv <p> ning o'zida. So'z `overflow-hidden` qobiq ichida
     110% pastga surilgan — IntersectionObserver uni «ko'rinmaydi» deb
     hisoblaydi va whileInView hech qachon ishlamaydi (birinchi smoke-testda
     shu sabab so'zlar chiqmadi). */
  const inView = useInView(ref, { once: false, amount: 0.3 })
  const words = text.split(" ")
  const accentSet = new Set((accent ?? []).map((w) => w.toLowerCase()))
  const hidden = reduce ? { y: 0, opacity: 1 } : { y: "110%", opacity: 0 }
  return (
    <p
      ref={ref}
      className={cn(
        "font-semibold tracking-[-0.035em] text-balance",
        size === "xl"
          ? "text-[26px] leading-[1.06] sm:text-[56px] lg:text-[84px]"
          : "text-[22px] leading-[1.1] sm:text-[44px] lg:text-[60px]",
        className,
      )}
      aria-label={text}
    >
      {words.map((w, i) => (
        /* Tashqi span — qatorlar orasida bo'sh joy qoladi (so'zlar o'raladi);
           ichki overflow-hidden qobiq so'zni pastdan «pardadan» chiqaradi. */
        <span key={`${w}-${i}`} aria-hidden>
          <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <motion.span
              className={cn(
                "inline-block",
                accentSet.has(w.toLowerCase().replace(/[.,!?]/g, "")) && "text-primary",
              )}
              initial={hidden}
              animate={inView ? { y: 0, opacity: 1 } : hidden}
              transition={{ duration: 0.7, delay: i * 0.045, ease: EASE }}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </p>
  )
}

function Eyebrow({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.18em]",
        onDark ? "text-[#9db0d9]" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  )
}

/* ==========================================================================
   1. NAVBAR — hero ustida shisha, pastda oq
   ========================================================================== */

function Nav({ hasSession }: { hasSession: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.9)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const onDark = !scrolled

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300",
        scrolled
          ? "bg-background/85 shadow-[0_1px_0_var(--border)] backdrop-blur-xl"
          : "bg-transparent",
      )}
      aria-label="Asosiy navigatsiya"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:h-18 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              onDark ? "bg-white text-[#0a2050]" : "bg-primary text-primary-foreground",
            )}
          >
            <Landmark className="h-5 w-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className={cn("block text-[15px] font-bold tracking-tight", onDark ? "text-white" : "text-foreground")}>
              e-Hokimiyat
            </span>
            <span
              className={cn(
                "block text-[10px] font-semibold uppercase tracking-[0.16em]",
                onDark ? "text-[#cfdcf7]" : "text-muted-foreground",
              )}
            >
              Xatirchi tumani
            </span>
          </span>
        </a>

        <div className="mx-auto hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                onDark
                  ? "text-white/90 hover:bg-white/12 hover:text-white focus-visible:outline-white"
                  : "text-muted-foreground hover:bg-card hover:text-foreground focus-visible:outline-ring",
              )}
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
            className={cn(
              "hidden h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors sm:inline-flex",
              onDark
                ? "bg-[#030b1f]/55 text-white backdrop-blur-md hover:bg-[#030b1f]/75"
                : "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft/80",
            )}
          >
            <Send className="h-4 w-4" aria-hidden />
            Ariza yuborish
          </a>

          <Link
            href={hasSession ? "/dashboard" : "/kirish"}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2",
              onDark
                ? "bg-white text-[#0a2050] shadow-[0_12px_34px_-14px_rgba(3,11,31,0.8)] focus-visible:outline-white"
                : "bg-primary text-primary-foreground shadow-[0_12px_30px_-12px_rgb(51_102_255_/_0.55)] focus-visible:outline-ring",
            )}
          >
            <LogIn className="h-4 w-4" aria-hidden />
            <span className="hidden min-[400px]:inline">{hasSession ? "Kabinet" : "Saytga kirish"}</span>
            <span className="min-[400px]:hidden">{hasSession ? "Kabinet" : "Kirish"}</span>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Menyu"
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors lg:hidden",
              onDark ? "bg-[#030b1f]/55 text-white backdrop-blur-md" : "bg-card text-foreground",
            )}
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
            transition={{ duration: 0.24, ease: EASE }}
            className="overflow-hidden bg-background/95 shadow-[0_1px_0_var(--border)] backdrop-blur-xl lg:hidden"
          >
            <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex h-12 items-center rounded-lg px-2 text-[15px] font-medium text-foreground transition-colors hover:bg-card"
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
                  className="flex h-12 items-center gap-2 rounded-lg px-2 text-[15px] font-semibold text-primary"
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
   2. HERO — parallaks surat, katta markaziy sarlavha
   ========================================================================== */

function Hero({ hasSession }: { hasSession: boolean }) {
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLElement | null>(null)

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.35, restDelta: 0.0005 })

  const imageY = useTransform(p, [0, 1], ["0%", "12%"])
  const imageScale = useTransform(p, [0, 0.85], [1.14, 1.0])
  const scrimOpacity = useTransform(p, [0, 0.5], [1, 0])
  const tintOpacity = useTransform(p, [0, 0.72], [1, 0.24])
  const contentY = useTransform(p, [0, 1], ["0%", "-26%"])
  const contentOpacity = useTransform(p, [0, 0.42], [1, 0])
  const hintOpacity = useTransform(p, [0, 0.14], [1, 0])

  const fade = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } }
      : {
          initial: { opacity: 0, y: 26 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: EASE },
        }

  return (
    <header ref={heroRef} id="top" className="relative h-[120dvh] lg:h-[140dvh]">
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        <motion.div
          className="absolute -top-[10%] left-0 -z-20 h-[120%] w-full"
          style={reduce ? {} : { y: imageY, scale: imageScale, willChange: "transform" }}
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
        <motion.div className="hero-tint absolute inset-0 -z-10" style={reduce ? {} : { opacity: tintOpacity }} aria-hidden />
        <motion.div className="hero-scrim grain absolute inset-0 -z-10" style={reduce ? {} : { opacity: scrimOpacity }} aria-hidden />

        <motion.div
          style={reduce ? {} : { opacity: contentOpacity, y: contentY, willChange: "transform, opacity" }}
          className="relative h-[100dvh]"
        >
          <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-5 pb-10 pt-20 text-center sm:pt-24">
            <motion.p
              {...fade(0.05)}
              className="inline-flex items-center gap-2 rounded-full bg-[#030b1f]/55 px-3.5 py-1.5 text-[10px] sm:px-4 sm:py-2 sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e6eeff] backdrop-blur-md"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf]" aria-hidden />
              Xatirchi tumani hokimligi
            </motion.p>

            <motion.h1
              {...fade(0.14)}
              className="mt-6 text-[32px] font-semibold leading-[1.06] tracking-[-0.04em] text-white text-balance [text-shadow:0_2px_34px_rgba(3,11,31,0.8)] sm:text-[68px] lg:text-[92px]"
            >
              Xalq dardi –<br />
              <span className="text-gradient-sky">davlat e’tiborida.</span>
            </motion.h1>

            <motion.p
              {...fade(0.24)}
              className="mx-auto mt-4 max-w-lg text-[14px] leading-6 text-[#dbe6ff] text-pretty [text-shadow:0_1px_18px_rgba(3,11,31,0.9)] sm:text-[19px] sm:leading-8"
            >
              Murojaat yuboring — natijasi isbot bilan yopiladi.
            </motion.p>

            <motion.div {...fade(0.34)} className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-13 w-full items-center justify-center gap-3 rounded-2xl bg-white px-8 text-[15px] sm:h-14 sm:text-[16px] font-semibold text-[#0a2050] shadow-[0_24px_60px_-20px_rgba(255,255,255,0.55)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
              >
                <Send className="h-[18px] w-[18px]" aria-hidden />
                Ariza yuborish
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </a>
              <Link
                href={hasSession ? "/dashboard" : "/kirish"}
                className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#030b1f]/55 px-7 text-[15px] sm:h-14 sm:text-[16px] font-semibold text-white backdrop-blur-md transition-colors duration-300 hover:bg-[#030b1f]/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                {hasSession ? "Kabinetga o‘tish" : "Saytga kirish"}
              </Link>
            </motion.div>

            <motion.div
              style={reduce ? {} : { opacity: hintOpacity }}
              className="scroll-hint absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
              aria-hidden
            >
              <span className="text-[11px] font-medium tracking-wide text-white/65">pastga</span>
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
   3. MANIFEST — uchta katta gap
   ========================================================================== */

function Manifest() {
  return (
    <section className="bg-background py-16 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-6xl px-5 text-center sm:px-6">
        <Reveal>
          <Eyebrow>Bitta tizim. Bitta yo‘l.</Eyebrow>
        </Reveal>
        <div className="mt-8 space-y-4 text-foreground sm:space-y-6">
          <Statement size="xl" text="Murojaat yuborasiz." />
          <Statement size="xl" text="Tizim nazoratga oladi." accent={["nazoratga"]} />
          <Statement size="xl" text="Natija isbot bilan yopiladi." accent={["isbot"]} />
        </div>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-[18px] sm:leading-8">
            Har bosqich vaqti bilan yoziladi.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* ==========================================================================
   4. QANDAY ISHLAYDI — uch qadam
   ========================================================================== */

const STEPS = [
  { n: "01", icon: Send, t: "Yuborasiz", d: "Telegram bot orqali, istalgan vaqtda." },
  { n: "02", icon: Timer, t: "Nazoratga tushadi", d: "Tashkilot va muddat belgilanadi." },
  { n: "03", icon: Camera, t: "Isbot bilan yopiladi", d: "Foto yuklanadi, hokim tasdiqlaydi." },
]

function HowItWorks() {
  return (
    <section id="qanday" className="scroll-mt-24 bg-card py-16 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <Eyebrow>Qanday ishlaydi</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-[24px] font-semibold leading-[1.1] tracking-[-0.035em] text-foreground text-balance sm:text-[48px]">
            Uch qadam
          </h2>
        </Reveal>

        <ol className="mt-16 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.n} className="h-full">
              <Reveal delay={i * 0.1} className="h-full">
                <div className="flex h-full flex-col rounded-[28px] bg-background p-6 transition-transform duration-300 hover:-translate-y-1 sm:p-10">
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                      <s.icon className="h-[22px] w-[22px]" aria-hidden />
                    </span>
                    <span className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-muted-foreground/25 tabular-nums sm:text-[56px]">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="mt-8 text-[20px] font-semibold tracking-[-0.02em] text-foreground sm:text-[24px]">{s.t}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-muted-foreground sm:text-[16px] sm:leading-7">{s.d}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ==========================================================================
   5. RAHBARIYAT — bir qatorli avtomatik karusel
   --------------------------------------------------------------------------
   Manba: gov.uz/oz/xatirchi/guides. Ro'yxat ikki marta takrorlanadi va
   CSS bilan chapga suriladi — uzluksiz halqa. Ustiga kelinsa / fokuslansa
   to'xtaydi. `prefers-reduced-motion` da harakat yo'q, oddiy gorizontal
   skroll qoladi. Rasm `.sharpen` (feConvolveMatrix) bilan tiniqlashadi.
   ========================================================================== */

function LeaderCard({ r, priority }: { r: Rahbar; priority?: boolean }) {
  return (
    <article className={cn(CARD, "w-[220px] shrink-0 overflow-hidden sm:w-[300px]")}>
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-sunken">
        <Image
          src={r.photo}
          alt={`${r.name} — ${r.position}`}
          fill
          priority={priority}
          quality={95}
          sizes="(max-width: 640px) 220px, 300px"
          className="sharpen object-cover object-top"
        />
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{r.position}</p>
        <h3 className="mt-2 text-[16px] sm:text-[18px] font-semibold leading-snug tracking-[-0.01em] text-foreground text-balance">
          {r.name}
        </h3>
        <dl className="mt-4 space-y-1.5 text-[13px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <dt className="sr-only">Qabul</dt>
            <dd>Qabul: {r.reception}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <dt className="sr-only">Telefon</dt>
            <dd>
              <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="tabular-nums hover:text-foreground">
                {r.phone}
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </article>
  )
}

function Leadership() {
  const reduce = useReducedMotion()
  // Halqa uchun ikki nusxa; reduce'da bitta nusxa va oddiy skroll
  const items = reduce ? RAHBARIYAT : [...RAHBARIYAT, ...RAHBARIYAT]

  return (
    <section id="rahbariyat" className="scroll-mt-24 overflow-hidden bg-background py-16 sm:py-32">
      {/* Tiniqlashtirish filtri — bir marta, sahifa bo'ylab ishlaydi */}
      <svg className="absolute h-0 w-0" aria-hidden focusable="false">
        <filter id="sharpen" colorInterpolationFilters="sRGB">
          <feConvolveMatrix order="3" kernelMatrix="0 -0.6 0 -0.6 3.4 -0.6 0 -0.6 0" preserveAlpha="true" />
        </filter>
      </svg>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <Eyebrow>Rahbariyat</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-[24px] font-semibold leading-[1.1] tracking-[-0.035em] text-foreground text-balance sm:text-[48px]">
            Tuman hokimi va o‘rinbosarlari
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-6 text-muted-foreground sm:text-[16px] sm:leading-7">
            Qabul kunlari — rasmiy manba.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.1} className="mt-14">
        <div
          className={cn(
            "marquee-mask",
            reduce ? "scroll-x flex gap-5 px-5" : "overflow-hidden",
          )}
        >
          <div
            className={cn(
              "flex w-max gap-5",
              !reduce && "marquee-track",
            )}
            style={{ ["--marquee-duration" as string]: `${RAHBARIYAT.length * 7}s` }}
          >
            {items.map((r, i) => (
              <LeaderCard key={`${r.name}-${i}`} r={r} priority={i < 2} />
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal className="mx-auto mt-8 max-w-7xl px-5 text-center sm:px-6">
        <a
          href={RAHBARIYAT_MANBA}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          Manba: gov.uz/oz/xatirchi/guides
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </Reveal>
    </section>
  )
}

/* ==========================================================================
   6. TELEGRAM — asosiy chaqiriq
   ========================================================================== */

function TelegramCta() {
  return (
    <section id="murojaat" className="scroll-mt-24 bg-background px-5 pb-16 sm:px-6 sm:pb-32 lg:px-8">
      <Reveal>
        <div className="landing relative mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-[#061436] px-5 py-12 text-center shadow-[0_60px_140px_-60px_rgba(6,20,54,0.9)] sm:px-12 sm:py-24">
          <div className="halo pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#4d86ff]/28 blur-3xl" aria-hidden />
          <div className="halo pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#2dd4bf]/20 blur-3xl" style={{ animationDelay: "3.5s" }} aria-hidden />

          <div className="relative mx-auto max-w-3xl">
            <Eyebrow onDark>Telegram bot · bepul · 24/7</Eyebrow>
            <h2 className="mt-5 text-[24px] font-semibold leading-[1.08] tracking-[-0.035em] text-white text-balance sm:text-[56px]">
              Hurmatli xatirchiliklar, <span className="text-gradient-sky">muammoingizni ayting.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-[#c3d3f2] sm:text-[17px] sm:leading-8">
              Yozing — javobi Telegram’ga keladi.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 text-[15px] sm:h-16 sm:px-8 sm:text-[17px] font-semibold text-[#0a2050] shadow-[0_24px_70px_-24px_rgba(255,255,255,0.45)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3f6bff] text-white">
                  <Send className="h-[18px] w-[18px]" aria-hidden />
                </span>
                Telegram orqali ariza yuborish
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </a>
              <p className="font-mono text-[13px] text-[#93a9d6]">@{TELEGRAM_BOT}</p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ==========================================================================
   7. DAVLAT XIZMATLARI — ikki qarama-qarshi marquee
   --------------------------------------------------------------------------
   Yuqori qator o'ngga, pastki chapga. Ustiga kelinsa to'xtaydi, havolalar
   klaviatura bilan yetib boriladi (fokuslanganda ham to'xtaydi).
   ========================================================================== */

function SiteChip({ s }: { s: GovSite }) {
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        CARD,
        "group flex h-[64px] w-[240px] shrink-0 items-center gap-3 px-4 sm:h-[72px] sm:w-[320px] sm:gap-4 sm:px-5 transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ",
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
        <Globe2 className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-foreground sm:text-[15px]">{s.name}</span>
        <span className="block truncate text-[12px] text-muted-foreground">{s.hint}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden />
    </a>
  )
}

function MarqueeRow({ items, reverse }: { items: GovSite[]; reverse?: boolean }) {
  const reduce = useReducedMotion()
  const list = reduce ? items : [...items, ...items]
  return (
    <div className={cn("marquee-mask", reduce ? "scroll-x flex gap-4 px-5" : "overflow-hidden")}>
      <div
        className={cn("flex w-max gap-4", !reduce && (reverse ? "marquee-track-reverse" : "marquee-track"))}
        style={{ ["--marquee-duration" as string]: `${items.length * 6}s` }}
      >
        {list.map((s, i) => (
          <SiteChip key={`${s.host}-${i}`} s={s} />
        ))}
      </div>
    </div>
  )
}

function GovServices() {
  return (
    <section id="xizmatlar" className="scroll-mt-24 overflow-hidden bg-card py-16 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <Eyebrow>Davlat xizmatlari</Eyebrow>
          <h2 className="mx-auto mt-5 max-w-3xl text-[24px] font-semibold leading-[1.1] tracking-[-0.035em] text-foreground text-balance sm:text-[48px]">
            Kerakli xizmat bir qadamda
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-6 text-muted-foreground sm:text-[16px] sm:leading-7">
            Umumdavlat portallari — yangi oynada ochiladi.
          </p>
        </Reveal>
      </div>

      <div className="mt-14 space-y-4">
        <Reveal delay={0.05}>
          <MarqueeRow items={DAVLAT_SAYTLARI_1} reverse />
        </Reveal>
        <Reveal delay={0.12}>
          <MarqueeRow items={DAVLAT_SAYTLARI_2} />
        </Reveal>
      </div>
    </section>
  )
}

/* ==========================================================================
   8. ISHONCH — uch qisqa gap
   ========================================================================== */

const TRUST = [
  { icon: Lock, t: "Rolli huquqlar", d: "Har kim faqat o‘z vakolatini ko‘radi." },
  { icon: History, t: "Audit jurnali", d: "Har o‘zgarish vaqti bilan yoziladi." },
  { icon: ShieldCheck, t: "Shaxsiy ma’lumot himoyasi", d: "PNFL — faqat oxirgi 4 raqam." },
]

function Trust() {
  return (
    <section className="bg-background py-16 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <Eyebrow>Xavfsizlik</Eyebrow>
          <Statement className="mx-auto mt-6 max-w-4xl text-foreground" text="Ma’lumot himoyalangan. Jarayon ochiq." accent={["ochiq"]} />
        </Reveal>
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {TRUST.map((item, i) => (
            <Reveal key={item.t} delay={i * 0.08}>
              <div className={cn(CARD, "h-full p-6 sm:p-8")}>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                  <item.icon className="h-[22px] w-[22px]" aria-hidden />
                </span>
                <h3 className="mt-6 text-[18px] font-semibold tracking-[-0.015em] text-foreground sm:text-[20px]">{item.t}</h3>
                <p className="mt-2 text-[14px] leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">{item.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   9. FUTER — rasmiy aloqa (gov.uz/oz/xatirchi dan)
   ========================================================================== */

function Footer({ hasSession }: { hasSession: boolean }) {
  return (
    <footer className="landing bg-[#030b1f] pb-safe text-[#93a9d6]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Reveal className="max-w-sm">
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#0a2050]">
                <Landmark className="h-5 w-5" aria-hidden />
              </span>
              <span className="leading-tight">
                <span className="block text-[15px] font-semibold tracking-tight text-white">e-Hokimiyat</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em]">Xatirchi tumani</span>
              </span>
            </span>
            <p className="mt-5 text-[14px] leading-6">
              Murojaatlar Telegram bot orqali qabul qilinadi.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white">{HOKIMLIK.name}</h2>
            <ul className="mt-6 space-y-3.5 text-[14px]">
              <li className="flex gap-3">
                <MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                <span>{HOKIMLIK.address}</span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                <a href={HOKIMLIK.phoneHref} className="tabular-nums transition-colors hover:text-white">
                  {HOKIMLIK.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                <a href={`mailto:${HOKIMLIK.email}`} className="transition-colors hover:text-white">
                  {HOKIMLIK.email}
                </a>
              </li>
              <li className="flex gap-3">
                <ExternalLink className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                <a href={HOKIMLIK.portal} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
                  gov.uz/oz/xatirchi
                </a>
              </li>
            </ul>
          </Reveal>

          <Reveal delay={0.16}>
          <nav aria-label="Havolalar">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white">Havolalar</h2>
            <ul className="mt-6 space-y-3.5 text-[14px]">
              <li>
                <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-white">
                  Ariza yuborish <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              </li>
              <li>
                <a href="#rahbariyat" className="transition-colors hover:text-white">Rahbariyat va qabul kunlari</a>
              </li>
              <li>
                <a href="#xizmatlar" className="transition-colors hover:text-white">Davlat xizmatlari</a>
              </li>
              <li>
                <Link href={hasSession ? "/dashboard" : "/kirish"} className="transition-colors hover:text-white">
                  Xodimlar uchun kirish
                </Link>
              </li>
            </ul>
          </nav>
          </Reveal>
        </div>

        <div className="mt-16 flex flex-col gap-3 pt-8 text-[12px] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Xatirchi tumani hokimligi.</p>
          <p className="font-mono text-[#5f74a1]">@{TELEGRAM_BOT}</p>
        </div>
      </div>
    </footer>
  )
}

/* ==========================================================================
   YIG'MA
   ========================================================================== */

export default function EHokimiyatLanding() {
  const router = useRouter()
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    setHasSession(Boolean(getAccessToken()))
  }, [])

  /* /kirish sahifasini oldindan yuklab qo'yamiz — tugma bosilganda kutish yo'q */
  useEffect(() => {
    router.prefetch("/kirish")
  }, [router])

  return (
    <div className="landing min-h-dvh bg-background">
      <a
        href="#qanday"
        className="sr-only rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[110]"
      >
        Asosiy kontentga o&apos;tish
      </a>

      <Nav hasSession={hasSession} />
      <Hero hasSession={hasSession} />

      <main>
        <Manifest />
        <HowItWorks />
        <Leadership />
        <TelegramCta />
        <GovServices />
        <Trust />
      </main>

      <Footer hasSession={hasSession} />
    </div>
  )
}
