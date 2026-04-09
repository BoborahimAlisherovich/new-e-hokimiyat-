"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { DashboardPageFrame } from "@/components/layout/dashboard-page-frame"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createManualAppeal, getAppealCategories, getAppealTypes, getCurrentUser, api } from "@/lib/api"
import { ArrowLeft, FileText, Loader2, Plus, Save, Trash2, Upload } from "lucide-react"
import Link from "next/link"

type RegionItem = { id: number; name_uz: string }
type CategoryItem = { id: number; name_uz: string }
type AppealTypeItem = { id: number; name_uz: string }
type Priority = "low" | "medium" | "high" | "urgent"
type TaskBlock = {
  id: string
  appealTypeId: string
  categoryId: string
  priority: Priority
  text: string
  files: File[]
}

const PHONE_REQUIRED_PREFIX = "+998"

const ALLOWED_ROLES = new Set(["HOKIM", "HOKIM_YORDAMCHISI", "ADMIN"])

function createTaskBlock(): TaskBlock {
  return {
    id: crypto.randomUUID(),
    appealTypeId: "",
    categoryId: "",
    priority: "medium",
    text: "",
    files: [],
  }
}

function normalizePhoneInput(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""

  const digits = trimmed.replace(/\D/g, "")
  if (!digits) return ""

  if (digits.startsWith("998")) {
    return `+${digits}`
  }

  return trimmed.startsWith("+") ? `+${digits}` : `${PHONE_REQUIRED_PREFIX}${digits}`
}

function isValidUzbekPhone(value: string): boolean {
  return /^\+998\d{9}$/.test(value)
}

