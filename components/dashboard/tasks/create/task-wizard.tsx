"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  FileText,
  Loader2,
  Paperclip,
  Repeat,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { getCurrentUser } from "@/lib/api/auth.api"
import { getSectors, type Sector } from "@/lib/api/sectors.api"
import {
  getAssignableOrganizations,
  type AssignableScope,
} from "@/lib/api/organizations.api"
import { getUsers } from "@/lib/api/users.api"
import { createTask, createRecurringTask } from "@/lib/api/tasks.api"
import { PriorityBadge } from "@/components/ui/status-badge"
import type { Organization } from "@/types"
import {
  FREQUENCY_DAYS,
  FREQUENCY_LABEL,
  PRIORITY_DAYS,
  PRIORITY_ORDER,
  WIZARD_STEPS,
  addDays,
  clearDraft,
  deadlinePayload,
  findOrganizationsByName,
  findSectorByName,
  firstInvalidStep,
  formatDateHuman,
  initialForm,
  isDirty,
  loadDraft,
  localDateString,
  saveDraft,
  takeAiPrefill,
  validateAll,
  validateStep,
  type DeputyOption,
  type Frequency,
  type StepKey,
  type TaskWizardForm,
  type WizardContext,
  type WizardErrors,
} from "./wizard-types"

/* ==========================================================================
   TOPSHIRIQ YARATISH WIZARD
   ==========================================================================
   Ilgari bu yerda ikki raqib implementatsiya bor edi va topshiriqlar
   sahifasidagi ASOSIY (gradientli) tugma buzuq bo'lganini ochardi:
   mock ma'lumotlar, mos kelmaydigan maydon nomlari, har submit'da 400.
   Endi bitta oqim, real API kontrakti bilan.
   ========================================================================== */

const MAX_FILES = 10
const MAX_FILE_MB = 20
const ALLOWED_EXT = [
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
  "jpg", "jpeg", "png", "webp", "heic", "gif",
  "mp4", "webm", "mov", "mp3", "m4a", "ogg", "wav",
]

