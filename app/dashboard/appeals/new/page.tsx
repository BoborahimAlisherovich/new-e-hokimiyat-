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
import { createManualAppeal, getAppealCategories, getCurrentUser, api } from "@/lib/api"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import Link from "next/link"

type RegionItem = { id: number; name_uz: string }
type CategoryItem = { id: number; name_uz: string }

const ALLOWED_ROLES = new Set(["HOKIM", "HOKIM_YORDAMCHISI", "ADMIN"])

export default function NewAppealPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [checkingAccess, setCheckingAccess] = useState(true)
  const [saving, setSaving] = useState(false)

  const [regions, setRegions] = useState<RegionItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])

  const [citizenName, setCitizenName] = useState("")
  const [citizenPhone, setCitizenPhone] = useState("")
  const [regionId, setRegionId] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [address, setAddress] = useState("")
  const [text, setText] = useState("")

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
    // Regions
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

    // Categories
    getAppealCategories()
      .then((rows) => setCategories(rows.map((c) => ({ id: c.id, name_uz: c.name_uz }))))
      .catch(() => setCategories([]))
  }, [])

  const canSubmit = useMemo(() => {
    return Boolean(citizenName.trim()) && Boolean(text.trim())
  }, [citizenName, text])

  const handleSubmit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    try {
      const created = await createManualAppeal({
        citizen_name: citizenName.trim(),
        citizen_phone: citizenPhone.trim(),
        citizen_region_id: regionId ? Number(regionId) : null,
        category_id: categoryId ? Number(categoryId) : null,
        priority,
        address: address.trim(),
        text: text.trim(),
      })

      toast({ title: "Muvaffaqiyat", description: "Murojaat qo'shildi" })
      router.push(`/dashboard/appeals/${created.id}`)
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
        description="Telegramdan kelmagan murojaatlarni hokim, hokim o‘rinbosari yoki admin qo‘lda kiritishi mumkin."
        stats={[]}
      >
        <div className="mb-4">
          <Link href="/dashboard/appeals" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Link>
        </div>

        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Ma'lumotlar</CardTitle>
            <CardDescription>Majburiy maydonlar: fuqaro ismi va murojaat matni.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fuqaro F.I.Sh</Label>
                <Input value={citizenName} onChange={(e) => setCitizenName(e.target.value)} placeholder="Masalan: Aliyev Ali" />
              </div>
              <div className="space-y-2">
                <Label>Telefon (+998...)</Label>
                <Input value={citizenPhone} onChange={(e) => setCitizenPhone(e.target.value)} placeholder="+998901234567" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label>Soha</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tanlang (ixtiyoriy)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name_uz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ustuvorlik</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Past</SelectItem>
                    <SelectItem value="medium">O'rtacha</SelectItem>
                    <SelectItem value="high">Yuqori</SelectItem>
                    <SelectItem value="urgent">Shoshilinch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Manzil</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ixtiyoriy" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Murojaat matni</Label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Murojaat mazmunini yozing..." />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSubmit} disabled={!canSubmit || saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Saqlash
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/appeals">Bekor qilish</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardPageFrame>
    </>
  )
}
