import { useCallback, useEffect, useMemo, useState } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { getAppealCategoriesAdmin, getOrganizations, updateAppealCategory } from "@/lib/api"
import { Building2, Loader2, Route, Save, Search } from "lucide-react"

type Translation = {
  settings: {
    appealsRouting: string
    appealsRoutingDesc: string
  }
  common: {
    loading: string
    saving: string
    save: string
    cancel: string
    search: string
    success: string
    error: string
  }
}

interface OrgItem {
  id: string
  name: string
  short_name?: string | null
}

interface CategoryItem {
  id: number
  name_uz: string
  code?: string
  icon?: string
  is_active?: boolean
  order?: number
  responsible_organizations: string[]
  responsible_organizations_detail?: OrgItem[]
}

export function SettingsAppealsRoutingTab({ t }: { t: Translation }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [organizations, setOrganizations] = useState<OrgItem[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([])
  const [orgSearch, setOrgSearch] = useState("")

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [cats, orgs] = await Promise.all([getAppealCategoriesAdmin(), getOrganizations()])
      const normalizedOrgs: OrgItem[] = (Array.isArray(orgs) ? orgs : (orgs as any)?.results || []).map((o: any) => ({
        id: String(o.id),
        name: String(o.name || ""),
        short_name: o.short_name ?? null,
      }))
      setOrganizations(normalizedOrgs)
      setCategories(
        (cats as any[]).map((c) => ({
          id: Number(c.id),
          name_uz: String(c.name_uz || ""),
          code: c.code || undefined,
          icon: c.icon || undefined,
          is_active: c.is_active ?? true,
          order: c.order ?? 0,
          responsible_organizations: Array.isArray(c.responsible_organizations)
            ? c.responsible_organizations.map((v: any) => String(v))
            : [],
          responsible_organizations_detail: Array.isArray(c.responsible_organizations_detail)
            ? c.responsible_organizations_detail.map((o: any) => ({
                id: String(o.id),
                name: String(o.name || ""),
                short_name: o.short_name ?? null,
              }))
            : undefined,
        }))
      )
    } catch (error) {
      console.error("Failed to load appeal routing settings:", error)
      setCategories([])
      setOrganizations([])
      toast({
        title: t.common.error,
        description: "Ma'lumotlarni yuklashda xatolik.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast, t.common.error])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openEdit = (category: CategoryItem) => {
    setEditingCategory(category)
    setSelectedOrgIds(category.responsible_organizations || [])
    setOrgSearch("")
    setDialogOpen(true)
  }

  const toggleOrg = (orgId: string) => {
    setSelectedOrgIds((prev) => (prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]))
  }

  const filteredOrgs = useMemo(() => {
    const q = orgSearch.trim().toLowerCase()
    if (!q) return organizations
    return organizations.filter((o) => (o.name || "").toLowerCase().includes(q) || (o.short_name || "").toLowerCase().includes(q))
  }, [organizations, orgSearch])

  const saveCategory = async () => {
    if (!editingCategory) return
    if (saving) return
    try {
      setSaving(true)
      const updated = await updateAppealCategory(editingCategory.id, {
        responsible_organizations: selectedOrgIds,
      })
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id
            ? {
                ...c,
                responsible_organizations: updated.responsible_organizations || [],
                responsible_organizations_detail: updated.responsible_organizations_detail as any,
              }
            : c
        )
      )
      setDialogOpen(false)
      toast({ title: t.common.success, description: "Saqlab qo'yildi." })
    } catch (error) {
      console.error("Failed to update appeal category mapping:", error)
      toast({
        title: t.common.error,
        description: "Saqlashda xatolik.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [categories])

  return (
    <TabsContent value="appeals_routing" className="space-y-6">
      <Card className="rounded-[28px] border border-white/70 bg-white/80 shadow-[0_24px_60px_-40px_rgba(14,165,233,0.35)] backdrop-blur-xl">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              {t.settings.appealsRouting}
            </CardTitle>
            <CardDescription>{t.settings.appealsRoutingDesc}</CardDescription>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading} className="rounded-2xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yangilash"}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.common.loading}
            </div>
          ) : sortedCategories.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Sohalar topilmadi.</div>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map((category) => {
                const orgs = category.responsible_organizations_detail || []
                const count = category.responsible_organizations?.length || 0
                return (
                  <div
                    key={category.id}
                    className="rounded-[22px] border border-border bg-white/80 px-4 py-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg">{category.icon || "📌"}</span>
                          <p className="truncate text-sm font-semibold text-foreground">{category.name_uz}</p>
                          {category.code && (
                            <Badge variant="outline" className="rounded-full">
                              {category.code}
                            </Badge>
                          )}
                          {category.is_active === false && (
                            <Badge variant="secondary" className="rounded-full">
                              passiv
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {count === 0 ? (
                            <span className="text-xs text-muted-foreground">Mas'ul tashkilot belgilanmagan</span>
                          ) : (
                            orgs.slice(0, 6).map((org) => (
                              <Badge key={org.id} className="rounded-full bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft">
                                <Building2 className="mr-1 h-3 w-3" />
                                {org.short_name ? `${org.short_name}` : org.name}
                              </Badge>
                            ))
                          )}
                          {count > 6 && (
                            <Badge variant="outline" className="rounded-full">
                              +{count - 6}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button onClick={() => openEdit(category)} className="rounded-2xl">
                        Tahrirlash
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl overflow-hidden border-white/70 bg-white/88 shadow-[0_26px_70px_-36px_rgba(14,165,233,0.32)] backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle>Mas'ul tashkilotlarni belgilash</DialogTitle>
            <DialogDescription>
              {editingCategory?.name_uz ? `${editingCategory.name_uz} sohasiga` : "Tanlangan sohaga"} mas'ul tashkilotlarni tanlang.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                placeholder={`${t.common.search}...`}
                className="h-11 rounded-2xl border-border bg-white pl-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => setSelectedOrgIds(organizations.map((o) => o.id))}
              disabled={organizations.length === 0}
            >
              Hammasi
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-2xl"
              onClick={() => setSelectedOrgIds([])}
              disabled={selectedOrgIds.length === 0}
            >
              Tozalash
            </Button>
          </div>

          <ScrollArea className="h-[360px] rounded-2xl border border-border bg-white/70 p-3">
            <div className="space-y-2">
              {filteredOrgs.map((org) => {
                const selected = selectedOrgIds.includes(org.id)
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => toggleOrg(org.id)}
                    className={[
                      "w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                      selected ? "border-border bg-primary-soft text-primary-soft-foreground" : "border-border bg-white hover:bg-background",
                    ].join(" ")}
                  >
                    <span className="font-medium">{org.short_name ? `${org.name} (${org.short_name})` : org.name}</span>
                  </button>
                )
              })}
              {filteredOrgs.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">Topilmadi</div>}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-2xl">
              {t.common.cancel}
            </Button>
            <Button onClick={saveCategory} disabled={saving} className="rounded-2xl bg-primary hover:bg-primary">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t.common.save}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  )
}
