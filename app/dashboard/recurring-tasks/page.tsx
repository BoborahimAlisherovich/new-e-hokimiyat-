"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { DashboardPageFrame } from "@/components/layout/dashboard-page-frame"
import { Button } from "@/components/ui/button"
import { getRecurringTasks, createRecurringTask, pauseRecurringTask, resumeRecurringTask, runRecurringTaskNow, deleteRecurringTask, getRecurringTaskStatistics } from "@/lib/api/tasks.api"
import { getOrganizations } from "@/lib/api/organizations.api"
import { useTranslation } from "@/lib/i18n/context"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { Repeat, Plus, Pause, Play, Trash2, Zap, Calendar, Clock3, ListTodo } from "lucide-react"
import type { RecurringTask } from "@/types"

interface RecurringTaskWithOrgs extends RecurringTask {
  organization_names?: string[]
}

export default function RecurringTasksPage() {
  const t = useTranslation()
  const pageRef = useGSAPPageEntrance()
  const [tasks, setTasks] = useState<RecurringTaskWithOrgs[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statistics, setStatistics] = useState({ total: 0, active: 0, paused: 0, total_tasks_created: 0 })
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "PAUSED">("all")

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [tasksData, orgsData, statsData] = await Promise.all([
        getRecurringTasks(statusFilter !== "all" ? { status: statusFilter } : undefined),
        getOrganizations(),
        getRecurringTaskStatistics(),
      ])
      setTasks(tasksData || [])
      setOrganizations(orgsData || [])
      setStatistics(statsData || { total: 0, active: 0, paused: 0, total_tasks_created: 0 })
    } catch (error) {
      console.error("Recurring tasks load error:", error)
      setTasks([])
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handlePause = async (id: number) => {
    try {
      await pauseRecurringTask(id)
      loadData()
    } catch (error) {
      console.error("Pause error:", error)
      alert(t.recurringTasks.deleteError)
    }
  }

  const handleResume = async (id: number) => {
    try {
      await resumeRecurringTask(id)
      loadData()
    } catch (error) {
      console.error("Resume error:", error)
      alert(t.recurringTasks.deleteError)
    }
  }

  const handleRunNow = async (id: number) => {
    if (!confirm(t.recurringTasks.runNow)) return
    try {
      await runRecurringTaskNow(id)
      loadData()
    } catch (error) {
      console.error("Run now error:", error)
      alert(t.recurringTasks.runNowError)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t.recurringTasks.deleteConfirm)) return
    try {
      await deleteRecurringTask(id)
      loadData()
    } catch (error) {
      console.error("Delete error:", error)
      alert(t.recurringTasks.deleteError)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const frequencyLabels: Record<string, string> = {
    DAILY: t.recurringTasks.frequencyDaily,
    WEEKLY: t.recurringTasks.frequencyWeekly,
    BIWEEKLY: t.recurringTasks.frequencyBiweekly,
    MONTHLY: t.recurringTasks.frequencyMonthly,
    QUARTERLY: t.recurringTasks.frequencyQuarterly,
    YEARLY: t.recurringTasks.frequencyYearly,
    CUSTOM: t.recurringTasks.frequencyCustom,
  }

  if (loading) {
    return (
      <>
        <Header title={t.recurringTasks.title} description={t.recurringTasks.description} />
        <div className="p-6 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-slate-500 text-sm">{t.common.loading}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.recurringTasks.title} description={t.recurringTasks.description} />
      <div ref={pageRef}>
      <DashboardPageFrame
        eyebrow="Takrorlanuvchi topshiriqlar"
        title="Muntazam takrorlanadigan topshiriqlarni avtomatik boshqaring"
        description="Har kuni, har hafta yoki har oy takrorlanadigan topshiriqlar tizim tomonidan avtomatik yaratiladi."
        stats={[
          { label: "Jami", value: statistics.total, icon: ListTodo, tone: "from-violet-500/18 to-violet-100/70" },
          { label: "Faol", value: statistics.active, icon: Play, tone: "from-emerald-500/18 to-emerald-100/70" },
          { label: "To'xtatilgan", value: statistics.paused, icon: Pause, tone: "from-amber-500/18 to-amber-100/70" },
          { label: "Yaratilgan", value: statistics.total_tasks_created, icon: Calendar, tone: "from-blue-500/18 to-blue-100/70" },
        ]}
      >
        {/* Filters */}
        <section data-gsap-section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <input
                type="text"
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm backdrop-blur-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white/70 px-4 py-2.5 text-sm backdrop-blur-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">Barchasi</option>
                <option value="ACTIVE">Faol</option>
                <option value="PAUSED">To'xtatilgan</option>
              </select>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:from-indigo-700 hover:to-violet-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.recurringTasks.createNew}
            </Button>
          </div>
        </section>

        {/* Tasks List */}
        <section data-gsap-section>
          {filteredTasks.length === 0 ? (
            <div className="overflow-hidden rounded-[26px] border border-white/70 bg-white/78 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl">
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <Repeat className="h-16 w-16 text-slate-300" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-700">{t.recurringTasks.emptyTitle}</h3>
                  <p className="mt-1 text-sm text-slate-500">{t.recurringTasks.emptyDescription}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="overflow-hidden rounded-[26px] border border-white/70 bg-white/78 shadow-[0_22px_50px_-34px_rgba(14,165,233,0.28)] backdrop-blur-xl transition-all hover:shadow-[0_28px_60px_-30px_rgba(14,165,233,0.35)]"
                >
                  <div className="border-b border-cyan-100/60 bg-gradient-to-r from-violet-50/55 via-white/30 to-transparent px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-800">{task.title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{task.description}</p>
                      </div>
                      <span
                        className={`ml-4 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          task.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {task.status === 'ACTIVE' ? t.recurringTasks.statusActive : t.recurringTasks.statusPaused}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">{t.recurringTasks.frequency}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{frequencyLabels[task.frequency] || task.frequency}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">{t.recurringTasks.nextRun}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{task.next_run_date ? new Date(task.next_run_date).toLocaleDateString('uz-UZ') : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">{t.recurringTasks.totalCreated}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{task.total_created} {t.common.itemsShort}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">{t.recurringTasks.deadlineDays}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{task.deadline_days} {t.common.daysRemaining}</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-100/60 bg-slate-50/40 px-6 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Tashkilotlar: {task.organizations_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status === 'ACTIVE' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePause(task.id as number)}
                            className="h-8 rounded-lg border-amber-200 text-amber-600 hover:bg-amber-50"
                          >
                            <Pause className="mr-1.5 h-3.5 w-3.5" />
                            {t.recurringTasks.pause}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResume(task.id as number)}
                            className="h-8 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            {t.recurringTasks.resume}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRunNow(task.id as number)}
                          className="h-8 rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <Zap className="mr-1.5 h-3.5 w-3.5" />
                          {t.recurringTasks.runNow}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(task.id as number)}
                          className="h-8 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </DashboardPageFrame>
      </div>

      {/* Create Dialog */}
      {isCreateDialogOpen && (
        <CreateRecurringTaskDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          organizations={organizations}
          onCreated={() => {
            setIsCreateDialogOpen(false)
            loadData()
          }}
        />
      )}
    </>
  )
}

// ============================================================================
// Create Recurring Task Dialog
// ============================================================================

interface CreateRecurringTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizations: any[]
  onCreated: () => void
}

function CreateRecurringTaskDialog({ open, onOpenChange, organizations, onCreated }: CreateRecurringTaskDialogProps) {
  const t = useTranslation()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [frequency, setFrequency] = useState("WEEKLY")
  const [priority, setPriority] = useState("ODDIY")
  const [category, setCategory] = useState("BOSHQA")
  const [deadlineDays, setDeadlineDays] = useState(5)
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Sarlavhani kiriting")
      return
    }
    try {
      setLoading(true)
      await createRecurringTask({
        title: title.trim(),
        description: description.trim(),
        frequency,
        priority,
        category,
        deadline_days: parseInt(deadlineDays) || 5,
        organizations: selectedOrgs,
        start_date: startDate,
        end_date: endDate || undefined,
      })
      onCreated()
    } catch (error) {
      console.error("Create error:", error)
      alert("Yaratishda xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  const toggleOrg = (orgId: string) => {
    setSelectedOrgs(prev =>
      prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/70 bg-white/95 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">{t.recurringTasks.createTitle}</h2>
          <p className="mt-1 text-sm text-slate-600">{t.recurringTasks.createDescription}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.recurringTasks.title}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Masalan: Har dushanba obodonlashtirish holati"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.recurringTasks.description}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              rows={3}
              placeholder="Topshiriq tavsifi..."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.recurringTasks.frequency}</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="DAILY">{t.recurringTasks.frequencyDaily}</option>
                <option value="WEEKLY">{t.recurringTasks.frequencyWeekly}</option>
                <option value="BIWEEKLY">{t.recurringTasks.frequencyBiweekly}</option>
                <option value="MONTHLY">{t.recurringTasks.frequencyMonthly}</option>
                <option value="QUARTERLY">{t.recurringTasks.frequencyQuarterly}</option>
                <option value="YEARLY">{t.recurringTasks.frequencyYearly}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.recurringTasks.priority}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="PAST">{t.task.priorities.PAST}</option>
                <option value="ODDIY">{t.task.priorities.ODDIY}</option>
                <option value="YUQORI">{t.task.priorities.YUQORI}</option>
                <option value="FAVQULODDA">{t.task.priorities.FAVQULODDA}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.recurringTasks.startDate}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.recurringTasks.endDate}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.recurringTasks.deadlineDays}</label>
            <input
              type="number"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              min="1"
              max="365"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t.recurringTasks.organizations}</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-3">
              {organizations.map((org) => (
                <label
                  key={org.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    selectedOrgs.includes(String(org.id))
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedOrgs.includes(String(org.id))}
                    onChange={() => toggleOrg(String(org.id))}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="truncate">{org.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
          >
            {loading ? t.common.saving : t.common.save}
          </Button>
        </div>
      </div>
    </div>
  )
}
