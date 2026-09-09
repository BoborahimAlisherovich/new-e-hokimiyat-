import { Card, CardContent } from "@/components/ui/card"
import { Building2, Clock, Target, TrendingUp, MessageSquare } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

interface AnalyticsOverviewProps {
  tasks: any[]
  organizations: any[]
  appeals: any[]
}

export function AnalyticsOverview({ tasks, organizations, appeals }: AnalyticsOverviewProps) {
  const { language } = useI18n()
  const tr = {
    uz: {
      totalTasks: "Jami topshiriqlar",
      completion: "Bajarilganlik",
      overdue: "Kechikkan topshiriqlar",
      activeOrgs: "Faol tashkilotlar",
      totalAppeals: "Jami murojaatlar",
      noTasks: "Hozircha topshiriqlar yaratilmagan",
      noCompletion: "Bajarilish foizi hisoblash uchun topshiriq yo'q",
      noOverdue: "Kechikkan topshiriqlar hozircha yo'q",
      noOrganizations: "Tizimda hali tashkilotlar mavjud emas",
      noAppeals: "Hozircha hech qanday murojaat yuborilmagan",
    },
    "uz-cyrl": {
      totalTasks: "Жами топшириқлар",
      completion: "Бажарилганлик",
      overdue: "Кечиккан топшириқлар",
      activeOrgs: "Фаол ташкилотлар",
      totalAppeals: "Жами мурожаатлар",
      noTasks: "Ҳозирча топшириқлар яратилмаган",
      noCompletion: "Бажарилиш фоизини ҳисоблаш учун топшириқ йўқ",
      noOverdue: "Кечиккан топшириқлар ҳозирча йўқ",
      noOrganizations: "Тизимда ҳали ташкилотлар мавжуд эмас",
      noAppeals: "Ҳозирча ҳеч қандай мурожаат юборилмаган",
    },
    ru: {
      totalTasks: "Всего поручений",
      completion: "Выполнение",
      overdue: "Просроченные поручения",
      activeOrgs: "Активные организации",
      totalAppeals: "Всего обращений",
      noTasks: "Поручения пока не созданы",
      noCompletion: "Нет поручений для расчета выполнения",
      noOverdue: "Просроченных поручений пока нет",
      noOrganizations: "В системе пока нет организаций",
      noAppeals: "Заявители пока не отправляли обращения",
    },
    en: {
      totalTasks: "Total tasks",
      completion: "Completion",
      overdue: "Overdue tasks",
      activeOrgs: "Active organizations",
      totalAppeals: "Total appeals",
      noTasks: "No tasks have been created yet",
      noCompletion: "No tasks available to calculate completion",
      noOverdue: "There are no overdue tasks yet",
      noOrganizations: "No organizations have been added yet",
      noAppeals: "No appeals have been submitted yet",
    },
  }[language]

  const completedCount = tasks.filter(
    (task) => task.status === "BAJARILDI" || task.status === "NAZORATDAN_YECHILDI",
  ).length
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0
  const overdueCount = tasks.filter((task) => task.status === "MUDDATI_KECH").length
  return (
    <section className="animate-slide-up">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-card/80 border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{tasks.length}</p>
                <p className="text-sm text-muted-foreground">{tr.totalTasks}</p>
                {tasks.length === 0 && <p className="text-xs text-muted-foreground mt-1">{tr.noTasks}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-success">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
                <p className="text-sm text-muted-foreground">{tr.completion}</p>
                {tasks.length === 0 && <p className="text-xs text-muted-foreground mt-1">{tr.noCompletion}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-warning">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{overdueCount}</p>
                <p className="text-sm text-muted-foreground">{tr.overdue}</p>
                {tasks.length === 0 && <p className="text-xs text-muted-foreground mt-1">{tr.noTasks}</p>}
                {tasks.length > 0 && overdueCount === 0 && <p className="text-xs text-muted-foreground mt-1">{tr.noOverdue}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{organizations.length}</p>
                <p className="text-sm text-muted-foreground">{tr.activeOrgs}</p>
                {organizations.length === 0 && <p className="text-xs text-muted-foreground mt-1">{tr.noOrganizations}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border border-border shadow-md rounded-2xl hover:shadow-xl transition-all duration-300 hover:scale-102">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-info">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{appeals.length}</p>
                <p className="text-sm text-muted-foreground">{tr.totalAppeals}</p>
                {appeals.length === 0 && <p className="text-xs text-muted-foreground mt-1">{tr.noAppeals}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
