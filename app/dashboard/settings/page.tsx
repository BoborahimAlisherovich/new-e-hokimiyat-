"use client"

import { Header } from "@/components/layout/header"
import { Tabs } from "@/components/ui/tabs"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useI18n, useTranslation, type Language } from "@/lib/i18n/context"
import { getCurrentUser, getNotificationPreferences, getPushPublicKey, getPushStatus, updateNotificationPreferences } from "@/lib/api"
import { User } from "@/types"
import { SettingsTabs } from "@/components/dashboard/settings/settings-tabs"
import { SettingsProfileTab } from "@/components/dashboard/settings/settings-profile-tab"
import { SettingsNotificationsTab } from "@/components/dashboard/settings/settings-notifications-tab"
import { SettingsSecurityTab } from "@/components/dashboard/settings/settings-security-tab"
import { SettingsAppearanceTab } from "@/components/dashboard/settings/settings-appearance-tab"
import { SettingsSectorsTab } from "@/components/dashboard/settings/settings-sectors-tab"
import { SettingsPositionsTab } from "@/components/dashboard/settings/settings-positions-tab"
import { SettingsAppealsRoutingTab } from "@/components/dashboard/settings/settings-appeals-routing-tab"
import { useToast } from "@/hooks/use-toast"
import { useGSAPPageEntrance } from "@/hooks/use-gsap"
import { canAccessSettingsTab, getAllowedSettingsTabs, type SettingsTabKey } from "@/lib/settings-access"
import { useRouter, useSearchParams } from "next/navigation"
import {
  emitPushSettingsChanged,
  getPushPermissionState,
  isPushSupported,
  syncPushSubscription,
} from "@/lib/push-notifications"

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslation()
  const { language, setLanguage } = useI18n()
  const { toast } = useToast()
  const pageRef = useGSAPPageEntrance()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Notification settings (stored locally for now)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [telegramNotifications, setTelegramNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [taskDeadlineReminder, setTaskDeadlineReminder] = useState(true)
  const [newTaskNotification, setNewTaskNotification] = useState(true)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushPermission, setPushPermission] = useState<"default" | "granted" | "denied" | "unsupported">("unsupported")
  const [pushConfigured, setPushConfigured] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      setCurrentUser(user)
      setPushSupported(isPushSupported())
      setPushPermission(getPushPermissionState())
      
      try {
        const preferences = await getNotificationPreferences()
        setEmailNotifications(preferences.email_notifications_enabled)
        setTelegramNotifications(preferences.telegram_notifications_enabled)
        setPushNotifications(preferences.push_notifications_enabled)
        setTaskDeadlineReminder(preferences.deadline_reminders_enabled)
        setNewTaskNotification(preferences.new_task_notifications_enabled)
      } catch (error) {
        console.error("Notification preferences error:", error)
      }

      if (isPushSupported()) {
        try {
          const { configured } = await getPushPublicKey()
          setPushConfigured(configured)
          const pushStatus = await getPushStatus()
          setPushNotifications(pushStatus.enabled)
        } catch (error) {
          console.error("Push status error:", error)
        }
      } else {
        setPushConfigured(false)
      }
    } catch (error) {
      console.error("Failed to load user:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    document.documentElement.lang = language || "uz"
  }, [language])

  const userRole = currentUser?.role ?? null
  const allowedTabs = useMemo(() => getAllowedSettingsTabs(userRole), [userRole])
  const requestedTab = searchParams.get("tab") as SettingsTabKey | null
  const resolvedTab = requestedTab && allowedTabs.includes(requestedTab) ? requestedTab : allowedTabs[0]
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("profile")

  useEffect(() => {
    setActiveTab(resolvedTab)
  }, [resolvedTab])

  const handleTabChange = (value: string) => {
    const nextTab = value as SettingsTabKey
    setActiveTab(nextTab)
    router.replace(`/dashboard/settings?tab=${nextTab}`, { scroll: false })
  }

  const handleLanguageChange = (value: string) => {
    const supported: Language[] = ["uz", "uz-cyrl", "ru", "en"]
    const normalized = supported.includes(value as Language) ? (value as Language) : "uz"
    setLanguage(normalized)
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      let nextPushNotifications = false

      if (pushNotifications) {
        nextPushNotifications = await syncPushSubscription(true, { interactive: true })
        setPushPermission(getPushPermissionState())
      } else {
        await syncPushSubscription(false, { interactive: false })
        nextPushNotifications = false
      }

      // Save notification settings to localStorage
      const notificationSettings = {
        email: emailNotifications,
        telegram: telegramNotifications,
        push: nextPushNotifications,
        deadline: taskDeadlineReminder,
        newTask: newTaskNotification,
      }
      localStorage.setItem("notifications", JSON.stringify(notificationSettings))
      localStorage.setItem("language", language)
      await updateNotificationPreferences({
        email_notifications_enabled: emailNotifications,
        telegram_notifications_enabled: telegramNotifications,
        push_notifications_enabled: nextPushNotifications,
        deadline_reminders_enabled: taskDeadlineReminder,
        new_task_notifications_enabled: newTaskNotification,
      })
      setPushNotifications(nextPushNotifications)
      emitPushSettingsChanged(nextPushNotifications)
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      toast({
        title: t.common.success,
        description: t.settings.settingsSaved,
      })
    } catch (error) {
      toast({
        title: t.common.error,
        description: error instanceof Error ? error.message : t.settings.saveError,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const userForProfile = currentUser ? {
    id: currentUser.id,
    login: currentUser.login || "",
    firstName: currentUser.first_name || "",
    lastName: currentUser.last_name || "",
    middleName: currentUser.middle_name || "",
    phone: currentUser.phone || "",
    pnfl: currentUser.masked_pnfl || currentUser.pnfl || "",
    role: currentUser.role || "USER",
    avatar_url: currentUser.avatar_url || null,
  } : {
    login: "",
    firstName: "",
    lastName: "",
    middleName: "",
    phone: "",
    pnfl: "",
    role: "USER",
  }

  if (loading) {
    return (
      <>
        <Header title={t.settings.title} description={t.settings.description} />
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ring mx-auto"></div>
              <p className="mt-4 text-muted-foreground">{t.common.loading}</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={t.settings.title} description={t.settings.description} />
      <div className="p-4 sm:p-6">
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="bg-primary absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl" />
          <div className="bg-[var(--st-tekshiruvda-bg)] absolute bottom-0 right-0 w-80 h-80 rounded-full blur-2xl" />
        </div>
        <div ref={pageRef} className="relative z-10 mx-auto max-w-5xl">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <section data-gsap-section>
              <SettingsTabs t={t} userRole={currentUser?.role} />
            </section>
            <section data-gsap-section>
              <SettingsProfileTab t={t} currentUser={userForProfile} onUserUpdate={loadData} />
            </section>
            <SettingsNotificationsTab
              t={t}
              emailNotifications={emailNotifications}
              onEmailChange={setEmailNotifications}
              telegramNotifications={telegramNotifications}
              onTelegramChange={setTelegramNotifications}
              pushNotifications={pushNotifications}
              onPushChange={setPushNotifications}
              newTaskNotification={newTaskNotification}
              onNewTaskChange={setNewTaskNotification}
              taskDeadlineReminder={taskDeadlineReminder}
              onDeadlineChange={setTaskDeadlineReminder}
              onSave={saveSettings}
              saving={saving}
              pushSupported={pushSupported}
              pushPermission={pushPermission}
              pushConfigured={pushConfigured}
            />
            <SettingsSecurityTab t={t} currentUser={userForProfile} />
            <SettingsAppearanceTab t={t} language={language} onLanguageChange={handleLanguageChange} onSave={saveSettings} saving={saving} />
            {canAccessSettingsTab(userRole, "sectors") && <SettingsSectorsTab t={t} />}
            {canAccessSettingsTab(userRole, "positions") && <SettingsPositionsTab t={t} />}
            {canAccessSettingsTab(userRole, "appeals_routing") && <SettingsAppealsRoutingTab t={t} />}
          </Tabs>
        </div>
      </div>
    </>
  )
}
