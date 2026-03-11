'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className,
      )}
      style={{
        background:
          'radial-gradient(circle at top, rgba(34,211,238,0.12), transparent 28%), rgba(255,255,255,0.58)',
        backdropFilter: 'blur(18px) saturate(145%)',
        WebkitBackdropFilter: 'blur(18px) saturate(145%)'
      }}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed top-[50%] left-[50%] z-40 grid w-[calc(100%-1.5rem)] max-h-[calc(100vh-3rem)] translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.84))] p-4 shadow-[0_32px_90px_-28px_rgba(14,165,233,0.28),0_14px_35px_-18px_rgba(15,23,42,0.12)] ring-1 ring-cyan-100/40 backdrop-blur-2xl duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:w-full sm:max-w-lg sm:p-6',
          className
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 rounded-t-[28px] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_68%)]" />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background absolute top-3 right-3 rounded-xl border border-white/70 bg-white/72 p-1.5 opacity-75 shadow-sm transition-all hover:bg-cyan-50 hover:opacity-100 focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none sm:top-4 sm:right-4 sm:p-1 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold tracking-tight text-slate-900', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-slate-500', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