export function TaskWizard() {
  const router = useRouter()

  const [form, setForm] = useState<TaskWizardForm>(initialForm)
  const [step, setStep] = useState<StepKey>("basics")
  const [errors, setErrors] = useState<WizardErrors>({})
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)

  const [sectors, setSectors] = useState<Sector[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [deputies, setDeputies] = useState<DeputyOption[]>([])
  const [role, setRole] = useState<string>("")
  /* Topshiriq berish doirasi (backend/tasks/access.py):
       all     — hokim/admin: barcha tashkilotlar, soha erkin tanlanadi
       sector  — o'rinbosar: faqat o'z sohasi, soha qulflangan
       curated — alohida biriktirilgan tashkilotlar, soha qulflangan
       own     — tashkilot rahbari: faqat o'z tashkiloti
       none    — soha/tashkilot biriktirilmagan, yaratish mumkin emas */
  const [lockedSector, setLockedSector] = useState<{ id: string; name: string } | null>(null)

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [draftFound, setDraftFound] = useState<boolean>(false)

  const liveRef = useRef<HTMLDivElement | null>(null)

  /* ------------------------------------------------------- Ma'lumot yuklash */
  useEffect(() => {
    let alive = true

    Promise.all([
      getCurrentUser().catch(() => null),
      getSectors().catch(() => [] as Sector[]),
      // FAQAT shu foydalanuvchi topshiriq bera oladigan tashkilotlar.
      // O'rinbosar kabinetida boshqa sohaning tashkilotlari umuman
      // ko'rinmaydi — backend ham yaratishda shu doirani tekshiradi.
      getAssignableOrganizations().catch(() => ({
        scope: "none" as AssignableScope,
        sector: null,
        organizations: [],
      })),
      // Faqat o'rinbosarlar kerak — hamma foydalanuvchi emas
      getUsers({ role: "HOKIM_YORDAMCHISI" } as any, 1, 200).catch(() => []),
    ])
      .then(([me, sectorList, assignable, deputyList]) => {
        if (!alive) return

        setRole(String((me as any)?.role ?? ""))

        const orgList = assignable.organizations as unknown as Organization[]
        const allSectors = (sectorList as Sector[]).filter((s) => s.is_active !== false)

        if (assignable.scope === "all") {
          setSectors(allSectors)
          setLockedSector(null)
        } else {
          // Doira cheklangan: soha qulflanadi va faqat ruxsat etilgan
          // tashkilotlarning sohalari ko'rsatiladi.
          const allowedSectorIds = new Set(
            orgList.map((o) => String((o as any).sector ?? "")).filter(Boolean),
          )
          const narrowed = allSectors.filter((sec) => allowedSectorIds.has(String(sec.id)))
          setSectors(narrowed.length > 0 ? narrowed : allSectors)
          if (assignable.sector) {
            setLockedSector(assignable.sector)
            setForm((prev) => ({ ...prev, sectorId: prev.sectorId || assignable.sector!.id }))
          } else if (narrowed.length === 1) {
            setLockedSector({ id: String(narrowed[0].id), name: narrowed[0].name })
            setForm((prev) => ({ ...prev, sectorId: prev.sectorId || String(narrowed[0].id) }))
          }
        }

        setOrganizations(orgList)
        setDeputies(
          (deputyList as any[]).map((u) => ({
            id: String(u.id),
            fullName:
              [u.first_name, u.last_name].filter(Boolean).join(" ") ||
              u.full_name ||
              u.username ||
              "—",
            sectorId: u.sector ? String(u.sector) : null,
            sectorName: u.sector_name ?? null,
          })),
        )

        if (orgList.length === 0) {
          setLoadError(
            assignable.scope === "none"
              ? "Sizga soha yoki tashkilot biriktirilmagan — topshiriq bera olmaysiz. Administratorga murojaat qiling."
              : "Tashkilotlar ro‘yxati yuklanmadi. Internet yoki server ulanishini tekshirib, sahifani yangilang.",
          )
        }
      })
      .catch(() => {
        if (alive) setLoadError("Ma’lumotlarni yuklashda xatolik yuz berdi.")
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  /* -------------------------------------- Qoralama va AI to'ldirishni tiklash */
  useEffect(() => {
    if (loading) return

    const prefill = takeAiPrefill()
    if (prefill) {
      setForm((prev) => ({
        ...prev,
        title: prefill.title ?? prev.title,
        description: prefill.description ?? prev.description,
        sectorId: findSectorByName(sectors, prefill.sectorName) || prev.sectorId,
        organizationIds:
          findOrganizationsByName(organizations, prefill.organizationNames) ||
          prev.organizationIds,
        priority: (PRIORITY_ORDER as string[]).includes(prefill.priority ?? "")
          ? (prefill.priority as TaskWizardForm["priority"])
          : prev.priority,
        deadline: prefill.deadline && prefill.deadline >= localDateString()
          ? prefill.deadline
          : prev.deadline,
      }))
      announce("AI tahlili forma maydonlariga joylandi. Tekshirib, tasdiqlang.")
      return
    }

    const draft = loadDraft()
    if (draft && isDirty(draft.form)) setDraftFound(true)
  }, [loading, sectors, organizations])

  /* ------------------------------------------------------- Qoralamani saqlash */
  useEffect(() => {
    if (loading || submitting) return
    if (!isDirty(form)) return
    const t = setTimeout(() => saveDraft(form, step), 700)
    return () => clearTimeout(t)
  }, [form, step, loading, submitting])

  /* --------------------------------------------------------------- Kontekst */
  const ctx: WizardContext = useMemo(
    () => ({
      sectors,
      organizations,
      deputies,
      role,
      // Backend HOKIM va ADMIN uchun kamida bitta o'rinbosar talab qiladi
      requiresDeputy: role === "HOKIM" || role === "ADMIN",
    }),
    [sectors, organizations, deputies, role],
  )

  /** Tanlangan sohaga tegishli tashkilotlar.
   *  Backend har bir tashkilotning sohasi topshiriq sohasiga mos kelishini
   *  tekshiradi — shuning uchun ro'yxatni oldindan filtrlaymiz. */
  const availableOrganizations = useMemo(() => {
    if (!form.sectorId) return organizations
    const inSector = organizations.filter(
      (o) => String((o as any).sector ?? "") === form.sectorId,
    )
    return inSector.length > 0 ? inSector : organizations
  }, [organizations, form.sectorId])

  const orgById = useMemo(() => {
    const m = new Map<string, Organization>()
    for (const o of organizations) m.set(String(o.id), o)
    return m
  }, [organizations])

  const deputyById = useMemo(() => {
    const m = new Map<string, DeputyOption>()
    for (const d of deputies) m.set(d.id, d)
    return m
  }, [deputies])

  const selectedSector = form.sectorId
    ? sectors.find((s) => s.id === form.sectorId)
    : undefined

  /* -------------------------------------------------------------- Yordamchi */
  function announce(text: string) {
    if (liveRef.current) liveRef.current.textContent = text
  }

  const set = useCallback(<K extends keyof TaskWizardForm>(key: K, value: TaskWizardForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key] && !prev.submit) return prev
      const next = { ...prev }
      delete next[key]
      delete next.submit
      return next
    })
  }, [])

  const toggleOrg = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      organizationIds: prev.organizationIds.includes(id)
        ? prev.organizationIds.filter((x) => x !== id)
        : [...prev.organizationIds, id],
    }))
    setErrors((prev) => ({ ...prev, organizationIds: undefined, submit: undefined }))
  }, [])

  const toggleDeputy = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      deputyIds: prev.deputyIds.includes(id)
        ? prev.deputyIds.filter((x) => x !== id)
        : [...prev.deputyIds, id],
    }))
    setErrors((prev) => ({ ...prev, deputyIds: undefined, submit: undefined }))
  }, [])

  /** Muhimlik o'zgarganda muddat ham tavsiya etilgan qiymatga siljiydi */
  const setPriority = useCallback((p: TaskWizardForm["priority"]) => {
    setForm((prev) => ({
      ...prev,
      priority: p,
      deadline: prev.isRecurring ? prev.deadline : addDays(PRIORITY_DAYS[p]),
    }))
  }, [])

  const setFrequency = useCallback((f: Frequency) => {
    setForm((prev) => ({ ...prev, frequency: f, deadlineDays: FREQUENCY_DAYS[f] }))
  }, [])

  /* ------------------------------------------------------------- Fayllar */
  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming)
      const problems: string[] = []

      setFiles((prev) => {
        const next = [...prev]
        for (const f of list) {
          if (next.length >= MAX_FILES) {
            problems.push(`Ko‘pi bilan ${MAX_FILES} ta fayl`)
            break
          }
          const ext = f.name.split(".").pop()?.toLowerCase() ?? ""
          if (!ALLOWED_EXT.includes(ext)) {
            problems.push(`«${f.name}» — bu fayl turi ruxsat etilmagan`)
            continue
          }
          if (f.size > MAX_FILE_MB * 1024 * 1024) {
            problems.push(`«${f.name}» — ${MAX_FILE_MB} MB dan katta`)
            continue
          }
          if (next.some((x) => x.name === f.name && x.size === f.size)) continue
          next.push(f)
        }
        return next
      })

      setFileError(problems.length ? problems.join(". ") : null)
    },
    [],
  )

  const removeFile = useCallback((idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
    setFileError(null)
  }, [])

  /* ----------------------------------------------------------- Navigatsiya */
  const stepIndex = WIZARD_STEPS.findIndex((s) => s.key === step)

  const goNext = useCallback(() => {
    const e = validateStep(step, form, ctx)
    if (Object.keys(e).length) {
      setErrors(e)
      announce("Formada to‘ldirilmagan maydonlar bor.")
      return
    }
    setErrors({})
    const next = WIZARD_STEPS[stepIndex + 1]
    if (next) {
      setStep(next.key)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [step, form, ctx, stepIndex])

  const goBack = useCallback(() => {
    const prev = WIZARD_STEPS[stepIndex - 1]
    if (prev) {
      setStep(prev.key)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [stepIndex])

  /** Qadamga o'tish — faqat oldingi qadamlar to'g'ri bo'lsa */
  const jumpTo = useCallback(
    (target: StepKey) => {
      const targetIndex = WIZARD_STEPS.findIndex((s) => s.key === target)
      if (targetIndex <= stepIndex) {
        setStep(target)
        return
      }
      for (let i = 0; i < targetIndex; i++) {
        const e = validateStep(WIZARD_STEPS[i].key, form, ctx)
        if (Object.keys(e).length) {
          setErrors(e)
          setStep(WIZARD_STEPS[i].key)
          return
        }
      }
      setStep(target)
    },
    [stepIndex, form, ctx],
  )

  /* --------------------------------------------------------------- Yuborish */
  const submit = useCallback(async () => {
    const all = validateAll(form, ctx)
    if (Object.keys(all).length) {
      setErrors(all)
      const bad = firstInvalidStep(all)
      if (bad) setStep(bad)
      announce("Formada xatolar bor.")
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      if (form.isRecurring) {
        await createRecurringTask({
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          sector: form.sectorId,
          organizations: form.organizationIds.join(","),
          deputy_ids: form.deputyIds.join(","),
          frequency: form.frequency,
          deadline_days: form.deadlineDays,
          start_date: form.startDate,
          ...(form.endDate ? { end_date: form.endDate } : {}),
        } as any)
      } else {
        const payload = new FormData()
        payload.append("title", form.title.trim())
        payload.append("description", form.description.trim())
        payload.append("priority", form.priority)
        payload.append("sector", form.sectorId)
        payload.append("organizations", form.organizationIds.join(","))
        if (form.deputyIds.length) payload.append("deputy_ids", form.deputyIds.join(","))
        payload.append("deadline", deadlinePayload(form.deadline))
        for (const f of files) payload.append("attachments", f)

        await createTask(payload)
      }

      clearDraft()
      router.push("/dashboard/tasks?created=1")
    } catch (err: any) {
      // Backend maydon xatolarini forma maydonlariga bog'laymiz.
      // Ilgari bu `alert("Xatolik yuz berdi!")` bilan tashlab yuborilardi.
      const data = err?.data
      const mapped: WizardErrors = {}

      const pick = (v: unknown): string | undefined => {
        if (!v) return undefined
        if (Array.isArray(v)) return String(v[0])
        if (typeof v === "string") return v
        return undefined
      }

      if (data && typeof data === "object") {
        mapped.title = pick((data as any).title)
        mapped.description = pick((data as any).description)
        mapped.sectorId = pick((data as any).sector)
        mapped.organizationIds = pick((data as any).organizations)
        mapped.deputyIds = pick((data as any).deputy_ids)
        mapped.deadline = pick((data as any).deadline)
        const general =
          pick((data as any).detail) ??
          pick((data as any).non_field_errors) ??
          pick((data as any).attachments)
        if (general) mapped.submit = general
      }

      const hasField = Object.keys(mapped).some(
        (k) => k !== "submit" && (mapped as any)[k],
      )
      if (!hasField && !mapped.submit) {
        mapped.submit =
          err?.message ||
          "Topshiriqni yaratib bo‘lmadi. Bir daqiqadan so‘ng qayta urinib ko‘ring."
      }

      setErrors(mapped)
      const bad = firstInvalidStep(mapped)
      if (bad) setStep(bad)
      announce("Yuborishda xatolik yuz berdi.")
    } finally {
      setSubmitting(false)
    }
  }, [form, ctx, files, router])

  /* ------------------------------------------------------------------ RENDER */

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="surface h-16 animate-pulse" />
        <div className="surface h-[420px] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl pb-28 md:pb-6">
      <div ref={liveRef} role="status" aria-live="polite" className="sr-only" />

      {loadError && (
        <Banner tone="danger" icon={AlertCircle} className="mb-3">
          {loadError}
        </Banner>
      )}

      {draftFound && (
        <Banner tone="info" icon={FileText} className="mb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Saqlangan qoralama topildi. Davom ettirasizmi?</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-hover"
                onClick={() => {
                  const d = loadDraft()
                  if (d) {
                    setForm(d.form)
                    setStep(d.step)
                  }
                  setDraftFound(false)
                }}
              >
                Davom ettirish
              </button>
              <button
                type="button"
                className="h-9 rounded-xl bg-card shadow-xs px-3 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => {
                  clearDraft()
                  setDraftFound(false)
                }}
              >
                Yangidan boshlash
              </button>
            </div>
          </div>
        </Banner>
      )}

      {/* ------------------------------------------------------ Qadamlar chizig'i */}
      <nav aria-label="Qadamlar" className="surface mb-4 overflow-hidden">
        <ol className="scroll-x flex gap-1 p-1.5">
          {WIZARD_STEPS.map((s, i) => {
            const active = s.key === step
            const done = i < stepIndex
            return (
              <li key={s.key} className="min-w-[42%] flex-1 sm:min-w-0">
                <button
                  type="button"
                  onClick={() => jumpTo(s.key)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex h-full w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                    active ? "bg-primary-soft" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      done
                        ? "bg-success text-success-foreground"
                        : active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-xs font-semibold",
                        active ? "text-primary-soft-foreground" : "text-foreground",
                      )}
                    >
                      {s.title}
                    </span>
                    <span className="hidden truncate text-2xs text-muted-foreground sm:block">
                      {s.hint}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {errors.submit && (
        <Banner tone="danger" icon={AlertCircle} className="mb-3">
          {errors.submit}
        </Banner>
      )}

      {/* -------------------------------------------------------------- Qadamlar */}
      <div className="surface p-5 sm:p-8">
        {step === "basics" && (
          <StepBasics
            form={form}
            errors={errors}
            sectors={sectors}
            lockedSector={lockedSector}
            set={set}
          />
        )}

        {step === "assignees" && (
          <StepAssignees
            form={form}
            errors={errors}
            ctx={ctx}
            availableOrganizations={availableOrganizations}
            orgById={orgById}
            selectedSectorName={selectedSector?.name}
            toggleOrg={toggleOrg}
            toggleDeputy={toggleDeputy}
          />
        )}

        {step === "schedule" && (
          <StepSchedule
            form={form}
            errors={errors}
            set={set}
            setPriority={setPriority}
            setFrequency={setFrequency}
          />
        )}

        {step === "review" && (
          <StepReview
            form={form}
            files={files}
            fileError={fileError}
            sectorName={selectedSector?.name}
            orgById={orgById}
            deputyById={deputyById}
            addFiles={addFiles}
            removeFile={removeFile}
            onEdit={jumpTo}
          />
        )}
      </div>

      {/* ------------------------------------------------- Harakatlar (mobilda qadalgan) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-3 pb-safe shadow-lg md:static md:mt-4 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-card shadow-xs px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Orqaga
            </button>
          ) : (
            <Link
              href="/dashboard/tasks"
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-card shadow-xs px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" aria-hidden />
              Bekor qilish
            </Link>
          )}

          <span className="ml-auto text-2xs text-muted-foreground">
            {stepIndex + 1}/{WIZARD_STEPS.length}
          </span>

          {step !== "review" ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Keyingisi
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
              {form.isRecurring ? "Jadvalni yaratish" : "Topshiriqni yuborish"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   1-QADAM — ASOSIY MA'LUMOT
   ========================================================================== */

function StepBasics({
  form,
  errors,
  sectors,
  lockedSector,
  set,
}: {
  form: TaskWizardForm
  errors: WizardErrors
  sectors: Sector[]
  /** Doira cheklangan (o'rinbosar / rahbar) — soha o'zgartirilmaydi */
  lockedSector: { id: string; name: string } | null
  set: <K extends keyof TaskWizardForm>(k: K, v: TaskWizardForm[K]) => void
}) {
  return (
    <div className="space-y-5">
      <SectionHead
        icon={FileText}
        title="Asosiy ma’lumot"
        hint="Topshiriq nima haqida va qaysi sohaga tegishli"
      />

      <Field label="Topshiriq nomi" required error={errors.title} htmlFor="w-title">
        <input
          id="w-title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={500}
          placeholder="Masalan: Buğirdoq MFY maktab yo‘lini ta’mirlash"
          aria-invalid={Boolean(errors.title)}
          className={inputCls(Boolean(errors.title))}
        />
        <Counter value={form.title.length} max={500} />
      </Field>

      <Field
        label="Tafsilot"
        required
        error={errors.description}
        htmlFor="w-desc"
        hint="Nima qilinishi kerakligini aniq yozing — ijrochi shu matnga qarab ishlaydi"
      >
        <textarea
          id="w-desc"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={5}
          placeholder="Yo‘lning 300 metrlik qismi asfaltlanadi, yo‘l chetlari tozalanadi, natija foto bilan tasdiqlanadi…"
          aria-invalid={Boolean(errors.description)}
          className={cn(inputCls(Boolean(errors.description)), "min-h-28 resize-y py-2.5")}
        />
      </Field>

      {/* SOHA — ilgari bu yerda «Taglar» degan ishlamaydigan blok va
          kategoriya uchun to'rtta mos kelmaydigan lug'at bor edi. */}
      <Field
        label="Soha"
        required
        error={errors.sectorId}
        hint="Soha ijrochi tashkilotlar ro‘yxatini va mas’ul o‘rinbosarni belgilaydi"
      >
        {lockedSector ? (
          /* O'rinbosar / rahbar: soha biriktirilgan, tanlanmaydi */
          <div className="flex items-center gap-3 rounded-xl bg-primary-soft px-4 py-3">
            <Check className="h-4 w-4 shrink-0 text-primary-soft-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary-soft-foreground">{lockedSector.name}</p>
              <p className="text-xs text-primary-soft-foreground/80">
                Sizga biriktirilgan soha — topshiriq faqat shu sohaning tashkilotlariga beriladi
              </p>
            </div>
          </div>
        ) : sectors.length === 0 ? (
          <Banner tone="warning" icon={AlertCircle}>
            Sohalar ro‘yxati bo‘sh. Sozlamalar → Sohalar bo‘limida soha qo‘shilishi kerak.
          </Banner>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sectors.map((s) => {
              const active = form.sectorId === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("sectorId", active ? "" : s.id)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active
                      ? "border-primary bg-primary-soft text-primary-soft-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted",
                  )}
                >
                  {active && <Check className="h-4 w-4" aria-hidden />}
                  {s.name}
                  {typeof s.organization_count === "number" && s.organization_count > 0 && (
                    <span className="text-2xs tabular-nums text-muted-foreground">
                      {s.organization_count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </Field>
    </div>
  )
}

/* ==========================================================================
   2-QADAM — IJROCHILAR
   ========================================================================== */

function StepAssignees({
  form,
  errors,
  ctx,
  availableOrganizations,
  orgById,
  selectedSectorName,
  toggleOrg,
  toggleDeputy,
}: {
  form: TaskWizardForm
  errors: WizardErrors
  ctx: WizardContext
  availableOrganizations: Organization[]
  orgById: Map<string, Organization>
  selectedSectorName?: string
  toggleOrg: (id: string) => void
  toggleDeputy: (id: string) => void
}) {
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return availableOrganizations
    return availableOrganizations.filter((o) =>
      `${o.name ?? ""} ${(o as any).short_name ?? ""}`.toLowerCase().includes(needle),
    )
  }, [q, availableOrganizations])

  /** Tanlangan tashkilotlarning sohalarini qamrab oladigan o'rinbosarlar */
  const relevantDeputies = useMemo(() => {
    if (form.organizationIds.length === 0) return ctx.deputies
    const sectorIds = new Set(
      form.organizationIds
        .map((id) => String((orgById.get(id) as any)?.sector ?? ""))
        .filter(Boolean),
    )
    const matching = ctx.deputies.filter((d) => d.sectorId && sectorIds.has(d.sectorId))
    return matching.length > 0 ? matching : ctx.deputies
  }, [form.organizationIds, ctx.deputies, orgById])

  return (
    <div className="space-y-6">
      <SectionHead
        icon={Building2}
        title="Ijrochi tashkilotlar"
        hint={
          selectedSectorName
            ? `«${selectedSectorName}» sohasidagi tashkilotlar`
            : "Bir yoki bir nechta tashkilot tanlanadi"
        }
      />

      <Field label="Tashkilotlar" required error={errors.organizationIds}>
        <div className="relative mb-2">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tashkilot nomi bo‘yicha qidirish…"
            aria-label="Tashkilot qidirish"
            className={cn(inputCls(false), "pl-8.5")}
          />
        </div>

        {form.organizationIds.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {form.organizationIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-xl bg-primary-soft px-2 py-1 text-xs font-medium text-primary-soft-foreground"
              >
                {orgById.get(id)?.name ?? id}
                <button
                  type="button"
                  onClick={() => toggleOrg(id)}
                  aria-label={`${orgById.get(id)?.name ?? id} — olib tashlash`}
                  className="rounded-md hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="max-h-72 overflow-y-auto rounded-xl bg-card shadow-xs">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Tashkilot topilmadi
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((o) => {
                const id = String(o.id)
                const active = form.organizationIds.includes(id)
                return (
                  <li key={id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted",
                        active && "bg-accent",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleOrg(id)}
                        className="h-4.5 w-4.5 shrink-0 accent-[var(--primary)]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {o.name}
                        </span>
                        {(o as any).sector_name && (
                          <span className="block truncate text-2xs text-muted-foreground">
                            {(o as any).sector_name}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Field>

      {ctx.requiresDeputy && (
        <>
          <SectionHead
            icon={UserCheck}
            title="Mas’ul hokim o‘rinbosari"
            hint="Nazoratni yuritadigan o‘rinbosar. Tanlangan tashkilotlarning sohasini qamrab olishi kerak."
          />
          <Field label="O‘rinbosar" required error={errors.deputyIds}>
            {relevantDeputies.length === 0 ? (
              <Banner tone="warning" icon={AlertCircle}>
                Hokim o‘rinbosari topilmadi. Foydalanuvchilar bo‘limida
                «Hokim o‘rinbosari» rolidagi xodim qo‘shilishi kerak.
              </Banner>
            ) : (
              <ul className="divide-y divide-border rounded-xl bg-card shadow-xs">
                {relevantDeputies.map((d) => {
                  const active = form.deputyIds.includes(d.id)
                  return (
                    <li key={d.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted",
                          active && "bg-accent",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleDeputy(d.id)}
                          className="h-4.5 w-4.5 shrink-0 accent-[var(--primary)]"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {d.fullName}
                          </span>
                          {d.sectorName && (
                            <span className="block truncate text-2xs text-muted-foreground">
                              {d.sectorName}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </Field>
        </>
      )}
    </div>
  )
}

/* ==========================================================================
   3-QADAM — MUDDAT VA MUHIMLIK
   ========================================================================== */

function StepSchedule({
  form,
  errors,
  set,
  setPriority,
  setFrequency,
}: {
  form: TaskWizardForm
  errors: WizardErrors
  set: <K extends keyof TaskWizardForm>(k: K, v: TaskWizardForm[K]) => void
  setPriority: (p: TaskWizardForm["priority"]) => void
  setFrequency: (f: Frequency) => void
}) {
  const today = localDateString()

  return (
    <div className="space-y-6">
      <SectionHead
        icon={Calendar}
        title="Muhimlik va muddat"
        hint="Muhimlik darajasi muddatni avtomatik taklif qiladi"
      />

      <Field label="Muhimlik darajasi" required>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRIORITY_ORDER.map((p) => {
            const active = form.priority === p
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                aria-pressed={active}
                className={cn(
                  "flex h-auto flex-col items-start gap-1.5 rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted",
                )}
              >
                <PriorityBadge priority={p} size="sm" />
                <span className="text-2xs text-muted-foreground">
                  {PRIORITY_DAYS[p]} kun tavsiya etiladi
                </span>
              </button>
            )
          })}
        </div>
      </Field>

      {/* Takrorlanuvchi rejim */}
      <div className="rounded-xl bg-card shadow-xs p-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.isRecurring}
            onChange={(e) => set("isRecurring", e.target.checked)}
            className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-[var(--primary)]"
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Repeat className="h-4 w-4" aria-hidden />
              Takrorlanuvchi topshiriq
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Tizim belgilangan davrda topshiriqni o‘zi yaratib, tashkilotga yuboradi.
              Masalan: «Har dushanba obodonlashtirish holati haqida hisobot».
            </span>
          </span>
        </label>
      </div>

      {form.isRecurring ? (
        <div className="space-y-5">
          <Field label="Takrorlanish davri" required>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => {
                const active = form.frequency === f
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    aria-pressed={active}
                    className={cn(
                      "h-11 rounded-xl border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active
                        ? "border-primary bg-primary-soft text-primary-soft-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {FREQUENCY_LABEL[f]}
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Har bir topshiriq muddati"
              required
              error={errors.deadlineDays}
              htmlFor="w-days"
              hint="Yaratilgandan keyin necha kun ichida bajarilishi kerak"
            >
              <div className="flex items-center gap-2">
                <input
                  id="w-days"
                  type="number"
                  min={1}
                  max={365}
                  value={form.deadlineDays}
                  onChange={(e) =>
                    set(
                      "deadlineDays",
                      Math.min(365, Math.max(1, Number(e.target.value) || 1)),
                    )
                  }
                  aria-invalid={Boolean(errors.deadlineDays)}
                  className={cn(inputCls(Boolean(errors.deadlineDays)), "w-24 tabular-nums")}
                />
                <span className="text-sm text-muted-foreground">kun</span>
              </div>
            </Field>

            <Field
              label="Boshlanish sanasi"
              required
              error={errors.startDate}
              htmlFor="w-start"
            >
              <input
                id="w-start"
                type="date"
                min={today}
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                aria-invalid={Boolean(errors.startDate)}
                className={inputCls(Boolean(errors.startDate))}
              />
            </Field>

            <Field
              label="Tugash sanasi"
              error={errors.endDate}
              htmlFor="w-end"
              hint="Bo‘sh qoldirilsa — cheksiz davom etadi"
            >
              <input
                id="w-end"
                type="date"
                min={form.startDate || today}
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                aria-invalid={Boolean(errors.endDate)}
                className={inputCls(Boolean(errors.endDate))}
              />
            </Field>
          </div>
        </div>
      ) : (
        <Field
          label="Bajarilish muddati"
          required
          error={errors.deadline}
          htmlFor="w-deadline"
          hint="Muddat kun oxiri (23:59) bilan hisoblanadi"
        >
          <input
            id="w-deadline"
            type="date"
            min={today}
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
            aria-invalid={Boolean(errors.deadline)}
            className={inputCls(Boolean(errors.deadline))}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[1, 3, 7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set("deadline", addDays(d))}
                className="h-8 rounded-xl bg-card shadow-xs px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                +{d} kun
              </button>
            ))}
          </div>
          {form.deadline && (
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDateHuman(form.deadline)}
            </p>
          )}
        </Field>
      )}
    </div>
  )
}

/* ==========================================================================
   4-QADAM — FAYLLAR VA TEKSHIRISH
   ========================================================================== */

function StepReview({
  form,
  files,
  fileError,
  sectorName,
  orgById,
  deputyById,
  addFiles,
  removeFile,
  onEdit,
}: {
  form: TaskWizardForm
  files: File[]
  fileError: string | null
  sectorName?: string
  orgById: Map<string, Organization>
  deputyById: Map<string, DeputyOption>
  addFiles: (f: FileList | File[]) => void
  removeFile: (i: number) => void
  onEdit: (s: StepKey) => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="space-y-6">
      <SectionHead
        icon={Paperclip}
        title="Fayllar va tekshirish"
        hint="Yuborishdan oldin ma’lumotlarni ko‘rib chiqing"
      />

      {/* Fayl yuklash — takrorlanuvchi rejimda backend fayl qabul qilmaydi */}
      {form.isRecurring ? (
        <Banner tone="info" icon={AlertCircle}>
          Takrorlanuvchi topshiriqlarga fayl biriktirilmaydi — har bir yaratilgan
          topshiriqqa ijrochi o‘zi hisobot va isbot yuklaydi.
        </Banner>
      ) : (
        <Field
          label="Biriktirilgan fayllar"
          error={fileError ?? undefined}
          hint={`Ko‘pi bilan ${MAX_FILES} ta, har biri ${MAX_FILE_MB} MB gacha`}
        >
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
            }}
            className={cn(
              "rounded-2xl border-2 border-dashed p-5 text-center transition-colors",
              dragging ? "border-primary bg-accent" : "border-border bg-muted/40",
            )}
          >
            <Upload className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm text-foreground">
              Fayllarni bu yerga tashlang yoki
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-2 inline-flex h-11 items-center gap-1.5 rounded-xl bg-card shadow-xs bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
            >
              <Paperclip className="h-4 w-4" aria-hidden />
              Fayl tanlash
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files)
                // Bir xil faylni qayta tanlash mumkin bo'lishi uchun
                e.target.value = ""
              }}
            />
          </div>

          {files.length > 0 && (
            <ul className="mt-2 divide-y divide-border rounded-xl bg-card shadow-xs">
              {files.map((f, i) => (
                <li key={`${f.name}-${f.size}`} className="flex items-center gap-3 px-3 py-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{f.name}</span>
                    <span className="block text-2xs tabular-nums text-muted-foreground">
                      {(f.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label={`${f.name} — o‘chirish`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>
      )}

      {/* Xulosa */}
      <div className="rounded-xl bg-card shadow-xs">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <h3 className="text-sm font-semibold text-foreground">Topshiriq xulosasi</h3>
        </div>
        <dl className="divide-y divide-border">
          <Row label="Nomi" onEdit={() => onEdit("basics")}>
            {form.title || "—"}
          </Row>
          <Row label="Tafsilot" onEdit={() => onEdit("basics")}>
            <span className="whitespace-pre-wrap">{form.description || "—"}</span>
          </Row>
          <Row label="Soha" onEdit={() => onEdit("basics")}>
            {sectorName ?? "—"}
          </Row>
          <Row label="Tashkilotlar" onEdit={() => onEdit("assignees")}>
            {form.organizationIds.length === 0
              ? "—"
              : form.organizationIds.map((id) => orgById.get(id)?.name ?? id).join(", ")}
          </Row>
          {form.deputyIds.length > 0 && (
            <Row label="Mas’ul o‘rinbosar" onEdit={() => onEdit("assignees")}>
              {form.deputyIds.map((id) => deputyById.get(id)?.fullName ?? id).join(", ")}
            </Row>
          )}
          <Row label="Muhimlik" onEdit={() => onEdit("schedule")}>
            <PriorityBadge priority={form.priority} size="sm" />
          </Row>
          {form.isRecurring ? (
            <>
              <Row label="Takrorlanish" onEdit={() => onEdit("schedule")}>
                {FREQUENCY_LABEL[form.frequency]} · har biriga {form.deadlineDays} kun
              </Row>
              <Row label="Davr" onEdit={() => onEdit("schedule")}>
                {formatDateHuman(form.startDate)}
                {form.endDate ? ` — ${formatDateHuman(form.endDate)}` : " — cheksiz"}
              </Row>
            </>
          ) : (
            <Row label="Muddat" onEdit={() => onEdit("schedule")}>
              {formatDateHuman(form.deadline)}
            </Row>
          )}
          {!form.isRecurring && (
            <Row label="Fayllar">
              {files.length === 0 ? "Biriktirilmagan" : `${files.length} ta fayl`}
            </Row>
          )}
        </dl>
      </div>
    </div>
  )
}

/* ==========================================================================
   UMUMIY ELEMENTLAR
   ========================================================================== */

function inputCls(invalid: boolean) {
  return cn(
    // Chegara o'rniga ichki halqa (inset ring): fokus va xato holati
    // shu halqa rangi bilan beriladi, layout siljimaydi.
    "h-11 w-full rounded-xl bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] outline-none transition-shadow focus:shadow-[inset_0_0_0_1.5px_var(--primary)]",
    invalid && "shadow-[inset_0_0_0_1.5px_var(--destructive)]",
  )
}

function SectionHead({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  const errId = htmlFor ? `${htmlFor}-error` : undefined
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-label="majburiy">
            *
          </span>
        )}
      </label>
      {hint && <p className="mb-1.5 text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && (
        <p
          id={errId}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-destructive"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

function Counter({ value, max }: { value: number; max: number }) {
  const near = value > max * 0.9
  return (
    <p
      className={cn(
        "mt-1 text-right text-2xs tabular-nums",
        near ? "text-warning" : "text-muted-foreground",
      )}
    >
      {value}/{max}
    </p>
  )
}

function Row({
  label,
  children,
  onEdit,
}: {
  label: string
  children: React.ReactNode
  onEdit?: () => void
}) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-start sm:gap-4">
      <dt className="w-full shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:w-40">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-foreground">{children}</dd>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 self-start rounded-md text-xs font-semibold text-primary hover:underline"
        >
          O‘zgartirish
        </button>
      )}
    </div>
  )
}

function Banner({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: "info" | "warning" | "danger"
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  const tones = {
    info: "bg-info-soft text-info-soft-foreground",
    warning: "bg-warning-soft text-warning-soft-foreground",
    danger: "bg-destructive-soft text-destructive-soft-foreground",
  }
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm", tones[tone], className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/* AI sahifasiga o'tish tugmasi — topshiriqlar sahifasi ham ishlatadi */
export function AiCreateLink({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard/tasks/new/ai"
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-xl bg-card shadow-xs bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted",
        className,
      )}
    >
      <Sparkles className="h-4 w-4 text-primary" aria-hidden />
      AI orqali yaratish
    </Link>
  )
}

export default TaskWizard
