'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import type { Language } from '@/lib/i18n/context'

const languages = [
  { code: 'uz' as Language, name: 'O\'zbekcha', flag: '🇺🇿' },
  { code: 'ru' as Language, name: 'Русский', flag: '🇷🇺' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n()

  const currentLanguage = languages.find(lang => lang.code === language)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLanguage?.flag} {currentLanguage?.name}
          </span>
          <span className="sm:hidden">
            {currentLanguage?.flag}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={language === lang.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
