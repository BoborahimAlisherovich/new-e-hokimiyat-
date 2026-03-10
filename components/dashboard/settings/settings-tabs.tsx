import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/i18n/context"
import { Bell, Globe, Layers, Settings, Shield, User } from "lucide-react"
import { UserRole } from "@/types"
import { canAccessSettingsTab } from "@/lib/settings-access"

type Translation = ReturnType<typeof useTranslation>

interface SettingsTabsProps {
  t: Translation
  isAdmin: boolean
  userRole?: UserRole
}

export function SettingsTabs({ t, isAdmin, userRole }: SettingsTabsProps) {
  return (
    <TabsList className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-white/60 bg-white/80 p-2 shadow-[0_10px_30px_-20px_rgba(37,99,235,0.25)] backdrop-blur-xl">
      <TabsTrigger
        value="profile"
        className="min-h-10 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 transition-colors"
      >
        <User className="h-4 w-4 mr-2" />
        {t.settings.profile}
      </TabsTrigger>

      <TabsTrigger
        value="notifications"
        className="min-h-10 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 transition-colors"
      >
        <Bell className="h-4 w-4 mr-2" />
        {t.settings.notifications}
      </TabsTrigger>

      <TabsTrigger
        value="security"
        className="min-h-10 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 transition-colors"
      >
        <Shield className="h-4 w-4 mr-2" />
        {t.settings.security}
      </TabsTrigger>

      <TabsTrigger
        value="appearance"
        className="min-h-10 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 transition-colors"
      >
        <Globe className="h-4 w-4 mr-2" />
        {t.settings.appearance}
      </TabsTrigger>

      {canAccessSettingsTab(userRole, "sectors") && (
        <TabsTrigger
          value="sectors"
          className="min-h-10 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 transition-colors"
        >
          <Layers className="h-4 w-4 mr-2" />
          Sohalar
        </TabsTrigger>
      )}

      {canAccessSettingsTab(userRole, "admin") && isAdmin && (
        <TabsTrigger
          value="admin"
          className="min-h-10 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700 transition-colors"
        >
          <Settings className="h-4 w-4 mr-2" />
          {t.settings.admin}
        </TabsTrigger>
      )}
    </TabsList>
  )
}
