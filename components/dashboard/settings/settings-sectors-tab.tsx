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
  name_uz: string
  name_ru: string
  name_en: string
}

export function SettingsSectorsTab({ t }: SettingsSectorsTabProps) {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name_uz: "",
    name_ru: "",
    name_en: "",
  })

  useEffect(() => {
    loadSectors()
  }, [])

  const loadSectors = async () => {
    try {
      setIsLoading(true)
      const response = await api.get<Sector[]>("/api/sectors/")
      setSectors(response.data)
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
        await api.put(`/api/sectors/${editingId}/`, formData)
      } else {
        await api.post("/api/sectors/", formData)
      }
      setFormData({ name_uz: "", name_ru: "", name_en: "" })
      setIsAdding(false)
      setEditingId(null)
      loadSectors()
    } catch (error) {
      console.error("Error saving sector:", error)
    }
  }

  const handleEdit = (sector: Sector) => {
    setFormData({
      name_uz: sector.name_uz,
      name_ru: sector.name_ru,
      name_en: sector.name_en,
    })
    setEditingId(sector.id)
    setIsAdding(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Ushbu sohani o'chirmoqchimisiz?")) return
    try {
      await api.delete(`/api/sectors/${id}/`)
      loadSectors()
    } catch (error) {
      console.error("Error deleting sector:", error)
    }
  }

  const handleCancel = () => {
    setFormData({ name_uz: "", name_ru: "", name_en: "" })
    setIsAdding(false)
    setEditingId(null)
  }

  return (
    <TabsContent value="sectors" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sohalar boshqaruvi</span>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Soha qo'shish
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Tizimda mavjud sohalarni boshqarish
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdding && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-slate-50">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name_uz">Nomi (O'zbekcha)</Label>
                  <Input
                    id="name_uz"
                    value={formData.name_uz}
                    onChange={(e) => setFormData({ ...formData, name_uz: e.target.value })}
                    placeholder="Soha nomi o'zbek tilida"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ru">Nomi (Ruscha)</Label>
                  <Input
                    id="name_ru"
                    value={formData.name_ru}
                    onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
                    placeholder="Название сектора на русском"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_en">Nomi (Inglizcha)</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    placeholder="Sector name in English"
                    required
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{sector.name_uz}</div>
                    <div className="text-sm text-slate-500">
                      {sector.name_ru} • {sector.name_en}
                    </div>
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
