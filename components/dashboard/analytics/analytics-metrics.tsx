import { Card, CardContent } from "@/components/ui/card"
import { Clock, Target, TrendingDown, TrendingUp } from "lucide-react"

export function AnalyticsMetrics() {
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
                    <p className="text-sm text-muted-foreground">Ўртача ижро муддати</p>
                    <p className="text-2xl font-bold text-foreground">4.2 кун</p>
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
                    <p className="text-sm text-muted-foreground">Ижро самарадорлиги</p>
                    <p className="text-2xl font-bold text-foreground">87%</p>
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
                    <p className="text-sm text-muted-foreground">Кечикиш фоизи</p>
                    <p className="text-2xl font-bold text-foreground">8%</p>
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
                    <p className="text-sm text-muted-foreground">Умумий рейтинг</p>
                    <p className="text-2xl font-bold text-foreground">86.8</p>
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
