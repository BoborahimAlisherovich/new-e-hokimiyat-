import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Eye, Lock, MoreHorizontal, Building2, Trash2, Unlock, ChevronRight } from "lucide-react"
import Link from "next/link"
import { formatOrgId } from "./organization-helpers"

interface OrganizationTableProps {
  organizations: any[]
  users?: any[]
  onDelete?: (id: number) => void
  onToggleStatus?: (id: number, currentStatus: boolean) => void
}

const getResponsibleUser = (org: any, users: any[]) => {
  // Find TASHKILOT_RAHBARI or TASHKILOT_MASUL assigned to this organization
  const responsibleUser = users.find(u => 
    (u.organization === org.id || u.organization_id === org.id) && 
    (u.role === 'TASHKILOT_RAHBARI' || u.role === 'TASHKILOT_MASUL')
  )
  if (responsibleUser) {
    return responsibleUser.full_name || `${responsibleUser.first_name || ''} ${responsibleUser.last_name || ''}`.trim() || responsibleUser.username
  }
  return null
}

export function OrganizationTable({ organizations, users = [], onDelete, onToggleStatus }: OrganizationTableProps) {
  if (organizations.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-white/50 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] ring-1 ring-indigo-50/30 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="rounded-2xl bg-gradient-to-br from-violet-100 to-purple-200 p-5 mb-5 shadow-inner">
            <Building2 className="h-10 w-10 text-violet-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Tashkilotlar topilmadi</h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            Hozircha bu filtrlar bo'yicha tashkilotlar mavjud emas. Yangi tashkilot qo'shing yoki filtrlarni o'zgartiring.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-white/50 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] ring-1 ring-indigo-50/30 overflow-hidden">
      {/* Table header with gradient */}
      <div className="bg-gradient-to-r from-slate-50 via-violet-50/30 to-purple-50/30 px-4 py-3 border-b border-indigo-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-violet-600" />
          <span className="font-medium text-slate-800">Tashkilotlar ro'yxati</span>
        </div>
        <span className="text-sm text-slate-500">{organizations.length} ta tashkilot</span>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-indigo-50/60 to-indigo-50/30 border-b-2 border-indigo-100/40">
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm">ID</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm">Tashkilot nomi</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm">Rahbar</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm">Telefon</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm">Holat</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-4 text-sm w-[70px]">Amallar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org, index) => (
            <TableRow 
              key={org.id} 
              className="border-b border-indigo-50/60/80 hover:bg-gradient-to-r hover:from-violet-50/50 hover:to-purple-50/50 transition-all duration-200 group"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <TableCell className="py-4 px-4">
                <code className="rounded-lg bg-gradient-to-r from-violet-100 to-purple-100 border border-violet-200 px-3 py-1.5 text-sm font-mono font-bold text-violet-700 shadow-sm">
                  {formatOrgId(String(org.id))}
                </code>
              </TableCell>
              <TableCell className="py-4 px-4">
                <div>
                  <p className="font-semibold text-slate-900 text-base">
                    {org.name}
                  </p>
                  {org.sector_name && (
                    <p className="text-sm text-slate-500 mt-0.5 font-medium">{org.sector_name}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-4 px-4">
                <span className="text-sm text-slate-700 font-medium">
                  {org.director_name || org.head || getResponsibleUser(org, users) || "—"}
                </span>
              </TableCell>
              <TableCell className="py-4 px-4">
                <span className="text-sm text-slate-700 font-medium">{org.phone || "—"}</span>
              </TableCell>
              <TableCell className="py-3.5 px-4">
                <Badge
                  variant="outline"
                  className={`font-medium text-xs border rounded-lg ${
                    org.is_active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-indigo-50/30 text-slate-600 border-indigo-100/40"
                  }`}
                >
                  {org.is_active ? "Faol" : "Nofaol"}
                </Badge>
              </TableCell>
              <TableCell className="py-3.5 px-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-violet-50 group-hover:bg-violet-100/50 transition-colors">
                      <MoreHorizontal className="h-4 w-4 text-slate-500 group-hover:text-violet-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <Link href={`/dashboard/organizations/${org.id}`}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Eye className="mr-2 h-4 w-4 text-slate-500" />
                        Batafsil ko'rish
                      </DropdownMenuItem>
                    </Link>
                    <Link href={`/dashboard/organizations/${org.id}`}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Edit className="mr-2 h-4 w-4 text-slate-500" />
                        Tahrirlash
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onToggleStatus?.(org.id, org.is_active)}
                      className="cursor-pointer"
                    >
                      {org.is_active ? (
                        <><Lock className="mr-2 h-4 w-4 text-amber-500" /> Nofaollashtirish</>
                      ) : (
                        <><Unlock className="mr-2 h-4 w-4 text-emerald-500" /> Faollashtirish</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(org.id)}
                      className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      O'chirish
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