export default function NewAppealPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [checkingAccess, setCheckingAccess] = useState(true)
  const [saving, setSaving] = useState(false)

  const [regions, setRegions] = useState<RegionItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [appealTypes, setAppealTypes] = useState<AppealTypeItem[]>([])

  const [citizenName, setCitizenName] = useState("")
  const [citizenPhone, setCitizenPhone] = useState("")
  const [citizenGender, setCitizenGender] = useState<"male" | "female" | "">("")
  const [regionId, setRegionId] = useState<string>("")
  const [tasks, setTasks] = useState<TaskBlock[]>([createTaskBlock()])

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        const role = String(user?.role || "")
        if (!ALLOWED_ROLES.has(role)) {
          router.replace("/dashboard/appeals")
          return
        }
      })
      .finally(() => setCheckingAccess(false))
  }, [router])

  useEffect(() => {
    api
      .get<any>("/telegram-bot/regions/")
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : res.data?.results || []
        setRegions(
          rows
            .map((r: any) => ({ id: Number(r.id), name_uz: String(r.name_uz || r.name || "") }))
            .filter((r: RegionItem) => Boolean(r.id) && Boolean(r.name_uz))
        )
      })
      .catch(() => setRegions([]))

    getAppealCategories()
      .then((rows) => setCategories(rows.map((c) => ({ id: c.id, name_uz: c.name_uz }))))
      .catch(() => setCategories([]))

    getAppealTypes()
      .then((rows) => setAppealTypes(rows.map((item) => ({ id: item.id, name_uz: item.name_uz }))))
      .catch(() => setAppealTypes([]))
  }, [])

  const canSubmit = useMemo(() => {
    if (!citizenName.trim() || tasks.length === 0) return false
    return tasks.every(
      (task) => Boolean(task.appealTypeId) && Boolean(task.categoryId) && Boolean(task.text.trim())
    )
  }, [citizenName, tasks])

  const updateTask = (id: string, patch: Partial<TaskBlock>) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)))
  }

  const addTask = () => {
    setTasks((prev) => [...prev, createTaskBlock()])
  }

  const removeTask = (id: string) => {
    setTasks((prev) => (prev.length === 1 ? prev : prev.filter((task) => task.id !== id)))
  }

  const handleSubmit = async () => {
    if (!canSubmit || saving) return

    const normalizedPhone = normalizePhoneInput(citizenPhone)
    if (normalizedPhone && !isValidUzbekPhone(normalizedPhone)) {
      toast({
        title: "Telefon noto'g'ri",
        description: "Telefon raqamni +998XXXXXXXXX formatida kiriting.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const result = await createManualAppeal({
        citizen_name: citizenName.trim(),
        citizen_phone: normalizedPhone,
        citizen_gender: citizenGender,
        citizen_region_id: regionId ? Number(regionId) : null,
        items: tasks.map((task) => ({
          appeal_type_id: Number(task.appealTypeId),
          category_id: Number(task.categoryId),
          priority: task.priority,
          text: task.text.trim(),
          attachments: task.files,
        })),
      })
      const created = result.appeals

      toast({
        title: result.warnings.length > 0 ? "Murojaat saqlandi" : "Muvaffaqiyat",
        description: [
          created.length > 1
            ? `${created.length} ta murojaat muvaffaqiyatli rasmiylashtirildi.`
            : "Murojaat muvaffaqiyatli rasmiylashtirildi.",
          result.warnings.join(" "),
        ].filter(Boolean).join(" "),
        variant: result.warnings.length > 0 ? "destructive" : "default",
      })

      if (created.length === 1) {
        router.push(`/dashboard/appeals/${created[0].id}`)
        return
      }

      router.push("/dashboard/appeals")
    } catch (err: any) {
      toast({
        title: "Xato",
        description: err?.message || "Murojaat qo'shishda xato",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (checkingAccess) {
    return (
      <>
        <Header title="Yangi murojaat" description="Qo'lda murojaat qo'shish" />
        <div className="p-6">
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Tekshirilmoqda...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Yangi murojaat" description="Qo'lda murojaat qo'shish" />
      <DashboardPageFrame
        eyebrow="Murojaatlar"
        title="Qo‘lda murojaat qo‘shish"
        description="Murojaatchi ma’lumotlarini kiriting va unga tegishli murojaatlarni yagona sahifa orqali rasmiylashtiring."
        stats={[]}
      >
        <div className="mb-4">
          <Link href="/dashboard/appeals" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
          <Card className="border-slate-200 bg-white/95">
            <CardHeader>
              <CardTitle>Murojaatchi ma&apos;lumotlari</CardTitle>
              <CardDescription>
                Ushbu ma&apos;lumotlar barcha kiritilayotgan murojaatlar uchun umumiy tarzda qo&apos;llanadi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Fuqaro F.I.Sh</Label>
                <Input value={citizenName} onChange={(e) => setCitizenName(e.target.value)} placeholder="Masalan: Aliyev Ali" />
              </div>

              <div className="space-y-2">
                <Label>Telefon (+998...)</Label>
                <Input
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(e.target.value)}
                  onBlur={() => setCitizenPhone((prev) => normalizePhoneInput(prev))}
                  placeholder="+998901234567"
                  inputMode="tel"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Jinsi</Label>
                  <Select value={citizenGender} onValueChange={(value) => setCitizenGender(value as "male" | "female" | "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Erkak</SelectItem>
                      <SelectItem value="female">Ayol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hudud</Label>
                  <Select value={regionId} onValueChange={setRegionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tanlang (ixtiyoriy)" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name_uz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Murojaatchi ma&apos;lumotlari bir marta kiritiladi va quyidagi murojaatlar uchun umumiy tartibda saqlanadi.
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/95">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Murojaatlar</CardTitle>
                <CardDescription>
                  Har bir murojaat bo&apos;yicha tegishli yo&apos;nalish, ustuvorlik va mazmun alohida kiritiladi.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" className="gap-2" onClick={addTask}>
                <Plus className="h-4 w-4" />
                Yana murojaat qo&apos;shish
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasks.map((task, index) => (
                <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Murojaat #{index + 1}</p>
                        <p className="text-sm text-slate-500">Murojaat bo&apos;yicha zarur ma&apos;lumotlarni to&apos;ldiring.</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTask(task.id)}
                      disabled={tasks.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-slate-500" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Murojaat turi</Label>
                      <Select value={task.appealTypeId} onValueChange={(value) => updateTask(task.id, { appealTypeId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {appealTypes.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name_uz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Soha</Label>
                      <Select value={task.categoryId} onValueChange={(value) => updateTask(task.id, { categoryId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.name_uz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Ustuvorlik</Label>
                      <Select value={task.priority} onValueChange={(value) => updateTask(task.id, { priority: value as Priority })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Past</SelectItem>
                          <SelectItem value="medium">O&apos;rtacha</SelectItem>
                          <SelectItem value="high">Yuqori</SelectItem>
                          <SelectItem value="urgent">Shoshilinch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label>Murojaat matni</Label>
                    <Textarea
                      value={task.text}
                      onChange={(e) => updateTask(task.id, { text: e.target.value })}
                      rows={5}
                      placeholder="Mazmunini yozing..."
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Fayllar
                    </Label>
                    <Input
                      type="file"
                      multiple
                      onChange={(e) => updateTask(task.id, { files: Array.from(e.target.files || []) })}
                    />
                    {task.files.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="space-y-1 text-sm text-slate-600">
                          {task.files.map((file, fileIndex) => (
                            <div key={`${file.name}-${fileIndex}`} className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-400" />
                              <span className="truncate">{file.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={handleSubmit} disabled={!canSubmit || saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Yuborish
                </Button>
                <Button type="button" variant="outline" className="gap-2" onClick={addTask}>
                  <Plus className="h-4 w-4" />
                  Yana murojaat qo&apos;shish
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/appeals">Bekor qilish</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardPageFrame>
    </>
  )
}
