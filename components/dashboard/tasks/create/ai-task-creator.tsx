"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Pencil,
  Send,
  Sparkles,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { aiAnalyzeTask } from "@/lib/api/tasks.api"
import { VoiceRecorder } from "@/components/chat/voice-recorder"
import { AiRobot, VoiceWave, type RobotState } from "./ai-robot"
import { addDays, putAiPrefill, type AiPrefill } from "./wizard-types"

/**
 * AI ORQALI TOPSHIRIQ YARATISH
 *
 * Hokim topshiriqni ovoz bilan aytadi yoki yozadi, AI uni maydonlarga
 * ajratadi, foydalanuvchi tasdiqlaydi — va wizard to'ldirilgan holda
 * ochiladi. Hech narsa AI'ning o'zi tomonidan yuborilmaydi: yaratishdan
 * oldin odam ko'rib chiqadi.
 *
 * DIZAYN — 2-tahrir.
 * Ilgari bu ekran quyuq siyoh rangli panel edi va butun sayt yorug'
 * bo'lgani uchun undan «boshqa mahsulot» kabi ajralib turardi. Endi
 * ekran saytning o'z dizayn tizimida:
 *   · faqat token ranglar (bg-card / bg-background / text-muted-foreground),
 *     shuning uchun dark tema ham avtomatik ishlaydi;
 *   · chegara yo'q — sirt kontrasti va yumshoq soya ajratadi;
 *   · robot ranglari `--robot-*` orqali yorug' palitraga o'tkazildi
 *     (robot komponentining o'zi o'zgarmadi — u shu o'zgaruvchilarni oladi).
 *
 * Mikrofon: `MediaRecorder` oqimi HAR HOLATDA to'xtatiladi — komponent
 * unmount bo'lganda ham.
 */

type Suggestion = {
  title?: string
  description?: string
  priority?: string
  category?: string
  sector_name?: string
  organization_ids?: string[]
  organization_names?: string[]
  is_recurring?: boolean
  frequency?: string | null
  deadline_days?: number
}

type Turn =
  | { role: "user"; text: string }
  | { role: "ai"; text?: string; suggestion?: Suggestion }
  | { role: "error"; text: string }

const QUICK_PROMPTS: { title: string; hint: string; text: string }[] = [
  {
    title: "Haftalik obodonlashtirish hisoboti",
    hint: "Har dushanba · mahalla raislari",
    text:
      "Har dushanba kuni tuman obodonlashtirish holati haqida hisobot berilsin. " +
      "Mas'ul — obodonlashtirish bo'limi. Muhimlik oddiy.",
  },
  {
    title: "Muddati kechikkanlarni so‘rash",
    hint: "Ijroda 7 kundan oshgan topshiriqlar",
    text:
      "Muddati kechikkan topshiriqlar bo'yicha tushuntirish xati talab qilinsin, " +
      "muddati uch kun, muhimligi yuqori.",
  },
  {
    title: "Qish mavsumiga tayyorgarlik",
    hint: "Ta’lim va sog‘liqni saqlash",
    text:
      "Maktab va shifoxonalarda issiqlik tizimini tekshirish topshirilsin. " +
      "Muhimlik favqulodda, muddati besh kun.",
  },
]

/** Robot ranglari — yorug' palitra, saytning ko'k aksenti bilan */
const ROBOT_VARS = {
  "--robot-body-1": "#dde7fb",
  "--robot-body-2": "#bccfef",
  "--robot-face-1": "#16224a",
  "--robot-face-2": "#243766",
  "--robot-accent": "#3366ff",
  "--robot-shadow": "#7f95c4",
} as React.CSSProperties

/** Yumshoq soyali oq karta — butun saytdagi kabi */
const CARD =
  "rounded-3xl bg-card shadow-[0_1px_2px_rgba(13,21,36,0.04),0_14px_40px_-18px_rgba(13,21,36,0.14)]"

