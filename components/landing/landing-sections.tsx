"use client"

import type React from "react"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  Bot,
  Camera,
  ClipboardCheck,
  Eye,
  FileCheck2,
  Fingerprint,
  Globe2,
  History,
  Landmark,
  Lock,
  Map as MapIcon,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ONEID_URL, OneIdMark } from "./login-modal"
import { TELEGRAM_BOT, TELEGRAM_URL } from "./landing-hero"

/* ------------------------------------------------------- Aylantirib ochish */

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
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

function SectionHead({
  eyebrow,
  title,
  lead,
  center,
}: {
  eyebrow: string
  title: React.ReactNode
  lead?: string
  center?: boolean
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-2.5 text-3xl font-extrabold leading-tight tracking-[-0.025em] text-foreground text-balance sm:text-4xl">
        {title}
      </h2>
      {lead && (
        <p className="mt-3.5 text-[15px] leading-7 text-muted-foreground">{lead}</p>
      )}
    </div>
  )
}

/* ============================================================ 1. QANDAY ISHLAYDI */

const STEPS = [
  {
    icon: Send,
    n: "01",
    t: "Murojaat yuborasiz",
    d: "Telegram bot orqali kunning istalgan vaqtida. Matn, foto, video yoki hujjat biriktirishingiz mumkin. Murojaatingiz darhol raqam oladi.",
  },
  {
    icon: Sparkles,
    n: "02",
    t: "Tizim saralaydi",
    d: "Sun'iy intellekt murojaatni o'qib, qaysi sohaga tegishli ekanini aniqlaydi va ustuvorlik darajasini belgilaydi. Adres va hudud ajratiladi.",
  },
  {
    icon: ClipboardCheck,
    n: "03",
    t: "Tashkilot ijroga oladi",
    d: "Murojaat mas'ul tashkilotga yo'naltiriladi, muddat belgilanadi. Muddat tugashiga oz qolganda tizim o'zi eslatadi.",
  },
  {
    icon: FileCheck2,
    n: "04",
    t: "Natija tasdiqlanadi",
    d: "Ijrochi bajarilgan ishni foto va hujjat bilan isbotlaydi, hokim tasdiqlaydi. Siz javobni olib, xizmatni baholaysiz.",
  },
]

