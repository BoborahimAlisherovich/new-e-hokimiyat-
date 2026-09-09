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
      <Card className="bg-card border-border ring-1 ring-ring/20 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl overflow-hidden">
        <CardHeader className="bg-background border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-secondary p-2.5 rounded-xl shadow-lg shadow-slate-500/25">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">{t.settings.admin}</CardTitle>
              <CardDescription className="text-muted-foreground mt-0.5">
                Telegram bot va Email sozlamalari alohida bo'limlarga ko'chirildi.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Telegram bot konfiguratsiyasi uchun chap menyudagi `Telegram bot` bo'limidan foydalaning.
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
