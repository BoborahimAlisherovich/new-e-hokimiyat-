import { Card, CardContent } from "@/components/ui/card"
import { Clock, Target, TrendingDown, TrendingUp } from "lucide-react"
import { useMemo } from "react"

interface AnalyticsMetricsProps {
  tasks: any[]
}

export function AnalyticsMetrics({ tasks }: AnalyticsMetricsProps) {
  const metrics = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'BAJARILDI' || t.status === 'NAZORATDAN_YECHILDI')
    const overdue = tasks.filter(t => t.status === 'MUDDATI_KECH')
    
    // O'rtacha ijro muddati hisoblash
    let avgDays = 0
    if (completed.length > 0) {
      const totalDays = completed.reduce((sum, t) => {
        if (t.closed_at && t.created_at) {
          const diff = new Date(t.closed_at).getTime() - new Date(t.created_at).getTime()
          return sum + Math.ceil(diff / (1000 * 60 * 60 * 24))
        }
        return sum
      }, 0)
      avgDays = Math.round((totalDays / completed.length) * 10) / 10
    }
    
    const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0
    const overdueRate = tasks.length > 0 ? Math.round((overdue.length / tasks.length) * 100) : 0
    const rating = Math.max(0, completionRate - overdueRate * 0.5)
    
    return {
      avgDays,
      completionRate,
      overdueRate,
      rating: Math.round(rating * 10) / 10
    }
  }, [tasks])

  const hasTasks = tasks.length > 0
  const hasCompleted = tasks.some((t) => t.status === 'BAJARILDI' || t.status === 'NAZORATDAN_YECHILDI')

  return (
    <section className="animate-slide-up" style={{ animationDelay: "400ms" }}>
      <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl">
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">O'rtacha ijro muddati</p>
                    <p className="text-2xl font-bold text-foreground">{hasCompleted ? `${metrics.avgDays} kun` : "-"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hasCompleted ? "Yopilgan topshiriqlar asosida hisoblandi" : "Hali bajarilgan topshiriqlar mavjud emas"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ijro samaradorligi</p>
                    <p className="text-2xl font-bold text-foreground">{hasTasks ? `${metrics.completionRate}%` : "-"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hasTasks ? "Jami topshiriqlarga nisbatan" : "Samaradorlikni hisoblash uchun topshiriq yo'q"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kechikish foizi</p>
                    <p className="text-2xl font-bold text-foreground">{hasTasks ? `${metrics.overdueRate}%` : "-"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hasTasks ? "Muddati kechgan topshiriqlar ulushi" : "Kechikish foizini hisoblash uchun topshiriq yo'q"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-xl border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Umumiy reyting</p>
                    <p className="text-2xl font-bold text-foreground">{hasTasks ? metrics.rating : "-"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {hasTasks ? "Bajarilish va kechikish ko'rsatkichlari asosida" : "Reytingni hisoblash uchun statistik ma'lumot yo'q"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
