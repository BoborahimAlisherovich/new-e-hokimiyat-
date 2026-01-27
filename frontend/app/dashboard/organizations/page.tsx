"use client"

import React from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getOrganizations } from "@/lib/api"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Lock,
  Building,
  Loader2,
} from "lucide-react"
import { useState, useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function OrganizationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getOrganizations()
      .then((orgsList) => {
        if (!mounted) return
        setOrganizations(orgsList || [])
        setError(null)
      })
      .catch((e) => {
        if (!mounted) return
        setError("Организацияларни юклашда хатолик юз берди")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  // Helper to format long organization IDs (e.g., UUID) as first 3 + "..." + last 3 characters
  const formatOrgId = (id: string) => {
    if (!id) return ""
    return id.length > 6 ? `${id.slice(0, 3)}...${id.slice(-3)}` : id
  }


  // Removed unused newUser creation logic and related state.
  // Simplified dialog handling – just close the dialog when cancelled or after creation.
  const resetCreateDialog = () => {
    setIsCreateOpen(false)
  }

  const createUser = () => {
    // Placeholder for real create logic – close dialog for now.
    setIsCreateOpen(false)
  }
    const filteredOrganizations = organizations.filter((org) => {
      const matchesStatus =
        statusFilter === "all" || (org.is_active ? "ACTIVE" : "INACTIVE") === statusFilter
      const matchesType = typeFilter === "all" || org.sector === typeFilter
      const matchesSearch =
        (org.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (org.head || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (org.phone || "").toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesType && matchesSearch
    })

  return (
    <>
      <Header title="Ташкилотлар бошқаруви" description="Тизимдаги барча ташкилотларнинг рўйхати, маълумотлари ва бошқаруви" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-200/15 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-gradient-to-tr from-purple-200/10 to-transparent rounded-full blur-xl" />
          <div className="absolute top-1/3 left-1/2 w-48 h-48 bg-gradient-to-br from-cyan-200/8 to-transparent rounded-full blur-lg" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 py-8">

            {/* Filters and Actions */}
            <section className="animate-slide-up">
              <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center flex-wrap">
                      <div className="relative flex-1 md:max-w-sm">
                        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Ташкилот номи, масъул шахс ёки телефон бўйича қидирув..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-12 h-12 bg-background/50 border-2 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                        />
                      </div>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full md:w-[200px] h-11 bg-background/50 border-2 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                          <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Сектор" />
                        </SelectTrigger>
                        <SelectContent className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl max-h-60 overflow-y-auto">
                          <SelectItem value="all">Барча секторлар</SelectItem>
                          <SelectItem value="IQTISODIYOT_BIZNES">Иқтисодиёт ва бизнес</SelectItem>
                          <SelectItem value="KOMMUNAL_SOHA">Коммунал соҳа</SelectItem>
                          <SelectItem value="SOGLIQNI_SAQLASH">Соғлиқни сақлаш</SelectItem>
                          <SelectItem value="TA_LIM">Таълим</SelectItem>
                          <SelectItem value="MADANIYAT_SPORT">Маданият ва спорт</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[180px] h-11 bg-background/50 border-2 border-border/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300">
                          <SelectValue placeholder="Ҳолат" />
                        </SelectTrigger>
                        <SelectContent className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl max-h-60 overflow-y-auto">
                          <SelectItem value="all">Барча ҳолатлар</SelectItem>
                          <SelectItem value="ACTIVE">Фаол</SelectItem>
                          <SelectItem value="INACTIVE">Нофаол</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Dialog
                      open={isCreateOpen}
                      onOpenChange={(open) => {
                        if (!open) resetCreateDialog()
                        else setIsCreateOpen(true)
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground h-12 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold">
                          <Plus className="mr-2 h-5 w-5" />
                          Янги ташкилот қўшиш
                        </Button>
                      </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Янги ташкилот қўшиш</DialogTitle>
                    <DialogDescription>
                      Ташкилот маълумотларини киритинг
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Ташкилот номи</Label>
                      <Input
                        id="orgName"
                        placeholder="Ташкилот номини киритинг"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgServicePhone">Ташкилот хизмат телефони</Label>
                      <Input
                        id="orgServicePhone"
                        placeholder="+998 XX XXX XX XX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orgAddress">Ташкилот манзили</Label>
                      <Input
                        id="orgAddress"
                        placeholder="Ташкилот манзилини киритинг"
                      />
                    </div>
                      <DialogFooter className="flex justify-end space-x-2">
                        <DialogClose asChild>
                          <Button variant="outline">
                            Бекор қилиш
                          </Button>
                        </DialogClose>
                        <Button>{"Қўшиш"}</Button>
                      </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </section>

            {/* Organizations Table */}
            <section className="animate-slide-up" style={{ animationDelay: "200ms" }}>
              <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-muted/20 transition-colors duration-300 bg-muted/10">
                        <TableHead className="text-foreground font-semibold px-6 py-4">ID</TableHead>
                        <TableHead className="text-foreground font-semibold px-6 py-4">Ташкилот номи</TableHead>
                        <TableHead className="text-foreground font-semibold px-6 py-4">Масъул шахс</TableHead>
                        <TableHead className="text-foreground font-semibold px-6 py-4">Телефон рақам</TableHead>
                        <TableHead className="text-foreground font-semibold px-6 py-4">Ҳолат</TableHead>
                        <TableHead className="text-foreground font-semibold px-6 py-4 w-[70px]">Амаллар</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrganizations.map((org, index) => (
                        <TableRow key={org.id} className="border-border hover:bg-muted/10 transition-colors duration-300 group">
                          <TableCell className="px-6 py-4">
                            <code className="rounded-lg bg-muted/30 px-3 py-2 text-sm font-mono text-muted-foreground border border-border/50">
                              {formatOrgId(org.id)}
                            </code>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                                {org.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {org.sector === "IQTISODIYOT_BIZNES" && "Иқтисодиёт ва бизнес"}
                                {org.sector === "KOMMUNAL_SOHA" && "Коммунал соҳа"}
                                {org.sector === "SOGLIQNI_SAQLASH" && "Соғлиқни сақлаш"}
                                {org.sector === "TA_LIM" && "Таълим"}
                                {org.sector === "MADANIYAT_SPORT" && "Маданият ва спорт"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-sm text-muted-foreground font-medium">
                              {org.head || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <span className="text-sm text-muted-foreground font-medium">
                              {org.phone || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className={`font-normal border-border/50 ${
                                org.is_active
                                  ? "bg-accent/10 text-accent hover:bg-accent/20"
                                  : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                              } transition-colors duration-200`}
                            >
                              {org.is_active ? "Фаол" : "Нофаол"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/20 hover:text-primary transition-all duration-300 rounded-lg">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border border-border/50 shadow-xl rounded-xl">
                                <Link href={`/dashboard/organizations/${org.id}`}>
                                  <DropdownMenuItem className="hover:bg-primary/10 hover:text-primary transition-all duration-300 rounded-lg">
                                    <Eye className="mr-2 h-4 w-4" />
                                    Батафсил кўриш
                                  </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem className="hover:bg-primary/10 hover:text-primary transition-all duration-300 rounded-lg">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Таҳрирлаш
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className={`hover:bg-amber/10 hover:text-amber-600 transition-all duration-300 rounded-lg ${!org.is_active ? 'text-muted-foreground' : ''}`}>
                                  <Lock className="mr-2 h-4 w-4" />
                                  {org.is_active ? "Нофаоллаштириш" : "Фаоллаштириш"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
