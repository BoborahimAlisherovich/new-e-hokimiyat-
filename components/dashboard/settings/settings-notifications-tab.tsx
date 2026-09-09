import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
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
  pushSupported?: boolean
  pushPermission?: "default" | "granted" | "denied" | "unsupported"
  pushConfigured?: boolean
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
  pushSupported = true,
  pushPermission = "default",
  pushConfigured = true,
}: SettingsNotificationsTabProps) {
  const pushWarning = !pushSupported
    ? "Bu brauzer push bildirishnomalarni qo'llab-quvvatlamaydi."
    : !pushConfigured
      ? "Push server hali production uchun sozlanmagan."
      : pushPermission === "denied"
        ? "Brauzer ruxsatni bloklagan. Push ishlashi uchun brauzer sozlamalaridan ruxsat bering."
        : null

  return (
    <TabsContent value="notifications" className="animate-fade-in">
      <Card className="overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] shadow-[0_26px_60px_-34px_rgba(14,165,233,0.24)] backdrop-blur-xl">
        <CardHeader className="relative overflow-hidden border-b border-border pb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_28%),linear-gradient(135deg,rgba(6,182,212,0.10),rgba(59,130,246,0.03)_45%,transparent_80%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-foreground sm:text-2xl">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_16px_30px_-18px_rgba(14,165,233,0.65)]">
                  <Bell className="h-5 w-5" />
                </div>
                {t.settings.notificationSettings}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {t.settings.notificationDescription}
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-white/80 px-3 py-2 text-xs font-medium text-primary shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Bildirishnomalar boshqaruvi
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-5 sm:p-8">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              {t.settings.notificationChannels}
            </h4>

            <NotificationSettingRow
              icon={Mail}
              title={t.settings.emailNotifications}
              description={t.settings.emailNotificationsDesc}
              checked={emailNotifications}
              onCheckedChange={onEmailChange}
            />
            <NotificationSettingRow
              icon={MessageSquare}
              title={t.settings.telegramNotifications}
              description={t.settings.telegramNotificationsDesc}
              checked={telegramNotifications}
              onCheckedChange={onTelegramChange}
            />
            <NotificationSettingRow
              icon={Smartphone}
              title={t.settings.pushNotifications}
              description={t.settings.pushNotificationsDesc}
              checked={pushNotifications}
              onCheckedChange={onPushChange}
              tone="amber"
              disabled={!pushSupported || !pushConfigured}
            />
            {pushWarning ? (
              <div className="rounded-[20px] border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm leading-6 text-amber-900">
                {pushWarning}
              </div>
            ) : null}
          </div>

          <Separator className="my-2 bg-primary-soft" />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{t.settings.notificationTypes}</h4>
            <NotificationSettingRow
              icon={AlertCircle}
              title={t.settings.newTasks}
              description={t.settings.newTasksDesc}
              checked={newTaskNotification}
              onCheckedChange={onNewTaskChange}
            />
            <NotificationSettingRow
              icon={AlertCircle}
              title={t.settings.deadlineReminders}
              description={t.settings.deadlineRemindersDesc}
              checked={taskDeadlineReminder}
              onCheckedChange={onDeadlineChange}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={onSave}
              disabled={saving}
              className="h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-6 text-sm font-semibold text-white shadow-[0_16px_32px_-18px_rgba(37,99,235,0.7)] transition hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? "Saqlanmoqda..." : t.common.save}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}

function NotificationSettingRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  tone = "cyan",
  disabled = false,
}: {
  icon: typeof Bell
  title: string
  description: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
  tone?: "cyan" | "amber"
  disabled?: boolean
}) {
  const toneClasses = tone === "amber"
    ? {
        wrapper: "border-amber-100/80 bg-gradient-to-r from-amber-50/90 to-orange-50/70 hover:border-amber-200 hover:bg-amber-50",
        icon: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_14px_28px_-18px_rgba(245,158,11,0.75)]",
      }
    : {
        wrapper: "border-border bg-gradient-to-r from-cyan-50/90 to-blue-50/65 hover:border-border hover:bg-primary-soft",
        icon: "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_14px_28px_-18px_rgba(14,165,233,0.75)]",
      }

  return (
    <div className={cn("flex flex-col gap-4 rounded-[24px] border p-4 transition sm:flex-row sm:items-center sm:justify-between sm:p-5", toneClasses.wrapper)}>
      <div className="flex items-start gap-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", toneClasses.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground sm:text-base">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex justify-end sm:block">
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </div>
    </div>
  )
}
