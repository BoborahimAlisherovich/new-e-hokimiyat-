"use client"

import { useCallback, useEffect, useState } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createPosition, deletePosition, getPositions, updatePosition } from "@/lib/api"
import type { PositionOption } from "@/types"
import { BriefcaseBusiness, Edit, Loader2, Plus, Trash2 } from "lucide-react"

type Translation = {
  settings: {
    positions: string
  }
  common: {
    success: string
    error: string
  }
}

export function SettingsPositionsTab({ t }: { t: Translation }) {
  const { toast } = useToast()
  const [positions, setPositions] = useState<PositionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "" })

  const loadPositions = useCallback(async () => {
    try {
      setLoading(true)
      const rows = await getPositions()
      setPositions(Array.isArray(rows) ? rows : [])
    } catch (error) {
      console.error("Failed to load positions:", error)
      toast({
        title: t.common.error,
        description: "Lavozimlarni yuklashda xatolik yuz berdi.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [t.common.error, toast])

  useEffect(() => {
    loadPositions()
  }, [loadPositions])

  const resetForm = () => {
    setFormData({ name: "", description: "" })
    setEditingId(null)
    setIsAdding(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      setIsSaving(true)
      if (editingId) {
        await updatePosition(editingId, {
          name: formData.name.trim(),
          description: formData.description.trim(),
        })
      } else {
        await createPosition({
          name: formData.name.trim(),
          description: formData.description.trim(),
        })
      }

      await loadPositions()
      resetForm()
      toast({
        title: t.common.success,
        description: editingId ? "Lavozim yangilandi." : "Lavozim qo'shildi.",
      })
    } catch (error: any) {
      console.error("Failed to save position:", error)
      toast({
        title: t.common.error,
        description: error?.message || "Lavozimni saqlashda xatolik yuz berdi.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (position: PositionOption) => {
    setFormData({
      name: String(position.name || ""),
      description: String(position.description || ""),
    })
    setEditingId(String(position.id))
    setIsAdding(true)
  }

  const handleDelete = async (id: string | number) => {
    if (!confirm("Ushbu lavozimni o'chirmoqchimisiz?")) return

    try {
      await deletePosition(id)
      await loadPositions()
      toast({
        title: t.common.success,
        description: "Lavozim o'chirildi.",
      })
    } catch (error: any) {
      console.error("Failed to delete position:", error)
      toast({
        title: t.common.error,
        description: error?.message || "Lavozimni o'chirishda xatolik yuz berdi.",
        variant: "destructive",
      })
    }
  }

  return (
    <TabsContent value="positions" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5 text-amber-600" />
              {t.settings.positions}
            </span>
            <Button onClick={() => setIsAdding((prev) => !prev)} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Lavozim qo'shish
            </Button>
          </CardTitle>
          <CardDescription>Foydalanuvchi yaratishda ishlatiladigan lavozimlar ro'yxatini boshqaring.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdding && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="position-name">Lavozim nomi</Label>
                  <Input
                    id="position-name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Masalan: Bosh mutaxassis"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position-description">Tavsif</Label>
                  <Input
                    id="position-description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Ixtiyoriy qisqa izoh"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                  Bekor qilish
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Yangilash" : "Saqlash"}
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Yuklanmoqda...
            </div>
          ) : positions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              Hozircha lavozimlar yo'q.
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => (
                <div key={position.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{position.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{position.description || "Tavsif kiritilmagan"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => handleEdit(position)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Tahrirlash
                    </Button>
                    <Button type="button" variant="outline" onClick={() => handleDelete(position.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      O'chirish
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
