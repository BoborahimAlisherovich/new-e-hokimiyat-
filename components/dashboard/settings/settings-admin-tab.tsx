import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { TabsContent } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/i18n/context"
import { AlertCircle, Bot, CheckCircle2, Eye, EyeOff, Mail, Save } from "lucide-react"

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
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {t.settings.telegramBotSettings}
            </CardTitle>
            <CardDescription>{t.settings.telegramBotDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">{t.settings.createBot}</AlertDescription>
            </Alert>

            {tokenSaved && (
              <Alert className="border-blue-200 bg-blue-50">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-600">{t.settings.settingsSaved}!</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="botToken">{t.settings.botToken}</Label>
                <div className="relative">
                  <Input
                    id="botToken"
                    type={showToken ? "text" : "password"}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={botToken}
                    onChange={(e) => onBotTokenChange(e.target.value)}
                    className="font-mono pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={onShowTokenToggle}
                  >
                    {showToken ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t.settings.botTokenDesc}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="botUsername">{t.settings.botUsername}</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-muted text-muted-foreground text-sm">
                    @
                  </span>
                  <Input
                    id="botUsername"
                    placeholder="hokimlik_bot"
                    value={botUsername}
                    onChange={(e) => onBotUsernameChange(e.target.value)}
                    className="rounded-l-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t.settings.botUsernameDesc}</p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={onSaveBotSettings}>
                <Save className="mr-2 h-4 w-4" />
                {t.common.save}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t.settings.emailSettings}
            </CardTitle>
            <CardDescription>{t.settings.emailSettingsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">{t.settings.smtpServer}</Label>
                <Input id="smtpHost" placeholder="smtp.example.com" value={smtpHost} onChange={(e) => onSmtpHostChange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPort">{t.settings.port}</Label>
                <Input id="smtpPort" placeholder="587" value={smtpPort} onChange={(e) => onSmtpPortChange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderEmail">{t.settings.senderEmail}</Label>
                <Input
                  id="senderEmail"
                  type="email"
                  placeholder="noreply@hokimlik.uz"
                  value={senderEmail}
                  onChange={(e) => onSenderEmailChange(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={onSaveBotSettings}>
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
