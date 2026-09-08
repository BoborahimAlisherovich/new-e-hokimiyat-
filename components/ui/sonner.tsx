'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      expand
      richColors
      toastOptions={{
        classNames: {
          toast:
            'rounded-[20px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.88))] shadow-[0_24px_60px_-28px_rgba(14,165,233,0.26)] backdrop-blur-2xl',
          title: 'text-sm font-semibold text-slate-900',
          description: 'text-xs text-slate-500',
          actionButton:
            'rounded-xl bg-[linear-gradient(135deg,#0f766e,#0891b2)] text-white hover:brightness-110',
          cancelButton:
            'rounded-xl border border-cyan-100 bg-white text-slate-700 hover:bg-cyan-50',
          success:
            'border-emerald-200/80',
          error:
            'border-rose-200/80',
          warning:
            'border-amber-200/80',
          info:
            'border-cyan-200/80',
        },
      }}
      style={
        {
          '--normal-bg': 'rgba(255,255,255,0.92)',
          '--normal-text': '#0f172a',
          '--normal-border': 'rgba(207,250,254,0.8)',
          '--success-bg': 'rgba(236,253,245,0.92)',
          '--success-border': 'rgba(167,243,208,0.9)',
          '--error-bg': 'rgba(255,241,242,0.94)',
          '--error-border': 'rgba(254,205,211,0.9)',
          '--warning-bg': 'rgba(255,251,235,0.94)',
          '--warning-border': 'rgba(253,230,138,0.9)',
          '--info-bg': 'rgba(236,254,255,0.94)',
          '--info-border': 'rgba(165,243,252,0.9)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
