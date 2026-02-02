import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { Appeal } from "@/types"
import { Archive, Eye, MoreHorizontal, MessageSquare } from "lucide-react"
import { useRouter } from "next/navigation"
import { PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "./appeal-constants"

interface AppealTableProps {
  appeals: Appeal[]
  onView: (appeal: Appeal) => void
  onArchive: (appealId: string) => void
}

export function AppealTable({ appeals, onView, onArchive }: AppealTableProps) {
  const router = useRouter()

  const handleRowClick = (appeal: Appeal) => {
    // tg- prefiksini olib tashlash
    const id = appeal.id.startsWith('tg-') ? appeal.id.replace('tg-', '') : appeal.id
    router.push(`/dashboard/appeals/${id}`)
  }

  if (appeals.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4 mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">Murojaatlar topilmadi</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Hozircha bu filtrlar bo'yicha murojaatlar mavjud emas. Filtrlarni o'zgartiring yoki keyinroq qaytib keling.
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
            <TableRow>
              <TableHead>Fuqaro</TableHead>
              <TableHead>Mavzu</TableHead>
              <TableHead>Kategoriya</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead>Muhimlik</TableHead>
              <TableHead>Hudud</TableHead>
              <TableHead>Sana</TableHead>
              <TableHead>Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appeals.map((appeal) => (
              <TableRow 
                key={appeal.id} 
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleRowClick(appeal)}
              >
                <TableCell className="font-medium">{appeal.citizenName}</TableCell>
                <TableCell>
                  <div className="max-w-xs truncate" title={appeal.subject}>
                    {appeal.subject}
                  </div>
                </TableCell>
                <TableCell>{appeal.category}</TableCell>
                <TableCell>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", STATUS_COLORS[appeal.status])}>
                    {STATUS_LABELS[appeal.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("px-2 py-1 text-xs font-medium", PRIORITY_COLORS[appeal.priority])}>
                    {PRIORITY_LABELS[appeal.priority]}
                  </Badge>
                </TableCell>
                <TableCell>{appeal.district}</TableCell>
                <TableCell>{new Date(appeal.createdAt).toLocaleDateString("uz-UZ")}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRowClick(appeal)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Batafsil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onArchive(appeal.id)}>
                        <Archive className="mr-2 h-4 w-4" />
                        Arxivlash
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
