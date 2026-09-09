"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { DashboardPageFrame } from "@/components/layout/dashboard-page-frame"
import { PremiumStatsGrid, PremiumTableShell } from "@/components/dashboard/premium-dashboard-ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useToast } from "@/hooks/use-toast"
import {
  addProjectComment,
  getProjectById,
  getProjectHistory,
  getProjectKpi,
  uploadProjectAttachment,
} from "@/lib/api"
import type { Project, ProjectAttachment, ProjectComment, ProjectHistory } from "@/types"
import { Activity, BarChart3, CalendarRange, FolderKanban, History, MessageSquare, Paperclip, Upload, UserCircle2 } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const { toast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [history, setHistory] = useState<ProjectHistory[]>([])
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([])
  const [comments, setComments] = useState<ProjectComment[]>([])
  const [commentText, setCommentText] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [kpi, setKpi] = useState<{ label: string; progress: number; events: number }[]>([])
  const [loading, setLoading] = useState(true)

  const loadProject = useCallback(async () => {
    try {
      setLoading(true)
      const projectId = params?.id
      if (!projectId) return
      const [projectData, historyData, kpiData] = await Promise.all([
        getProjectById(projectId),
        getProjectHistory(projectId),
        getProjectKpi(projectId),
      ])
      setProject(projectData)
      setHistory(historyData || [])
      setAttachments(projectData.attachments || [])
      setComments(projectData.comments || [])
      setKpi(kpiData.timeline || [])
    } catch (error: any) {
      toast({ title: "Xato", description: error?.message || "Loyiha ma'lumotlari yuklanmadi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [params?.id, toast])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  const durationLabel = useMemo(() => {
    if (!project?.start_date && !project?.end_date) return "Muddat belgilanmagan"
    return `${project?.start_date || "Boshlanish yo'q"} - ${project?.end_date || "Davom etmoqda"}`
  }, [project])

  const handleFileUpload = async (file?: File | null) => {
    if (!file || !params?.id) return
    try {
      setUploading(true)
      await uploadProjectAttachment(params.id, file)
      setSelectedFile(null)
      await loadProject()
      toast({ title: "Muvaffaqiyat", description: "Fayl loyihaga biriktirildi" })
    } catch (error: any) {
      toast({ title: "Xato", description: error?.message || "Fayl yuklanmadi", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleSendComment = async () => {
    if (!commentText.trim() || !params?.id) return
    try {
      setSendingComment(true)
      const item = await addProjectComment(params.id, commentText.trim())
      setComments((prev) => [...prev, item])
      setCommentText("")
      await loadProject()
    } catch (error: any) {
      toast({ title: "Xato", description: error?.message || "Kommentariya yuborilmadi", variant: "destructive" })
    } finally {
      setSendingComment(false)
    }
  }

  const chartConfig = {
    progress: { label: "Progress", color: "#0ea5e9" },
    events: { label: "O'zgarishlar", color: "#10b981" },
  }

  return (
    <>
      <Header title={project?.title || "Loyiha tafsiloti"} description="Loyiha holati, tarixi va o'zgarishlar oqimi." />
      <DashboardPageFrame
        eyebrow="Loyiha tafsiloti"
        title={project?.title || "Loyiha yuklanmoqda"}
        description={project?.summary || "Loyiha bo'yicha asosiy ma'lumotlar va timeline shu sahifada jamlangan."}
        stats={[
          { label: "Holat", value: project?.status_display || project?.status || "—", icon: FolderKanban, tone: "from-emerald-500/18 to-emerald-100/70" },
          { label: "Progress", value: `${project?.progress ?? 0}%`, icon: BarChart3, tone: "from-sky-500/18 to-sky-100/70" },
          { label: "Tarix", value: history.length, icon: History, tone: "from-amber-500/18 to-amber-100/70" },
        ]}
      >
        <PremiumStatsGrid
          items={[
            {
              label: "Mas'ul bo'lim",
              value: project?.owner || "Belgilanmagan",
              icon: UserCircle2,
              iconBg: "bg-primary-soft",
              textColor: "text-primary",
              borderColor: "border-border",
            },
            {
              label: "Resurs",
              value: project?.budget || "Belgilanmagan",
              icon: Activity,
              iconBg: "bg-success-soft",
              textColor: "text-success",
              borderColor: "border-border",
            },
            {
              label: "Davr",
              value: durationLabel,
              icon: CalendarRange,
              iconBg: "bg-warning-soft",
              textColor: "text-warning",
              borderColor: "border-border",
            },
          ]}
        />

        <PremiumTableShell icon={History} title="Timeline / History" countLabel={`${history.length} ta yozuv`} accentClassName="bg-background">
          <div className="space-y-4 p-4">
            {loading && (
              <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                Timeline yuklanmoqda...
              </div>
            )}
            {!loading && history.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                Hozircha loyiha bo'yicha tarix yozuvlari yo'q.
              </div>
            )}
            {history.map((entry) => (
              <article key={String(entry.id)} className="rounded-[22px] border border-border bg-white p-4 shadow-[0_16px_35px_-30px_rgba(15,23,42,0.22)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
                      <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                        {entry.action_display || entry.action_type}
                      </Badge>
                    </div>
                    {entry.description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.description}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {entry.actor_name || "Tizim"} • {new Date(entry.created_at).toLocaleString("uz-UZ")}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </PremiumTableShell>

        <PremiumTableShell icon={BarChart3} title="Loyiha KPI grafigi" countLabel={`${kpi.length} nuqta`} accentClassName="bg-primary-soft">
          <div className="p-4">
            <ChartContainer
              config={chartConfig}
              className="h-[280px] w-full"
            >
              <AreaChart data={kpi}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="progress" type="monotone" fill="var(--color-progress)" fillOpacity={0.18} stroke="var(--color-progress)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </div>
        </PremiumTableShell>

        <div className="grid gap-6 lg:grid-cols-2">
          <PremiumTableShell icon={Paperclip} title="Loyiha fayllari" countLabel={`${attachments.length} ta`} accentClassName="bg-warning-soft">
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3">
                <Input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} disabled={uploading} />
                <Button disabled={uploading || !selectedFile} className="gap-2" onClick={() => handleFileUpload(selectedFile)}>
                  <Upload className="h-4 w-4" />
                  {uploading ? "Yuklanmoqda..." : "Yuklash"}
                </Button>
              </div>
              {attachments.length === 0 && <p className="text-sm text-muted-foreground">Hozircha fayl biriktirilmagan.</p>}
              {attachments.map((item) => (
                <a key={String(item.id)} href={item.file_url || "#"} target="_blank" rel="noreferrer" className="block rounded-2xl border border-border bg-white p-4 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.2)]">
                  <p className="text-sm font-medium text-foreground">{item.file_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.uploaded_by_name || "Tizim"} • {new Date(item.created_at).toLocaleString("uz-UZ")}</p>
                </a>
              ))}
            </div>
          </PremiumTableShell>

          <PremiumTableShell icon={MessageSquare} title="Kommentariya / Chat" countLabel={`${comments.length} ta`} accentClassName="bg-success-soft">
            <div className="space-y-4 p-4">
              <div className="space-y-3">
                <Textarea
                  rows={4}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Loyiha bo'yicha ichki izoh yoki topshiriq eslatmasini yozing"
                />
                <div className="flex justify-end">
                  <Button onClick={handleSendComment} disabled={sendingComment || !commentText.trim()}>
                    {sendingComment ? "Yuborilmoqda..." : "Yuborish"}
                  </Button>
                </div>
              </div>
              {comments.length === 0 && <p className="text-sm text-muted-foreground">Hozircha kommentariya yo'q.</p>}
              {comments.map((item) => (
                <article key={String(item.id)} className="rounded-2xl border border-border bg-white p-4 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.2)]">
                  <p className="text-sm leading-6 text-secondary-foreground">{item.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{item.author_name || "Tizim"} • {new Date(item.created_at).toLocaleString("uz-UZ")}</p>
                </article>
              ))}
            </div>
          </PremiumTableShell>
        </div>
      </DashboardPageFrame>
    </>
  )
}
