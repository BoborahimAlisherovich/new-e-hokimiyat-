'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { Language, Translations } from './types'
export type { Language, Translations } from './types'
import { uzTranslations } from './uz'
import { uzCyrlTranslations } from './uz-cyrl'
import { ruTranslations } from './ru'
import { enTranslations } from './en'

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
  isLoading: boolean
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const translations = {
  uz: uzTranslations,
  'uz-cyrl': uzCyrlTranslations,
  ru: ruTranslations,
  en: enTranslations,
}

interface I18nProviderProps {
  children: ReactNode
  defaultLanguage?: Language
}

export function I18nProvider({ children, defaultLanguage = 'uz' }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage)
  const [isLoading, setIsLoading] = useState(true)

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language
    if (savedLanguage && ['uz', 'uz-cyrl', 'ru', 'en'].includes(savedLanguage)) {
      setLanguageState(savedLanguage)
    }
    setIsLoading(false)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
    isLoading,
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Helper hook for easier translation access
export function useTranslation() {
  const { t } = useI18n()
  return t
}
