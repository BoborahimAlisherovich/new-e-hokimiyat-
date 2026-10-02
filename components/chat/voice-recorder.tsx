"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, Loader2, Lock, Mic, Send, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { LOCK_THRESHOLD_PX, usePushToTalk } from "@/hooks/use-push-to-talk"
import {
  formatVoiceDuration,
  useVoiceRecorder,
  type VoiceRecording,
} from "@/hooks/use-voice-recorder"

/**
 * OVOZLI XABAR — TELEGRAM XATTI-HARAKATI
 * ======================================
 *
 * Jest `hooks/use-push-to-talk.ts` da: bosib turing, qo'yib yuborsangiz
 * ketadi, chapga sursangiz bekor bo'ladi, yuqoriga sursangiz qulflanadi.
 * Bu yerda faqat KO'RINISH.
 *
 * NEGA «bekor» bosilganda blob yasalmaydi
 * ---------------------------------------
 * `use-voice-recorder` bekor qilinganda Blob'ni umuman yig'maydi.
 * «Yozib olib, keyin tashlab yuborish» tashqaridan bir xil ko'rinadi,
 * lekin ovoz baribir xotirada bir zum yotadi — davlat tizimida bunday
 * «bekor qilindi, lekin saqlandi» holati bo'lmasligi kerak.
 *
 * SAHIFA SURILMASLIGI VA SAKRAMASLIGI
 * -----------------------------------
 *   1. Tugmada `touch-none` — barmoq surilganda brauzer sahifani
 *      aylantirmaydi va `pointermove` uzilmaydi.
 *   2. `composer` ko'rinishida yozuv paneli MUTLAQ joylashgan: qatorni
 *      ustidan yopadi, hech narsani surib yubormaydi (ota `relative`).
 *   3. `round` ko'rinishida tugma ostidagi joy OLDINDAN band qilingan
 *      (`min-h-[52px]`): maslahat matni va yozuv paneli bir xil
 *      balandlikda, shuning uchun yozuv boshlanganda sahifa sakramaydi.
 */

type Props = {
  onRecorded: (recording: VoiceRecording) => void | Promise<void>
  disabled?: boolean
  /** Tashqarida yuborish davom etayotgan bo'lsa */
  busy?: boolean
  /** Ota komponent boshqa tugmalarni yashirishi uchun */
  onRecordingChange?: (recording: boolean) => void
  /**
   * `composer` — chat yozish qatoridagi 44px tugma; yozuv paytida butun
   *              qatorni yopadigan panel chiqadi (ota element `relative`).
   * `round`    — AI topshiriq sehrgaridagi katta doira tugma; panel
   *              o'rniga tugma OSTIDA band qilingan joyda vaqt va maslahat.
   */
  variant?: "composer" | "round"
  className?: string
}

