import { Card, CardContent } from "@/components/ui/card"
import { Building2, Clock, Target, TrendingUp } from "lucide-react"

interface AnalyticsOverviewProps {
  tasks: any[]
  organizations: any[]
}

export function AnalyticsOverview({ tasks, organizations }: AnalyticsOverviewProps) {
  const completedCount = tasks.filter(
    (task) => task.status === "BAJARILDI" || task.status === "NAZORATDAN_YECHILDI",
  ).length
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0
  const overdueCount = tasks.filter((task) => task.status === "MUDDATI_KECH").length

  return (
    <section className="animate-slide-up">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
                <p className="text-sm text-muted-foreground">Жами топшириқлар</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
                <p className="text-sm text-muted-foreground">Бажарилганлик</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{overdueCount}</p>
                <p className="text-sm text-muted-foreground">Кечиккан топшириқлар</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{organizations.length}</p>
                <p className="text-sm text-muted-foreground">Фаол ташкилотлар</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
