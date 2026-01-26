"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { createTask } from "@/lib/api"

type CreateTaskDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizations: any[]
  onCreated: () => void | Promise<void>
}

type CreateFormState = {
  title: string
  description: string
  priority: string
  category: string
  due_date: string
  organization_id: string
}

// Kategoriyalar to'g'ridan-to'g'ri backend'ga yuboriladi
const CATEGORIES = ["Ижтимоий", "Иқтисодий", "Ҳуқуқий", "Бошқа"] as const

export function CreateTaskDialog({ open, onOpenChange, organizations, onCreated }: CreateTaskDialogProps) {
  const [form, setForm] = useState<CreateFormState>({
    title: "",
    description: "",
    priority: "PAST",
    category: "",
    due_date: "",
    organization_id: "",
  })
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [orgOpen, setOrgOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm({
        title: "",
        description: "",
        priority: "PAST",
        category: "",
        due_date: "",
        organization_id: "",
      })
      setFiles([])
      setErrors({})
      setOrgOpen(false)
    }
  }, [open])

  const isSubmitDisabled = useMemo(() => {
    return (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.priority ||
      !form.category ||
      !form.organization_id ||
      !form.due_date
    )
  }, [form])

  const setField = (field: keyof CreateFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Priority to days mapping
  const priorityDaysMap: Record<string, number> = {
    'FAVQULODDA': 1,  // Muhim va shoshilinch - 1 kun
    'YUQORI': 3,      // Muhim, lekin shoshilinch emas - 3 kun
    'ODDIY': 5,       // Shoshilinch, lekin muhim emas - 5 kun
    'PAST': 7,        // Muhim emas va shoshilinch emas - 7 kun
  }

  const handlePriorityChange = (priority: string) => {
    setField("priority", priority)
    
    // Avtomatik muddat hisoblash
    const days = priorityDaysMap[priority]
    if (days) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + days)
      const formattedDate = dueDate.toISOString().split('T')[0]
      setField("due_date", formattedDate)
    }
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.title.trim()) next.title = "Топшириқ номи мажбурий"
    if (!form.description.trim()) next.description = "Тафсилотлар мажбурий"
    if (!form.priority) next.priority = "Муҳимлик даражасини танланг"
    if (!form.category) next.category = "Соҳани танланг"
    if (!form.organization_id) next.organization_id = "Ташкилотни танланг"
    if (!form.due_date) next.due_date = "Муддатни танланг"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      const payload = new FormData()
      payload.append("title", form.title)
      payload.append("description", form.description)
      payload.append("priority", form.priority)
      payload.append("category", form.category)
      if (form.due_date) payload.append("deadline", new Date(form.due_date).toISOString())
      if (form.organization_id) payload.append("organizations", form.organization_id)
      files.forEach((file) => payload.append("attachments", file))

      console.log("Creating task with payload:", {
        title: form.title,
        description: form.description,
        priority: form.priority,
        category: form.category,
        deadline: form.due_date ? new Date(form.due_date).toISOString() : null,
        organizations: form.organization_id,
      })

      await createTask(payload)
      onOpenChange(false)
      await onCreated()
    } catch (error: any) {
      console.error("Task creation error:", error)
      console.error("Error data:", error.data)
      alert(`Xatolik: ${JSON.stringify(error.data || error.message)}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[700px] max-h-[85vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>Янги топшириқ қўшиш</DialogTitle>
          <DialogDescription>
            Тизимга янги топшириқ қўшиш учун маълумотларни киритинг
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Топшириқ номи <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Топшириқ номини киритинг"
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Тафсилотлар <span className="text-destructive">*</span></Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Топшириқ ҳақида тўлиқ маълумотларни киритинг"
              rows={4}
              aria-invalid={!!errors.description}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priority">Муҳимлик даражаси <span className="text-destructive">*</span></Label>
              <Select value={form.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger aria-invalid={!!errors.priority}>
                  <SelectValue placeholder="Муҳимлик даражасини танланг" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="FAVQULODDA">Муҳим ва шошилинч (1 кун)</SelectItem>
                  <SelectItem value="YUQORI">Муҳим, лекин шошилинч эмас (3 кун)</SelectItem>
                  <SelectItem value="ODDIY">Шошилинч, лекин муҳим эмас (5 кун)</SelectItem>
                  <SelectItem value="PAST">Муҳим эмас ва шошилинч эмас (7 кун)</SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && <p className="text-xs text-destructive">{errors.priority}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Соҳа <span className="text-destructive">*</span></Label>
              <Select value={form.category} onValueChange={(value) => setField("category", value)}>
                <SelectTrigger aria-invalid={!!errors.category}>
                  <SelectValue placeholder="Соҳани танланг" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="Ижтимоий">Ижтимоий</SelectItem>
                  <SelectItem value="Иқтисодий">Иқтисодий</SelectItem>
                  <SelectItem value="Ҳуқуқий">Ҳуқуқий</SelectItem>
                  <SelectItem value="Бошқа">Бошқа</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label>Ташкилот <span className="text-destructive">*</span></Label>
              <Popover open={orgOpen} onOpenChange={setOrgOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("w-full justify-between", errors.organization_id && "border-destructive")}
                  >
                    {form.organization_id
                      ? organizations.find((org) => String(org.id) === String(form.organization_id))?.name
                      : "Ташкилотни танланг"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Қидириш..." />
                    <CommandList>
                      <CommandEmpty>Топилмади</CommandEmpty>
                      <CommandGroup>
                        {organizations.map((org) => (
                          <CommandItem
                            key={org.id}
                            value={org.name}
                            onSelect={() => {
                              setField("organization_id", String(org.id))
                              setOrgOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                String(org.id) === String(form.organization_id)
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {org.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.organization_id && <p className="text-xs text-destructive">{errors.organization_id}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Муддат <span className="text-destructive">*</span></Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) => setField("due_date", e.target.value)}
                aria-invalid={!!errors.due_date}
              />
              {errors.due_date && <p className="text-xs text-destructive">{errors.due_date}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">Файллар (расм/видео/ҳужжат)</Label>
            <Input
              id="attachments"
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            {files.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {files.map((file) => file.name).join(", ")}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Бекор қилиш
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              Қўшиш
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