export function VoiceRecorder({
  onRecorded,
  disabled,
  busy,
  onRecordingChange,
  variant = "composer",
  className,
}: Props) {
  const { state, isRecording, elapsedMs, level, error, start, stop, cancel, clearError } =
    useVoiceRecorder()
  const [sending, setSending] = useState(false)

  const blocked = Boolean(disabled || busy || sending)

  const handleStop = useCallback(async () => {
    const recording = await stop()
    if (!recording) return
    setSending(true)
    try {
      await onRecorded(recording)
    } finally {
      setSending(false)
    }
  }, [onRecorded, stop])

  const gesture = usePushToTalk({
    onStart: start,
    onStop: handleStop,
    onCancel: cancel,
    disabled: blocked,
    isRecording,
  })

  useEffect(() => {
    onRecordingChange?.(isRecording)
  }, [isRecording, onRecordingChange])

  const showBar = isRecording || state === "requesting"
  const round = variant === "round"

  const micButton = (
    <button
      type="button"
      disabled={blocked}
      {...gesture.handlers}
      aria-pressed={isRecording}
      aria-label={
        isRecording
          ? "Yozuvni tugatish va yuborish"
          : "Ovozli xabar — bosib turing yoki bir marta bosing"
      }
      className={cn(
        "relative z-10 flex items-center justify-center transition-colors disabled:opacity-40",
        gesture.surfaceClass,
        round
          ? "h-16 w-16 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          : "h-11 w-11 rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isRecording
          ? round
            ? "bg-destructive text-white shadow-[0_16px_40px_-14px_var(--destructive)]"
            : "bg-destructive text-destructive-foreground"
          : round
            ? "bg-primary text-white shadow-[0_16px_40px_-14px_var(--primary)] hover:-translate-y-0.5"
            : "bg-primary text-primary-foreground hover:bg-primary-hover",
      )}
    >
      {sending || state === "requesting" ? (
        <Loader2 className={cn("animate-spin", round ? "h-6 w-6" : "h-5 w-5")} aria-hidden />
      ) : (
        <Mic className={cn(round ? "h-6 w-6" : "h-5 w-5")} aria-hidden />
      )}
    </button>
  )

  const bar = (
    <VoiceRecordingBar
      ms={elapsedMs}
      level={level}
      locked={gesture.locked}
      willCancel={gesture.willCancel}
      dx={gesture.dx}
      onCancel={gesture.cancel}
      onStop={() => void gesture.stop()}
    />
  )

  /* ------------------------------------------- KATTA DOIRA (AI sehrgari) */
  if (round) {
    return (
      <div className={cn("flex w-full flex-col items-center gap-3", className)}>
        {micButton}

        {/*
          Balandlik OLDINDAN band qilingan — yozuv boshlanganda pastdagi
          kontent surilib ketmasligi uchun.
        */}
        <div className="flex min-h-[52px] w-full max-w-[340px] items-center justify-center">
          {showBar ? (
            bar
          ) : (
            <p className="text-[12px] font-medium text-muted-foreground">
              Bosib turing va gapiring
            </p>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="flex w-full max-w-[340px] items-start gap-2 rounded-2xl bg-destructive-soft px-3.5 py-2.5 text-[13px] leading-6 text-destructive-soft-foreground"
          >
            <span className="min-w-0 flex-1">{error}</span>
            <button type="button" onClick={clearError} className="shrink-0 font-semibold underline">
              Yopish
            </button>
          </p>
        )}
      </div>
    )
  }

  /* --------------------------------------------- CHAT YOZISH QATORI */
  return (
    <div className={cn("shrink-0", className)}>
      {error && (
        <div
          role="alert"
          className="absolute inset-x-0 bottom-full z-30 mb-1 flex items-center gap-2 rounded-[10px] bg-destructive-soft px-3 py-2 text-xs text-destructive-soft-foreground"
        >
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" onClick={clearError} className="shrink-0 font-semibold underline">
            Yopish
          </button>
        </div>
      )}

      {/* Yozuv paneli — qatorni USTIDAN yopadi, hech narsani surmaydi */}
      {showBar && <div className="absolute inset-0 z-20 flex items-center bg-card px-2">{bar}</div>}

      {/* Qulflash ko'rsatkichi — yuqoriga surilganda */}
      {showBar && !gesture.locked && (
        <div
          aria-hidden
          className="absolute bottom-full right-2 z-30 mb-2 flex flex-col items-center gap-1 rounded-full bg-card px-2 py-2 shadow-[inset_0_0_0_1px_var(--border)]"
          style={{ opacity: Math.min(1, 0.35 + Math.abs(gesture.dy) / LOCK_THRESHOLD_PX) }}
        >
          <Lock className="h-4 w-4 text-muted-foreground" />
          <ChevronLeft className="h-3 w-3 rotate-90 text-muted-foreground" />
        </div>
      )}

      {micButton}
    </div>
  )
}

/* ====================================================== YOZUV PANELI ==== */

