"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Check, Loader2, Paperclip, Send, Smile, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatBytes, uploadAttachment, type ChatAttachment } from "@/lib/api/chat-v2.api"
import { VoiceRecorder, voiceToFile } from "./voice-recorder"
import type { VoiceRecording } from "@/hooks/use-voice-recorder"
import type { LocalMessage } from "./chat-utils"

/**
 * YOZISH MAYDONI
 *
 * Tuzatilgan nuqsonlar:
 *  1. Mikrofon va lokatsiya tugmalari `hidden sm:inline-flex` edi —
 *     ya'ni ovozli xabar aynan telefonda ishlamasdi. Endi barcha
 *     o'lchamlarda va >= 44px.
 *  2. `URL.createObjectURL(audioBlob)` to'g'ridan-to'g'ri JSX ichida
 *     chaqirilardi: har renderda yangi blob URL yaratilardi va biror
 *     marta ham `revokeObjectURL` qilinmasdi — haqiqiy xotira oqishi.
 *     Endi URL bir marta yaratiladi va tozalanadi.
 *  3. `MediaRecorder` oqimi faqat `onstop` da to'xtatilardi va komponent
 *     unmount bo'lganda tozalash yo'q edi — sahifadan chiqilsa mikrofon
 *     yoniq qolardi. Endi unmount'da ham to'xtatiladi.
 *  4. Bitta fayl, yuklash progressi yo'q, xabar POST'i fayl yuklanishini
 *     kutib turardi. Endi fayllar alohida endpointga progres bilan
 *     yuklanadi, xabar esa darhol ketadi.
 */

const MAX_FILES = 10
const MAX_FILE_MB = 25
const EMOJI = [
  "👍", "🙏", "✅", "❗", "🔥", "👏", "🤝", "📌",
  "😊", "😀", "😉", "🙂", "😐", "😕", "😢", "😡",
  "💯", "⚡", "📎", "📅", "⏰", "📞", "🏛️", "🚧",
]

type Pending = {
  key: string
  file: File
  progress: number
  attachment?: ChatAttachment
  error?: string
}

