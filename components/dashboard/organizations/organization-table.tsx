import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Eye, Lock, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { formatOrgId, getSectorLabel } from "./organization-helpers"

interface OrganizationTableProps {
  organizations: any[]
}

export function OrganizationTable({ organizations }: OrganizationTableProps) {
  return (
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
                    <p className="text-sm text-muted-foreground">{getSectorLabel(org.sector)}</p>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <span className="text-sm text-muted-foreground font-medium">{org.head || "—"}</span>
                </TableCell>
                <TableCell className="px-6 py-4">
                  <span className="text-sm text-muted-foreground font-medium">{org.phone || "—"}</span>
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
                      <DropdownMenuItem
                        className={`hover:bg-amber/10 hover:text-amber-600 transition-all duration-300 rounded-lg ${
                          !org.is_active ? "text-muted-foreground" : ""
                        }`}
                      >
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
  )
}
