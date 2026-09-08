"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  ChevronsUpDown,
  Check,
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  X,
  FileAudio,
  Repeat,
  CalendarClock,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createTask, aiAnalyzeTask, createRecurringTask } from "@/lib/api"
import { resolveOrganizationIdsByNames } from "@/lib/organization-matching"

// ============================================================================
// Types
// ============================================================================

type CreateTaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizations: any[]
  users: any[]
  currentUser?: any
  onCreated: () => void | Promise<void>
  preferredInputMode?: "manual" | "audio"
}

type CreateFormState = {
  title: string
  description: string
  priority: string
  category: string
  due_date: string
  deputy_ids: string[]
  organization_ids: string[]
  // Recurring task fields
  is_recurring: boolean
  frequency: string
  start_date: string
  end_date: string
  deadline_days: number
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_DAYS: Record<string, number> = {
  FAVQULODDA: 1,
  YUQORI: 3,
  ODDIY: 5,
  PAST: 7,
}

const PRIORITY_OPTIONS = [
  { value: "FAVQULODDA", label: "Muhim va shoshilinch (1 kun)" },
  { value: "YUQORI", label: "Muhim, lekin shoshilinch emas (3 kun)" },
  { value: "ODDIY", label: "Shoshilinch, lekin muhim emas (5 kun)" },
  { value: "PAST", label: "Muhim emas va shoshilinch emas (7 kun)" },
]

const CATEGORY_OPTIONS = [
  { value: "IJTIMOIY", label: "Ijtimoiy" },
  { value: "IQTISODIY", label: "Iqtisodiy" },
  { value: "HUQUQIY", label: "Huquqiy" },
  { value: "INFRASTRUKTURA", label: "Infrastruktura" },
  { value: "TA_LIM", label: "Ta\u2019lim" },
  { value: "SOG_LIQNI_SAQLASH", label: "Sog\u2019liqni saqlash" },
  { value: "BOSHQA", label: "Boshqa" },
]

const FREQUENCY_OPTIONS = [
  { value: "DAILY", label: "Har kuni", days: 1 },
  { value: "WEEKLY", label: "Har hafta", days: 5 },
  { value: "BIWEEKLY", label: "Ikki haftada bir", days: 7 },
  { value: "MONTHLY", label: "Har oy", days: 7 },
  { value: "QUARTERLY", label: "Har chorakda", days: 14 },
  { value: "YEARLY", label: "Har yili", days: 30 },
]

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const INITIAL_FORM: CreateFormState = {
  title: "",
  description: "",
  priority: "PAST",
  category: "",
  due_date: "",
  deputy_ids: [],
  organization_ids: [],
  is_recurring: false,
  frequency: "MONTHLY",
  start_date: toDateInputValue(new Date()),
  end_date: "",
  deadline_days: 7,
}

const toLocalEndOfDayIso = (dateValue: string) => {
  if (!dateValue) return ""
  const localEndOfDay = new Date(`${dateValue}T23:59:59`)
  return localEndOfDay.toISOString()
}

// ============================================================================
// Component
// ============================================================================

export function CreateTaskDialog({
  open,
  onOpenChange,
  organizations,
  users,
  currentUser,
  onCreated,
  preferredInputMode = "manual",
}: CreateTaskDialogProps) {
  const organizationItems = useMemo(
    () => (
      Array.isArray(organizations)
        ? organizations
        : (organizations as { results?: any[] } | null | undefined)?.results || []
    ),
    [organizations]
  )

  // Form state
  const [form, setForm] = useState<CreateFormState>({ ...INITIAL_FORM })
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [orgOpen, setOrgOpen] = useState(false)
  const [deputyOpen, setDeputyOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // AI & Audio states
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiApplied, setAiApplied] = useState(false)
  const [aiTranscription, setAiTranscription] = useState("")
  const [aiError, setAiError] = useState("")

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioPanelRef = useRef<HTMLDivElement | null>(null)

  // ==================== LIFECYCLE ====================
  useEffect(() => {
    if (!open) {
      setForm({ ...INITIAL_FORM })
      setFiles([])
      setErrors({})
      setOrgOpen(false)
      setDeputyOpen(false)
      setAiApplied(false)
      setAiAnalyzing(false)
      setAiTranscription("")
      setAiError("")
      setSubmitting(false)
      cleanupRecording()
    }
  }, [open])

  useEffect(() => {
    if (!open || preferredInputMode !== "audio") return
    const timeoutId = window.setTimeout(() => {
      audioPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [open, preferredInputMode])

  useEffect(() => {
    if (!open || !currentUser) return
    if (currentUser.role === "HOKIM_YORDAMCHISI") {
      setForm((prev) => ({
        ...prev,
        deputy_ids: prev.deputy_ids.length ? prev.deputy_ids : [String(currentUser.id)],
      }))
    }
  }, [open, currentUser])

  // ==================== HELPERS ====================
  const setField = <K extends keyof CreateFormState>(field: K, value: CreateFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const isSubmitDisabled = useMemo(() => {
    if (submitting || aiAnalyzing) return true
    const base =
      !form.title.trim() ||
      !form.description.trim() ||
      !form.priority ||
      !form.category ||
      form.organization_ids.length === 0

    const requiresDeputySelection = ["HOKIM", "ADMIN"].includes(currentUser?.role || "")

    if (form.is_recurring) {
      return base || (requiresDeputySelection && form.deputy_ids.length === 0) || !form.frequency || !form.start_date || form.deadline_days < 1
    }
    return base || (requiresDeputySelection && form.deputy_ids.length === 0) || !form.due_date
  }, [form, submitting, aiAnalyzing, currentUser])

  const deputyItems = useMemo(() => {
    const selectedSectorIds = new Set(
      form.organization_ids
        .map((id) => organizationItems.find((org: any) => String(org.id) === String(id)))
        .map((org: any) => String(org?.sector?.id || org?.sector_id || org?.sector || ""))
        .filter(Boolean)
    )

    const allDeputies = (Array.isArray(users) ? users : []).filter((item: any) => item?.role === "HOKIM_YORDAMCHISI")
    const matchingDeputies = allDeputies.filter((item: any) => {
      const deputySectorId = String(item?.sector?.id || item?.sector_id || item?.sector || "")
      return !selectedSectorIds.size || (deputySectorId && selectedSectorIds.has(deputySectorId))
    })

    const source = matchingDeputies.length > 0 ? matchingDeputies : allDeputies
    return source.sort((a: any, b: any) =>
      String(a?.full_name || `${a?.last_name || ""} ${a?.first_name || ""}`).localeCompare(
        String(b?.full_name || `${b?.last_name || ""} ${b?.first_name || ""}`),
        "uz"
      )
    )
  }, [form.organization_ids, organizationItems, users])

  const handlePriorityChange = (priority: string) => {
    setField("priority", priority)
    if (!form.is_recurring) {
      const days = PRIORITY_DAYS[priority]
      if (days) {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + days)
        setField("due_date", toDateInputValue(dueDate))
      }
    }
  }

  // ==================== RECURRING TASK TOGGLE ====================
  const handleRecurringToggle = (checked: boolean) => {
    setField("is_recurring", checked)
    if (checked) {
      // Set default start_date and deadline_days
      setForm((prev) => ({
        ...prev,
        is_recurring: true,
        start_date: toDateInputValue(new Date()),
        deadline_days:
          FREQUENCY_OPTIONS.find((f) => f.value === prev.frequency)?.days || 7,
      }))
    }
  }

  const handleFrequencyChange = (freq: string) => {
    const option = FREQUENCY_OPTIONS.find((f) => f.value === freq)
    setForm((prev) => ({
      ...prev,
      frequency: freq,
      deadline_days: option?.days || prev.deadline_days,
    }))
  }

  // ==================== MULTI-ORG SELECTION ====================
  const toggleOrganization = (orgId: string) => {
    setForm((prev) => {
      const ids = prev.organization_ids.includes(orgId)
        ? prev.organization_ids.filter((id) => id !== orgId)
        : [...prev.organization_ids, orgId]
      return { ...prev, organization_ids: ids }
    })
    if (errors.organization_ids) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.organization_ids
        return next
      })
    }
  }

  const removeOrganization = (orgId: string) => {
    setForm((prev) => ({
      ...prev,
      organization_ids: prev.organization_ids.filter((id) => id !== orgId),
    }))
  }

  const toggleDeputy = (deputyId: string) => {
    setForm((prev) => {
      const ids = prev.deputy_ids.includes(deputyId)
        ? prev.deputy_ids.filter((id) => id !== deputyId)
        : [...prev.deputy_ids, deputyId]
      return { ...prev, deputy_ids: ids }
    })
    if (errors.deputy_ids) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.deputy_ids
        return next
      })
    }
  }

  const removeDeputy = (deputyId: string) => {
    setForm((prev) => ({
      ...prev,
      deputy_ids: prev.deputy_ids.filter((id) => id !== deputyId),
    }))
  }

  const selectAllOrganizations = () => {
    const allIds = organizationItems.map((org: any) => String(org.id))
    setForm((prev) => ({ ...prev, organization_ids: allIds }))
    if (errors.organization_ids) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.organization_ids
        return next
      })
    }
  }

  // ==================== AUDIO RECORDING ====================
  const cleanupRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop()
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    setIsRecording(false)
    setRecordingTime(0)
  }

  const startRecording = async () => {
    try {
      setAiError("")
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
      ]
      const supportedMime =
        mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || ""

      const recorder = new MediaRecorder(
        stream,
        supportedMime ? { mimeType: supportedMime } : undefined
      )
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })
        // Cleanup stream
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        // Analyze
        await analyzeWithAI(undefined, blob)
      }

      recorder.start(250)
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(
        () => setRecordingTime((p) => p + 1),
        1000
      )
    } catch {
      setAiError("Mikrofonga ruxsat berilmadi yoki mikrofon topilmadi")
    }
  }

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    setRecordingTime(0)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  // ==================== AI ANALYSIS ====================
  const analyzeWithAI = async (text?: string, audio?: Blob) => {
    if (!text && !audio) return

    try {
      setAiAnalyzing(true)
      setAiError("")
      setAiTranscription("")

      const result = await aiAnalyzeTask({ text, audio })

      // Show transcription
      if (result.transcription) {
        setAiTranscription(result.transcription)
      }

      const s = result.suggestions
      const validOrgIdsFromIds = s.organization_ids?.length
        ? s.organization_ids.filter((id: string) =>
            organizationItems.some((o: any) => String(o.id) === String(id))
          )
        : []
      const resolvedOrgIdsFromNames = resolveOrganizationIdsByNames(
        s.organization_names,
        organizationItems,
      )
      const suggestedOrgIds = Array.from(
        new Set([...validOrgIdsFromIds, ...resolvedOrgIdsFromNames])
      )

      // Apply all AI suggestions to form
      setForm((prev) => {
        const newForm: CreateFormState = {
          ...prev,
          title: s.title || prev.title,
          description: s.description || prev.description,
          priority: s.priority || prev.priority,
          category: s.category || prev.category,
          organization_ids: suggestedOrgIds.length ? suggestedOrgIds : prev.organization_ids,
          is_recurring: s.is_recurring ?? prev.is_recurring,
          frequency: s.frequency || prev.frequency,
          deadline_days: s.deadline_days || prev.deadline_days,
        }

        // Auto-compute dates
        if (s.is_recurring) {
          newForm.start_date =
            prev.start_date || toDateInputValue(new Date())
        } else {
          // Set due_date based on priority
          const priority = s.priority || "ODDIY"
          const days = PRIORITY_DAYS[priority] || 5
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + days)
          newForm.due_date = toDateInputValue(dueDate)
        }

        return newForm
      })

      setAiApplied(true)
      if ((s.organization_names?.length || s.organization_ids?.length) && suggestedOrgIds.length === 0) {
        setErrors((prev) => ({
          ...prev,
          organization_ids: "AI tashkilotni topa olmadi. Qidiruv orqali qo'lda tanlang.",
        }))
      } else {
        setErrors({})
      }
    } catch (err: any) {
      console.error("AI analysis error:", err)
      setAiError(
        err?.message ||
          "AI tahlil qilishda xatolik yuz berdi. Qayta urinib ko\u2018ring."
      )
    } finally {
      setAiAnalyzing(false)
    }
  }

  const handleAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be selected again
    e.target.value = ""
    await analyzeWithAI(undefined, file)
  }

  // ==================== VALIDATION & SUBMIT ====================
  const validate = (): boolean => {
    const next: Record<string, string> = {}

    if (!form.title.trim()) next.title = "Topshiriq nomi majburiy"
    if (!form.description.trim()) next.description = "Tafsilotlar majburiy"
    if (!form.priority) next.priority = "Muhimlik darajasini tanlang"
    if (!form.category) next.category = "Sohani tanlang"
    if (["HOKIM", "ADMIN"].includes(currentUser?.role || "") && form.deputy_ids.length === 0) {
      next.deputy_ids = "Kamida bitta hokim o'rinbosarini tanlang"
    }
    if (form.organization_ids.length === 0)
      next.organization_ids = "Kamida bitta tashkilot tanlang"

    if (form.is_recurring) {
      if (!form.frequency) next.frequency = "Takrorlanish chastotasini tanlang"
      if (!form.start_date) next.start_date = "Boshlanish sanasini tanlang"
      if (form.deadline_days < 1)
        next.deadline_days = "Kamida 1 kun bo\u2018lishi kerak"
    } else {
      if (!form.due_date) next.due_date = "Muddatni tanlang"
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      setSubmitting(true)

      if (form.is_recurring) {
        // Create recurring task
        await createRecurringTask({
          title: form.title,
          description: form.description,
          frequency: form.frequency,
          priority: form.priority,
          category: form.category,
          deadline_days: form.deadline_days,
          organizations: form.organization_ids,
          deputy_ids: form.deputy_ids,
          start_date: form.start_date,
          end_date: form.end_date || undefined,
        })
      } else {
        // Create regular task
        const payload = new FormData()
        payload.append("title", form.title)
        payload.append("description", form.description)
        payload.append("priority", form.priority)
        payload.append("category", form.category)
        if (form.due_date) {
          payload.append("deadline", toLocalEndOfDayIso(form.due_date))
        }
        if (form.deputy_ids.length > 0) {
          payload.append("deputy_ids", form.deputy_ids.join(","))
        }
        payload.append("organizations", form.organization_ids.join(","))
        files.forEach((file) => payload.append("attachments", file))

        await createTask(payload)
      }

      onOpenChange(false)
      await onCreated()
    } catch (error: any) {
      console.error("Task creation error:", error)
      const msg =
        error?.data?.detail ||
        error?.data?.non_field_errors?.[0] ||
        (typeof error?.data === "object"
          ? Object.values(error.data).flat().join(", ")
          : error?.message || "Noma\u2018lum xatolik")
      setErrors((prev) => ({ ...prev, submit: String(msg) }))
    } finally {
      setSubmitting(false)
    }
  }

  // ==================== RENDER ====================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[760px] max-h-[94dvh] overflow-hidden rounded-[28px] border-white/70 bg-white/96 p-0 shadow-[0_30px_100px_-36px_rgba(14,165,233,0.35)] backdrop-blur-2xl sm:w-full">
        <div className="max-h-[94dvh] overflow-y-auto px-4 py-5 sm:px-6">
          <DialogHeader className="space-y-2 pr-8">
            <DialogTitle className="text-xl font-semibold text-slate-900">Yangi topshiriq qo&apos;shish</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Topshiriq ma&apos;lumotlarini kiriting yoki audio yozib AI yordamida to&apos;ldiring
            </DialogDescription>
          </DialogHeader>

          {/* ========== AI AUDIO PANEL ========== */}
          <div
            ref={audioPanelRef}
            className={cn(
              "mb-5 rounded-2xl border border-indigo-100/70 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4 shadow-[0_18px_40px_-30px_rgba(79,70,229,0.45)] space-y-3",
              preferredInputMode === "audio" && "border-indigo-300"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  <Sparkles className="h-4 w-4" />
                  AI yordamida tezkor topshiriq yaratish
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  Audio yozing yoki fayl yuklang. AI matnni tartiblaydi va maydonlarni to‘ldiradi.
                </p>
              </div>
              {aiApplied && (
                <Badge
                  variant="secondary"
                  className="shrink-0 bg-emerald-100 text-emerald-700 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" /> AI to&apos;ldirdi
                </Badge>
              )}
            </div>

            {preferredInputMode === "audio" && (
              <div className="rounded-xl border border-indigo-200/70 bg-white/80 p-3 text-xs leading-5 text-indigo-700">
                Telefon uchun tezkor rejim yoqilgan. Mikrofon tugmasi orqali gapirib topshiriq yaratish mumkin.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
            {/* Mic button */}
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              className={cn(
                "gap-2 min-w-[140px] min-h-11 sm:min-h-10",
                isRecording && "animate-pulse"
              )}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={aiAnalyzing}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4" />
                  To&apos;xtatish {formatTime(recordingTime)}
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Audio yozish
                </>
              )}
            </Button>

            {/* Audio file upload */}
            <div className="relative">
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioFile}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={aiAnalyzing || isRecording}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 min-h-11 sm:min-h-10"
                disabled={aiAnalyzing || isRecording}
              >
                <FileAudio className="h-4 w-4" />
                Audio fayl
              </Button>
            </div>

            {/* AI analyze from existing text */}
            {form.description.trim().length > 10 && !aiAnalyzing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 min-h-11 sm:min-h-10 text-indigo-600 border-indigo-200 hover:bg-indigo-50/60"
                onClick={() => analyzeWithAI(form.description)}
              >
                <Sparkles className="h-4 w-4" />
                AI bilan to&apos;ldirish
              </Button>
            )}

              {aiAnalyzing && (
                <div className="flex items-center gap-2 text-sm text-indigo-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    Audio matnga o&apos;girilmoqda va AI tahlil qilmoqda...
                  </span>
                </div>
              )}
            </div>

            {/* Show AI transcription result */}
            {aiTranscription && !aiAnalyzing && (
              <div className="rounded-xl bg-white/80 border border-indigo-100/60 p-3 space-y-1">
                <div className="text-xs font-medium text-indigo-600">
                  Audio transkripsiyasi:
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {aiTranscription}
                </p>
              </div>
            )}

            {aiError && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}
          </div>

          {/* ========== FORM ========== */}
          <form
            className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Topshiriq nomi <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Topshiriq nomini kiriting"
              aria-invalid={!!errors.title}
              maxLength={500}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Tafsilotlar <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Topshiriq haqida to'liq ma'lumotlarni kiriting"
              rows={4}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Priority + Category */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priority">
                Muhimlik darajasi <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.priority}
                onValueChange={handlePriorityChange}
              >
                <SelectTrigger aria-invalid={!!errors.priority}>
                  <SelectValue placeholder="Muhimlik darajasini tanlang" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 border border-indigo-100/40 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] z-[100]">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-xs text-destructive">{errors.priority}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Soha <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.category}
                onValueChange={(value) => setField("category", value)}
              >
                <SelectTrigger aria-invalid={!!errors.category}>
                  <SelectValue placeholder="Sohani tanlang" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 border border-indigo-100/40 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] z-[100]">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category}</p>
              )}
            </div>
          </div>

          {["HOKIM", "ADMIN", "HOKIM_YORDAMCHISI"].includes(currentUser?.role || "") && (
            <div className="space-y-2">
              <Label>
                Hokim o'rinbosari
                {["HOKIM", "ADMIN"].includes(currentUser?.role || "") && <span className="text-destructive"> *</span>}
              </Label>

              {form.deputy_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.deputy_ids.map((id) => {
                    const deputy = deputyItems.find((item: any) => String(item.id) === String(id))
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1 text-xs">
                        {deputy?.full_name || `${deputy?.last_name || ""} ${deputy?.first_name || ""}`.trim() || id}
                        {currentUser?.role === "HOKIM_YORDAMCHISI" && String(currentUser?.id) === String(id) ? null : (
                          <button
                            type="button"
                            onClick={() => removeDeputy(id)}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-slate-300/50"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    )
                  })}
                </div>
              )}

              <Popover open={deputyOpen} onOpenChange={setDeputyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("w-full justify-between", errors.deputy_ids && "border-destructive")}
                    disabled={currentUser?.role === "HOKIM_YORDAMCHISI"}
                  >
                    {form.deputy_ids.length > 0
                      ? `${form.deputy_ids.length} ta hokim o'rinbosari tanlangan`
                      : "Hokim o'rinbosarini tanlang"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
              <PopoverContent
                className="w-[calc(100vw-1rem)] max-w-[360px] p-0 bg-white border border-indigo-100/40 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)]"
                align="start"
              >
                  <Command className="bg-white">
                    <CommandInput placeholder="Ism bo'yicha qidirish..." className="bg-white" />
                    <CommandList>
                      <CommandEmpty>Hokim o'rinbosari topilmadi.</CommandEmpty>
                      <CommandGroup>
                        {deputyItems.map((deputy: any) => {
                          const deputyId = String(deputy.id)
                          const isSelected = form.deputy_ids.includes(deputyId)
                          return (
                            <CommandItem
                              key={deputyId}
                              value={`${deputy.full_name || ""} ${deputy.first_name || ""} ${deputy.last_name || ""}`}
                              onSelect={() => toggleDeputy(deputyId)}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-800">
                                  {deputy.full_name || `${deputy.last_name || ""} ${deputy.first_name || ""}`.trim() || deputyId}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                  {deputy.sector_name || "Soha biriktirilmagan"}
                                </p>
                              </div>
                              <Check className={cn("h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {errors.deputy_ids && <p className="text-xs text-destructive">{errors.deputy_ids}</p>}
            </div>
          )}

          {/* ========== MULTI-ORG SELECTION ========== */}
          <div className="space-y-2">
            <Label>
              Tashkilotlar <span className="text-destructive">*</span>
            </Label>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="min-h-10" onClick={selectAllOrganizations}>
                Barcha faol tashkilotlar
              </Button>
              {form.organization_ids.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-10"
                  onClick={() => setField("organization_ids", [])}
                >
                  Tozalash
                </Button>
              )}
            </div>

            {/* Selected org badges */}
            {form.organization_ids.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.organization_ids.map((id) => {
                  const org = organizationItems.find(
                    (o: any) => String(o.id) === String(id)
                  )
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="gap-1 pr-1 text-xs"
                    >
                      {org?.short_name || org?.name || id}
                      <button
                        type="button"
                        onClick={() => removeOrganization(id)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-slate-300/50"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}

            <Popover open={orgOpen} onOpenChange={setOrgOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-between",
                    errors.organization_ids && "border-destructive"
                  )}
                >
                  {form.organization_ids.length > 0
                    ? form.organization_ids.length <= 2
                      ? form.organization_ids
                          .map((id) => organizationItems.find((org: any) => String(org.id) === String(id)))
                          .filter(Boolean)
                          .map((org: any) => org.short_name || org.name)
                          .join(", ")
                      : `${form.organization_ids.length} ta tashkilot tanlangan`
                    : "Tashkilotlarni tanlang"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[calc(100vw-1rem)] max-w-[420px] p-0 bg-white border border-indigo-100/40 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)]"
                align="start"
              >
                <Command className="bg-white">
                  <CommandInput
                    placeholder="Qidirish..."
                    className="bg-white"
                  />
                  <CommandList className="max-h-[250px]">
                    <CommandEmpty>Topilmadi</CommandEmpty>
                    <CommandGroup>
                      {organizationItems.map((org: any) => {
                        const isSelected = form.organization_ids.includes(
                          String(org.id)
                        )
                        return (
                          <CommandItem
                            key={org.id}
                            value={org.name}
                            onSelect={() =>
                              toggleOrganization(String(org.id))
                            }
                          >
                            <div
                              className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                isSelected
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-slate-300"
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <span
                              className={cn(
                                "text-sm",
                                isSelected && "font-medium"
                              )}
                            >
                              {org.short_name ? `${org.name} (${org.short_name})` : org.name}
                            </span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.organization_ids && (
              <p className="text-xs text-destructive">
                {errors.organization_ids}
              </p>
            )}
          </div>

          {/* ========== RECURRING TASK TOGGLE ========== */}
          <div className="rounded-lg border border-indigo-100/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-lg",
                    form.is_recurring
                      ? "bg-violet-100"
                      : "bg-indigo-50/50"
                  )}
                >
                  <Repeat
                    className={cn(
                      "h-4 w-4",
                      form.is_recurring
                        ? "text-violet-600"
                        : "text-slate-400"
                    )}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="is_recurring"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Takrorlanuvchi topshiriq
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Avtomatik ravishda takrorlanadigan topshiriq yaratish
                  </p>
                </div>
              </div>
              <Switch
                id="is_recurring"
                checked={form.is_recurring}
                onCheckedChange={handleRecurringToggle}
              />
            </div>

            {form.is_recurring && (
              <div className="space-y-4 pt-2 border-t border-indigo-50/60">
                {/* Frequency + Deadline days */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">
                      Takrorlanish chastotasi{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.frequency}
                      onValueChange={handleFrequencyChange}
                    >
                      <SelectTrigger aria-invalid={!!errors.frequency}>
                        <SelectValue placeholder="Chastotani tanlang" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-slate-900 border border-indigo-100/40 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] z-[100]">
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.frequency && (
                      <p className="text-xs text-destructive">
                        {errors.frequency}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline_days">
                      Har bir topshiriq muddati (kun){" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="deadline_days"
                      type="number"
                      min={1}
                      max={365}
                      value={form.deadline_days}
                      onChange={(e) =>
                        setField(
                          "deadline_days",
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      }
                      aria-invalid={!!errors.deadline_days}
                    />
                    {errors.deadline_days && (
                      <p className="text-xs text-destructive">
                        {errors.deadline_days}
                      </p>
                    )}
                  </div>
                </div>

                {/* Start & End dates */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">
                      Boshlanish sanasi{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setField("start_date", e.target.value)}
                      aria-invalid={!!errors.start_date}
                    />
                    {errors.start_date && (
                      <p className="text-xs text-destructive">
                        {errors.start_date}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">
                      Tugash sanasi{" "}
                      <span className="text-xs text-muted-foreground">
                        (ixtiyoriy)
                      </span>
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setField("end_date", e.target.value)}
                      min={form.start_date}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 rounded-lg bg-violet-50/70 p-3">
                  <CalendarClock className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-700">
                    {FREQUENCY_OPTIONS.find((f) => f.value === form.frequency)
                      ?.label || "Har oy"}{" "}
                    avtomatik yangi topshiriq yaratiladi. Har bir topshiriq uchun{" "}
                    <strong>{form.deadline_days} kun</strong> muddat beriladi.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Due date — only for non-recurring */}
          {!form.is_recurring && (
            <div className="space-y-2">
              <Label htmlFor="due_date">
                Muddat <span className="text-destructive">*</span>
              </Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => setField("due_date", e.target.value)}
                aria-invalid={!!errors.due_date}
              />
              {errors.due_date && (
                <p className="text-xs text-destructive">{errors.due_date}</p>
              )}
            </div>
          )}

          {/* Attachments — only for non-recurring */}
          {!form.is_recurring && (
            <div className="space-y-2">
              <Label htmlFor="attachments">Fayllar (rasm/video/hujjat)</Label>
              <Input
                id="attachments"
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              {files.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {files.map((file) => file.name).join(", ")}
                </div>
              )}
            </div>
          )}

          {/* Submit error */}
          {errors.submit && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errors.submit}</span>
            </div>
          )}

          <DialogFooter className="pt-2 sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              className="min-w-[120px]"
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className={cn(
                "min-w-[140px]",
                form.is_recurring &&
                  "bg-violet-600 hover:bg-violet-700 text-white"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Yaratilmoqda...
                </>
              ) : aiAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  AI tahlil qilmoqda...
                </>
              ) : form.is_recurring ? (
                <>
                  <Repeat className="h-4 w-4 mr-2" />
                  Takrorlanuvchi topshiriq yaratish
                </>
              ) : (
                "Qo\u2018shish"
              )}
            </Button>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
