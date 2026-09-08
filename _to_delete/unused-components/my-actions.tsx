"use client"

import React from "react"
import { useEffect, useState } from "react"
import { getCurrentUser } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, RefreshCcw, Plus, UserPlus, Building2, FileText } from "lucide-react"

/**
 * Role‑based actions panel showing available actions per role according to technical specification
 * 
 * HOKIM can:
 * - Close tasks (NAZORATDAN_YECHILDI)
 * - Reassign tasks (QAYTA_IJROGA_YUBORILDI)
 * - Remove control
 * - Create tasks
 * - Add users (Hokimlik masul, Tashkilot rahbar, Tashkilot masul)
 * - Create organizations
 * 
 * HOKIMLIK_MASUL can:
 * - Create tasks
 * - Add users (Tashkilot rahbar, Tashkilot masul)
 * - Create organizations
 * 
 * TASHKILOT_RAHBAR can:
 * - Accept tasks (YANGI → IJRODA)
 * - Submit reports (IJRODA → BAJARILDI)
 * - Request deadline extension
 * - Add users (Tashkilot masul only)
 * - Upload reports
 * 
 * TASHKILOT_MASUL can:
 * - Accept tasks (YANGI → IJRODA)
 * - Submit reports (IJRODA → BAJARILDI)
 * - Upload reports
 */
export default function MyActions() {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    getCurrentUser()
      .then((user) => {
        if (mounted) setRole(user.role)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  if (!role) return null

  const renderActions = () => {
    switch (role) {
      case "HOKIM":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="default" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Топшириқ яратиш
            </Button>
            <Button variant="default" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Фойдаланувчи қўшиш
            </Button>
            <Button variant="default" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Ташкилот яратиш
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Назоратдан ечиш
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Қайта ижрога юбориш
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Топшириқни ёпиш
            </Button>
          </div>
        )
      case "HOKIMLIK_MASUL":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="default" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Топшириқ яратиш
            </Button>
            <Button variant="default" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Фойдаланувчи қўшиш
            </Button>
            <Button variant="default" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Ташкилот яратиш
            </Button>
          </div>
        )
      case "TASHKILOT_RAHBARI":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="default" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Ижрога олиш
            </Button>
            <Button variant="default" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Ҳисобот топшириш
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Муддат узайтириш сўрови
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Масъул қўшиш
            </Button>
          </div>
        )
      case "TASHKILOT_MASUL":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button variant="default" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Ижрога олиш
            </Button>
            <Button variant="default" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Ҳисобот топшириш
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Ҳужжат юклаш
            </Button>
          </div>
        )
      default:
        return <p className="text-muted-foreground text-center py-4">Бу рол учун амаллар мавжуд эмас</p>
    }
  }

  return (
    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Менга рухсат этилган амаллар</CardTitle>
      </CardHeader>
      <CardContent>
        {renderActions()}
      </CardContent>
    </Card>
  )
}
