"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Check,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Smile,
  Square,
  Trash2,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  formatBytes,
  formatDuration,
  uploadAttachment,
  type ChatAttachment,
} from "@/lib/api/chat-v2.api"
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
  const [recording, setRecording] = useState(false)
  const [recordMs, setRecordMs] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)
  const [voice, setVoice] = useState<{ blob: Blob; url: string; ms: number } | null>(null)
  const [voiceBusy, setVoiceBusy] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const typingTimer = useRef<number | null>(null)

  /* --------------------------------------------------------- Tozalash */
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    chunksRef.current = []
    if (tickRef.current) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      cancelledRef.current = true
      try {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop()
      } catch {
        /* ignore */
      }
      stopStream()
      if (typingTimer.current) window.clearTimeout(typingTimer.current)
    },
    [stopStream],
  )

  // Ovoz blob URL'ini bir marta yaratamiz va tozalaymiz
  useEffect(() => {
    return () => {
      if (voice?.url) URL.revokeObjectURL(voice.url)
    }
  }, [voice?.url])

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
  const startRecording = useCallback(async () => {
    setMicError(null)
    cancelledRef.current = false

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Brauzer mikrofonni qo‘llab-quvvatlamaydi")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const rec = new MediaRecorder(stream)
      recorderRef.current = rec
      const startedAt = Date.now()

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const ms = Date.now() - startedAt
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" })
        stopStream()
        setRecording(false)
        setRecordMs(0)

        if (cancelledRef.current) return
        if (blob.size < 1000 || ms < 500) {
          setMicError("Yozuv juda qisqa")
          return
        }
        setVoice({ blob, url: URL.createObjectURL(blob), ms })
      }

      rec.start()
      setRecording(true)
      setRecordMs(0)
      tickRef.current = window.setInterval(() => setRecordMs(Date.now() - startedAt), 200)
    } catch {
      stopStream()
      setMicError("Mikrofonga ruxsat berilmadi")
    }
  }, [stopStream])

  const stopRecording = useCallback(
    (cancel: boolean) => {
      cancelledRef.current = cancel
      try {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop()
        else {
          stopStream()
          setRecording(false)
        }
      } catch {
        stopStream()
        setRecording(false)
      }
    },
    [stopStream],
  )

  const sendVoice = useCallback(async () => {
    if (!voice) return
    setVoiceBusy(true)
    try {
      const file = new File([voice.blob], `ovoz-${Date.now()}.webm`, {
        type: voice.blob.type || "audio/webm",
      })
      const attachment = await uploadAttachment(file, {
        kind: "VOICE",
        durationMs: voice.ms,
      })
      onSend("", [attachment.id])
      URL.revokeObjectURL(voice.url)
      setVoice(null)
    } catch (err: any) {
      setMicError(err?.message || "Ovozli xabar yuborilmadi")
    } finally {
      setVoiceBusy(false)
    }
  }, [voice, onSend])

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

      {micError && (
        <p
          role="alert"
          className="flex items-center gap-1.5 border-b border-border bg-destructive-soft px-3 py-1.5 text-xs text-destructive-soft-foreground"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {micError}
        </p>
      )}

      {/* Ovozli xabar oldindan tinglash */}
      {voice && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <audio src={voice.url} controls className="h-9 min-w-0 flex-1" />
          <span className="shrink-0 text-2xs tabular-nums text-muted-foreground">
            {formatDuration(voice.ms)}
          </span>
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(voice.url)
              setVoice(null)
            }}
            aria-label="O‘chirish"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => void sendVoice()}
            disabled={voiceBusy}
            aria-label="Ovozli xabarni yuborish"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {voiceBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      )}

      {/* Yozuv rejimi */}
      {recording ? (
        <div className="flex items-center gap-2 p-2">
          <span className="flex items-center gap-2 rounded-md bg-destructive-soft px-3 py-2 text-sm font-semibold text-destructive-soft-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" aria-hidden />
            {formatDuration(recordMs)}
          </span>
          <button
            type="button"
            onClick={() => stopRecording(true)}
            className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Bekor
          </button>
          <button
            type="button"
            onClick={() => stopRecording(false)}
            className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
          >
            <Square className="h-4 w-4" aria-hidden />
            To‘xtatish
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1 p-2">
          {/* Emoji */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setEmojiOpen((v) => !v)}
              aria-expanded={emojiOpen}
              aria-label="Emoji"
              className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Smile className="h-5 w-5" aria-hidden />
            </button>
            {emojiOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setEmojiOpen(false)}
                  aria-hidden
                />
                <div className="absolute bottom-12 left-0 z-20 grid w-64 grid-cols-8 gap-0.5 rounded-lg border border-border bg-popover p-2 shadow-lg">
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

          {/* Fayl */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Fayl biriktirish"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
              window.setTimeout(
                () => inputRef.current?.scrollIntoView({ block: "nearest" }),
                250,
              )
            }}
            rows={1}
            disabled={disabled}
            placeholder="Xabar yozing…"
            className="min-h-11 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          />

          {/* Mikrofon yoki yuborish */}
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
            <button
              type="button"
              onClick={() => void startRecording()}
              disabled={disabled}
              aria-label="Ovozli xabar yozish"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Mic className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
