'use client'

import * as React from 'react'
import type { Language, Translations } from './types'
export type { Language, Translations } from './types'

/**
 * TUZATILGAN IKKI MUAMMO
 *
 * 1) Kontekst qiymati har renderda YANGI obyekt bo'lardi:
 *      const value: I18nContextType = { language, setLanguage, t, isLoading }
 *    Natijada `useI18n()` / `useTranslation()` ishlatadigan HAR BIR komponent
 *    provider qayta renderlanganda qayta renderlanardi. Endi `useMemo` +
 *    `useCallback`.
 *
 * 2) To'rtta lug'at ham statik import qilinardi:
 *      uz 15,884 + uz-cyrl 18,100 + ru 18,253 + en 12,639 = ~64,9 KB
 *    va hammasi tanlangan tildan qat'i nazar root client chunk'ga tushardi.
 *    Endi faqat standart til (uz) statik — qolganlari tanlanganda
 *    `import()` bilan yuklanadi. Standart til eager bo'lgani uchun
 *    birinchi bo'yoqda matn "sakramaydi".
 */

import { uzTranslations } from './uz'

const DEFAULT_LANGUAGE: Language = 'uz'
const SUPPORTED: readonly Language[] = ['uz', 'uz-cyrl', 'ru', 'en']
const STORAGE_KEY = 'language'

const lazyLoaders: Record<Exclude<Language, 'uz'>, () => Promise<Translations>> = {
  'uz-cyrl': () => import('./uz-cyrl').then((m) => m.uzCyrlTranslations),
  ru: () => import('./ru').then((m) => m.ruTranslations),
  en: () => import('./en').then((m) => m.enTranslations),
}

/** Yuklab olingan lug'atlar — bir marta olinadi, qayta so'ralmaydi */
const loaded = new Map<Language, Translations>([['uz', uzTranslations]])

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
  isLoading: boolean
}

const I18nContext = React.createContext<I18nContextType | undefined>(undefined)

function readStoredLanguage(fallback: Language): Language {
  if (typeof window === 'undefined') return fallback
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null
    if (saved && SUPPORTED.includes(saved)) return saved
  } catch {
    // maxfiy rejimda localStorage tashlashi mumkin
  }
  return fallback
}

interface I18nProviderProps {
  children: React.ReactNode
  defaultLanguage?: Language
}

export function I18nProvider({ children, defaultLanguage = DEFAULT_LANGUAGE }: I18nProviderProps) {
  const [language, setLanguageState] = React.useState<Language>(defaultLanguage)
  const [dictionary, setDictionary] = React.useState<Translations>(uzTranslations)
  const [isLoading, setIsLoading] = React.useState(false)

  // Saqlangan tilni mount'dan keyin o'qiymiz — SSR bilan hydration
  // mos kelishi uchun (localStorage serverda yo'q).
  React.useEffect(() => {
    const stored = readStoredLanguage(defaultLanguage)
    if (stored !== language) setLanguageState(stored)
  }, [defaultLanguage]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    document.documentElement.lang = language

    const cached = loaded.get(language)
    if (cached) {
      setDictionary(cached)
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)
    lazyLoaders[language as Exclude<Language, 'uz'>]()
      .then((dict) => {
        loaded.set(language, dict)
        if (!active) return
        setDictionary(dict)
      })
      .catch(() => {
        // Lug'at yuklanmasa standart tilda qolamiz — bo'sh interfeys emas
        if (active) setDictionary(uzTranslations)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [language])

  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') document.documentElement.lang = lang
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }))
    }
  }, [])

  const value = React.useMemo<I18nContextType>(
    () => ({ language, setLanguage, t: dictionary, isLoading }),
    [language, setLanguage, dictionary, isLoading],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = React.useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

/** Tarjimalarga qulay kirish */
export function useTranslation() {
  return useI18n().t
}
