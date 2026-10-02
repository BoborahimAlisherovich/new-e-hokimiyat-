"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * OVOZLI XABAR YOZGICHI — Telegram xatti-harakati
 * ==============================================
 *
 * Mavjud `use-audio-recorder.ts` dan farqi:
 *
 *  1. BEKOR QILISH SEMANTIKASI. Telegramda yozuvni bekor qilish — bu
 *     «to'xtatib, keyin o'chirish» emas: blob UMUMAN hosil qilinmaydi.
 *     Eski hook `onstop` da doim blob yasardi va `audioUrl` yaratardi;
 *     bekor qilingan yozuv ham xotirada qolardi (objectURL sizib ketardi).
 *
 *  2. AMPLITUDA. To'lqin chizig'i uchun jonli daraja kerak. Buning uchun
 *     `AnalyserNode` ulangan — MediaRecorder o'zi bunday ma'lumot bermaydi.
 *
 *  3. ANIQLIK. Vaqt sekundda emas, MILLISEKUNDDA yuritiladi: backend
 *     `duration_ms` kutadi va «0:00» ko'rinib turgan 900 ms lik yozuv
 *     yuborilmasligi kerak.
 *
 *  4. TOZALASH. Komponent yo'qolganda (sahifa almashtirildi, suhbat
 *     yopildi) mikrofon oqimi MAJBURAN to'xtatiladi. Aks holda brauzerda
 *     qizil «yozilmoqda» nishoni qolib ketardi — foydalanuvchi buni
 *     josuslik deb qabul qiladi.
 */

export type VoiceRecorderState = "idle" | "requesting" | "recording" | "error"

export interface VoiceRecording {
  blob: Blob
  durationMs: number
  mimeType: string
  /** 0…1 oralig'idagi o'rtacha darajalar — to'lqin chizig'i uchun */
  waveform: number[]
}

/** Bundan qisqa yozuv tasodifiy bosish deb hisoblanadi va yuborilmaydi */
export const MIN_VOICE_MS = 700

const WAVEFORM_SLOTS = 48

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return ""
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ]
  for (const type of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type
    } catch {
      // isTypeSupported ba'zi brauzerlarda tashlaydi — keyingisini sinaymiz
    }
  }
  return ""
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>("idle")
  const [elapsedMs, setElapsedMs] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const tickRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const waveformRef = useRef<number[]>([])
  const cancelledRef = useRef(false)
  /** stop() chaqirilganda natijani yetkazadigan promise */
  const resolveRef = useRef<((r: VoiceRecording | null) => void) | null>(null)

  const teardown = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    analyserRef.current = null
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined)
      audioCtxRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    recorderRef.current = null
  }, [])

  // Komponent yo'qolganda mikrofon albatta bo'shatiladi
  useEffect(() => teardown, [teardown])

  const start = useCallback(async (): Promise<boolean> => {
    if (state === "recording" || state === "requesting") return false

    setError(null)
    cancelledRef.current = false
    chunksRef.current = []
    waveformRef.current = []
    setElapsedMs(0)
    setLevel(0)

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Brauzer mikrofonni qo'llab-quvvatlamaydi")
      setState("error")
      return false
    }

    setState("requesting")

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
    } catch (err) {
      const name = (err as DOMException)?.name
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("Mikrofonga ruxsat berilmadi")
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("Mikrofon topilmadi")
      } else if (name === "NotReadableError") {
        setError("Mikrofon band — boshqa ilovani yoping")
      } else {
        setError("Mikrofonni ishga tushirib bo'lmadi")
      }
      setState("error")
      return false
    }

    streamRef.current = stream

    const mimeType = pickMimeType()
    let recorder: MediaRecorder
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    } catch {
      teardown()
      setError("Yozib olishni ishga tushirib bo'lmadi")
      setState("error")
      return false
    }

    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const durationMs = Date.now() - startedAtRef.current
      const type = recorder.mimeType || mimeType || "audio/webm"
      const chunks = chunksRef.current
      chunksRef.current = []

      const resolve = resolveRef.current
      resolveRef.current = null

      teardown()
      setState("idle")
      setLevel(0)

      // Bekor qilingan bo'lsa blob UMUMAN yasalmaydi — xotira ham,
      // objectURL ham qolmaydi.
      if (cancelledRef.current || !resolve) {
        resolve?.(null)
        return
      }

      const blob = new Blob(chunks, { type })
      if (durationMs < MIN_VOICE_MS || blob.size === 0) {
        resolve(null)
        return
      }

      resolve({
        blob,
        durationMs,
        mimeType: type,
        waveform: normalizeWaveform(waveformRef.current),
      })
    }

    // Jonli daraja — to'lqin uchun
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      analyserRef.current = analyser

      const buffer = new Uint8Array(analyser.frequencyBinCount)
      const sample = () => {
        const node = analyserRef.current
        if (!node) return
        node.getByteTimeDomainData(buffer)
        let peak = 0
        for (let i = 0; i < buffer.length; i += 1) {
          const v = Math.abs(buffer[i] - 128) / 128
          if (v > peak) peak = v
        }
        setLevel(peak)
        waveformRef.current.push(peak)
        rafRef.current = requestAnimationFrame(sample)
      }
      rafRef.current = requestAnimationFrame(sample)
    } catch {
      // Analyser bo'lmasa ham yozuv ishlashi kerak — to'lqin tekis chiqadi.
    }

    startedAtRef.current = Date.now()
    recorder.start(100)
    setState("recording")
    tickRef.current = window.setInterval(
      () => setElapsedMs(Date.now() - startedAtRef.current),
      100,
    )
    return true
  }, [state, teardown])

  /** Yozuvni tugatib, natijani qaytaradi (juda qisqa bo'lsa — null) */
  const stop = useCallback((): Promise<VoiceRecording | null> => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === "inactive") {
      return Promise.resolve(null)
    }
    cancelledRef.current = false
    return new Promise((resolve) => {
      resolveRef.current = resolve
      try {
        recorder.stop()
      } catch {
        resolveRef.current = null
        teardown()
        setState("idle")
        resolve(null)
      }
    })
  }, [teardown])

  /** Yozuvni bekor qiladi — hech narsa qaytmaydi va saqlanmaydi */
  const cancel = useCallback(() => {
    const recorder = recorderRef.current
    cancelledRef.current = true
    if (!recorder || recorder.state === "inactive") {
      teardown()
      setState("idle")
      setElapsedMs(0)
      setLevel(0)
      return
    }
    try {
      recorder.stop()
    } catch {
      teardown()
      setState("idle")
    }
  }, [teardown])

  const clearError = useCallback(() => {
    setError(null)
    if (state === "error") setState("idle")
  }, [state])

  return {
    state,
    isRecording: state === "recording",
    elapsedMs,
    /** 0…1 — joriy tovush darajasi */
    level,
    error,
    start,
    stop,
    cancel,
    clearError,
  }
}

/** Yozuv davomida to'plangan darajalarni 48 ta ustunga siqadi */
function normalizeWaveform(samples: number[]): number[] {
  if (samples.length === 0) return []
  const out: number[] = []
  const step = samples.length / WAVEFORM_SLOTS
  for (let i = 0; i < WAVEFORM_SLOTS; i += 1) {
    const from = Math.floor(i * step)
    const to = Math.max(from + 1, Math.floor((i + 1) * step))
    let peak = 0
    for (let j = from; j < to && j < samples.length; j += 1) {
      if (samples[j] > peak) peak = samples[j]
    }
    out.push(Number(peak.toFixed(3)))
  }
  return out
}

/** `0:07` / `1:23` */
export function formatVoiceDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}
