import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { TabsContent } from "@/components/ui/tabs"
import { AlertCircle, Bell, Mail, MessageSquare, Save, Smartphone, Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"

type Translation = ReturnType<typeof useTranslation>

interface SettingsNotificationsTabProps {
  t: Translation
  emailNotifications: boolean
  onEmailChange: (value: boolean) => void
  telegramNotifications: boolean
  onTelegramChange: (value: boolean) => void
  pushNotifications: boolean
  onPushChange: (value: boolean) => void
  newTaskNotification: boolean
  onNewTaskChange: (value: boolean) => void
  taskDeadlineReminder: boolean
  onDeadlineChange: (value: boolean) => void
  onSave: () => Promise<void>
  saving?: boolean
}

export function SettingsNotificationsTab({
  t,
  emailNotifications,
  onEmailChange,
  telegramNotifications,
  onTelegramChange,
  pushNotifications,
  onPushChange,
  newTaskNotification,
  onNewTaskChange,
  taskDeadlineReminder,
  onDeadlineChange,
  onSave,
  saving,
}: SettingsNotificationsTabProps) {
  return (
    <TabsContent value="notifications" className="animate-fade-in">
      <Card className="bg-white border border-gray-200 shadow-sm hover:border-blue-300 transition-all duration-250">
        <CardHeader className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-blue-600/3 to-blue-700/5" />
          <CardTitle className="relative flex items-center gap-3 text-2xl">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Bell className="h-4 w-4 text-white" />
            </div>
            {t.settings.notificationSettings}
          </CardTitle>
          <CardDescription className="relative">{t.settings.notificationDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 p-8">
          <div className="space-y-6">
            <h4 className="text-xl font-semibold text-blue-600 bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              {t.settings.notificationChannels}
            </h4>

            <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 p-6 bg-blue-50 hover:bg-blue-100 transition-all duration-250">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-medium">{t.settings.emailNotifications}</p>
                  <p className="text-sm text-muted-foreground">{t.settings.emailNotificationsDesc}</p>
                </div>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={onEmailChange} className="scale-125" />
            </div>

            <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 p-6 bg-blue-50 hover:bg-blue-100 transition-all duration-250">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-medium">{t.settings.telegramNotifications}</p>
                  <p className="text-sm text-muted-foreground">{t.settings.telegramNotificationsDesc}</p>
                </div>
              </div>
              <Switch checked={telegramNotifications} onCheckedChange={onTelegramChange} className="scale-125" />
            </div>

            <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 p-6 bg-amber-50 hover:bg-amber-100 transition-all duration-250">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600 shadow-sm">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-medium">{t.settings.pushNotifications}</p>
                  <p className="text-sm text-muted-foreground">{t.settings.pushNotificationsDesc}</p>
                </div>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={onPushChange} className="scale-125" />
            </div>
          </div>

          <Separator className="my-8" />

          <div className="space-y-6">
            <h4 className="font-medium text-blue-600">{t.settings.notificationTypes}</h4>
            <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 p-6 bg-blue-50 hover:bg-blue-100 transition-all duration-250">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-medium">{t.settings.newTasks}</p>
                  <p className="text-sm text-muted-foreground">{t.settings.newTasksDesc}</p>
                </div>
              </div>
              <Switch checked={newTaskNotification} onCheckedChange={onNewTaskChange} className="scale-125" />
            </div>

            <div className="flex items-center justify-between rounded-2xl border-2 border-gray-200 p-6 bg-blue-50 hover:bg-blue-100 transition-all duration-250">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-lg font-medium">{t.settings.deadlineReminders}</p>
                  <p className="text-sm text-muted-foreground">{t.settings.deadlineRemindersDesc}</p>
                </div>
              </div>
              <Switch checked={taskDeadlineReminder} onCheckedChange={onDeadlineChange} className="scale-125" />
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <Button
              onClick={onSave}
              disabled={saving}
              className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-250 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {saving ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Save className="mr-2 h-5 w-5" />
              )}
              {saving ? "Saqlanmoqda..." : t.common.save}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
