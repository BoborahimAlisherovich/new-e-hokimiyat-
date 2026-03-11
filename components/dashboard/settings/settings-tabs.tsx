import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/i18n/context"
import { Bell, Globe, Layers, Shield, User } from "lucide-react"
import { UserRole } from "@/types"
import { canAccessSettingsTab } from "@/lib/settings-access"

type Translation = ReturnType<typeof useTranslation>

interface SettingsTabsProps {
  t: Translation
  userRole?: UserRole
}

export function SettingsTabs({ t, userRole }: SettingsTabsProps) {
  return (
    <TabsList className="h-auto w-full justify-start flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-transparent p-0 shadow-none">
      <TabsTrigger
        value="profile"
        className="min-h-10 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-slate-100/70 data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors"
      >
        <User className="h-4 w-4 mr-2" />
        {t.settings.profile}
      </TabsTrigger>

      <TabsTrigger
        value="notifications"
        className="min-h-10 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-slate-100/70 data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors"
      >
        <Bell className="h-4 w-4 mr-2" />
        {t.settings.notifications}
      </TabsTrigger>

      <TabsTrigger
        value="security"
        className="min-h-10 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-slate-100/70 data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors"
      >
        <Shield className="h-4 w-4 mr-2" />
        {t.settings.security}
      </TabsTrigger>

      <TabsTrigger
        value="appearance"
        className="min-h-10 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-slate-100/70 data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-none transition-colors"
      >
        <Globe className="h-4 w-4 mr-2" />
        {t.settings.appearance}
      </TabsTrigger>

      {canAccessSettingsTab(userRole, "sectors") && (
        <TabsTrigger
          value="sectors"
          className="min-h-10 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-slate-100/70 data-[state=active]:border-violet-200 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:shadow-none transition-colors"
        >
          <Layers className="h-4 w-4 mr-2" />
          {t.settings.sectors}
        </TabsTrigger>
      )}

    </TabsList>
  )
}
