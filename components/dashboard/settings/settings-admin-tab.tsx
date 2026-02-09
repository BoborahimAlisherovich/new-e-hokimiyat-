import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { TabsContent } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/i18n/context"
import { AlertCircle, Bot, CheckCircle2, Eye, EyeOff, Mail, Save, ExternalLink } from "lucide-react"

type Translation = ReturnType<typeof useTranslation>

interface SettingsAdminTabProps {
  t: Translation
  botToken: string
  botUsername: string
  showToken: boolean
  tokenSaved: boolean
  smtpHost: string
  smtpPort: string
  senderEmail: string
  onBotTokenChange: (value: string) => void
  onBotUsernameChange: (value: string) => void
  onShowTokenToggle: () => void
  onSaveBotSettings: () => void
  onSmtpHostChange: (value: string) => void
  onSmtpPortChange: (value: string) => void
  onSenderEmailChange: (value: string) => void
}

export function SettingsAdminTab({
  t,
  botToken,
  botUsername,
  showToken,
  tokenSaved,
  smtpHost,
  smtpPort,
  senderEmail,
  onBotTokenChange,
  onBotUsernameChange,
  onShowTokenToggle,
  onSaveBotSettings,
  onSmtpHostChange,
  onSmtpPortChange,
  onSenderEmailChange,
}: SettingsAdminTabProps) {
  return (
    <TabsContent value="admin">
      <div className="space-y-6">
        <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 border-b border-blue-100/50 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  {t.settings.telegramBotSettings}
                </CardTitle>
                <CardDescription className="text-slate-600 mt-0.5">{t.settings.telegramBotDesc}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-700 font-medium flex items-center gap-2">
                {t.settings.createBot}
                <a 
                  href="https://t.me/BotFather" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
                >
                  @BotFather <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>

            {tokenSaved && (
              <Alert className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-sm text-emerald-700 font-semibold">{t.settings.settingsSaved}!</AlertDescription>
              </Alert>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="botToken" className="text-sm font-semibold text-slate-700">{t.settings.botToken}</Label>
                <div className="relative">
                  <Input
                    id="botToken"
                    type={showToken ? "text" : "password"}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={botToken}
                    onChange={(e) => onBotTokenChange(e.target.value)}
                    className="font-mono pr-10 h-11 rounded-xl border-indigo-100/60 focus:border-indigo-400 focus:ring-indigo-400/20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 hover:bg-indigo-50/50 rounded-lg"
                    onClick={onShowTokenToggle}
                  >
                    {showToken ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 font-medium">{t.settings.botTokenDesc}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="botUsername" className="text-sm font-semibold text-slate-700">{t.settings.botUsername}</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-indigo-100/60 bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 text-sm font-semibold">
                    @
                  </span>
                  <Input
                    id="botUsername"
                    placeholder="hokimlik_bot"
                    value={botUsername}
                    onChange={(e) => onBotUsernameChange(e.target.value)}
                    className="rounded-l-none rounded-r-xl h-11 border-indigo-100/60 focus:border-indigo-400 focus:ring-indigo-400/20"
                  />
                </div>
                <p className="text-xs text-slate-500 font-medium">{t.settings.botUsernameDesc}</p>
              </div>
            </div>

            <Separator className="bg-indigo-50/50" />

            <div className="flex justify-end">
              <Button 
                onClick={onSaveBotSettings}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 rounded-xl px-6"
              >
                <Save className="mr-2 h-4 w-4" />
                {t.common.save}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur-xl border-white/50 ring-1 ring-indigo-50/30 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.08)] rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border-b border-amber-100/50 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-slate-900">
                  {t.settings.emailSettings}
                </CardTitle>
                <CardDescription className="text-slate-600 mt-0.5">{t.settings.emailSettingsDesc}</CardDescription>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                Tez kunda
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6 opacity-60">
            <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-700 font-medium">
                Email sozlamalari hozircha ishlamaydi. Bu xususiyat tez orada qo&apos;shiladi.
              </AlertDescription>
            </Alert>
            
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtpHost" className="text-sm font-semibold text-slate-700">{t.settings.smtpServer}</Label>
                <Input 
                  id="smtpHost" 
                  placeholder="smtp.example.com" 
                  value={smtpHost} 
                  onChange={(e) => onSmtpHostChange(e.target.value)} 
                  disabled
                  className="h-11 rounded-xl border-indigo-100/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort" className="text-sm font-semibold text-slate-700">{t.settings.port}</Label>
                <Input 
                  id="smtpPort" 
                  placeholder="587" 
                  value={smtpPort} 
                  onChange={(e) => onSmtpPortChange(e.target.value)} 
                  disabled
                  className="h-11 rounded-xl border-indigo-100/60"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="senderEmail" className="text-sm font-semibold text-slate-700">{t.settings.senderEmail}</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  placeholder="noreply@hokimlik.uz"
                  value={senderEmail}
                  onChange={(e) => onSenderEmailChange(e.target.value)}
                  disabled
                  className="h-11 rounded-xl border-indigo-100/60"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button disabled className="rounded-xl px-6 opacity-50">
                <Save className="mr-2 h-4 w-4" />
                {t.common.save}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}
