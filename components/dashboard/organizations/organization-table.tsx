import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Tashkilotlar topilmadi</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Hozircha bu filtrlar bo'yicha tashkilotlar mavjud emas. Yangi tashkilot qo'shing yoki filtrlarni o'zgartiring.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-muted/20 transition-colors duration-300 bg-muted/10">
              <TableHead className="text-foreground font-semibold px-6 py-4">ID</TableHead>
              <TableHead className="text-foreground font-semibold px-6 py-4">Tashkilot nomi</TableHead>
              <TableHead className="text-foreground font-semibold px-6 py-4">Rahbar</TableHead>
              <TableHead className="text-foreground font-semibold px-6 py-4">Telefon</TableHead>
              <TableHead className="text-foreground font-semibold px-6 py-4">Holat</TableHead>
              <TableHead className="text-foreground font-semibold px-6 py-4 w-[70px]">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => (
              <TableRow key={org.id} className="border-border hover:bg-muted/10 transition-colors duration-300 group">
                <TableCell className="px-6 py-4">
                  <code className="rounded-lg bg-muted/30 px-3 py-2 text-sm font-mono text-muted-foreground border border-border/50">
                    {formatOrgId(String(org.id))}
                  </code>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                      {org.name}
                    </p>
                    {org.sector_name && (
                      <p className="text-sm text-muted-foreground">{org.sector_name}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <span className="text-sm text-muted-foreground font-medium">
                    {org.director_name || org.head || getResponsibleUser(org, users) || "—"}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <span className="text-sm text-muted-foreground font-medium">{org.phone || "—"}</span>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge
                    variant="outline"
                    className={`font-normal border-border/50 ${
                      org.is_active
                        ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                        : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                    } transition-colors duration-200`}
                  >
                    {org.is_active ? "Faol" : "Nofaol"}
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
                          Batafsil ko'rish
                        </DropdownMenuItem>
                      </Link>
                      <Link href={`/dashboard/organizations/${org.id}`}>
                        <DropdownMenuItem className="hover:bg-primary/10 hover:text-primary transition-all duration-300 rounded-lg">
                          <Edit className="mr-2 h-4 w-4" />
                          Tahrirlash
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onToggleStatus?.(org.id, org.is_active)}
                        className="hover:bg-amber-500/10 hover:text-amber-600 transition-all duration-300 rounded-lg"
                      >
                        {org.is_active ? (
                          <><Lock className="mr-2 h-4 w-4" /> Nofaollashtirish</>
                        ) : (
                          <><Unlock className="mr-2 h-4 w-4" /> Faollashtirish</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(org.id)}
                        className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300 rounded-lg"
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
      </CardContent>
    </Card>
  )
}
