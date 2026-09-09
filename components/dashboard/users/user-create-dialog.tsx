"use client"

import type React from "react"
import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Organization, PositionOption, User } from "@/types"
import { createUser } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Shield,
  UserRound,
  Wand2,
} from "lucide-react"

/**
 * YANGI FOYDALANUVCHI — DIALOG
 *
 * Nima o'zgardi (dizayn tahriri):
 *  1. O'n ikki maydon bitta devor bo'lib turardi. Endi uch bo'lim:
 *       Vakolat → Shaxs → Kirish.
 *     Rol BIRINCHI so'raladi, chunki qolgan majburiy maydonlar
 *     (tashkilot, soha, rahbar) roldan kelib chiqadi.
 *  2. Haqiqiy <form>: Enter yuboradi, brauzer autofill ishlaydi.
 *  3. «Parol yaratish» tugmasi — 12 belgili tasodifiy parol
 *     (crypto.getRandomValues). Login esa familiya+ismdan taklif qilinadi,
 *     lekin qo'lda kiritilgan qiymat ustun.
 *  4. Chegara yo'q: maydonlar ichki halqa (inset ring) bilan, xato holati
 *     halqa rangi va matn bilan. Bo'limlar och fon plitkalari.
 *
 * Props va API chaqiruvi o'zgarmadi — users/page.tsx tegilmaydi.
 */

interface CreateUserFormData {
  login: string
  firstName: string
  lastName: string
  middleName: string
  email: string
  phone: string
  pnfl: string
  position: string
  password: string
  role: User["role"]
  organizationId: string
  sectorId: string
  supervisorId: string
}

interface UserCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: CreateUserFormData
  organizations: Organization[]
  sectors: Array<{ id: string; name: string }>
  positions: PositionOption[]
  users: User[]
  currentUser: User | null
  onChange: (field: keyof CreateUserFormData, value: string) => void
  onCreated: (createdUser: User, plainPassword: string) => void
}

const ROLE_LABEL: Record<string, string> = {
  HOKIM: "Hokim",
  HOKIM_YORDAMCHISI: "Hokim o'rinbosari",
  HOKIMLIK_MASUL: "Hokimlik mutaxassisi",
  TASHKILOT_RAHBARI: "Tashkilot rahbari",
  TASHKILOT_MASUL: "Tashkilot mas'uli",
  ADMIN: "Administrator",
}

const ROLE_HINT: Record<string, string> = {
  HOKIM: "Barcha topshiriqlarni ko'radi va tasdiqlaydi",
  HOKIM_YORDAMCHISI: "O'z sohasidagi topshiriqlarni nazorat qiladi",
  HOKIMLIK_MASUL: "Soha bo'yicha ijroni kuzatadi, bevosita rahbari bor",
  TASHKILOT_RAHBARI: "Tashkilot topshiriqlarini qabul qiladi va hisobot beradi",
  TASHKILOT_MASUL: "Tashkilot ichida ijro va hisobot",
  ADMIN: "Tizim sozlamalari va foydalanuvchilar",
}

/* Maydon uslubi — chegara o'rniga ichki halqa */
const FIELD =
  "h-11 w-full rounded-xl bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] outline-none transition-shadow focus:shadow-[inset_0_0_0_1.5px_var(--primary)] disabled:opacity-60"
const FIELD_INVALID = "shadow-[inset_0_0_0_1.5px_var(--destructive)]"
const TRIGGER =
  "h-11 w-full rounded-xl border-0 bg-card px-3.5 text-sm shadow-[inset_0_0_0_1px_var(--border)] focus:ring-0 focus:shadow-[inset_0_0_0_1.5px_var(--primary)] data-[placeholder]:text-muted-foreground"

