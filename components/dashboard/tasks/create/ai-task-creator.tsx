"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Mic,
  Pencil,
  Send,
  Square,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { aiAnalyzeTask } from "@/lib/api/tasks.api"
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
 * Mikrofon: `MediaRecorder` oqimi HAR HOLATDA to'xtatiladi — komponent
 * unmount bo'lganda ham. (Loyihaning chat qismida shu qilinmagani uchun
 * sahifadan chiqib ketilsa mikrofon yoniq qolardi.)
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

export function AiTaskCreator() {
  const router = useRouter()

  const [turns, setTurns] = useState<Turn[]>([])
  const [text, setText] = useState("")
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const cancelledRef = useRef(false)
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

  /* --------------------------------------------------- Mikrofonni tozalash */
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      // Sahifadan chiqilganda yozuv to'xtaydi va natija ISHLATILMAYDI
      cancelledRef.current = true
      try {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop()
      } catch {
        /* ignore */
      }
      stopStream()
    }
  }, [stopStream])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
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
  const startRecording = useCallback(async () => {
    setMicError(null)
    cancelledRef.current = false

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicError("Bu brauzer mikrofonni qo‘llab-quvvatlamaydi. Matn orqali yozing.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })
        stopStream()
        setRecording(false)

        // Bekor qilingan yozuv tahlil qilinmaydi
        if (cancelledRef.current) return
        if (blob.size < 1200) {
          setMicError("Yozuv juda qisqa chiqdi. Yana urinib ko‘ring.")
          return
        }
        void analyze({ audio: blob })
      }

      recorder.start()
      setRecording(true)
      announce("Yozuv boshlandi.")
    } catch {
      stopStream()
      setMicError(
        "Mikrofonga ruxsat berilmadi. Brauzer sozlamalarida ruxsat bering yoki matn orqali yozing.",
      )
    }
  }, [analyze, stopStream])

  const stopRecording = useCallback(() => {
    cancelledRef.current = false
    try {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop()
      else {
        stopStream()
        setRecording(false)
      }
    } catch {
      stopStream()
      setRecording(false)
    }
  }, [stopStream])

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
    <div
      className="ai-panel overflow-hidden rounded-xl border"
      style={
        {
          // Robot va panel ranglari — saytning ko'k akцentiga moslangan
          "--robot-body-1": "#2c3c67",
          "--robot-body-2": "#1b2748",
          "--robot-face-1": "#0c1630",
          "--robot-face-2": "#17244d",
          "--robot-accent": "#7098ff",
          "--robot-shadow": "#5b84ff",
          "--ai-bg": "#070c18",
          "--ai-card": "#101a30",
          "--ai-border": "#1e2b45",
          "--ai-fg": "#eaf0fc",
          "--ai-mut": "#93a5c4",
          "--ai-accent": "#6d92ff",
          background:
            "radial-gradient(620px 340px at 78% -10%, rgba(91,132,255,0.20), transparent 70%)," +
            "radial-gradient(440px 300px at 6% 110%, rgba(34,211,238,0.12), transparent 70%)," +
            "var(--ai-bg)",
          borderColor: "var(--ai-border)",
          color: "var(--ai-fg)",
        } as React.CSSProperties
      }
    >
      <div ref={liveRef} role="status" aria-live="polite" className="sr-only" />

      <div className="grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* ------------------------------------------------------- CHAP PANEL */}
        <div
          className="flex flex-col items-center px-5 py-6 lg:border-r"
          style={{ borderColor: "var(--ai-border)" }}
        >
          <AiRobot
            state={state}
            className="h-44 w-44 sm:h-52 sm:w-52"
            label={`AI yordamchi — ${statusText}`}
          />

          <p className="mt-3 text-center text-lg font-bold tracking-tight text-balance">
            {statusText}
          </p>
          <p className="mt-1 text-center text-xs" style={{ color: "var(--ai-mut)" }}>
            Masalan: «Buğirdoq mahallasidagi maktab yo‘lini ta’mirlash bo‘yicha
            qurilish bo‘limiga favqulodda topshiriq bering, muddati 5 sentabr»
          </p>

          <VoiceWave active={recording} className="mt-4 w-full max-w-[280px]" />

          {/* Mikrofon */}
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={busy}
            aria-pressed={recording}
            className={cn(
              "mt-2 flex h-16 w-16 items-center justify-center rounded-full transition-transform focus-visible:outline-2 focus-visible:outline-offset-4",
              "disabled:opacity-50",
              !recording && "hover:scale-105",
            )}
            style={{
              background: recording
                ? "linear-gradient(140deg,#f0526a,#d93a55)"
                : "linear-gradient(140deg,#6d92ff,#3f6bff)",
              boxShadow: recording
                ? "0 10px 30px -10px rgba(240,82,106,0.65)"
                : "0 10px 30px -10px rgba(91,132,255,0.7)",
              outlineColor: "var(--ai-accent)",
            }}
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden />
            ) : recording ? (
              <Square className="h-5 w-5 text-white" aria-hidden />
            ) : (
              <Mic className="h-6 w-6 text-white" aria-hidden />
            )}
            <span className="sr-only">
              {recording ? "Yozuvni to‘xtatish" : "Ovoz bilan aytish"}
            </span>
          </button>
          <p className="mt-2 text-2xs" style={{ color: "var(--ai-mut)" }}>
            {recording ? "To‘xtatish uchun bosing" : "Bosib gapiring"}
          </p>

          {micError && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-1.5 rounded-md px-3 py-2 text-xs"
              style={{ background: "rgba(240,82,106,0.14)", color: "#ffb4bf" }}
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {micError}
            </p>
          )}

          {/* Tez shablonlar */}
          <div className="mt-6 w-full">
            <p
              className="mb-2 text-2xs font-semibold uppercase tracking-[0.09em]"
              style={{ color: "var(--ai-mut)" }}
            >
              Tez shablonlar
            </p>
            <div className="space-y-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  disabled={busy || recording}
                  onClick={() => void analyze({ text: p.text }, p.text)}
                  className="block w-full rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50"
                  style={{ background: "var(--ai-card)", borderColor: "var(--ai-border)" }}
                >
                  <span className="block text-sm font-semibold">{p.title}</span>
                  <span className="block text-xs" style={{ color: "var(--ai-mut)" }}>
                    {p.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- O'NG PANEL */}
        <div className="flex min-h-[460px] flex-col px-5 py-6">
          <p
            className="mb-3 text-2xs font-semibold uppercase tracking-[0.09em]"
            style={{ color: "var(--ai-mut)" }}
          >
            Suhbat
          </p>

          <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto pr-1">
            {turns.length === 0 && !busy && (
              <div
                className="rounded-xl border px-4 py-6 text-center text-sm"
                style={{
                  background: "var(--ai-card)",
                  borderColor: "var(--ai-border)",
                  color: "var(--ai-mut)",
                }}
              >
                Hozircha bo‘sh. Mikrofonni bosib gapiring, shablon tanlang yoki
                pastdagi maydonga yozing.
              </div>
            )}

            {turns.map((t, i) => {
              if (t.role === "user") {
                return (
                  <div
                    key={i}
                    className="ml-auto max-w-[88%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm leading-relaxed text-white"
                    style={{ background: "linear-gradient(140deg,#3f6bff,#5b84ff)" }}
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
                    className="max-w-[88%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm"
                    style={{
                      background: "rgba(240,82,106,0.12)",
                      borderColor: "rgba(240,82,106,0.35)",
                      color: "#ffc2ca",
                    }}
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
              <div
                className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm"
                style={{ background: "var(--ai-card)", borderColor: "var(--ai-border)" }}
              >
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
            className="mt-3 flex items-end gap-2"
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
              className="min-h-11 flex-1 resize-y rounded-lg border px-3 py-2.5 text-sm outline-none placeholder:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: "var(--ai-card)",
                borderColor: "var(--ai-border)",
                color: "var(--ai-fg)",
                outlineColor: "var(--ai-accent)",
              }}
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white disabled:opacity-40"
              style={{ background: "var(--ai-accent)" }}
            >
              <Send className="h-4.5 w-4.5" aria-hidden />
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
    <div
      className="max-w-full rounded-2xl rounded-bl-md border px-3.5 py-3 text-sm"
      style={{ background: "var(--ai-card)", borderColor: "var(--ai-border)" }}
    >
      {empty ? (
        <p style={{ color: "var(--ai-mut)" }}>
          AI topshiriqni ajratib olmadi. Iltimos, aniqroq aytib ko‘ring: nima
          qilinishi kerak, qaysi tashkilot va qanday muddatda.
        </p>
      ) : (
        <>
          <p className="mb-2">Topshiriqni shunday tushundim — tekshirib tasdiqlang:</p>

          {suggestion.description && (
            <p
              className="mb-2 whitespace-pre-wrap rounded-lg px-3 py-2 text-xs leading-relaxed"
              style={{ background: "rgba(255,255,255,0.04)", color: "var(--ai-fg)" }}
            >
              {suggestion.description}
            </p>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt style={{ color: "var(--ai-mut)" }}>{k}</dt>
                <dd className="min-w-0 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onUse(suggestion)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold text-[#04122b]"
              style={{ background: "var(--ai-accent)" }}
            >
              Topshiriqni yaratish
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onUse(suggestion)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3.5 text-xs font-semibold"
              style={{ borderColor: "var(--ai-border)", color: "var(--ai-fg)" }}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Tahrirlash
            </button>
          </div>
          <p className="mt-2 text-2xs" style={{ color: "var(--ai-mut)" }}>
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