export function AiTaskCreator() {
  const router = useRouter()

  const [turns, setTurns] = useState<Turn[]>([])
  const [text, setText] = useState("")
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const liveRef = useRef<HTMLDivElement | null>(null)

  const state: RobotState = recording
    ? "listening"
    : busy
      ? "thinking"
      : turns.some((t) => t.role === "ai" && t.suggestion)
        ? "done"
        : "idle"

  const statusText = recording
    ? "Tinglayapman…"
    : busy
      ? "O‘ylayapman…"
      : turns.length === 0
        ? "Topshiriqni ayting — qolganini o‘zim to‘ldiraman"
        : "Yana bir topshiriq aytishingiz mumkin"

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [turns, busy])

  function announce(t: string) {
    if (liveRef.current) liveRef.current.textContent = t
  }

  /* ------------------------------------------------------------- Tahlil */
  const analyze = useCallback(
    async (payload: { text?: string; audio?: Blob }, echo?: string) => {
      setBusy(true)
      setMicError(null)
      if (echo) setTurns((prev) => [...prev, { role: "user", text: echo }])

      try {
        const res: any = await aiAnalyzeTask(payload)
        const s: Suggestion = res?.suggestions ?? {}
        const transcription: string = res?.transcription ?? ""

        setTurns((prev) => {
          const next = [...prev]
          // Ovozli xabarda foydalanuvchi gapini transkripsiya bilan almashtiramiz
          if (!echo && transcription) next.push({ role: "user", text: transcription })
          next.push({ role: "ai", suggestion: s })
          return next
        })
        announce("AI topshiriqni tahlil qildi. Tekshirib tasdiqlang.")
      } catch (err: any) {
        const message =
          err?.data?.error ||
          err?.data?.detail ||
          err?.message ||
          "AI tahlil qilib bo‘lmadi. Matnni qo‘lda kiritib ko‘ring."
        setTurns((prev) => [...prev, { role: "error", text: message }])
        announce("Xatolik yuz berdi.")
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  /* --------------------------------------------------------- Ovoz yozish */
  /**
   * Ovoz yozish endi umumiy `VoiceRecorder` komponentida — chatdagi
   * bilan BIR XIL xatti-harakat: bosib turing, qo'yib yuborsangiz ketadi,
   * chapga sursangiz bekor bo'ladi.
   *
   * Ilgari bu yerda alohida `MediaRecorder` mantig'i yotardi va u
   * chatdagidan farq qilardi: bir marta bosib boshlash, yana bosib
   * to'xtatish. Bir tizimda ovoz yozishning ikki xil usuli bo'lishi —
   * foydalanuvchi uchun eng tez unutiladigan narsa.
   */
  const handleVoice = useCallback(
    async (recorded: { blob: Blob }) => {
      setMicError(null)
      await analyze({ audio: recorded.blob })
    },
    [analyze],
  )

  /* -------------------------------------------------- Wizard'ga o'tkazish */
  const useSuggestion = useCallback(
    (s: Suggestion) => {
      const prefill: AiPrefill = {
        title: s.title,
        description: s.description,
        sectorName: s.sector_name ?? s.category,
        organizationNames: s.organization_names,
        priority: s.priority,
        deadline:
          typeof s.deadline_days === "number" && s.deadline_days > 0
            ? addDays(s.deadline_days)
            : undefined,
      }
      putAiPrefill(prefill)
      router.push("/dashboard/tasks/new")
    },
    [router],
  )

  /* ------------------------------------------------------------------ RENDER */
  return (
    <div className={cn(CARD, "overflow-hidden")} style={ROBOT_VARS}>
      <div ref={liveRef} role="status" aria-live="polite" className="sr-only" />

      <div className="grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* ------------------------------------------------------- CHAP PANEL
            Cho'kkan sirt (bg-background) — chegara emas, kontrast ajratadi */}
        <div className="flex flex-col items-center bg-background px-6 py-8">
          <AiRobot
            state={state}
            className="h-40 w-40 sm:h-48 sm:w-48"
            label={`AI yordamchi — ${statusText}`}
          />

          <p className="mt-4 text-center text-[17px] font-semibold leading-6 tracking-[-0.01em] text-foreground text-balance">
            {statusText}
          </p>
          <p className="mt-2 text-center text-[13px] leading-6 text-muted-foreground text-pretty">
            Masalan: «Mahalla markazidagi maktab yo‘lini ta’mirlash bo‘yicha
            qurilish bo‘limiga favqulodda topshiriq bering, muddati besh kun»
          </p>

          <VoiceWave active={recording} className="mt-5 w-full max-w-[280px]" />

          {/*
            Mikrofon — chatdagi bilan bir xil komponent, «round» ko'rinishi.
            Bosib turing va gapiring; qo'yib yuborsangiz AI ga ketadi,
            chapga sursangiz bekor bo'ladi (yozuv umuman saqlanmaydi).
          */}
          <VoiceRecorder
            variant="round"
            onRecorded={handleVoice}
            busy={busy}
            onRecordingChange={setRecording}
            className="mt-1"
          />

          {micError && (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-2xl bg-destructive-soft px-3.5 py-2.5 text-[13px] leading-6 text-destructive-soft-foreground"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {micError}
            </p>
          )}

          {/* Tez shablonlar */}
          <div className="mt-8 w-full">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Tez shablonlar
            </p>
            <div className="space-y-3">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  disabled={busy || recording}
                  onClick={() => void analyze({ text: p.text }, p.text)}
                  className="block w-full rounded-2xl bg-card px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(13,21,36,0.04),0_8px_24px_-14px_rgba(13,21,36,0.16)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(13,21,36,0.05),0_18px_40px_-18px_rgba(13,21,36,0.22)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                >
                  <span className="block text-sm font-semibold text-foreground">
                    {p.title}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                    {p.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- O'NG PANEL */}
        <div className="flex min-h-[480px] flex-col px-6 py-8">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Suhbat
              </p>
              <p className="text-[13px] text-muted-foreground">
                Aytganingizni maydonlarga ajratib beraman
              </p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
            {turns.length === 0 && !busy && (
              <div className="rounded-2xl bg-background px-5 py-8 text-center text-[14px] leading-7 text-muted-foreground">
                Hozircha bo‘sh. Mikrofonni bosib gapiring, shablon tanlang yoki
                pastdagi maydonga yozing.
              </div>
            )}

            {turns.map((t, i) => {
              if (t.role === "user") {
                return (
                  <div
                    key={i}
                    className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-6 text-primary-foreground"
                  >
                    {t.text}
                  </div>
                )
              }

              if (t.role === "error") {
                return (
                  <div
                    key={i}
                    role="alert"
                    className="max-w-[88%] rounded-2xl rounded-bl-md bg-destructive-soft px-4 py-2.5 text-sm leading-6 text-destructive-soft-foreground"
                  >
                    {t.text}
                  </div>
                )
              }

              return (
                <SuggestionCard
                  key={i}
                  suggestion={t.suggestion ?? {}}
                  onUse={useSuggestion}
                />
              )
            })}

            {busy && (
              <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md bg-background px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Tahlil qilinmoqda…
              </div>
            )}
          </div>

          {/* Matn kirituvchi */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const value = text.trim()
              if (!value || busy) return
              setText("")
              void analyze({ text: value }, value)
            }}
            className="mt-4 flex items-end gap-2.5"
          >
            <label htmlFor="ai-text" className="sr-only">
              Topshiriqni yozing
            </label>
            <textarea
              id="ai-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  ;(e.currentTarget.form as HTMLFormElement | null)?.requestSubmit()
                }
              }}
              rows={2}
              placeholder="Yoki shu yerga yozing…"
              disabled={busy}
              className="min-h-11 flex-1 resize-y rounded-2xl bg-background px-4 py-3 text-sm leading-6 text-foreground shadow-[inset_0_0_0_1px_var(--border)] outline-none transition-shadow placeholder:text-muted-foreground focus:shadow-[inset_0_0_0_1.5px_var(--primary)] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:translate-y-0 disabled:opacity-40"
            >
              <Send className="h-4 w-4" aria-hidden />
              <span className="sr-only">Yuborish</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------ AI TAKLIF KARTASI */

function SuggestionCard({
  suggestion,
  onUse,
}: {
  suggestion: Suggestion
  onUse: (s: Suggestion) => void
}) {
  const rows: [string, string][] = []
  if (suggestion.title) rows.push(["Sarlavha", suggestion.title])
  const sector = suggestion.sector_name ?? suggestion.category
  if (sector) rows.push(["Soha", sector])
  if (suggestion.organization_names?.length)
    rows.push(["Tashkilot", suggestion.organization_names.join(", ")])
  if (suggestion.priority) rows.push(["Muhimlik", priorityLabel(suggestion.priority)])
  if (suggestion.is_recurring)
    rows.push([
      "Takrorlanish",
      `${frequencyLabel(suggestion.frequency)} · har biriga ${
        suggestion.deadline_days ?? "—"
      } kun`,
    ])
  else if (typeof suggestion.deadline_days === "number")
    rows.push(["Muddat", `${suggestion.deadline_days} kun ichida`])

  const empty = rows.length === 0

  return (
    <div className="max-w-full rounded-2xl rounded-bl-md bg-background p-5 text-sm">
      {empty ? (
        <p className="leading-7 text-muted-foreground">
          AI topshiriqni ajratib olmadi. Iltimos, aniqroq aytib ko‘ring: nima
          qilinishi kerak, qaysi tashkilot va qanday muddatda.
        </p>
      ) : (
        <>
          <p className="text-[14px] font-medium leading-6 text-foreground">
            Topshiriqni shunday tushundim — tekshirib tasdiqlang:
          </p>

          {suggestion.description && (
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-card px-3.5 py-3 text-[13px] leading-6 text-muted-foreground">
              {suggestion.description}
            </p>
          )}

          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="min-w-0 font-semibold text-foreground">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onUse(suggestion)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Topshiriqni yaratish
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onUse(suggestion)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-card px-4 text-[13px] font-semibold text-foreground shadow-[0_1px_2px_rgba(13,21,36,0.04),0_8px_24px_-14px_rgba(13,21,36,0.16)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Tahrirlash
            </button>
          </div>
          <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
            Ikkisi ham formani to‘ldirilgan holda ochadi — topshiriq siz
            tasdiqlaguningizcha yuborilmaydi.
          </p>
        </>
      )}
    </div>
  )
}

function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    FAVQULODDA: "Favqulodda",
    YUQORI: "Yuqori",
    ODDIY: "Oddiy",
    PAST: "Past",
  }
  return map[p] ?? p
}

function frequencyLabel(f?: string | null): string {
  const map: Record<string, string> = {
    DAILY: "Har kuni",
    WEEKLY: "Har hafta",
    BIWEEKLY: "Ikki haftada bir",
    MONTHLY: "Har oy",
    QUARTERLY: "Har chorakda",
    YEARLY: "Har yili",
  }
  return f ? (map[f] ?? f) : "—"
}

export default AiTaskCreator
