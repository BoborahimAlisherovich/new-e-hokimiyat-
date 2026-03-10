"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TabsContent } from "@/components/ui/tabs"
import { Plus, Trash2, Edit } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

type Translation = ReturnType<typeof useTranslation>

interface SettingsSectorsTabProps {
  t: Translation
}

interface Sector {
  id: string
  name: string
  description?: string
  is_active?: boolean
}


export function SettingsSectorsTab({ t }: SettingsSectorsTabProps) {
  const { toast } = useToast()
  const [sectors, setSectors] = useState<Sector[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  useEffect(() => {
    loadSectors()
  }, [])

  const loadSectors = async () => {
    try {
      setIsLoading(true)
      const response = await api.get<unknown>("/organizations/sectors/")
      const data = response.data as { results?: Sector[] } | Sector[]
      const normalized = Array.isArray(data) ? data : (data?.results ?? [])
      setSectors(normalized)
    } catch (error) {
      console.error("Error loading sectors:", error)
      toast({
        title: t.common.error,
        description: "Sohalarni yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      setIsSaving(true)
      if (editingId) {
        await api.patch(`/organizations/sectors/${editingId}/`, {
          name: formData.name.trim(),
          description: formData.description.trim(),
        })
      } else {
        await api.post("/organizations/sectors/", {
          name: formData.name.trim(),
          description: formData.description.trim(),
        })
      }
      setFormData({ name: "", description: "" })
      setIsAdding(false)
      setEditingId(null)
      await loadSectors()
      toast({
        title: t.common.success,
        description: editingId ? "Soha yangilandi" : "Soha qo'shildi",
      })
    } catch (error) {
      console.error("Error saving sector:", error)
      toast({
        title: t.common.error,
        description: "Sohani saqlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (sector: Sector) => {
    setFormData({
      name: sector.name,
      description: sector.description || "",
    })
    setEditingId(sector.id)
    setIsAdding(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Ushbu sohani o'chirmoqchimisiz?")) return
    try {
      await api.delete(`/organizations/sectors/${id}/`)
      await loadSectors()
      toast({
        title: t.common.success,
        description: "Soha o'chirildi",
      })
    } catch (error) {
      console.error("Error deleting sector:", error)
      toast({
        title: t.common.error,
        description: "Sohani o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setFormData({ name: "", description: "" })
    setIsAdding(false)
    setEditingId(null)
  }

  const handleAddDefaults = async () => {
    try {
      await api.post("/organizations/sectors/populate_defaults/")
      await loadSectors()
      toast({
        title: t.common.success,
        description: "Standart sohalar yangilandi",
      })
    } catch (error) {
      console.error("Error adding default sectors:", error)
      toast({
        title: t.common.error,
        description: "Standart sohalarni qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  return (
    <TabsContent value="sectors" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Sohalar boshqaruvi</span>
            {!isAdding && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleAddDefaults} variant="outline" size="sm">
                  Standart sohalarni qo'shish
                </Button>
                <Button onClick={() => setIsAdding(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Soha qo'shish
                </Button>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Tizimda mavjud sohalarni boshqarish
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdding && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-indigo-50/30">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nomi</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Soha nomi"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Tavsif (ixtiyoriy)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Sohaga qisqa tavsif"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saqlanmoqda..." : editingId ? "Yangilash" : "Qo'shish"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Bekor qilish
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Yuklanmoqda...</div>
          ) : sectors.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Hozircha sohalar yo'q. Birinchi sohani qo'shing.
            </div>
          ) : (
            <div className="space-y-2">
              {sectors.map((sector) => (
                <div
                  key={sector.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-indigo-50/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{sector.name}</div>
                    {sector.description && (
                      <div className="text-sm text-slate-500">{sector.description}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(sector)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(sector.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  )
}
