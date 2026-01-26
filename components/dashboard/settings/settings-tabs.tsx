import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/i18n/context"
import { Bell, Globe, Mail, Settings, Shield, User } from "lucide-react"

type Translation = ReturnType<typeof useTranslation>

interface SettingsTabsProps {
  t: Translation
  isAdmin: boolean
}

export function SettingsTabs({ t, isAdmin }: SettingsTabsProps) {
  return (
    <TabsList className="flex space-x-1 border-b border-gray-200">
      <TabsTrigger
        value="profile"
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
      >
        <User className="h-4 w-4 mr-2" />
        {t.settings.profile}
      </TabsTrigger>

      <TabsTrigger
        value="notifications"
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
      >
        <Bell className="h-4 w-4 mr-2" />
        {t.settings.notifications}
      </TabsTrigger>

      <TabsTrigger
        value="security"
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
      >
        <Shield className="h-4 w-4 mr-2" />
        {t.settings.security}
      </TabsTrigger>

      <TabsTrigger
        value="appearance"
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
      >
        <Globe className="h-4 w-4 mr-2" />
        {t.settings.appearance}
      </TabsTrigger>

      <TabsTrigger
        value="applications"
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
      >
        <Mail className="h-4 w-4 mr-2" />
        Murojatlar
      </TabsTrigger>

      <TabsTrigger
        value="tasks"
        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-blue-600 data-[state=active]:border-blue-600 transition-colors"
      >
        <Settings className="h-4 w-4 mr-2" />
        Topshiriqlar
      </TabsTrigger>

      {isAdmin && (
        <TabsTrigger
          value="admin"
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[state=active]:text-emerald-600 data-[state=active]:border-emerald-600 transition-colors"
        >
          <Settings className="h-4 w-4 mr-2" />
          {t.settings.admin}
        </TabsTrigger>
      )}
    </TabsList>
  )
}
