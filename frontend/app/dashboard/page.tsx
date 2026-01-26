// @ts-nocheck
import { Header } from "@/components/layout/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentTasks } from "@/components/dashboard/recent-tasks"
import { OrganizationRatings } from "@/components/dashboard/organization-ratings"
import { ActivityChart } from "@/components/dashboard/activity-chart"
import { SectorOverview } from "@/components/dashboard/sector-overview"

export default function DashboardPage() {
  return (
    <>
      <Header title="Бош саҳифа" description="Туман ҳокимлиги топшириқлар бошқарув тизими" />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12 py-8">

            {/* Welcome Section */}
            <section className="animate-slide-up">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 p-8 border border-emerald-100/50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-2xl">🏛️</span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-900 to-blue-900 bg-clip-text text-transparent">
                      Хуш келибсиз!
                    </h1>
                    <p className="text-lg text-emerald-700 font-medium">Тизим статистикаси ва кўрсаткичлари</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span>Барча маълумотлар жонли янгиланиб турилади</span>
                </div>
              </div>
            </section>

            {/* Stats Cards Section */}
            <section className="animate-slide-up">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">📊</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Асосий статистика</h2>
                  <p className="text-muted-foreground">Тизимнинг умумий кўрсаткичлари ва метрикалари</p>
                </div>
              </div>
              <StatsCards />
            </section>

            {/* Charts and Ratings Section */}
            <section className="grid gap-8 lg:grid-cols-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
              <div className="lg:col-span-2">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold">📈</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Фаоллик динамикаси</h3>
                    <p className="text-muted-foreground">Топшириқларнинг вақт бўйича тақсимланиши</p>
                  </div>
                </div>
                <ActivityChart />
              </div>

              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold">🏆</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Ташкилот рейтинги</h3>
                    <p className="text-muted-foreground">Энг фаол ва самарали ташкилотлар</p>
                  </div>
                </div>
                <OrganizationRatings />
              </div>
            </section>

            {/* Sector Overview Section */}
            <section className="animate-slide-up" style={{ animationDelay: "400ms" }}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">🏢</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Соҳалар бўйича таҳлил</h3>
                  <p className="text-muted-foreground">Ҳар бир соҳанинг ижро кўрсаткичлари ва самарадорлиги</p>
                </div>
              </div>
              <SectorOverview />
            </section>

            {/* Recent Tasks Section */}
            <section className="animate-slide-up" style={{ animationDelay: "600ms" }}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">⏰</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">Муддати яқин топшириқлар</h3>
                  <p className="text-muted-foreground">Ижро муддати яқинлашиб бораётган фаол топшириқлар рўйхати</p>
                </div>
              </div>
              <RecentTasks />
            </section>

          </div>
        </div>
      </div>
    </>
  )
}
