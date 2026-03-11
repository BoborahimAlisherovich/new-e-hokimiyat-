"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Save, X, Building2, BarChart3, TrendingUp } from "lucide-react"
import { getSectors, createSector, updateSector, deleteSector, getOrganizations, getTasks, getTaskStats } from "@/lib/api"
import type { Sector } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnalyticsTabsProps {
  tasks?: any[]
  organizations?: any[]
}

interface TaskStatsData {
  total: number
  pending: number
  in_progress: number
  completed: number
  overdue: number
  active_sectors: number
}

export function AnalyticsTabs({ tasks = [], organizations = [] }: AnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState("status")
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(false)
  const [editingSector, setEditingSector] = useState<Sector | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({ name: "", description: "" })
  const [taskStats, setTaskStats] = useState<TaskStatsData | null>(null)

  useEffect(() => {
    console.log('📊 AnalyticsTabs Props:', {
      tasksCount: tasks?.length || 0,
      organizationsCount: organizations?.length || 0,
      tasks: tasks?.slice(0, 2), // First 2 tasks for debugging
      organizations: organizations?.slice(0, 2) // First 2 orgs for debugging
    })
  }, [tasks, organizations])

  useEffect(() => {
    loadSectors()
    loadTaskStats()
  }, [])

  const loadSectors = async () => {
    try {
      const data = await getSectors()
      console.log('🔵 Sectors loaded from API:', {
        count: data?.length || 0,
        sectors: data
      })
      setSectors(data)
    } catch (error) {
      console.error("Sohalarni yuklashda xato:", error)
    }
  }

  const loadTaskStats = async () => {
    try {
      const stats = await getTaskStats()
      console.log('📊 Task stats loaded from API:', stats)
      setTaskStats(stats)
    } catch (error) {
      console.error("Task statistikasini yuklashda xato:", error)
    }
  }

  const handleCreateSector = async () => {
    if (!formData.name.trim()) return
    
    setLoading(true)
    try {
      await createSector({ name: formData.name, description: formData.description, is_active: true })
      await loadSectors()
      setFormData({ name: "", description: "" })
      setIsCreating(false)
    } catch (error) {
      console.error("Soha yaratishda xato:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSector = async () => {
    if (!editingSector || !formData.name.trim()) return
    
    setLoading(true)
    try {
      await updateSector(editingSector.id, { name: formData.name, description: formData.description })
      await loadSectors()
      setEditingSector(null)
      setFormData({ name: "", description: "" })
    } catch (error) {
      console.error("Sohani yangilashda xato:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSector = async (id: string) => {
    if (!confirm("Sohani o'chirishni tasdiqlaysizmi?")) return
    
    setLoading(true)
    try {
      await deleteSector(id)
      await loadSectors()
    } catch (error) {
      console.error("Sohani o'chirishda xato:", error)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (sector: Sector) => {
    setEditingSector(sector)
    setFormData({ name: sector.name, description: sector.description })
    setIsCreating(false)
  }

  const cancelEdit = () => {
    setEditingSector(null)
    setIsCreating(false)
    setFormData({ name: "", description: "" })
  }

  // Calculate statistics by status - API dan olingan ma'lumotlar ustun
  const statusStats = taskStats ? {
    completed: taskStats.completed,
    in_progress: taskStats.in_progress,
    new: taskStats.pending,
    overdue: taskStats.overdue,
  } : {
    // Fallback: props'dan hisoblash
    completed: tasks.filter(t => t.status === 'BAJARILDI' || t.status === 'COMPLETED').length,
    in_progress: tasks.filter(t => t.status === 'IJRODA' || t.status === 'IN_PROGRESS').length,
    new: tasks.filter(t => t.status === 'YANGI' || t.status === 'NEW' || t.status === 'PENDING').length,
    overdue: tasks.filter(t => t.status === 'MUDDATI_KECH' || t.status === 'OVERDUE').length,
  }

  // Calculate statistics by sector
  const sectorStats = Array.isArray(sectors) ? sectors.map(sector => {
    // Find organizations belonging to this sector
    const sectorOrgs = Array.isArray(organizations) ? organizations.filter(org => {
      // Check both sector field and sector_id field
      return org.sector === sector.id || org.sector_id === sector.id || 
             org.sector === sector.name || org.sector_id === sector.name
    }) : []
    
    const sectorOrgIds = sectorOrgs.map(org => org.id)
    
    // Find tasks assigned to organizations in this sector
    const sectorTasks = tasks.filter(task => {
      // Check different possible task structures
      if (Array.isArray(task.assigned_organizations)) {
        return task.assigned_organizations.some((ao: any) => 
          sectorOrgIds.includes(ao.organization) || sectorOrgIds.includes(ao.organization_id) || sectorOrgIds.includes(ao.id)
        )
      }
      if (Array.isArray(task.organizations)) {
        return task.organizations.some((orgId: any) => sectorOrgIds.includes(orgId))
      }
      if (task.organization) {
        return sectorOrgIds.includes(task.organization) || sectorOrgIds.includes(task.organization_id)
      }
      // Check if task has sector field directly
      if (task.sector === sector.id || task.sector === sector.name || task.sector_id === sector.id) {
        return true
      }
      return false
    })
    
    return {
      sector: sector.name,
      organizations: sectorOrgs.length,
      tasks: sectorTasks.length,
      completed: sectorTasks.filter(t => t.status === 'BAJARILDI' || t.status === 'COMPLETED').length,
    }
  }) : []
  const hasTaskStatusStats = statusStats.completed + statusStats.in_progress + statusStats.new + statusStats.overdue > 0
  const hasSectorActivity = sectorStats.some((item) => item.organizations > 0 || item.tasks > 0 || item.completed > 0)

  return (
    <section className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-indigo-100/40 rounded-xl p-1.5 shadow-sm">
          <TabsTrigger
            value="status"
            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
          >
            Holat bo'yicha
          </TabsTrigger>
          <TabsTrigger
            value="sector"
            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
          >
            Soha bo'yicha
          </TabsTrigger>
          <TabsTrigger
            value="organizations"
            className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
          >
            Tashkilotlar
          </TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="mt-6">
          {hasTaskStatusStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Bajarildi", value: statusStats.completed, color: "from-green-500 to-green-600", icon: "✓" },
                { label: "Ijroda", value: statusStats.in_progress, color: "from-blue-500 to-blue-600", icon: "⟳" },
                { label: "Yangi", value: statusStats.new, color: "from-purple-500 to-purple-600", icon: "★" },
                { label: "Muddati kechgan", value: statusStats.overdue, color: "from-red-500 to-red-600", icon: "!" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl hover:shadow-xl transition-all duration-300">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                          <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                        </div>
                        <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br", stat.color, "flex items-center justify-center text-white text-2xl shadow-lg")}>
                          {stat.icon}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl">
              <CardContent className="py-10 text-center text-slate-500">
                Hozircha topshiriqlar statistikasi mavjud emas. Statuslar bo'yicha tahlil topshiriqlar kelgandan keyin ko'rinadi.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sector Tab */}
        <TabsContent value="sector" className="mt-6 space-y-6">
          {/* Sector Management */}
          <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Sohalarni boshqarish
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Tashkilotlar sohalari va ularning statistikasi
                  </CardDescription>
                </div>
                {!isCreating && !editingSector && (
                  <Button 
                    onClick={() => setIsCreating(true)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Soha qo'shish
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create/Edit Form */}
              <AnimatePresence>
                {(isCreating || editingSector) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-blue-50 rounded-xl border border-blue-200"
                  >
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-slate-900">Soha nomi *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Masalan: Ta'lim, Sog'liqni saqlash"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-slate-900">Tavsif</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Soha haqida qisqacha ma'lumot"
                          className="mt-1"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={editingSector ? handleUpdateSector : handleCreateSector}
                          disabled={loading || !formData.name.trim()}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {editingSector ? "Yangilash" : "Saqlash"}
                        </Button>
                        <Button onClick={cancelEdit} variant="outline">
                          <X className="h-4 w-4 mr-2" />
                          Bekor qilish
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sectors List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.isArray(sectors) ? sectors.map((sector) => (
                  <motion.div
                    key={sector.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-gradient-to-br from-white to-slate-50 rounded-xl border border-white/50 hover:shadow-[0_4px_16px_-4px_rgba(99,102,241,0.1)] transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-lg">{sector.name}</h3>
                        {sector.description && (
                          <p className="text-sm text-slate-600 mt-1">{sector.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(sector)}
                          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSector(sector.id)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                        {sector.organization_count} ta tashkilot
                      </Badge>
                      {sector.is_active && (
                        <Badge className="bg-green-50 text-green-700 border-green-200">
                          Faol
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )) : null}
              </div>

              {Array.isArray(sectors) && sectors.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Building2 className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>Hozircha sohalar mavjud emas</p>
                  <p className="text-sm">Yangi soha qo'shish uchun yuqoridagi tugmani bosing</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sector Statistics */}
          {sectorStats.length > 0 && (
            <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  Soha bo'yicha statistika
                </CardTitle>
              </CardHeader>
              <CardContent>
                {hasSectorActivity ? (
                  <div className="space-y-3">
                    {sectorStats.map((stat, index) => (
                      <motion.div
                        key={stat.sector}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 bg-indigo-50/30 rounded-lg hover:bg-indigo-50/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">{stat.sector}</h4>
                          <p className="text-sm text-slate-600">
                            {stat.organizations} tashkilot • {stat.tasks} topshiriq
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Bajarildi</p>
                            <p className="text-lg font-bold text-green-600">{stat.completed}</p>
                          </div>
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    Sohalar mavjud, lekin ular bo'yicha hali topshiriq yoki tashkilot statistikasi shakllanmagan.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="mt-6">
          <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl">
            <CardHeader>
              <CardTitle className="text-slate-900">Tashkilotlar statistikasi</CardTitle>
              <CardDescription className="text-slate-600">
                Barcha tashkilotlar va ularning faoliyati
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-900">
                        {Array.isArray(organizations) ? organizations.length : 0}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">Jami tashkilotlar</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-900">
                        {Array.isArray(organizations) 
                          ? organizations.filter(o => o.is_active || o.isActive || o.status === 'active').length 
                          : 0}
                      </p>
                      <p className="text-sm text-green-700 mt-1">Faol tashkilotlar</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-900">
                        {Array.isArray(sectors) ? sectors.length : 0}
                      </p>
                      <p className="text-sm text-purple-700 mt-1">Sohalar soni</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tashkilotlar ro'yxati */}
              {Array.isArray(organizations) && organizations.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Tashkilotlar ro'yxati</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {organizations.map((org, index) => (
                      <motion.div
                        key={org.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="flex items-center justify-between p-3 bg-indigo-50/30 rounded-lg hover:bg-indigo-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900">{org.name || 'Noma\'lum'}</h4>
                            <p className="text-sm text-slate-600">
                              {org.sector_name || org.sector || 'Soha ko\'rsatilmagan'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(org.is_active || org.isActive || org.status === 'active') && (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Faol
                            </Badge>
                          )}
                          {(!org.is_active && !org.isActive && org.status !== 'active') && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                              Nofaol
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {(!Array.isArray(organizations) || organizations.length === 0) && (
                <div className="mt-6 text-center py-8 text-slate-500">
                  <Building2 className="h-16 w-16 mx-auto mb-3 text-slate-300" />
                  <p className="text-lg font-medium">Tashkilotlar topilmadi</p>
                  <p className="text-sm">Hozircha tizimda tashkilotlar mavjud emas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}
