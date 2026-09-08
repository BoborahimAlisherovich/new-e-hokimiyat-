import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/i18n/context"
import { Bell, BriefcaseBusiness, Globe, Layers, Shield, User, Route } from "lucide-react"
import { UserRole } from "@/types"
import { canAccessSettingsTab } from "@/lib/settings-access"

type Translation = ReturnType<typeof useTranslation>

interface SettingsTabsProps {
  t: Translation
  userRole?: UserRole
}

export function SettingsTabs({ t, userRole }: SettingsTabsProps) {
  return (
    <div className="sticky top-20 z-20 rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,250,252,0.92))] p-3 shadow-[0_24px_60px_-40px_rgba(14,165,233,0.38)] backdrop-blur-xl">
      <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-[22px] bg-transparent p-0 shadow-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <TabsTrigger
          value="profile"
          className="min-h-11 shrink-0 whitespace-nowrap rounded-2xl border border-transparent px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-slate-200 hover:bg-slate-100/80 hover:text-gray-900 data-[state=active]:border-cyan-200 data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 data-[state=active]:shadow-none"
        >
          <User className="mr-2 h-4 w-4" />
          {t.settings.profile}
        </TabsTrigger>

        <TabsTrigger
          value="notifications"
          className="min-h-11 shrink-0 whitespace-nowrap rounded-2xl border border-transparent px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-slate-200 hover:bg-slate-100/80 hover:text-gray-900 data-[state=active]:border-cyan-200 data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 data-[state=active]:shadow-none"
        >
          <Bell className="mr-2 h-4 w-4" />
          {t.settings.notifications}
        </TabsTrigger>

        <TabsTrigger
          value="security"
          className="min-h-11 shrink-0 whitespace-nowrap rounded-2xl border border-transparent px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-slate-200 hover:bg-slate-100/80 hover:text-gray-900 data-[state=active]:border-cyan-200 data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 data-[state=active]:shadow-none"
        >
          <Shield className="mr-2 h-4 w-4" />
          {t.settings.security}
        </TabsTrigger>

        <TabsTrigger
          value="appearance"
          className="min-h-11 shrink-0 whitespace-nowrap rounded-2xl border border-transparent px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-slate-200 hover:bg-slate-100/80 hover:text-gray-900 data-[state=active]:border-cyan-200 data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-700 data-[state=active]:shadow-none"
        >
          <Globe className="mr-2 h-4 w-4" />
          {t.settings.appearance}
        </TabsTrigger>

        {canAccessSettingsTab(userRole, "sectors") && (
          <TabsTrigger
            value="sectors"
            className="min-h-11 shrink-0 whitespace-nowrap rounded-2xl border border-transparent px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-slate-200 hover:bg-slate-100/80 hover:text-gray-900 data-[state=active]:border-violet-200 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700 data-[state=active]:shadow-none"
          >
            <Layers className="mr-2 h-4 w-4" />
            {t.settings.sectors}
          </TabsTrigger>
        )}

        {canAccessSettingsTab(userRole, "positions") && (
          <TabsTrigger
            value="positions"
            className="min-h-11 shrink-0 whitespace-nowrap rounded-2xl border border-transparent px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-slate-200 hover:bg-slate-100/80 hover:text-gray-900 data-[state=active]:border-amber-200 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-none"
          >
            <BriefcaseBusiness className="mr-2 h-4 w-4" />
            {t.settings.positions}
          </TabsTrigger>
        )}

        {canAccessSettingsTab(userRole, "appeals_routing") && (
          <TabsTrigger
            value="appeals_routing"
            className="min-h-11 shrink-0 whitespace-nowrap rounded-2xl border border-transparent px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-slate-200 hover:bg-slate-100/80 hover:text-gray-900 data-[state=active]:border-indigo-200 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none"
          >
            <Route className="mr-2 h-4 w-4" />
            {t.settings.appealsRouting}
          </TabsTrigger>
        )}
      </TabsList>
    </div>
  )
}
