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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-slate-100 p-5 mb-4">
          <MessageSquare className="h-10 w-10 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Murojaatlar topilmadi</h3>
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
          <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 hover:bg-slate-100 border-b-2 border-slate-200">
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">ID</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">Murojaatchi</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">Mahalla</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">Turi</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">Sana</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm">Holati</TableHead>
            <TableHead className="font-bold text-slate-800 py-4 px-6 text-sm w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appeals.map((appeal, index) => (
            <TableRow 
              key={appeal.id} 
              className="cursor-pointer transition-all duration-200 border-b border-slate-100 hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-cyan-50/50"
              onClick={() => handleRowClick(appeal)}
            >
              <TableCell className="py-4 px-6">
                <code className="rounded-lg bg-gradient-to-r from-teal-100 to-cyan-100 border border-teal-200 px-3 py-1.5 text-sm font-mono font-bold text-teal-700 shadow-sm">
                  {appeal.id}
                </code>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className="text-sm font-semibold text-slate-900">{appeal.citizenName}</span>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className="text-sm text-slate-700 font-medium">{appeal.district || "—"}</span>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className="text-sm text-slate-700 font-medium">{appeal.category || "—"}</span>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className="text-sm text-slate-600 font-medium">
                  {new Date(appeal.createdAt).toLocaleDateString("uz-UZ", {
                    day: "2-digit",
                    month: "2-digit", 
                    year: "numeric"
                  })}
                </span>
              </TableCell>
              <TableCell className="py-4 px-6">
                <span className={cn(
                  "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold min-w-[90px] shadow-sm",
                  appeal.status === "PENDING" && "bg-blue-100 text-blue-700",
                  appeal.status === "IN_PROGRESS" && "bg-emerald-100 text-emerald-700",
                  appeal.status === "RESOLVED" && "bg-teal-100 text-teal-700",
                  appeal.status === "REJECTED" && "bg-rose-100 text-rose-700",
                  (appeal.status === "OVERDUE" || appeal.status === "overdue") && "bg-red-100 text-red-700"
                )}>
                  {STATUS_LABELS[appeal.status] || appeal.status}
                </span>
              </TableCell>
              <TableCell className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100">
                      <MoreHorizontal className="h-4 w-4 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[150px]">
                    <DropdownMenuItem onClick={() => handleRowClick(appeal)} className="cursor-pointer">
                      <Eye className="mr-2 h-4 w-4" />
                      Batafsil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onArchive(appeal.id)} className="cursor-pointer">
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
