import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/i18n/context"

type Translation = ReturnType<typeof useTranslation>

interface CurrentUser {
  login?: string
  pnfl?: string
}

interface SettingsSecurityTabProps {
  t: Translation
  currentUser: CurrentUser
}

export function SettingsSecurityTab({ t, currentUser }: SettingsSecurityTabProps) {
  return (
    <TabsContent value="security">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>{t.settings.securitySettings}</CardTitle>
          <CardDescription>{t.settings.securityDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{t.settings.oneIDAuth}</h4>
                <p className="text-sm text-muted-foreground mt-1">{t.settings.oneIDAuthDesc}</p>
              </div>
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                {t.settings.active}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Login</h4>
                <p className="text-sm text-muted-foreground mt-1">Tizimga kirish uchun foydalaniladigan login</p>
              </div>
              <code className="rounded bg-muted px-3 py-1 font-mono text-sm">{currentUser.login || "—"}</code>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{t.settings.pnfl}</h4>
                <p className="text-sm text-muted-foreground mt-1">{t.settings.pnflDesc}</p>
              </div>
              <code className="rounded bg-muted px-3 py-1 font-mono text-sm">***{(currentUser.pnfl ?? "").slice(-4)}</code>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h4 className="font-medium mb-2">{t.settings.activeSessions}</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                  <span>{t.settings.currentSession}</span>
                </div>
                <span className="text-muted-foreground">{t.settings.now}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span>{t.settings.hoursAgo}</span>
                </div>
                <span className="text-muted-foreground">2 {t.settings.hoursAgo}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-4 bg-transparent">
              {t.settings.terminateOtherSessions}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
