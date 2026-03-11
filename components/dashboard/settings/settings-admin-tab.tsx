import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/i18n/context"
import { Settings } from "lucide-react"

type Translation = ReturnType<typeof useTranslation>

interface SettingsAdminTabProps {
  t: Translation
}

export function SettingsAdminTab({ t }: SettingsAdminTabProps) {
  return (
    <TabsContent value="admin">
      <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 shadow-lg shadow-slate-500/25">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">{t.settings.admin}</CardTitle>
              <CardDescription className="text-slate-600 mt-0.5">
                Telegram bot va Email sozlamalari alohida bo'limlarga ko'chirildi.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-slate-600">
            Telegram bot konfiguratsiyasi uchun chap menyudagi `Telegram bot` bo'limidan foydalaning.
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
