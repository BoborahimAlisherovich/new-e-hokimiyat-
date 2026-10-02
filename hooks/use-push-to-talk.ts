"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * «BOSIB TURIB GAPIRISH» JESTI — Telegram xatti-harakati
 * =====================================================
 *
 * Bu hook FAQAT jestni biladi; yozib olish bilan umuman ishi yo'q.
 * Shu sababli u ikki xil yozgich ustida ishlaydi:
 *
 *   chat va AI topshiriq → `useVoiceRecorder` (ovoz fayl bo'lib ketadi)
 *   AI yordamchi         → `useAudioRecorder` + nutqni matnga aylantirish
 *
 * Ilgari jest mantig'i `VoiceRecorder` ichida qamalib qolgan edi va AI
 * yordamchidagi mikrofon boshqacha ishlardi: bir bosib boshlanardi, yana
 * bosib to'xtardi. Bitta tizimda ovoz yozishning ikki xil usuli bo'lishi —
 * foydalanuvchi eng tez charchaydigan narsa.
 *
 * UCH XIL QURILMA, UCH XIL BOSHLASH
 * ---------------------------------
 *   SENSORLI  — bosib turing; qo'yib yuborsangiz yuboriladi.
 *               Chapga suring — bekor. Yuqoriga suring — qulflanadi.
 *   SICHQONCHA— qisqa bosish darhol QULFLANGAN rejimni yoqadi
 *               (sichqonchani ushlab turish real emas).
 *   KLAVIATURA— Enter/Probel yoqadi va o'chiradi.
 *
 * SAHIFA SURILMASLIGI
 * -------------------
 * Tugmaga `touch-action: none` berilishi SHART (`touch-none` klassi) —
 * aks holda barmoq pastga-yuqoriga surilganda brauzer sahifani
 * aylantiradi va `pointermove` hodisalari uzilib qoladi. Hook buni
 * o'zi ta'minlay olmaydi (CSS), shuning uchun `touchActionNone`
 * bayrog'i qaytariladi va tugma uni klass sifatida qo'yadi.
 */

export const CANCEL_THRESHOLD_PX = 72
export const LOCK_THRESHOLD_PX = 64
/** Bundan qisqa bosish «chertish» deb qabul qilinadi */
export const TAP_MS = 260

export interface PushToTalkOptions {
  /** Yozuvni boshlash. `false` qaytarsa jest bekor qilinadi. */
  onStart: () => void | Promise<void | boolean> | boolean
  /** Yozuvni tugatish va natijani ishlatish */
  onStop: () => void | Promise<void>
  /** Yozuvni bekor qilish — natija ISHLATILMAYDI */
  onCancel: () => void
  disabled?: boolean
  /** Ayni paytda yozuv ketyaptimi (tashqi holatdan) */
  isRecording?: boolean
}

export function usePushToTalk({
  onStart,
  onStop,
  onCancel,
  disabled,
  isRecording,
}: PushToTalkOptions) {
  const [locked, setLocked] = useState(false)
  const [willCancel, setWillCancel] = useState(false)
  const [dx, setDx] = useState(0)
  const [dy, setDy] = useState(0)

  const originRef = useRef<{ x: number; y: number } | null>(null)
  const pressedAtRef = useRef(0)
  const lockedRef = useRef(false)
  const willCancelRef = useRef(false)

  useEffect(() => {
    lockedRef.current = locked
  }, [locked])
  useEffect(() => {
    willCancelRef.current = willCancel
  }, [willCancel])

  const reset = useCallback(() => {
    setLocked(false)
    setWillCancel(false)
    setDx(0)
    setDy(0)
    originRef.current = null
    lockedRef.current = false
    willCancelRef.current = false
  }, [])

  const stop = useCallback(async () => {
    reset()
    await onStop()
  }, [onStop, reset])

  const cancel = useCallback(() => {
    reset()
    onCancel()
  }, [onCancel, reset])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (disabled) return
      if (e.button !== 0) return
      // Sahifa surilib ketmasligi uchun — brauzerning o'z ishorasini
      // to'xtatamiz. `preventDefault` fokusni ham to'xtatadi, shuning
      // uchun uni qo'lda beramiz: aks holda klaviatura foydalanuvchisi
      // tugmani sichqoncha bilan bosgach uni yo'qotib qo'yardi.
      e.preventDefault()
      try {
        ;(e.currentTarget as HTMLElement).focus({ preventScroll: true })
      } catch {
        /* ignore */
      }

      pressedAtRef.current = Date.now()
      originRef.current = { x: e.clientX, y: e.clientY }
      setLocked(false)
      setWillCancel(false)
      setDx(0)
      setDy(0)
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId)
      } catch {
        // Ba'zi brauzerlarda capture rad etiladi — jest baribir ishlaydi
      }
      void onStart()
    },
    [disabled, onStart],
  )

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const origin = originRef.current
    if (!origin || lockedRef.current) return

    const moveX = Math.min(0, e.clientX - origin.x)
    const moveY = Math.min(0, e.clientY - origin.y)
    setDx(moveX)
    setDy(moveY)

    // Yuqoriga surish — qulflash. Bir vaqtning o'zida chapga ham
    // surilgan bo'lsa bekor qilish ustun turadi.
    if (moveY < -LOCK_THRESHOLD_PX && moveX > -CANCEL_THRESHOLD_PX) {
      setLocked(true)
      lockedRef.current = true
      setWillCancel(false)
      setDx(0)
      setDy(0)
      return
    }
    setWillCancel(moveX < -CANCEL_THRESHOLD_PX)
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId)
      } catch {
        /* ignore */
      }

      // Qulflangan bo'lsa yozuv davom etadi — foydalanuvchi keyin
      // «yuborish» yoki «o'chirish» ni bosadi.
      if (lockedRef.current) {
        originRef.current = null
        return
      }

      const held = Date.now() - pressedAtRef.current
      const moved = originRef.current
        ? Math.hypot(e.clientX - originRef.current.x, e.clientY - originRef.current.y)
        : 0

      // Qisqa chertish + deyarli qimirlamagan = sichqoncha bilan bosildi.
      // Yozuvni qulflab qo'yamiz, tugmani ushlab turish shart emas.
      if (held < TAP_MS && moved < 10) {
        setLocked(true)
        lockedRef.current = true
        setDx(0)
        setDy(0)
        originRef.current = null
        return
      }

      if (willCancelRef.current) {
        cancel()
        return
      }
      void stop()
    },
    [cancel, stop],
  )

  const onPointerCancel = useCallback(() => {
    // Qo'ng'iroq keldi, oyna almashdi va h.k. — yozuv saqlanmaydi
    cancel()
  }, [cancel])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape" && isRecording) {
        e.preventDefault()
        cancel()
        return
      }
      if (e.key !== "Enter" && e.key !== " ") return
      e.preventDefault()
      if (isRecording) {
        void stop()
        return
      }
      if (disabled) return
      setLocked(true)
      lockedRef.current = true
      void onStart()
    },
    [cancel, disabled, isRecording, onStart, stop],
  )

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Uzoq bosishda mobil brauzerlar kontekst menyusini ochadi va
    // jest uziladi.
    e.preventDefault()
  }, [])

  return {
    locked,
    willCancel,
    dx,
    dy,
    reset,
    /** Qulflangan rejimdan «yuborish» */
    stop,
    /** Qulflangan rejimdan «bekor qilish» */
    cancel,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onKeyDown,
      onContextMenu,
      onDragStart: (e: React.DragEvent) => e.preventDefault(),
    },
    /**
     * Tugmaga qo'yiladigan MAJBURIY klasslar:
     *   touch-none            — barmoq surilganda sahifa aylanmaydi
     *   overscroll-contain    — chetga yetganda ota konteyner ham surilmaydi
     *   select-none           — uzoq bosishda matn belgilanmaydi
     *   -webkit-touch-callout — iOS'dagi «nusxalash» oynachasi chiqmaydi
     */
    surfaceClass:
      "touch-none select-none overscroll-contain [-webkit-touch-callout:none] [-webkit-user-select:none]",
  }
}
