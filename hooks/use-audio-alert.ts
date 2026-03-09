"use client"

import { useCallback, useEffect, useRef } from "react"

export function useAudioAlert() {
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    audioContextRef.current = ctx
    return () => {
      ctx.close().catch(() => {})
    }
  }, [])

  return useCallback((frequency = 440, duration = 0.18) => {
    const ctx = audioContextRef.current
    if (!ctx) return
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {})
    }

    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.frequency.value = frequency
    oscillator.type = "sine"
    gain.gain.value = 0.12
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + duration)
  }, [])
}