export function MessageComposer({
  disabled,
  replyTo,
  editing,
  onCancelReply,
  onCancelEdit,
  onSend,
  onSubmitEdit,
  onTyping,
  draft,
  onDraftChange,
}: {
  disabled?: boolean
  replyTo: LocalMessage | null
  editing: LocalMessage | null
  onCancelReply: () => void
  onCancelEdit: () => void
  onSend: (text: string, attachmentIds: number[]) => void
  onSubmitEdit: (message: LocalMessage, text: string) => void
  onTyping: (isTyping: boolean) => void
  draft: string
  onDraftChange: (value: string) => void
}) {
  const [pending, setPending] = useState<Pending[]>([])
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [recording, setRecording] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const typingTimer = useRef<number | null>(null)

  /* --------------------------------------------------------- Tozalash */
  // Mikrofon oqimini `VoiceRecorder` o'zi boshqaradi va unmount'da
  // to'xtatadi — bu yerda faqat yozish taymeri qoladi.
  useEffect(
    () => () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current)
    },
    [],
  )

  /* --------------------------------------------------- Tahrirlash rejimi */
  useEffect(() => {
    if (editing) {
      onDraftChange(editing.content ?? "")
      inputRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id])

  useEffect(() => {
    if (replyTo) inputRef.current?.focus()
  }, [replyTo])

  /* Matn maydoni balandligi mazmunga qarab */
  const autoGrow = useCallback(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  useEffect(() => {
    autoGrow()
  }, [draft, autoGrow])

  /* ------------------------------------------------------------ Fayllar */
  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming)
      const accepted: Pending[] = []

      for (const f of list) {
        if (pending.length + accepted.length >= MAX_FILES) break
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          accepted.push({
            key: `${f.name}-${f.size}-${Date.now()}`,
            file: f,
            progress: 0,
            error: `${MAX_FILE_MB} MB dan katta`,
          })
          continue
        }
        accepted.push({ key: `${f.name}-${f.size}-${Date.now()}`, file: f, progress: 0 })
      }

      if (accepted.length === 0) return
      setPending((prev) => [...prev, ...accepted])

      for (const item of accepted) {
        if (item.error) continue
        void uploadAttachment(item.file, {
          onProgress: (p) =>
            setPending((prev) =>
              prev.map((x) => (x.key === item.key ? { ...x, progress: p } : x)),
            ),
        })
          .then((attachment) =>
            setPending((prev) =>
              prev.map((x) =>
                x.key === item.key ? { ...x, attachment, progress: 100 } : x,
              ),
            ),
          )
          .catch((err: Error) =>
            setPending((prev) =>
              prev.map((x) =>
                x.key === item.key ? { ...x, error: err.message || "Yuklanmadi" } : x,
              ),
            ),
          )
      }
    },
    [pending.length],
  )

  // Ota komponent drag&drop uchun shu funksiyani ishlatadi
  useEffect(() => {
    ;(window as any).__chatAddFiles = addFiles
    return () => {
      delete (window as any).__chatAddFiles
    }
  }, [addFiles])

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length) {
        e.preventDefault()
        addFiles(files)
      }
    },
    [addFiles],
  )

  /* ------------------------------------------------------- Ovoz yozish */
  /**
   * Ovozli xabar yozib bo'lindi — faylni yuklaymiz va darhol yuboramiz.
   *
   * Telegramda ovoz qo'yib yuborilishi bilan ketadi: «tinglab ko'ring,
   * keyin yuboring» degan oraliq qadam yo'q. Shuning uchun bu yerda ham
   * oldindan tinglash oynasi yo'q — kerak bo'lsa foydalanuvchi yozuvni
   * surib bekor qiladi.
   */
  const handleVoiceRecorded = useCallback(
    async (recorded: VoiceRecording) => {
      setVoiceBusy(true)
      setVoiceError(null)
      try {
        const attachment = await uploadAttachment(voiceToFile(recorded), {
          kind: "VOICE",
          durationMs: recorded.durationMs,
        })
        onSend("", [attachment.id])
      } catch (err: any) {
        setVoiceError(err?.message || "Ovozli xabar yuborilmadi")
      } finally {
        setVoiceBusy(false)
      }
    },
    [onSend],
  )

  /* ------------------------------------------------------------ Yuborish */
  const readyIds = pending
    .filter((p) => p.attachment && !p.error)
    .map((p) => p.attachment!.id)
  const uploading = pending.some((p) => !p.attachment && !p.error)
  const canSend =
    !disabled && !uploading && (draft.trim().length > 0 || readyIds.length > 0)

  const submit = useCallback(() => {
    if (editing) {
      const text = draft.trim()
      if (!text) return
      onSubmitEdit(editing, text)
      onDraftChange("")
      return
    }
    if (!canSend) return
    onSend(draft.trim(), readyIds)
    onDraftChange("")
    setPending([])
    onTyping(false)
  }, [editing, draft, canSend, readyIds, onSend, onSubmitEdit, onDraftChange, onTyping])

  const handleChange = (value: string) => {
    onDraftChange(value)
    onTyping(true)
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => onTyping(false), 2500)
  }

  /* ------------------------------------------------------------- RENDER */
  return (
    <div className="border-t border-border bg-card pb-safe">
      {/* Javob / tahrirlash paneli */}
      {(replyTo || editing) && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <span className="h-8 w-0.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-2xs font-semibold text-primary">
              {editing ? "Tahrirlanmoqda" : `Javob: ${replyTo?.sender_name ?? ""}`}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {(editing ?? replyTo)?.content || "Fayl"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (editing) {
                onCancelEdit()
                onDraftChange("")
              } else {
                onCancelReply()
              }
            }}
            aria-label="Bekor qilish"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {/* Yuklanayotgan fayllar */}
      {pending.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto border-b border-border p-2">
          {pending.map((p) => (
            <li
              key={p.key}
              className={cn(
                "relative w-32 shrink-0 rounded-md border p-2",
                p.error ? "border-destructive bg-destructive-soft" : "border-border bg-muted",
              )}
            >
              <p className="truncate text-2xs font-medium text-foreground">{p.file.name}</p>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {formatBytes(p.file.size)}
              </p>
              {p.error ? (
                <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-destructive">
                  <AlertCircle className="h-3 w-3" aria-hidden />
                  {p.error}
                </p>
              ) : p.attachment ? (
                <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-success">
                  <Check className="h-3 w-3" aria-hidden />
                  Tayyor
                </p>
              ) : (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-primary transition-[width] duration-200"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setPending((prev) => prev.filter((x) => x.key !== p.key))}
                aria-label={`${p.file.name} — olib tashlash`}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {voiceError && (
        <p
          role="alert"
          className="flex items-center gap-1.5 border-b border-border bg-destructive-soft px-3 py-1.5 text-xs text-destructive-soft-foreground"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {voiceError}
        </p>
      )}

      {/*
        YOZISH QATORI — Telegram tartibi
        --------------------------------
        Skrepka CHAPDA, matn maydoni o'rtada, emoji va mikrofon O'NGDA.
        Ilgari emoji ham, skrepka ham chapda turardi va matn maydoni
        ikki tugma orasida siqilib qolardi.

        `relative` — MAJBURIY: ovoz yozilayotganda `VoiceRecorder` shu
        qatorni to'liq yopadigan panel chizadi.
      */}
      <div className="relative flex items-end gap-1 p-2">
        {/* Fayl */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || recording}
          tabIndex={recording ? -1 : undefined}
          aria-label="Fayl biriktirish"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <Paperclip className="h-5 w-5" aria-hidden />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ""
          }}
        />

        {/* Matn */}
        <label htmlFor="chat-input" className="sr-only">
          Xabar yozish
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          onFocus={() => {
            // Klaviatura ochilganda maydon ko'rinishda qolsin
            window.setTimeout(() => inputRef.current?.scrollIntoView({ block: "nearest" }), 250)
          }}
          rows={1}
          disabled={disabled || recording}
          tabIndex={recording ? -1 : undefined}
          placeholder="Xabar yozing…"
          className="min-h-11 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        />

        {/* Emoji */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setEmojiOpen((v) => !v)}
            disabled={recording}
            tabIndex={recording ? -1 : undefined}
            aria-expanded={emojiOpen}
            aria-label="Emoji"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Smile className="h-5 w-5" aria-hidden />
          </button>
          {emojiOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} aria-hidden />
              <div className="absolute bottom-12 right-0 z-20 grid w-64 grid-cols-8 gap-0.5 rounded-lg border border-border bg-popover p-2 shadow-lg">
                {EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      onDraftChange(draft + e)
                      inputRef.current?.focus()
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-muted"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/*
          Mikrofon yoki yuborish — Telegramdagi kabi: maydon bo'sh bo'lsa
          mikrofon, matn yozilsa yuborish o'qi.
        */}
        {draft.trim() || readyIds.length > 0 || editing ? (
          <button
            type="button"
            onClick={submit}
            disabled={editing ? !draft.trim() : !canSend}
            aria-label={editing ? "Saqlash" : "Yuborish"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : editing ? (
              <Check className="h-5 w-5" aria-hidden />
            ) : (
              <Send className="h-5 w-5" aria-hidden />
            )}
          </button>
        ) : (
          <VoiceRecorder
            onRecorded={handleVoiceRecorded}
            disabled={disabled}
            busy={voiceBusy}
            onRecordingChange={setRecording}
          />
        )}
      </div>
    </div>
  )
}