export function HowItWorks() {
  return (
    <section id="qanday" className="scroll-mt-20 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHead
            eyebrow="Murojaat yo'li"
            title={
              <>
                To&apos;rt qadam — va murojaatingiz{" "}
                <span className="text-primary">nazoratda</span>
              </>
            }
            lead="Har bir bosqich vaqti bilan qayd etiladi. Murojaat “yo'qolib qolishi” yoki e'tibordan chetda qolishi mumkin emas."
          />
        </Reveal>

        <ol className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <li className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                <span
                  className="absolute -right-3 -top-4 text-6xl font-black tabular-nums text-primary/[0.07] transition-colors group-hover:text-primary/[0.13]"
                  aria-hidden
                >
                  {s.n}
                </span>
                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                  <s.icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="relative mt-4 text-md font-bold text-foreground">{s.t}</h3>
                <p className="relative mt-2 text-sm leading-6 text-muted-foreground">{s.d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ============================================================ 2. IMKONIYATLAR */

const FEATURES = [
  {
    icon: Timer,
    t: "Muddat nazorati",
    d: "Har bir topshiriqda aniq muddat bor. Tugashiga oz qolganda tizim o'zi eslatadi, kechiksa alohida belgilanadi va rahbariyat ro'yxatiga tushadi.",
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
    d: "Murojaatlarni saralaydi, takrorlanganlarini aniqlaydi, kechikkanlarni ajratadi va rahbariyat uchun kunlik xulosa tayyorlaydi.",
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

export function Features() {
  return (
    <section id="imkoniyat" className="scroll-mt-20 bg-surface-sunken py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHead
            center
            eyebrow="Tizim imkoniyatlari"
            title="Qog'oz va messenjerlar o'rniga — bitta tizim"
            lead="Ilgari topshiriqlar daftarda va guruhlarda yurar, kim nima qilayotgani aniq bilinmasdi. Endi hamma narsa bir joyda va nazorat ostida."
          />
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 0.07}>
              <article className="h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-md">
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    TONES[f.tone],
                  )}
                >
                  <f.icon className="h-5.5 w-5.5" aria-hidden />
                </span>
                <h3 className="mt-4 text-md font-bold text-foreground">{f.t}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.d}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ========================================================= 3. TELEGRAM CTA */

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

export function TelegramCta() {
  return (
    <section id="murojaat" className="scroll-mt-20 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="landing relative overflow-hidden rounded-[32px] bg-[#061436] px-6 py-12 sm:px-10 sm:py-16 lg:px-16">
            {/* Nurlar */}
            <div
              className="halo pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#4d86ff]/30 blur-3xl"
              aria-hidden
            />
            <div
              className="halo pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#2dd4bf]/22 blur-3xl"
              style={{ animationDelay: "3.5s" }}
              aria-hidden
            />

            <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-[#bcd0f7]">
                  <Bot className="h-3.5 w-3.5" aria-hidden />
                  Telegram bot · bepul · 24/7
                </p>

                <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-[-0.025em] text-white text-balance sm:text-[40px]">
                  Hurmatli Xatirchiliklar,{" "}
                  <span className="text-gradient-sky">muammolaringizni ayting!</span>
                </h2>

                <p className="mt-4 text-[15px] leading-7 text-[#c3d3f2]">
                  Qaysi masala bo&apos;lsa ham yozing — murojaatingiz raqam oladi,
                  mas&apos;ul tashkilotga yo&apos;naltiriladi va muddati nazoratga
                  tushadi. Javobni Telegram orqali olasiz.
                </p>

                <ul className="mt-6 flex flex-wrap gap-2">
                  {TOPICS.map((topic) => (
                    <li
                      key={topic}
                      className="rounded-full border border-white/14 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-[#cfdcf7]"
                    >
                      {topic}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href={TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-white px-7 text-[15px] font-bold text-[#0a2050] shadow-[0_18px_50px_-16px_rgba(255,255,255,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Send className="h-[18px] w-[18px]" aria-hidden />
                    Telegram orqali ariza yuborish
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </a>
                  <p className="font-mono text-sm text-[#a9bde4]">@{TELEGRAM_BOT}</p>
                </div>
              </div>

              {/* Telefon ko'rinishi */}
              <div className="relative mx-auto hidden w-[260px] lg:block" aria-hidden>
                <div className="rounded-[34px] border border-white/14 bg-[#030b1f] p-2.5 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]">
                  <div className="overflow-hidden rounded-[26px] bg-[#0a1730]">
                    <div className="flex items-center gap-2 border-b border-white/8 px-3.5 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#4d86ff] to-[#2dd4bf] text-[#030b1f]">
                        <Landmark className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-bold text-white">
                          Xatirchi Murojaat
                        </span>
                        <span className="block text-[10px] text-[#2dd4bf]">bot</span>
                      </span>
                    </div>

                    <div className="space-y-2 p-3.5">
                      <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/[0.08] px-3 py-2 text-[11px] leading-5 text-[#dbe6ff]">
                        Assalomu alaykum! Murojaatingizni yozing yoki foto
                        yuboring.
                      </p>
                      <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#4d86ff] to-[#3a6ee0] px-3 py-2 text-[11px] leading-5 text-white">
                        Ko&apos;chamizda chiroq yonmaydi
                      </p>
                      <p className="max-w-[90%] rounded-2xl rounded-bl-md bg-white/[0.08] px-3 py-2 text-[11px] leading-5 text-[#dbe6ff]">
                        Qabul qilindi ✅ Raqam:{" "}
                        <span className="font-mono">XT-2026-000412</span>
                        <br />
                        Energetika sohasiga yo&apos;naltirildi.
                      </p>
                      <p className="max-w-[70%] rounded-2xl rounded-bl-md bg-white/[0.08] px-3 py-2 text-[11px] leading-5 text-[#9fb6e4]">
                        Holatni tekshirish uchun raqamni yuboring
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-[#6b81b0]">
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

/* ============================================================== 4. ONEID */

export function OneIdSection() {
  const [note, setNote] = useState(false)

  return (
    <section className="bg-surface-sunken py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="grid items-center gap-8 rounded-3xl border border-border bg-card p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-14">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-primary-soft-foreground">
                <Fingerprint className="h-3.5 w-3.5" aria-hidden />
                Yagona identifikatsiya
              </span>

              <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.02em] text-foreground text-balance sm:text-3xl">
                OneID orqali ro&apos;yxatdan o&apos;tish
              </h2>

              <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                Davlat xizmatlarining yagona identifikatsiya tizimi orqali
                shaxsingizni tasdiqlang. Shundan so&apos;ng barcha
                murojaatlaringiz bitta shaxsiy kabinetda to&apos;planadi:
                holatini kuzatasiz, javoblarni saqlaysiz va xizmatni baholaysiz.
              </p>

              <ul className="mt-5 space-y-2.5">
                {[
                  "Shaxsni bir marta tasdiqlaysiz — keyin qayta ma'lumot kiritish shart emas",
                  "Murojaatlar tarixi va javoblar bir joyda saqlanadi",
                  "PNFL to'liq ko'rinmaydi — tizimda faqat oxirgi 4 raqami saqlanadi",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-6 text-foreground">
                    <ShieldCheck
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 text-success"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full lg:w-72">
              {ONEID_URL ? (
                <a
                  href={ONEID_URL}
                  className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 text-[15px] font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <OneIdMark className="bg-white text-[#0a2050]" />
                  OneID bilan boshlash
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setNote(true)}
                  className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 text-[15px] font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <OneIdMark className="bg-white text-[#0a2050]" />
                  OneID bilan boshlash
                </button>
              )}

              {note && !ONEID_URL && (
                <p
                  role="status"
                  className="mt-3 rounded-xl bg-info-soft px-3 py-2.5 text-xs leading-5 text-info-soft-foreground"
                >
                  OneID ulanishi sozlanmoqda. Hozircha murojaatni Telegram bot
                  orqali yuborishingiz mumkin — bu ham to&apos;liq nazoratga
                  olinadi.
                </p>
              )}

              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border text-sm font-semibold text-foreground transition-colors hover:bg-muted"
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

/* ========================================================== 5. XAVFSIZLIK */

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

export function Trust() {
  return (
    <section id="ishonch" className="scroll-mt-20 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHead
            eyebrow="Xavfsizlik va ishonch"
            title="Ma'lumot himoyalangan, jarayon qaytarib bo'lmaydigan"
            lead="Davlat tizimi uchun ishonch bezak emas — talab. Har bir amal iz qoldiradi va har bir foydalanuvchi faqat o'z vakolatidagi ma'lumotga ega."
          />
        </Reveal>

        <div className="mt-12 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.map((item, i) => (
            <Reveal key={item.t} delay={(i % 3) * 0.06}>
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-md font-bold text-foreground">{item.t}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================== 6. FUTER */

export function Footer({ onLogin }: { onLogin: () => void }) {
  return (
    <footer className="landing bg-[#030b1f] pb-safe text-[#a9bde4]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="max-w-sm">
            <span className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4d86ff] to-[#2dd4bf] text-[#030b1f]">
                <Landmark className="h-5 w-5" aria-hidden />
              </span>
              <span className="leading-tight">
                <span className="block text-[15px] font-extrabold tracking-tight text-white">
                  e-Hokimiyat
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em]">
                  Xatirchi tumani
                </span>
              </span>
            </span>
            <p className="mt-4 text-sm leading-6">
              Topshiriqlar ijrosi va fuqarolar murojaatlari nazorati axborot
              tizimi. Murojaatlar Telegram bot orqali qabul qilinadi va bitta
              tizimda nazoratga olinadi.
            </p>
          </div>

          <nav aria-label="Fuqarolar uchun">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">
              Fuqarolar uchun
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white hover:underline"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  Ariza yuborish (@{TELEGRAM_BOT})
                </a>
              </li>
              <li>
                <a href="#qanday" className="hover:text-white hover:underline">
                  Murojaat qanday ko&apos;riladi
                </a>
              </li>
              <li>
                <a href="#murojaat" className="hover:text-white hover:underline">
                  Qaysi masalalar bo&apos;yicha yozish mumkin
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Xodimlar uchun">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">
              Xodimlar uchun
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={onLogin}
                  className="hover:text-white hover:underline"
                >
                  Tizimga kirish
                </button>
              </li>
              <li>
                <a href="#imkoniyat" className="hover:text-white hover:underline">
                  Tizim imkoniyatlari
                </a>
              </li>
              <li>
                <a href="#ishonch" className="hover:text-white hover:underline">
                  Xavfsizlik talablari
                </a>
              </li>
            </ul>
            {/* TODO(hokimlik): rasmiy manzil, telefon va ishonch telefonini
                shu yerga qo'shish kerak. Taxminiy raqam yozilmadi. */}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs">
            © {new Date().getFullYear()} Xatirchi tumani hokimligi. Barcha
            huquqlar himoyalangan.
          </p>
          <p className="flex items-center gap-1.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-[#2dd4bf]" aria-hidden />
            Shoshilinch holatlarda tegishli favqulodda xizmatlarga murojaat qiling.
          </p>
        </div>
      </div>
    </footer>
  )
}