/**
 * Yozuv paytidagi qator: ● vaqt · to'lqin · (qulflangan bo'lsa 🗑 ➤,
 * aks holda «‹ Bekor qilish uchun suring»).
 *
 * Alohida eksport qilingan, chunki AI yordamchi sahifasi boshqa
 * yozgichdan (`useAudioRecorder` + nutqni matnga aylantirish)
 * foydalanadi, lekin KO'RINISHI bir xil bo'lishi kerak.
 */
export function VoiceRecordingBar({
  ms,
  seconds,
  level,
  locked,
  willCancel,
  dx = 0,
  onCancel,
  onStop,
  className,
}: {
  /** O'tgan vaqt, millisekund */
  ms?: number
  /** yoki sekund — `useAudioRecorder` shunday beradi */
  seconds?: number
  /** 0…1 tovush darajasi; berilmasa to'lqin sekin nafas oladi */
  level?: number
  locked: boolean
  willCancel: boolean
  dx?: number
  onCancel: () => void
  onStop: () => void
  className?: string
}) {
  const totalMs = ms ?? (seconds ?? 0) * 1000

  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      <span className="flex shrink-0 items-center gap-2 pl-1">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" aria-hidden />
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {formatVoiceDuration(totalMs)}
        </span>
      </span>

      <LiveWave level={level} muted={willCancel} />

      {locked ? (
        <>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Ovozli xabarni bekor qilish"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
          >
            <Trash2 className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onStop}
            aria-label="Yozuvni tugatish"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground"
          >
            <Send className="h-5 w-5" aria-hidden />
          </button>
        </>
      ) : (
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 pr-1 text-xs font-medium transition-colors",
            willCancel ? "text-destructive" : "text-muted-foreground",
          )}
          style={{ transform: `translateX(${Math.max(dx / 3, -24)}px)` }}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          {willCancel ? "Qo'yib yuboring — bekor" : "Bekor qilish uchun suring"}
        </span>
      )}
    </div>
  )
}

/**
 * Jonli to'lqin — 28 ta ustun.
 *
 * `level` berilmasa (AI yordamchi: `useAudioRecorder` amplituda
 * bermaydi) to'lqin sekin «nafas oladi». Bu yolg'on ma'lumot emas:
 * hech qayerda «bu ovozning shakli» deyilmaydi, u shunchaki yozuv
 * ketayotganini bildiradi.
 */
export function LiveWave({ level, muted }: { level?: number; muted?: boolean }) {
  const bars = 28
  const [phase, setPhase] = useState(0)
  const idle = level === undefined

  useEffect(() => {
    if (!idle) return
    const id = window.setInterval(() => setPhase((p) => p + 1), 140)
    return () => window.clearInterval(id)
  }, [idle])

  return (
    <span
      aria-hidden
      className={cn(
        "flex min-w-0 flex-1 items-center justify-center gap-[3px] transition-opacity",
        muted && "opacity-40",
      )}
    >
      {Array.from({ length: bars }, (_, i) => {
        // Markazdagi ustunlar balandroq — tabiiy ko'rinish beradi
        const distance = Math.abs(i - (bars - 1) / 2) / ((bars - 1) / 2)
        const shape = 1 - distance * 0.55
        const amplitude = idle ? 0.28 + 0.22 * Math.sin((i + phase) * 0.6) : level
        const height = Math.max(3, Math.min(22, 3 + amplitude * 34 * shape))
        return (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-full transition-[height] duration-100",
              muted ? "bg-destructive" : "bg-primary",
            )}
            style={{ height }}
          />
        )
      })}
    </span>
  )
}

/** Yozib olingan ovozni `File` ga aylantiradi (yuklash uchun) */
export function voiceToFile(recording: VoiceRecording): File {
  const ext = recording.mimeType.includes("mp4")
    ? "m4a"
    : recording.mimeType.includes("ogg")
      ? "ogg"
      : "webm"
  return new File([recording.blob], `ovoz-${Date.now()}.${ext}`, {
    type: recording.mimeType || "audio/webm",
  })
}
