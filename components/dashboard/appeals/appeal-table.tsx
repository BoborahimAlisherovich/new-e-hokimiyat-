import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
    const id = appeal.id.startsWith('tg-') ? appeal.id.replace('tg-', '') : appeal.id
    router.push(`/dashboard/appeals/${id}`)
  }

  if (appeals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-slate-100 p-4 mb-4">
          <MessageSquare className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-700 mb-1">Murojaatlar topilmadi</h3>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Hozircha bu filtrlar bo'yicha murojaatlar mavjud emas.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead className="font-semibold text-slate-700 py-3">Fuqaro</TableHead>
            <TableHead className="font-semibold text-slate-700 py-3">Mavzu</TableHead>
            <TableHead className="font-semibold text-slate-700 py-3">Kategoriya</TableHead>
            <TableHead className="font-semibold text-slate-700 py-3">Holat</TableHead>
            <TableHead className="font-semibold text-slate-700 py-3">Muhimlik</TableHead>
            <TableHead className="font-semibold text-slate-700 py-3">Hudud</TableHead>
            <TableHead className="font-semibold text-slate-700 py-3">Sana</TableHead>
            <TableHead className="font-semibold text-slate-700 py-3 w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appeals.map((appeal, index) => (
            <TableRow 
              key={appeal.id} 
              className={cn(
                "cursor-pointer transition-colors border-b border-slate-100",
                index % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                "hover:bg-blue-50/50"
              )}
              onClick={() => handleRowClick(appeal)}
            >
              <TableCell className="py-3">
                <span className="font-medium text-slate-800">{appeal.citizenName}</span>
              </TableCell>
              <TableCell className="py-3">
                <div className="max-w-[200px] truncate text-sm text-slate-600" title={appeal.subject}>
                  {appeal.subject}
                </div>
              </TableCell>
              <TableCell className="py-3">
                <span className="text-sm text-slate-600">{appeal.category}</span>
              </TableCell>
              <TableCell className="py-3">
                <Badge 
                  variant="outline"
                  className={cn("text-xs font-medium border", STATUS_COLORS[appeal.status])}
                >
                  {STATUS_LABELS[appeal.status]}
                </Badge>
              </TableCell>
              <TableCell className="py-3">
                <Badge 
                  variant="outline"
                  className={cn("text-xs font-medium border", PRIORITY_COLORS[appeal.priority])}
                >
                  {PRIORITY_LABELS[appeal.priority]}
                </Badge>
              </TableCell>
              <TableCell className="py-3">
                <span className="text-sm text-slate-600">{appeal.district}</span>
              </TableCell>
              <TableCell className="py-3">
                <span className="text-sm text-slate-500">
                  {new Date(appeal.createdAt).toLocaleDateString("uz-UZ")}
                </span>
              </TableCell>
              <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
    </div>
  )
}
