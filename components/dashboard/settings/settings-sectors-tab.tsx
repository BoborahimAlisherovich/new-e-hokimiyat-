"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TabsContent } from "@/components/ui/tabs"
import { Plus, Trash2, Edit } from "lucide-react"
import { useI18n, useTranslation } from "@/lib/i18n/context"
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
  const { language } = useI18n()
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

  const tr = {
    uz: {
      loadError: "Sohalarni yuklashda xatolik yuz berdi",
      updated: "Soha yangilandi",
      added: "Soha qo'shildi",
      saveError: "Sohani saqlashda xatolik yuz berdi",
      deleteConfirm: "Ushbu sohani o'chirmoqchimisiz?",
      deleted: "Soha o'chirildi",
      deleteError: "Sohani o'chirishda xatolik yuz berdi",
      defaultsUpdated: "Standart sohalar yangilandi",
      defaultsError: "Standart sohalarni qo'shishda xatolik yuz berdi",
      title: "Sohalar boshqaruvi",
      addDefaults: "Standart sohalarni qo'shish",
      addSector: "Soha qo'shish",
      desc: "Tizimda mavjud sohalarni boshqarish",
      name: "Nomi",
      namePlaceholder: "Soha nomi",
      description: "Tavsif (ixtiyoriy)",
      descriptionPlaceholder: "Sohaga qisqa tavsif",
      saving: "Saqlanmoqda...",
      update: "Yangilash",
      add: "Qo'shish",
      cancel: "Bekor qilish",
      loading: "Yuklanmoqda...",
      empty: "Hozircha sohalar yo'q. Birinchi sohani qo'shing.",
    },
    "uz-cyrl": {
      loadError: "Соҳаларни юклашда хатолик юз берди",
      updated: "Соҳа янгиланди",
      added: "Соҳа қўшилди",
      saveError: "Соҳани сақлашда хатолик юз берди",
      deleteConfirm: "Ушбу соҳани ўчирмоқчимисиз?",
      deleted: "Соҳа ўчирилди",
      deleteError: "Соҳани ўчиришда хатолик юз берди",
      defaultsUpdated: "Стандарт соҳалар янгиланди",
      defaultsError: "Стандарт соҳаларни қўшишда хатолик юз берди",
      title: "Соҳалар бошқаруви",
      addDefaults: "Стандарт соҳаларни қўшиш",
      addSector: "Соҳа қўшиш",
      desc: "Тизимда мавжуд соҳаларни бошқариш",
      name: "Номи",
      namePlaceholder: "Соҳа номи",
      description: "Тавсиф (ихтиёрий)",
      descriptionPlaceholder: "Соҳага қисқа тавсиф",
      saving: "Сақланмоқда...",
      update: "Янгилаш",
      add: "Қўшиш",
      cancel: "Бекор қилиш",
      loading: "Юкланмоқда...",
      empty: "Ҳозирча соҳалар йўқ. Биринчи соҳани қўшинг.",
    },
    ru: {
      loadError: "Ошибка при загрузке сфер",
      updated: "Сфера обновлена",
      added: "Сфера добавлена",
      saveError: "Ошибка при сохранении сферы",
      deleteConfirm: "Удалить эту сферу?",
      deleted: "Сфера удалена",
      deleteError: "Ошибка при удалении сферы",
      defaultsUpdated: "Стандартные сферы обновлены",
      defaultsError: "Ошибка при добавлении стандартных сфер",
      title: "Управление сферами",
      addDefaults: "Добавить стандартные сферы",
      addSector: "Добавить сферу",
      desc: "Управление существующими сферами системы",
      name: "Название",
      namePlaceholder: "Название сферы",
      description: "Описание (необязательно)",
      descriptionPlaceholder: "Краткое описание сферы",
      saving: "Сохранение...",
      update: "Обновить",
      add: "Добавить",
      cancel: "Отмена",
      loading: "Загрузка...",
      empty: "Пока нет сфер. Добавьте первую сферу.",
    },
    en: {
      loadError: "Failed to load sectors",
      updated: "Sector updated",
      added: "Sector added",
      saveError: "Failed to save sector",
      deleteConfirm: "Delete this sector?",
      deleted: "Sector deleted",
      deleteError: "Failed to delete sector",
      defaultsUpdated: "Default sectors updated",
      defaultsError: "Failed to add default sectors",
      title: "Sector management",
      addDefaults: "Add default sectors",
      addSector: "Add sector",
      desc: "Manage existing sectors in the system",
      name: "Name",
      namePlaceholder: "Sector name",
      description: "Description (optional)",
      descriptionPlaceholder: "Short description for the sector",
      saving: "Saving...",
      update: "Update",
      add: "Add",
      cancel: "Cancel",
      loading: "Loading...",
      empty: "No sectors yet. Add the first sector.",
    },
  }[language || "uz"]

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
        description: tr.loadError,
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
        description: editingId ? tr.updated : tr.added,
      })
    } catch (error) {
      console.error("Error saving sector:", error)
      toast({
        title: t.common.error,
        description: tr.saveError,
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
    if (!confirm(tr.deleteConfirm)) return
    try {
      await api.delete(`/organizations/sectors/${id}/`)
      await loadSectors()
      toast({
        title: t.common.success,
        description: tr.deleted,
      })
    } catch (error) {
      console.error("Error deleting sector:", error)
      toast({
        title: t.common.error,
        description: tr.deleteError,
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
        description: tr.defaultsUpdated,
      })
    } catch (error) {
      console.error("Error adding default sectors:", error)
      toast({
        title: t.common.error,
        description: tr.defaultsError,
        variant: "destructive",
      })
    }
  }

  return (
    <TabsContent value="sectors" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{tr.title}</span>
            {!isAdding && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleAddDefaults} variant="outline" size="sm">
                  {tr.addDefaults}
                </Button>
                <Button onClick={() => setIsAdding(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {tr.addSector}
                </Button>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            {tr.desc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdding && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-indigo-50/30">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{tr.name}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={tr.namePlaceholder}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{tr.description}</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={tr.descriptionPlaceholder}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? tr.saving : editingId ? tr.update : tr.add}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                  {tr.cancel}
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-slate-500">{tr.loading}</div>
          ) : sectors.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {tr.empty}
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
