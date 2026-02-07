import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Eye, Lock, MoreHorizontal, Building2, Trash2, Unlock } from "lucide-react"
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-slate-100 p-4 mb-4">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-1">Tashkilotlar topilmadi</h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            Hozircha bu filtrlar bo'yicha tashkilotlar mavjud emas. Yangi tashkilot qo'shing yoki filtrlarni o'zgartiring.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b border-slate-200">
              <TableHead className="font-semibold text-slate-700 py-3.5 px-4">ID</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5 px-4">Tashkilot nomi</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5 px-4">Rahbar</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5 px-4">Telefon</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5 px-4">Holat</TableHead>
              <TableHead className="font-semibold text-slate-700 py-3.5 px-4 w-[70px]">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => (
              <TableRow key={org.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                <TableCell className="py-3 px-4">
                  <code className="rounded-md bg-slate-100 px-2 py-1 text-sm font-mono text-slate-600">
                    {formatOrgId(String(org.id))}
                  </code>
                </TableCell>
                <TableCell className="py-3 px-4">
                  <div>
                    <p className="font-medium text-slate-800">
                      {org.name}
                    </p>
                    {org.sector_name && (
                      <p className="text-sm text-slate-500">{org.sector_name}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3 px-4">
                  <span className="text-sm text-slate-600">
                    {org.director_name || org.head || getResponsibleUser(org, users) || "—"}
                  </span>
                </TableCell>
                <TableCell className="py-3 px-4">
                  <span className="text-sm text-slate-600">{org.phone || "—"}</span>
                </TableCell>
                <TableCell className="py-3 px-4">
                  <Badge
                    variant="outline"
                    className={`font-medium text-xs border ${
                      org.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-slate-50 text-slate-600 border-slate-300"
                    }`}
                  >
                    {org.is_active ? "Faol" : "Nofaol"}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 px-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/dashboard/organizations/${org.id}`}>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Batafsil ko'rish
                        </DropdownMenuItem>
                      </Link>
                      <Link href={`/dashboard/organizations/${org.id}`}>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Tahrirlash
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onToggleStatus?.(org.id, org.is_active)}
                      >
                        {org.is_active ? (
                          <><Lock className="mr-2 h-4 w-4" /> Nofaollashtirish</>
                        ) : (
                          <><Unlock className="mr-2 h-4 w-4" /> Faollashtirish</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(org.id)}
                        className="text-red-600"
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