/** Lotin transliteratsiyasi — login taklifi uchun (faqat taklif) */
function toLoginSlug(last: string, first: string): string {
  const map: Record<string, string> = {
    "o'": "o", "o‘": "o", "g'": "g", "g‘": "g", sh: "sh", ch: "ch", ng: "ng",
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ь: "", э: "e",
    ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
  }
  const clean = (v: string) =>
    v
      .toLowerCase()
      .replace(/o['‘]|g['‘]/g, (m) => map[m] ?? m)
      .split("")
      .map((ch) => map[ch] ?? ch)
      .join("")
      .replace(/[^a-z0-9]/g, "")
  const l = clean(last)
  const f = clean(first)
  if (!l && !f) return ""
  return f ? `${f.charAt(0)}.${l}` : l
}

/** 12 belgili tasodifiy parol: katta/kichik harf, raqam, belgi kafolatlangan */
function generatePassword(): string {
  const sets = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnpqrstuvwxyz",
    "23456789",
    "!@#$%*",
  ]
  const all = sets.join("")
  const pick = (chars: string) => {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return chars[buf[0] % chars.length]
  }
  const out = sets.map(pick)
  while (out.length < 12) out.push(pick(all))
  // aralashtirish
  for (let i = out.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.join("")
}

export function UserCreateDialog({
  open,
  onOpenChange,
  formData,
  organizations,
  sectors,
  positions,
  users,
  currentUser,
  onChange,
  onCreated,
}: UserCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [loginTouched, setLoginTouched] = useState(false)

  const organizationItems = Array.isArray(organizations)
    ? organizations
    : (organizations as { results?: Organization[] } | null | undefined)?.results || []
  const isOrganizationRole = ["TASHKILOT_RAHBARI", "TASHKILOT_MASUL"].includes(formData.role)
  const isHokimlikRole = ["HOKIM_YORDAMCHISI", "HOKIMLIK_MASUL"].includes(formData.role)
  const requiresSupervisor = formData.role === "HOKIMLIK_MASUL"

  const availableSupervisors = useMemo(
    () =>
      users.filter((user) => {
        if (user.role !== "HOKIM_YORDAMCHISI") return false
        const supervisorSectorId =
          typeof user.sector === "object" && user.sector?.id
            ? String(user.sector.id)
            : String(user.sector_id || "")
        if (formData.sectorId && supervisorSectorId && supervisorSectorId !== formData.sectorId) {
          return false
        }
        if (currentUser?.role === "HOKIM_YORDAMCHISI") {
          return String(user.id) === String(currentUser.id)
        }
        return true
      }),
    [users, formData.sectorId, currentUser],
  )

  /* Login taklifi: foydalanuvchi qo'lda yozmagan bo'lsa, F.I.dan yasaladi */
  const suggestedLogin = toLoginSlug(formData.lastName, formData.firstName)
  const applyName = (field: "firstName" | "lastName", value: string) => {
    onChange(field, value)
    if (!loginTouched) {
      const next =
        field === "lastName"
          ? toLoginSlug(value, formData.firstName)
          : toLoginSlug(formData.lastName, value)
      onChange("login", next)
    }
  }

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })

  const validate = () => {
    const e: Record<string, string> = {}
    const phone = formData.phone.trim()
    const email = formData.email.trim()
    if (!formData.login.trim()) e.login = "Login majburiy"
    if (!formData.firstName.trim()) e.firstName = "Ism majburiy"
    if (!formData.lastName.trim()) e.lastName = "Familiya majburiy"
    if (!phone) e.phone = "Telefon majburiy"
    if (phone && !/^\+998\d{9}$/.test(phone)) e.phone = "+998XXXXXXXXX formatida bo'lishi kerak"
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email formati noto'g'ri"
    if (!formData.pnfl.trim()) e.pnfl = "PNFL majburiy"
    if (formData.pnfl && formData.pnfl.length !== 14) e.pnfl = "PNFL 14 ta raqamdan iborat"
    if (!formData.password.trim()) e.password = "Parol majburiy"
    if (formData.password && formData.password.length < 6) e.password = "Kamida 6 ta belgi"
    if (isOrganizationRole && !formData.organizationId) e.organizationId = "Tashkilot tanlang"
    if (isHokimlikRole && !formData.sectorId) e.sectorId = "Soha yoki kompleksni tanlang"
    if (requiresSupervisor && !formData.supervisorId) e.supervisorId = "Bevosita rahbarni tanlang"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev?: React.FormEvent) => {
    ev?.preventDefault()
    if (isSubmitting || !validate()) return

    setIsSubmitting(true)
    try {
      const createdUser = await createUser({
        login: formData.login.trim(),
        first_name: formData.firstName,
        last_name: formData.lastName,
        middle_name: formData.middleName,
        email: formData.email || undefined,
        phone: formData.phone,
        pnfl: formData.pnfl,
        position: formData.position || undefined,
        password: formData.password,
        role: formData.role,
        organization: formData.organizationId || undefined,
        sector: formData.sectorId || undefined,
        supervisor: formData.supervisorId || undefined,
      })
      onCreated(createdUser, formData.password)
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {}
      if (error?.data && typeof error.data === "object") {
        const fieldMap: Record<string, string> = {
          login: "login",
          first_name: "firstName",
          last_name: "lastName",
          middle_name: "middleName",
          organization: "organizationId",
          sector: "sectorId",
          supervisor: "supervisorId",
          pnfl: "pnfl",
          phone: "phone",
          email: "email",
          role: "role",
          position: "position",
          password: "password",
        }
        for (const [field, msgs] of Object.entries(error.data)) {
          const key = fieldMap[field] || field
          fieldErrors[key] = Array.isArray(msgs) ? msgs.join(", ") : String(msgs)
        }
      }
      setErrors(
        Object.keys(fieldErrors).length > 0
          ? fieldErrors
          : { submit: error?.message || "Yaratishda xatolik yuz berdi" },
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const requiredCount =
    5 + (isOrganizationRole ? 1 : 0) + (isHokimlikRole ? 1 : 0) + (requiresSupervisor ? 1 : 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-hidden rounded-3xl border-0 bg-card p-0 shadow-[0_1px_2px_rgba(13,21,36,0.06),0_40px_90px_-30px_rgba(13,21,36,0.35)]">
        <form onSubmit={handleSubmit} noValidate className="flex max-h-[92dvh] flex-col">
          {/* ---------------------------------------------------------- Sarlavha */}
          <DialogHeader className="px-6 pb-4 pt-6 text-left sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Foydalanuvchilar
            </p>
            <DialogTitle className="mt-1 text-xl font-semibold tracking-[-0.01em] text-foreground">
              Yangi foydalanuvchi
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {requiredCount} ta majburiy maydon. Parol bir marta ko&apos;rsatiladi — yaratilgach
              xodimga topshiring.
            </DialogDescription>
          </DialogHeader>

          {/* ------------------------------------------------------------ Tana */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-2 sm:px-8">
            {errors.submit && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive-soft-foreground"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {errors.submit}
              </p>
            )}

            {/* ===== 1. VAKOLAT — rol birinchi, qolgani undan kelib chiqadi */}
            <Section icon={Shield} title="Vakolat" hint="Rol qolgan majburiy maydonlarni belgilaydi">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Rol" required error={errors.role} className="sm:col-span-2">
                  <Select
                    value={formData.role}
                    onValueChange={(value) => {
                      onChange("role", value)
                      if (value !== "HOKIMLIK_MASUL") onChange("supervisorId", "")
                      clearError("role")
                    }}
                  >
                    <SelectTrigger className={cn(TRIGGER, errors.role && FIELD_INVALID)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Object.entries(ROLE_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="rounded-lg">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1.5 text-xs text-muted-foreground">{ROLE_HINT[formData.role]}</p>
                </Field>

                <Field
                  label="Soha / kompleks"
                  required={isHokimlikRole}
                  error={errors.sectorId}
                >
                  <Select
                    value={formData.sectorId || "none"}
                    onValueChange={(v) => {
                      onChange("sectorId", v === "none" ? "" : v)
                      clearError("sectorId")
                    }}
                  >
                    <SelectTrigger className={cn(TRIGGER, errors.sectorId && FIELD_INVALID)}>
                      <SelectValue placeholder="Sohani tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="rounded-lg">
                        Belgilanmagan
                      </SelectItem>
                      {sectors.map((sector) => (
                        <SelectItem key={sector.id} value={String(sector.id)} className="rounded-lg">
                          {sector.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label="Tashkilot"
                  required={isOrganizationRole}
                  error={errors.organizationId}
                >
                  <Select
                    value={formData.organizationId || "none"}
                    onValueChange={(v) => {
                      onChange("organizationId", v === "none" ? "" : v)
                      clearError("organizationId")
                    }}
                  >
                    <SelectTrigger className={cn(TRIGGER, errors.organizationId && FIELD_INVALID)}>
                      <SelectValue placeholder="Tashkilotni tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="rounded-lg">
                        Belgilanmagan
                      </SelectItem>
                      {organizationItems.map((org) => (
                        <SelectItem key={org.id} value={String(org.id)} className="rounded-lg">
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {requiresSupervisor && (
                  <Field
                    label="Bevosita rahbar"
                    required
                    error={errors.supervisorId}
                    className="sm:col-span-2"
                  >
                    <Select
                      value={formData.supervisorId || "none"}
                      onValueChange={(v) => {
                        onChange("supervisorId", v === "none" ? "" : v)
                        clearError("supervisorId")
                      }}
                    >
                      <SelectTrigger className={cn(TRIGGER, errors.supervisorId && FIELD_INVALID)}>
                        <SelectValue placeholder="Rahbarni tanlang" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none" className="rounded-lg">
                          Belgilanmagan
                        </SelectItem>
                        {availableSupervisors.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} className="rounded-lg">
                            {s.full_name || `${s.last_name} ${s.first_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableSupervisors.length === 0 && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Tanlangan soha bo&apos;yicha hokim o&apos;rinbosari topilmadi.
                      </p>
                    )}
                  </Field>
                )}

                <Field label="Lavozim" className="sm:col-span-2">
                  <Select
                    value={formData.position || "none"}
                    onValueChange={(v) => onChange("position", v === "none" ? "" : v)}
                  >
                    <SelectTrigger className={TRIGGER}>
                      <SelectValue placeholder="Lavozimni tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none" className="rounded-lg">
                        Belgilanmagan
                      </SelectItem>
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.name} className="rounded-lg">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>

            {/* ===== 2. SHAXS */}
            <Section icon={UserRound} title="Shaxs" hint="Pasport bo'yicha, PNFL 14 raqam">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Familiya" required error={errors.lastName} htmlFor="u-last">
                  <input
                    id="u-last"
                    value={formData.lastName}
                    onChange={(e) => {
                      applyName("lastName", e.target.value)
                      clearError("lastName")
                    }}
                    autoComplete="family-name"
                    placeholder="Karimov"
                    className={cn(FIELD, errors.lastName && FIELD_INVALID)}
                  />
                </Field>
                <Field label="Ism" required error={errors.firstName} htmlFor="u-first">
                  <input
                    id="u-first"
                    value={formData.firstName}
                    onChange={(e) => {
                      applyName("firstName", e.target.value)
                      clearError("firstName")
                    }}
                    autoComplete="given-name"
                    placeholder="Anvar"
                    className={cn(FIELD, errors.firstName && FIELD_INVALID)}
                  />
                </Field>
                <Field label="Sharifi" htmlFor="u-middle">
                  <input
                    id="u-middle"
                    value={formData.middleName}
                    onChange={(e) => onChange("middleName", e.target.value)}
                    autoComplete="additional-name"
                    placeholder="Botir o'g'li"
                    className={FIELD}
                  />
                </Field>
                <Field label="PNFL" required error={errors.pnfl} htmlFor="u-pnfl">
                  <input
                    id="u-pnfl"
                    value={formData.pnfl}
                    onChange={(e) => {
                      onChange("pnfl", e.target.value.replace(/\D/g, "").slice(0, 14))
                      clearError("pnfl")
                    }}
                    inputMode="numeric"
                    placeholder="14 ta raqam"
                    maxLength={14}
                    className={cn(FIELD, "tabular-nums", errors.pnfl && FIELD_INVALID)}
                  />
                  <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
                    {formData.pnfl.length}/14
                  </p>
                </Field>
                <Field label="Telefon" required error={errors.phone} htmlFor="u-phone">
                  <input
                    id="u-phone"
                    value={formData.phone}
                    onChange={(e) => {
                      const raw = e.target.value
                      const normalized = raw.startsWith("+")
                        ? `+${raw.slice(1).replace(/\D/g, "")}`
                        : raw.replace(/[^\d+]/g, "")
                      onChange("phone", normalized)
                      clearError("phone")
                    }}
                    onFocus={() => {
                      if (!formData.phone) onChange("phone", "+998")
                    }}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+998901234567"
                    className={cn(FIELD, "tabular-nums", errors.phone && FIELD_INVALID)}
                  />
                </Field>
                <Field label="Email" error={errors.email} htmlFor="u-email">
                  <input
                    id="u-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      onChange("email", e.target.value)
                      clearError("email")
                    }}
                    autoComplete="email"
                    placeholder="ism@hokimlik.uz"
                    className={cn(FIELD, errors.email && FIELD_INVALID)}
                  />
                </Field>
              </div>
            </Section>

            {/* ===== 3. KIRISH */}
            <Section icon={KeyRound} title="Kirish" hint="Login va parol — xodim bu bilan tizimga kiradi">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Login" required error={errors.login} htmlFor="u-login">
                  <input
                    id="u-login"
                    value={formData.login}
                    onChange={(e) => {
                      setLoginTouched(true)
                      onChange("login", e.target.value.toLowerCase().replace(/\s+/g, ""))
                      clearError("login")
                    }}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={suggestedLogin || "a.karimov"}
                    className={cn(FIELD, errors.login && FIELD_INVALID)}
                  />
                  {!loginTouched && suggestedLogin && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Familiya va ismdan taklif qilindi — o&apos;zgartirish mumkin.
                    </p>
                  )}
                </Field>

                <Field label="Parol" required error={errors.password} htmlFor="u-pass">
                  <div className="relative">
                    <input
                      id="u-pass"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => {
                        onChange("password", e.target.value)
                        clearError("password")
                      }}
                      autoComplete="new-password"
                      placeholder="Kamida 6 ta belgi"
                      className={cn(FIELD, "pr-24 font-mono", errors.password && FIELD_INVALID)}
                    />
                    <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onChange("password", generatePassword())
                          setShowPassword(true)
                          clearError("password")
                        }}
                        title="Tasodifiy parol yaratish"
                        aria-label="Tasodifiy parol yaratish"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <Wand2 className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                  <PasswordMeter value={formData.password} />
                </Field>
              </div>
            </Section>
          </div>

          {/* ------------------------------------------------------------ Tugmalar */}
          <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4 sm:px-8">
            <p className="hidden text-xs text-muted-foreground sm:block">
              <span className="text-destructive">*</span> — majburiy maydon
            </p>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_-14px_var(--primary)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:translate-y-0 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Building2 className="h-4 w-4" aria-hidden />
                )}
                Foydalanuvchini yaratish
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------------------------------------------------------- Yordamchilar */

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-background p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  required,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
      >
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-label="majburiy">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

/** Parol kuchi — to'rt pog'ona, faqat ko'rsatkich (bloklamaydi) */
function PasswordMeter({ value }: { value: string }) {
  const score = useMemo(() => {
    if (!value) return 0
    let s = 0
    if (value.length >= 6) s++
    if (value.length >= 10) s++
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) s++
    if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) s++
    return s
  }, [value])
  if (!value) return null
  const label = ["Juda qisqa", "Zaif", "O'rtacha", "Yaxshi", "Kuchli"][score]
  const tone =
    score <= 1 ? "bg-destructive" : score === 2 ? "bg-warning" : "bg-success"
  return (
    <div className="mt-2 flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full", i < score ? tone : "bg-border")}
            aria-hidden
          />
        ))}
      </div>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
