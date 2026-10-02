"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Pause, Play } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * OVOZLI XABARNI TINGLASH — Telegram ko'rinishi
 * =============================================
 *
 * Brauzerning o'z `<audio controls>` elementi o'rniga. Sabab:
 *
 *   1. Har brauzerda boshqacha ko'rinadi (Chrome kulrang panel, Safari
 *      boshqa) va pufak rangiga umuman moslashmaydi — ko'k pufak ichida
 *      kulrang qutича turardi.
 *   2. Balandligi ~54px — pufakning yarmini egallaydi.
 *   3. Telegramda ovozli xabar bitta qator: ▶ tugma, to'lqin, davomiylik.
 *      Bosilgan joyga o'tish ham to'lqin ustidan bo'ladi.
 *
 * To'lqin haqiqiy amplitudadan chizilmaydi (server uni saqlamaydi) —
 * u xabar identifikatoridan BARQAROR tarzda hosil qilinadi: bir xil
 * xabar har doim bir xil to'lqinda ko'rinadi, ya'ni ro'yxat sakramaydi.
 * Bu bezak ekani aniq, lekin yolg'on ma'lumot bermaydi: hech qayerda
 * «bu ovozning haqiqiy shakli» deb aytilmaydi.
 */

const BARS = 34

function pseudoWave(seed: number): number[] {
  // Kichik xorijiy kutubxonasiz, barqaror psevdo-tasodifiy ketma-ketlik
  let x = (seed % 2147483647) || 1
  const out: number[] = []
  for (let i = 0; i < BARS; i += 1) {
    x = (x * 16807) % 2147483647
    const base = (x % 1000) / 1000
    // Chekkalarni pasaytiramiz — tabiiy gapirish shakli
    const edge = 1 - Math.abs(i - (BARS - 1) / 2) / ((BARS - 1) / 2)
    out.push(0.25 + base * 0.75 * (0.55 + edge * 0.45))
  }
  return out
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

export function VoicePlayer({
  src,
  durationMs,
  seed,
  className,
  tone = "muted",
}: {
  src: string | null
  durationMs?: number | null
  /** Barqaror to'lqin uchun — xabar id'si */
  seed: number
  className?: string
  /** `own` — o'z pufagi (ko'k fon), `muted` — kelgan xabar */
  tone?: "own" | "muted"
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState((durationMs ?? 0) / 1000)

  const bars = useRef(pseudoWave(seed)).current

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => setPosition(audio.currentTime)
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration)
      setLoading(false)
    }
    const onEnd = () => {
      setPlaying(false)
      setPosition(0)
      audio.currentTime = 0
    }
    const onWaiting = () => setLoading(true)
    const onPlaying = () => setLoading(false)

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onMeta)
    audio.addEventListener("ended", onEnd)
    audio.addEventListener("waiting", onWaiting)
    audio.addEventListener("playing", onPlaying)
    return () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onMeta)
      audio.removeEventListener("ended", onEnd)
      audio.removeEventListener("waiting", onWaiting)
      audio.removeEventListener("playing", onPlaying)
    }
  }, [])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !src) return
    if (audio.paused) {
      setLoading(true)
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setLoading(false))
    } else {
      audio.pause()
      setPlaying(false)
    }
  }, [src])

  const seek = useCallback(
    (ratio: number) => {
      const audio = audioRef.current
      if (!audio || !duration) return
      const next = Math.max(0, Math.min(duration, ratio * duration))
      audio.currentTime = next
      setPosition(next)
    },
    [duration],
  )

  const progress = duration > 0 ? Math.min(1, position / duration) : 0
  const own = tone === "own"

  return (
    <div className={cn("flex items-center gap-2.5 py-0.5", className)}>
      <audio ref={audioRef} src={src ?? undefined} preload="metadata" className="hidden" />

      <button
        type="button"
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? "To'xtatish" : "Tinglash"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40",
          own
            ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
            : "bg-primary text-primary-foreground hover:bg-primary-hover",
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : playing ? (
          <Pause className="h-4 w-4" aria-hidden />
        ) : (
          <Play className="ml-0.5 h-4 w-4" aria-hidden />
        )}
      </button>

      {/* To'lqin — bosilgan joyga o'tadi */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Ovoz bo'ylab o'tish"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          seek((e.clientX - rect.left) / rect.width)
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault()
            seek(Math.min(1, progress + 0.05))
          } else if (e.key === "ArrowLeft") {
            e.preventDefault()
            seek(Math.max(0, progress - 0.05))
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            toggle()
          }
        }}
        className="flex min-w-[110px] flex-1 cursor-pointer items-center gap-[2px] rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {bars.map((value, i) => {
          const played = i / BARS <= progress
          return (
            <span
              key={i}
              className={cn(
                "w-[3px] shrink-0 rounded-full transition-opacity",
                own
                  ? played
                    ? "bg-primary-foreground"
                    : "bg-primary-foreground/35"
                  : played
                    ? "bg-primary"
                    : "bg-border",
              )}
              style={{ height: Math.round(4 + value * 18) }}
            />
          )
        })}
      </div>

      <span
        className={cn(
          "shrink-0 text-2xs tabular-nums",
          own ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {fmt((playing || position > 0 ? position : duration) * 1000)}
      </span>
    </div>
  )
}
