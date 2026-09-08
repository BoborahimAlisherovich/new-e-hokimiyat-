"use client"

import * as React from "react"

/**
 * Mobil menyuni ochish/yopish — shell egalik qiladi, Header chaqiradi.
 *
 * Nima uchun kontekst: sahifalar `<Header title="..." />` ni prop
 * uzatmasdan chaqiradi (21 sahifa), shuning uchun hamburger tugmasini
 * proplar zanjiri bilan ulash mumkin emas edi. Ilgari header'da ochilmagan
 * ikkinchi hamburger, sidebar'da esa sarlavha ustiga chiqib turadigan
 * uchinchisi bor edi.
 */

export interface MobileNavState {
  isOpen: boolean
  open: () => void
  close: () => void
  setOpen: (open: boolean) => void
}

const MobileNavContext = React.createContext<MobileNavState | null>(null)

export function MobileNavProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: MobileNavState
}) {
  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>
}

export function useMobileNav(): MobileNavState {
  const ctx = React.useContext(MobileNavContext)
  if (ctx) return ctx
  // Provider'dan tashqarida (masalan login sahifasi) — jim ishlaydi
  return { isOpen: false, open: () => {}, close: () => {}, setOpen: () => {} }
}
