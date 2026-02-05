import { Card, CardContent } from "@/components/ui/card"
import { Archive, Calendar, MessageSquare, Search } from "lucide-react"
import { Stats } from "@/types"

interface AppealStatsProps {
  stats: Stats
}

export function AppealStats({ stats }: AppealStatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Jami murojaatlar</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Kutilmoqda</p>
              <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bajarilmoqda</p>
              <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
            </div>
            <Search className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hal etilgan</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <Archive className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
