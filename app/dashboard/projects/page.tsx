"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { DashboardPageFrame } from "@/components/layout/dashboard-page-frame"
import { PremiumStatsGrid, PremiumTableShell } from "@/components/dashboard/premium-dashboard-ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  createProject,
  deleteProject,
  getCurrentUser,
  getProjects,
  getProjectsSummary,
  restoreProject,
  updateProject,
} from "@/lib/api"
import { normalizeUserRole } from "@/lib/role-utils"
import type { Project, ProjectCreateInput, ProjectScope, ProjectSummary } from "@/types"
import {
  ArchiveRestore,
  BarChart3,
  FolderKanban,
  Globe2,
  Landmark,
  Pencil,
  Plus,
  Rocket,
  Trash2,
  TrendingUp,
} from "lucide-react"

const CATEGORY_META = {
  MAHALLIY: { label: "Mahalliy", icon: Landmark, badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  XALQARO: { label: "Xalqaro", icon: Globe2, badge: "bg-sky-50 text-sky-700 border-sky-100" },
  DRIVER: { label: "Driver", icon: Rocket, badge: "bg-amber-50 text-amber-700 border-amber-100" },
} as const

const STATUS_OPTIONS = [
  { value: "REJA", label: "Rejada" },
  { value: "TASDIQLANGAN", label: "Tasdiqlangan" },
  { value: "IJRODA", label: "Ijroda" },
  { value: "MONITORING", label: "Monitoring" },
  { value: "YAKUNLANGAN", label: "Yakunlangan" },
] as const

const CATEGORY_OPTIONS = [
  { value: "MAHALLIY", label: "Mahalliy loyiha" },
  { value: "XALQARO", label: "Xalqaro loyiha" },
  { value: "DRIVER", label: "Driver loyiha" },
] as const

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Barcha holatlar" },
  ...STATUS_OPTIONS,
] as const

const SCOPE_OPTIONS: Array<{ value: ProjectScope; label: string }> = [
  { value: "active", label: "Faol loyihalar" },
  { value: "archived", label: "Arxiv" },
  { value: "all", label: "Barchasi" },
]

type FormState = Omit<ProjectCreateInput, "progress"> & {
  progress: number | ""
}

const INITIAL_FORM: FormState = {
  title: "",
  summary: "",
  category: "MAHALLIY",
  status: "REJA",
  progress: "",
  budget: "",
  owner: "",
  start_date: "",
  end_date: "",
  sort_order: 0,
  is_active: true,
}

function ProjectFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  saving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: FormState
  onSubmit: (data: FormState) => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>(initialData)

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{initialData.title ? "Loyihani tahrirlash" : "Yangi loyiha qo'shish"}</DialogTitle>
          <DialogDescription>
            Portfel ma'lumotlarini to'ldirib, loyiha holatini nazoratga oling.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="project-title">Loyiha nomi</Label>
            <Input id="project-title" value={form.title} onChange={(e) => setField("title", e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="project-summary">Qisqa tavsif</Label>
            <Textarea id="project-summary" rows={4} value={form.summary} onChange={(e) => setField("summary", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Kategoriya</Label>
            <Select value={form.category} onValueChange={(value) => setField("category", value as FormState["category"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Holati</Label>
            <Select value={form.status} onValueChange={(value) => setField("status", value as FormState["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-progress">Progress (%)</Label>
            <Input
              id="project-progress"
              type="number"
              min={0}
              max={100}
              value={form.progress}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "") {
                  setField("progress", "")
                  return
                }
                const parsed = Number(raw)
                const next = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0
                setField("progress", next)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-sort">Tartib</Label>
            <Input
              id="project-sort"
              type="number"
              min={0}
              value={form.sort_order ?? 0}
              onChange={(e) => setField("sort_order", Number(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-budget">Byudjet yoki paket</Label>
            <Input id="project-budget" value={form.budget || ""} onChange={(e) => setField("budget", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-owner">Mas'ul bo'lim</Label>
            <Input id="project-owner" value={form.owner || ""} onChange={(e) => setField("owner", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-start">Boshlanish sanasi</Label>
            <Input id="project-start" type="date" value={form.start_date || ""} onChange={(e) => setField("start_date", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-end">Yakun sanasi</Label>
            <Input id="project-end" type="date" value={form.end_date || ""} onChange={(e) => setField("end_date", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Bekor qilish</Button>
          <Button onClick={() => onSubmit(form)} disabled={saving || !form.title.trim()}>
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ProjectsPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<"all" | Project["category"]>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | Project["status"]>("all")
  const [scope, setScope] = useState<ProjectScope>("active")
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [summary, setSummary] = useState<ProjectSummary>({
    total: 0,
    active_count: 0,
    archived_count: 0,
    completed_count: 0,
    driver_count: 0,
    average_progress: 0,
  })

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      const [projectData, summaryData, user] = await Promise.all([
        getProjects(scope),
        getProjectsSummary(scope),
        getCurrentUser().catch(() => null),
      ])
      setProjects(projectData || [])
      setSummary(summaryData)
      const role = normalizeUserRole(user?.role)
      setCanManage(Boolean(role && ["HOKIM", "HOKIM_YORDAMCHISI", "ADMIN"].includes(role)))
    } catch (error: any) {
      setProjects([])
      setSummary({
        total: 0,
        active_count: 0,
        archived_count: 0,
        completed_count: 0,
        driver_count: 0,
        average_progress: 0,
      })
      toast({ title: "Xato", description: error?.message || "Loyihalarni yuklab bo'lmadi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [scope, toast])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (!canManage) return
    if (searchParams.get("action") !== "create") return
    setEditingProject(null)
    setFormOpen(true)
  }, [canManage, searchParams])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = [project.title, project.summary, project.owner, project.budget]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search.toLowerCase()))
      const matchesCategory = categoryFilter === "all" || project.category === categoryFilter
      const matchesStatus = statusFilter === "all" || project.status === statusFilter
      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [projects, search, categoryFilter, statusFilter])

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      const aOrder = a.sort_order ?? 0
      const bOrder = b.sort_order ?? 0
      if (aOrder !== bOrder) return aOrder - bOrder
      return String(a.title).localeCompare(String(b.title))
    })
  }, [filteredProjects])

  const openCreate = () => {
    setEditingProject(null)
    setFormOpen(true)
  }

  const openEdit = (project: Project) => {
    setEditingProject(project)
    setFormOpen(true)
  }

  const handleSubmit = async (data: FormState) => {
    try {
      setSaving(true)
      const payload: ProjectCreateInput = {
        ...(data as Omit<ProjectCreateInput, "progress">),
        progress: data.progress === "" ? 0 : data.progress,
      }
      if (editingProject) {
        await updateProject(editingProject.id, payload)
        toast({ title: "Muvaffaqiyat", description: "Loyiha yangilandi" })
      } else {
        await createProject(payload)
        toast({ title: "Muvaffaqiyat", description: "Yangi loyiha qo'shildi" })
      }
      setFormOpen(false)
      await loadProjects()
    } catch (error: any) {
      toast({ title: "Xato", description: error?.message || "Loyiha saqlanmadi", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setSaving(true)
      await deleteProject(deleteTarget.id)
      toast({ title: "Muvaffaqiyat", description: "Loyiha arxivga olindi" })
      setDeleteTarget(null)
      await loadProjects()
    } catch (error: any) {
      toast({ title: "Xato", description: error?.message || "Loyiha arxivlanmadi", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (project: Project) => {
    try {
      setSaving(true)
      await restoreProject(project.id)
      toast({ title: "Muvaffaqiyat", description: "Loyiha qayta faollashtirildi" })
      await loadProjects()
    } catch (error: any) {
      toast({ title: "Xato", description: error?.message || "Loyihani tiklab bo'lmadi", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const formInitialData: FormState = editingProject ? {
    title: editingProject.title,
    summary: editingProject.summary || "",
    category: editingProject.category,
    status: editingProject.status,
    progress: editingProject.progress || 0,
    budget: editingProject.budget || "",
    owner: editingProject.owner || "",
    start_date: editingProject.start_date || "",
    end_date: editingProject.end_date || "",
    sort_order: editingProject.sort_order || 0,
    is_active: editingProject.is_active ?? true,
  } : INITIAL_FORM

  return (
    <>
      <Header title="Loyihalar portfeli" description="Mahalliy, xalqaro va driver loyihalarni boshqarish va tahlil qilish." />
      <DashboardPageFrame
        eyebrow="Loyihalar"
        title="Portfel boshqaruvi, progress va strategik og'irlik bir oynada jamlandi."
        description="Loyihalar shu sahifaning o'zida real API orqali yaratiladi, tahrirlanadi, arxivlanadi va qayta tiklanadi."
        stats={[
          { label: "Jami", value: summary.total, icon: FolderKanban, tone: "from-emerald-500/18 to-emerald-100/70" },
          { label: "Faol", value: summary.active_count, icon: TrendingUp, tone: "from-sky-500/18 to-sky-100/70" },
          { label: "Driver", value: summary.driver_count, icon: Rocket, tone: "from-amber-500/18 to-amber-100/70" },
        ]}
      >
        <PremiumStatsGrid
          items={[
            {
              label: "O'rtacha progress",
              value: `${summary.average_progress}%`,
              icon: BarChart3,
              gradient: "from-cyan-500 to-sky-500",
              bgGradient: "from-cyan-50 to-white",
              iconBg: "bg-cyan-100",
              textColor: "text-cyan-700",
              borderColor: "border-cyan-100",
              hint: "Barcha loyihalar kesimida",
            },
            {
              label: "Faol loyihalar",
              value: summary.active_count,
              icon: TrendingUp,
              gradient: "from-emerald-500 to-teal-500",
              bgGradient: "from-emerald-50 to-white",
              iconBg: "bg-emerald-100",
              textColor: "text-emerald-700",
              borderColor: "border-emerald-100",
              hint: "Ijroda va monitoringda",
            },
            {
              label: "Yakunlangan",
              value: summary.completed_count,
              icon: FolderKanban,
              gradient: "from-indigo-500 to-blue-500",
              bgGradient: "from-indigo-50 to-white",
              iconBg: "bg-indigo-100",
              textColor: "text-indigo-700",
              borderColor: "border-indigo-100",
              hint: "To'liq yopilgan loyihalar",
            },
            {
              label: "Arxiv",
              value: summary.archived_count,
              icon: Rocket,
              gradient: "from-amber-500 to-orange-500",
              bgGradient: "from-amber-50 to-white",
              iconBg: "bg-amber-100",
              textColor: "text-amber-700",
              borderColor: "border-amber-100",
              hint: "Arxivga olingan loyihalar",
            },
          ]}
        />

        <section data-gsap-section className="rounded-[26px] border border-cyan-100 bg-[linear-gradient(135deg,rgba(236,254,255,0.96),rgba(255,255,255,0.92))] p-5 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Portfel boshqaruvi shu sahifada ishlaydi</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Yangi loyiha qo'shish, mavjudini tahrirlash, arxivlash va qayta tiklash shu bo'limdan amalga oshiriladi. Sahifadagi barcha ko'rsatkichlar real API ma'lumotiga ulangan.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">Ko'rish: barcha tegishli rollar uchun</span>
                <span className="rounded-full bg-white px-3 py-1 shadow-sm">Boshqaruv: hokim, hokim o'rinbosari, administrator</span>
              </div>
            </div>
            {canManage && (
              <div className="flex w-full flex-col items-start gap-2 lg:w-auto">
                <Button
                  onClick={openCreate}
                  className="w-full gap-2 rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Yangi loyiha
                </Button>
                <p className="text-xs text-slate-500">Yaratish, tahrirlash, arxivlash va qayta tiklash shu bo'limda.</p>
              </div>
            )}
          </div>
        </section>

        <section data-gsap-section className="rounded-[26px] border border-white/70 bg-white/78 p-4 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="project-search">Qidiruv</Label>
                <Input id="project-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, bo'lim yoki byudjet bo'yicha qidiring" />
              </div>
              <div className="space-y-2">
                <Label>Kategoriya</Label>
                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as typeof categoryFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barchasi</SelectItem>
                    {CATEGORY_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Holat</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTER_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {canManage && (
                <div className="space-y-2">
                  <Label>Ko'rinish</Label>
                  <Select value={scope} onValueChange={(value) => setScope(value as ProjectScope)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCOPE_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </section>

        <PremiumTableShell
          icon={FolderKanban}
          title="Loyihalar ro'yxati"
          countLabel={`${sortedProjects.length} ta`}
          accentClassName="bg-gradient-to-r from-slate-50 via-white to-slate-50"
        >
          <div className="grid gap-4 p-4">
            {loading && sortedProjects.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Loyihalar yuklanmoqda...
              </div>
            )}
            {!loading && sortedProjects.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Hozircha loyiha topilmadi.
              </div>
            )}

            {sortedProjects.map((project) => {
              const meta = CATEGORY_META[project.category]
              return (
                <article key={project.id} className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)] sm:p-5">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-slate-900">{project.title}</h3>
                    </div>
                    <div className="flex sm:justify-center">
                      <Badge className={meta.badge}>{project.category_display || meta.label}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        {project.status_display || project.status}
                      </Badge>
                      <span className="text-sm font-medium text-slate-700">{project.progress}%</span>
                    </div>
                  </div>

                  {project.summary && <p className="mt-3 text-sm leading-6 text-slate-600">{project.summary}</p>}

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                    <span>Mas'ul: <span className="font-medium text-slate-700">{project.owner || "Belgilanmagan"}</span></span>
                    <span>Resurs: <span className="font-medium text-slate-700">{project.budget || "Belgilanmagan"}</span></span>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500" style={{ width: `${project.progress}%` }} />
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Button asChild variant="link" className="h-auto px-0 text-cyan-700">
                      <Link href={`/dashboard/projects/${project.id}`}>Batafsil ko'rish</Link>
                    </Button>

                    {canManage && (
                      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                        {project.is_active ? (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openEdit(project)} className="w-full sm:w-auto">
                              <Pencil className="mr-2 h-4 w-4" />
                              Tahrirlash
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(project)} className="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:w-auto">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Arxivlash
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleRestore(project)} className="w-full sm:w-auto">
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Qayta tiklash
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </PremiumTableShell>
      </DashboardPageFrame>

      <ProjectFormDialog
        key={editingProject?.id ? `edit-${editingProject.id}` : "create-project"}
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={formInitialData}
        onSubmit={handleSubmit}
        saving={saving}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Loyihani arxivlash</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title} loyihasi faol ro'yxatdan olinadi va arxivga o'tadi. Keyinroq uni qayta tiklash mumkin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-rose-600 hover:bg-rose-700">
              Arxivlash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
