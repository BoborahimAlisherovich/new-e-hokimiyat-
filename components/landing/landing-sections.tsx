"use client"

import type React from "react"
import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Bot,
  Camera,
  Check,
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

/* ==========================================================================
   DIZAYN QOIDALARI (butun fayl bo'ylab bir xil):
     · Chegara ishlatilmaydi. Elementlar OQ karta + och fon kontrasti va
       juda yumshoq, tarqoq soya bilan ajratiladi.
     · Bo'shliq ko'p: bo'lim ritmi py-24/py-32, karta ichi p-8, gap-6/8.
     · Tipografika ierarxiyasi: mikro-yorliq (11px, uppercase, tracking) →
       sarlavha (semibold, tight tracking) → matn (15px, muted).
     · Akсent rangi faqat CTA, faol holat va muhim ikonkalarda.
     · Radius yirik va bir xil: karta 24px (rounded-3xl), ikonka 16px.
   ========================================================================== */

/** Yumshoq, tarqoq soya — qattiq chegara o'rniga */
const CARD = "rounded-3xl bg-card shadow-[0_1px_2px_rgba(13,21,36,0.04),0_14px_40px_-18px_rgba(13,21,36,0.14)]"
const CARD_HOVER =
  "transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(13,21,36,0.05),0_26px_60px_-22px_rgba(13,21,36,0.22)]"
/** Och fonli, chegarasiz ichki blok (oq bo'lim ustida) */
const TILE = "rounded-3xl bg-background"

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

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  )
}

function SectionHead({
  label,
  title,
  lead,
  center,
}: {
  label: string
  title: React.ReactNode
  lead?: string
  center?: boolean
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      <MicroLabel>{label}</MicroLabel>
      <h2 className="mt-4 text-[32px] font-semibold leading-[1.12] tracking-[-0.028em] text-foreground text-balance sm:text-[42px]">
        {title}
      </h2>
      {lead && (
        <p className="mt-5 text-[17px] leading-8 text-muted-foreground text-pretty">{lead}</p>
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

export function HowItWorks() {
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
            <Reveal key={s.n} delay={i * 0.07}>
              <li className={cn(CARD, CARD_HOVER, "flex h-full flex-col p-8")}>
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
                <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{s.d}</p>
              </li>
            </Reveal>
          ))}
        </ol>

        {/* Namuna: murojaat holati foydalanuvchiga shunday ko'rinadi */}
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
              «Buğirdoq MFY — ko&apos;cha yorug&apos;ligi ishlamaydi»
            </p>

            <ol className="mt-7 space-y-5">
              {[
                { t: "Qabul qilindi", s: "Telegram bot · 09:14", done: true },
                { t: "Sohaga yo'naltirildi", s: "Energetika · 09:15", done: true },
                { t: "Ijroda", s: "Tuman elektr tarmoqlari", done: true },
                { t: "Isbot yuklandi", s: "3 foto · tasdiq kutilmoqda", done: false },
              ].map((step, i, arr) => (
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
                    <span className="block text-[13px] text-muted-foreground">{step.s}</span>
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

/* ============================================================ 2. IMKONIYATLAR */

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

export function Features() {
  return (
    <section id="imkoniyat" className="scroll-mt-24 bg-card py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <SectionHead
            center
            label="Tizim imkoniyatlari"
            title="Qog'oz va messenjerlar o'rniga — bitta tizim"
            lead="Ilgari topshiriqlar daftarda va guruhlarda yurar, kim nima qilayotgani aniq bilinmasdi. Endi hamma narsa bir joyda va nazorat ostida."
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
                <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{f.d}</p>
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
    <section id="murojaat" className="scroll-mt-24 bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <div className="landing relative overflow-hidden rounded-[36px] bg-[#061436] px-8 py-14 sm:px-12 sm:py-20 lg:px-16">
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
                <p className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#bcd0f7]">
                  <Bot className="h-3.5 w-3.5" aria-hidden />
                  Telegram bot · bepul · 24/7
                </p>

                <h2 className="mt-7 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-white text-balance sm:text-[46px]">
                  Hurmatli Xatirchiliklar,{" "}
                  <span className="text-gradient-sky">muammolaringizni ayting!</span>
                </h2>

                <p className="mt-5 text-[17px] leading-8 text-[#c3d3f2] text-pretty">
                  Qaysi masala bo&apos;lsa ham yozing — murojaatingiz raqam oladi,
                  mas&apos;ul tashkilotga yo&apos;naltiriladi va muddati nazoratga
                  tushadi. Javobni Telegram orqali olasiz.
                </p>

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
                    className="group inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-white px-8 text-[15px] font-semibold text-[#0a2050] shadow-[0_20px_60px_-20px_rgba(255,255,255,0.4)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Send className="h-[18px] w-[18px]" aria-hidden />
                    Telegram orqali ariza yuborish
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden
                    />
                  </a>
                  <p className="font-mono text-[13px] text-[#93a9d6]">@{TELEGRAM_BOT}</p>
                </div>
              </div>

              {/* Telefon ko'rinishi */}
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

/* ============================================================== 4. ONEID */

export function OneIdSection() {
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
              <MicroLabel>Yagona identifikatsiya</MicroLabel>

              <h2 className="mt-4 text-[30px] font-semibold leading-[1.14] tracking-[-0.028em] text-foreground text-balance sm:text-[36px]">
                OneID orqali ro&apos;yxatdan o&apos;tish
              </h2>

              <p className="mt-5 text-[17px] leading-8 text-muted-foreground text-pretty">
                Davlat xizmatlarining yagona identifikatsiya tizimi orqali
                shaxsingizni tasdiqlang. Shundan so&apos;ng murojaatlaringiz
                bitta shaxsiy kabinetda to&apos;planadi.
              </p>

              <ul className="mt-8 space-y-4">
                {[
                  "Shaxsni bir marta tasdiqlaysiz — keyin qayta ma'lumot kiritish shart emas",
                  "Murojaatlar tarixi va javoblar bir joyda saqlanadi",
                  "PNFL to'liq ko'rinmaydi — tizimda faqat oxirgi 4 raqami saqlanadi",
                ].map((item) => (
                  <li key={item} className="flex gap-3.5 text-[15px] leading-7 text-foreground">
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
    <section id="ishonch" className="scroll-mt-24 bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal>
          <SectionHead
            label="Xavfsizlik va ishonch"
            title="Ma'lumot himoyalangan, jarayon qaytarib bo'lmaydigan"
            lead="Davlat tizimi uchun ishonch bezak emas — talab. Har bir amal iz qoldiradi va har bir foydalanuvchi faqat o'z vakolatidagi ma'lumotga ega."
          />
        </Reveal>

        <div className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.map((item, i) => (
            <Reveal key={item.t} delay={(i % 3) * 0.06}>
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-primary shadow-[0_1px_2px_rgba(13,21,36,0.04),0_10px_28px_-16px_rgba(13,21,36,0.2)]">
                  <item.icon className="h-[22px] w-[22px]" aria-hidden />
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-[-0.01em] text-foreground">
                  {item.t}
                </h3>
                <p className="mt-2.5 text-[15px] leading-7 text-muted-foreground">{item.d}</p>
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
