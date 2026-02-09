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

type Translation = ReturnType<typeof useTranslation>

interface SettingsSectorsTabProps {
  t: Translation
}

interface Sector {
  id: number
  name: string
  description?: string
  is_active?: boolean
}


export function SettingsSectorsTab({ t }: SettingsSectorsTabProps) {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
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
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/organizations/sectors/${editingId}/`, formData)
      } else {
        await api.post("/organizations/sectors/", formData)
      }
      setFormData({ name: "", description: "" })
      setIsAdding(false)
      setEditingId(null)
      loadSectors()
    } catch (error) {
      console.error("Error saving sector:", error)
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

  const handleDelete = async (id: number) => {
    if (!confirm("Ushbu sohani o'chirmoqchimisiz?")) return
    try {
      await api.delete(`/organizations/sectors/${id}/`)
      loadSectors()
    } catch (error) {
      console.error("Error deleting sector:", error)
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
      loadSectors()
    } catch (error) {
      console.error("Error adding default sectors:", error)
    }
  }

  return (
    <TabsContent value="sectors" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sohalar boshqaruvi</span>
            {!isAdding && (
              <div className="flex gap-2">
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
                <Button type="submit">
                  {editingId ? "Yangilash" : "Qo'shish"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
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
