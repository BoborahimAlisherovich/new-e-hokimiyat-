"use client"

import { cn } from "@/lib/utils"

/**
 * AI YORDAMCHI — ROBOTCHA
 *
 * Butun animatsiya CSS'da (app/globals.css, «AI YORDAMCHI — ROBOTCHA»
 * bo'limi) va faqat `transform` / `opacity` ustida ishlaydi — kompozitor
 * qatlamida bajariladi, JS animatsiya kutubxonasi kerak emas.
 *
 * Holatlar `data-state` atributi orqali beriladi:
 *   idle      — suzib turadi, ko'zini pirpiratadi, ba'zan qo'lini silkitadi
 *   listening — atrofida tovush halqalari tarqaladi, ko'zlari kattalashadi
 *   thinking  — boshi ustida uch nuqta sakraydi
 *   done      — bir marta bosh irg'ab tasdiqlaydi
 *
 * Ranglar `--robot-*` CSS o'zgaruvchilaridan olinadi, shuning uchun robot
 * qo'yilgan panel o'z ranglarini bersa — u avtomatik moslashadi.
 */

export type RobotState = "idle" | "listening" | "thinking" | "done"

export function AiRobot({
  state = "idle",
  className,
  label,
}: {
  state?: RobotState
  className?: string
  /** Ekran o'quvchi uchun holat matni */
  label?: string
}) {
  return (
    <div
      data-state={state}
      className={cn("relative select-none", className)}
      role="img"
      aria-label={label ?? "AI yordamchi"}
    >
      <svg viewBox="0 0 200 210" className="h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="robotBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--robot-body-1)" />
            <stop offset="100%" stopColor="var(--robot-body-2)" />
          </linearGradient>
          <linearGradient id="robotFace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--robot-face-1)" />
            <stop offset="100%" stopColor="var(--robot-face-2)" />
          </linearGradient>
          <radialGradient id="robotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--robot-accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--robot-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Tovush halqalari — faqat "listening" holatida ko'rinadi */}
        <g>
          <circle
            className="robot-ring"
            cx="100"
            cy="96"
            r="70"
            fill="none"
            stroke="var(--robot-accent)"
            strokeWidth="1.6"
          />
          <circle
            className="robot-ring"
            cx="100"
            cy="96"
            r="70"
            fill="none"
            stroke="var(--robot-accent)"
            strokeWidth="1.6"
          />
          <circle
            className="robot-ring"
            cx="100"
            cy="96"
            r="70"
            fill="none"
            stroke="var(--robot-accent)"
            strokeWidth="1.6"
          />
        </g>

        {/* Yumshoq nur */}
        <circle cx="100" cy="96" r="76" fill="url(#robotGlow)" />

        {/* Soya */}
        <ellipse
          className="robot-shadow"
          cx="100"
          cy="196"
          rx="42"
          ry="8"
          fill="var(--robot-shadow)"
        />

        {/* Butun robot — suzib turadi */}
        <g className="robot">
          {/* O'ylash nuqtalari */}
          <g>
            <circle className="robot-think" cx="82" cy="14" r="4" fill="var(--robot-accent)" opacity="0" />
            <circle className="robot-think" cx="100" cy="14" r="4" fill="var(--robot-accent)" opacity="0" />
            <circle className="robot-think" cx="118" cy="14" r="4" fill="var(--robot-accent)" opacity="0" />
          </g>

          {/* Antenna */}
          <line x1="100" y1="40" x2="100" y2="26" stroke="var(--robot-body-2)" strokeWidth="4" strokeLinecap="round" />
          <circle className="robot-antenna-tip" cx="100" cy="23" r="6" fill="var(--robot-accent)" />

          {/* Qo'llar — boshdan oldin chiziladi, tanadan chiqib turadi */}
          <rect
            className="robot-arm robot-arm--left"
            x="26"
            y="112"
            width="13"
            height="42"
            rx="6.5"
            fill="url(#robotBody)"
          />
          <rect
            className="robot-arm robot-arm--right"
            x="161"
            y="112"
            width="13"
            height="42"
            rx="6.5"
            fill="url(#robotBody)"
          />

          {/* Bosh */}
          <rect x="44" y="40" width="112" height="86" rx="26" fill="url(#robotBody)" />
          {/* Quloqlar */}
          <rect x="36" y="70" width="10" height="26" rx="5" fill="var(--robot-body-2)" />
          <rect x="154" y="70" width="10" height="26" rx="5" fill="var(--robot-body-2)" />

          {/* Yuz ekrani */}
          <rect x="58" y="54" width="84" height="58" rx="20" fill="url(#robotFace)" />

          {/* Ko'zlar */}
          <rect
            className="robot-eye"
            x="76"
            y="72"
            width="11"
            height="18"
            rx="5.5"
            fill="var(--robot-accent)"
          />
          <rect
            className="robot-eye robot-eye--right"
            x="113"
            y="72"
            width="11"
            height="18"
            rx="5.5"
            fill="var(--robot-accent)"
          />

          {/* Tabassum */}
          <path
            d="M88 99 Q100 107 112 99"
            fill="none"
            stroke="var(--robot-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Bo'yin */}
          <rect x="92" y="124" width="16" height="10" rx="4" fill="var(--robot-body-2)" />

          {/* Tana */}
          <rect x="52" y="132" width="96" height="58" rx="24" fill="url(#robotBody)" />
          {/* Ko'krak chirog'i */}
          <circle cx="100" cy="158" r="13" fill="var(--robot-face-2)" />
          <circle className="robot-chest" cx="100" cy="158" r="7" fill="var(--robot-accent)" />
          {/* Panel chiziqlari */}
          <rect x="74" y="176" width="52" height="4" rx="2" fill="var(--robot-face-2)" opacity="0.8" />
        </g>
      </svg>
    </div>
  )
}

/**
 * Ovoz to'lqini. Ustunlar soni va balandliklari qat'iy — tasodifiy
 * qiymatlar har renderda o'zgarib, sakrash effekti berardi.
 */
const BAR_HEIGHTS = [
  14, 26, 40, 22, 52, 34, 58, 24, 44, 18, 38, 54, 30, 46, 20, 34, 50, 24, 16, 30,
]

export function VoiceWave({
  active,
  className,
}: {
  active: boolean
  className?: string
}) {
  return (
    <div
      className={cn("flex h-16 items-center justify-center gap-[3px]", className)}
      aria-hidden="true"
    >
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-[var(--robot-accent)]",
            active ? "wave-bar" : "opacity-30",
          )}
          style={{
            height: `${h}px`,
            animationDelay: `${(i * 0.055).toFixed(3)}s`,
          }}
        />
      ))}
    </div>
  )
}

export default AiRobot
