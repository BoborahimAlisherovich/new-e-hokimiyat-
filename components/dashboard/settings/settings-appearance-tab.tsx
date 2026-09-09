import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TabsContent } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/i18n/context"
import { Globe, Save, Loader2 } from "lucide-react"

type Translation = ReturnType<typeof useTranslation>

interface SettingsAppearanceTabProps {
  t: Translation
  language: string
  onLanguageChange: (value: string) => void
  onSave: () => Promise<void>
  saving?: boolean
}

export function SettingsAppearanceTab({ t, language, onLanguageChange, onSave, saving }: SettingsAppearanceTabProps) {
  return (
    <TabsContent value="appearance">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>{t.settings.appearanceSettings}</CardTitle>
          <CardDescription>{t.settings.appearanceDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t.settings.language}</Label>
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20">
                <Globe className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uz">{t.settings.languageUzLatin}</SelectItem>
                <SelectItem value="uz-cyrl">{t.settings.languageUzCyrl}</SelectItem>
                <SelectItem value="ru">{t.settings.languageRu}</SelectItem>
                <SelectItem value="en">{t.settings.languageEn}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={onSave} 
              disabled={saving}
              className="bg-primary hover:bg-primary-hover text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saving ? t.common.saving : t.common.save}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
